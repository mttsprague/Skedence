//
//  AdminService.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class AdminService: ObservableObject {
    // MARK: - ServiceProtocol Standard Properties
    
    @Published private(set) var items: [SimpleUser] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Admin-Specific Properties
    
    @Published private(set) var isAdmin = false
    @Published private(set) var organizationData: [String: Any]?
    @Published private(set) var organizationBilling: OrganizationBilling?
    
    // Backward compatibility aliases
    var allUsers: [SimpleUser] { items }
    var errorMessage: String? { error?.localizedDescription }
    
    private let repository = AdminRepository()
    private let db = Firestore.firestore()  // Keep for legacy methods
    
    // MARK: - Error Mapping
    
    private func mapRepositoryError(_ error: Error) -> ServiceError {
        if let repoError = error as? RepositoryError {
            switch repoError {
            case .notFound:
                return ServiceError.notFound
            case .unauthorized:
                return ServiceError.unauthorized
            default:
                return ServiceError.networkError(error)
            }
        }
        return ServiceError.networkError(error)
    }
    private var currentOrgId: String?
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch all users for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        await loadAllUsers(orgId: orgId)
    }
    
    /// Refresh all users
    func refresh() async throws {
        try await fetch()
    }
    
    // MARK: - Admin Authentication
    
    // Check if current user is admin
    func checkAdminStatus() async {
        error = nil
        guard let uid = Auth.auth().currentUser?.uid else {
            isAdmin = false
            error = ServiceError.notAuthenticated
            return
        }
        
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Check admin status via repository
            _ = try await repository.fetchAll(orgId: "")
            
            // Try to find user's org membership
            isAdmin = try await repository.checkAdminStatus(userId: uid, orgId: currentOrgId ?? "")
            
            // Load organization data if admin
            if isAdmin, let orgId = currentOrgId {
                await loadOrganizationData(orgId: orgId)
                organizationBilling = await fetchOrganizationBilling(orgId: orgId)
            }
        } catch let catchError {
            isAdmin = false
            error = mapRepositoryError(catchError)
        }
    }
    
    // Load organization data
    func loadOrganizationData(orgId: String) async {
        do {
            organizationData = try await repository.fetchOrganizationData(orgId: orgId)
            currentOrgId = orgId
        } catch let catchError {
            error = mapRepositoryError(catchError)
        }
    }
    
    // MARK: - Class Management
    
    // Create a new class (admin only)
    func createClass(
        orgId: String,
        title: String,
        description: String,
        startTime: Date,
        endTime: Date,
        maxParticipants: Int,
        location: String,
        trainerId: String,
        trainerName: String
    ) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw ServiceError.notAuthenticated
        }
        
        guard isAdmin else {
            throw ServiceError.unauthorized
        }
        
        let classData: [String: Any] = [
            "orgId": orgId,
            "title": title,
            "description": description,
            "startTime": Timestamp(date: startTime),
            "endTime": Timestamp(date: endTime),
            "maxParticipants": maxParticipants,
            "currentParticipants": 0,
            "location": location,
            "isOpenForRegistration": true,
            "trainerId": trainerId,
            "trainerName": trainerName,
            "createdBy": uid,
            "createdAt": Timestamp(date: Date())
        ]
        
        let classRef = try await db.collection("classes").addDocument(data: classData)
        
        // Create a booking ONLY on the assigned trainer's schedule to block off the time
        let bookingData: [String: Any] = [
            "startTime": Timestamp(date: startTime),
            "endTime": Timestamp(date: endTime),
            "status": "booked",
            "clientId": "CLASS",
            "clientName": title,
            "classId": classRef.documentID,
            "isClassBooking": true,
            "bookedAt": Timestamp(date: Date()),
            "orgId": orgId
        ]
        
        // Add slot ONLY to the assigned trainer's schedule
        try await db.collection("trainers").document(trainerId)
            .collection("schedules").addDocument(data: bookingData)
    }
    
    // Toggle class registration status
    func toggleClassRegistration(classId: String, isOpen: Bool) async throws {
        guard isAdmin else {
            throw ServiceError.unauthorized
        }
        
        try await db.collection("classes").document(classId)
            .updateData(["isOpenForRegistration": isOpen])
    }
    
    // Delete a class
    func deleteClass(classId: String, orgId: String) async throws {
        guard isAdmin else {
            throw ServiceError.unauthorized
        }
        
        // Delete the class document
        try await db.collection("classes").document(classId).delete()
        
        // Remove class bookings from the assigned trainer's schedule only
        // Get the class data first to know which trainer
        let classDoc = try await db.collection("classes").document(classId).getDocument()
        guard let classData = classDoc.data(),
              let trainerId = classData["trainerId"] as? String else {
            // Class already deleted or no trainer assigned, just return
            return
        }
        
        let schedulesQuery = db.collection("trainers").document(trainerId)
            .collection("schedules")
            .whereField("classId", isEqualTo: classId)
            .whereField("isClassBooking", isEqualTo: true)
        
        let schedulesSnapshot = try await schedulesQuery.getDocuments()
        
        for scheduleDoc in schedulesSnapshot.documents {
            try await scheduleDoc.reference.delete()
        }
    }
    
    // Update a class
    func updateClass(
        classId: String,
        orgId: String,
        title: String,
        description: String,
        startTime: Date,
        endTime: Date,
        maxParticipants: Int,
        location: String,
        trainerId: String,
        trainerName: String
    ) async throws {
        guard isAdmin else {
            throw ServiceError.unauthorized
        }
        
        // Update the class document
        try await db.collection("classes").document(classId).updateData([
            "title": title,
            "description": description,
            "startTime": Timestamp(date: startTime),
            "endTime": Timestamp(date: endTime),
            "maxParticipants": maxParticipants,
            "location": location,
            "trainerId": trainerId,
            "trainerName": trainerName
        ])
        
        // Remove old bookings from the assigned trainer's schedule only
        let schedulesQuery = db.collection("trainers").document(trainerId)
            .collection("schedules")
            .whereField("classId", isEqualTo: classId)
            .whereField("isClassBooking", isEqualTo: true)
        
        let schedulesSnapshot = try await schedulesQuery.getDocuments()
        
        for scheduleDoc in schedulesSnapshot.documents {
            try await scheduleDoc.reference.delete()
        }
        
        // Create new booking on the assigned trainer's schedule with updated times
        let bookingData: [String: Any] = [
            "clientId": "",
            "startTime": Timestamp(date: startTime),
            "endTime": Timestamp(date: endTime),
            "packageType": "class",
            "classId": classId,
            "isClassBooking": true,
            "bookedAt": Timestamp(date: Date()),
            "orgId": orgId
        ]
        
        try await db.collection("trainers").document(trainerId)
            .collection("schedules").addDocument(data: bookingData)
    }
    
    // MARK: - User Management
    
    // Load all users (admin only)
    func loadAllUsers(orgId: String) async {
        guard isAdmin else {
            error = ServiceError.unauthorized
            return
        }
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            // Get org members with role 'client' only (exclude trainers, admins, owners)
            let membersSnapshot = try await db.collection("orgMembers")
                .whereField("orgId", isEqualTo: orgId)
                .whereField("role", isEqualTo: "client")
                .whereField("isActive", isEqualTo: true)
                .getDocuments()
            
            var users: [SimpleUser] = []
            
            for memberDoc in membersSnapshot.documents {
                let memberData = memberDoc.data()
                guard let userId = memberData["userId"] as? String else { continue }
                
                // Load user document
                if let userDoc = try? await db.collection("users").document(userId).getDocument(),
                   let data = userDoc.data() {
                    let firstName = data["firstName"] as? String ?? ""
                    let lastName = data["lastName"] as? String ?? ""
                    let athleteFirst = data["athleteFirstName"] as? String ?? ""
                    let athleteLast = data["athleteLastName"] as? String ?? ""
                    
                    users.append(SimpleUser(
                        id: userDoc.documentID,
                        firstName: firstName,
                        lastName: lastName,
                        athleteName: athleteFirst.isEmpty ? "" : "\(athleteFirst) \(athleteLast)".trimmingCharacters(in: .whitespaces)
                    ))
                }
            }
            
            items = users.sorted { $0.lastName < $1.lastName }
        } catch let catchError {
            error = ServiceError.networkError(catchError)
            items = []
        }
    }
    
    // MARK: - Pass Management
    
    // Add pass to client (admin only)
    // passType parameter should be the packageType (e.g., "private", "2_athlete"), not the title
    func addPassToClient(clientId: String, passType: String, totalLessons: Int) async throws {
        guard isAdmin else {
            throw ServiceError.unauthorized
        }
        
        // Get the user's orgId
        let userDoc = try await db.collection("users").document(clientId).getDocument()
        guard let orgId = userDoc.data()?["orgId"] as? String else {
            throw ServiceError.invalidData("User organization not found")
        }
        
        // Load pricing structure to get packageCategory
        let pricingDoc = try await db.collection("organizations").document(orgId)
            .collection("pricingStructure").document("current").getDocument()
        
        var packageCategory: String = "pass" // Default to pass for backward compatibility
        
        if let pricingData = pricingDoc.data(),
           let tiers = pricingData["tiers"] as? [[String: Any]] {
            // Search for the package in all tiers
            for tier in tiers {
                if let packages = tier["packages"] as? [[String: Any]] {
                    for package in packages {
                        if let pkgType = package["packageType"] as? String,
                           pkgType == passType,
                           let category = package["packageCategory"] as? String {
                            packageCategory = category
                            break
                        }
                    }
                }
            }
        }
        
        let now = Date()
        let expirationDate = Calendar.current.date(byAdding: .year, value: 1, to: now) ?? now.addingTimeInterval(365 * 24 * 60 * 60)
        
        let passData: [String: Any] = [
            "packageType": passType, // This must be packageType (e.g., "private"), not title
            "packageCategory": packageCategory, // "pass" or "class"
            "totalLessons": totalLessons,
            "lessonsUsed": 0,
            "purchaseDate": Timestamp(date: now),
            "expirationDate": Timestamp(date: expirationDate),
            "transactionId": "ADMIN_ADDED_\(UUID().uuidString)",
            "orgId": orgId
        ]
        
        try await db.collection("users")
            .document(clientId)
            .collection("lessonPackages")
            .addDocument(data: passData)
    }
    
    // Remove pass from client (admin only)
    func removePassFromClient(clientId: String, passType: String, lessonsToRemove: Int) async throws {
        guard isAdmin else {
            throw ServiceError.unauthorized
        }
        
        // Get all packages for this client and pass type
        let packagesSnapshot = try await db.collection("users")
            .document(clientId)
            .collection("lessonPackages")
            .whereField("packageType", isEqualTo: passType)
            .getDocuments()
        
        guard !packagesSnapshot.documents.isEmpty else {
            throw ServiceError.invalidData("No passes of this type found for client")
        }
        
        var remainingToRemove = lessonsToRemove
        
        // Remove from packages starting with those closest to expiration
        let sortedPackages = packagesSnapshot.documents.sorted { doc1, doc2 in
            let exp1 = (doc1.data()["expirationDate"] as? Timestamp)?.dateValue() ?? Date.distantFuture
            let exp2 = (doc2.data()["expirationDate"] as? Timestamp)?.dateValue() ?? Date.distantFuture
            return exp1 < exp2
        }
        
        for packageDoc in sortedPackages {
            guard remainingToRemove > 0 else { break }
            
            let data = packageDoc.data()
            let totalLessons = data["totalLessons"] as? Int ?? 0
            let lessonsUsed = data["lessonsUsed"] as? Int ?? 0
            let availableLessons = totalLessons - lessonsUsed
            
            if availableLessons <= 0 {
                continue // Skip packages with no available lessons
            }
            
            let lessonsToRemoveFromThisPackage = min(remainingToRemove, availableLessons)
            let newTotalLessons = totalLessons - lessonsToRemoveFromThisPackage
            
            // Update or delete the package
            if newTotalLessons <= lessonsUsed {
                // If removing would make total <= used, delete the package
                try await packageDoc.reference.delete()
            } else {
                // Update the package with reduced total
                try await packageDoc.reference.updateData([
                    "totalLessons": newTotalLessons
                ])
            }
            
            remainingToRemove -= lessonsToRemoveFromThisPackage
        }
        
        if remainingToRemove > 0 {
            throw ServiceError.invalidData("Client only has \(lessonsToRemove - remainingToRemove) available passes of this type")
        }
    }
    
    // MARK: - Organization Billing
    
    // Fetch organization billing info
    func fetchOrganizationBilling(orgId: String) async -> OrganizationBilling? {
        do {
            let doc = try await db.collection("organizations").document(orgId).getDocument()
            guard doc.exists, let data = doc.data() else {
                return nil
            }
            
            // Extract billing info
            guard let billingData = data["billing"] as? [String: Any] else {
                return nil
            }
            
            let status = billingData["status"] as? String ?? "trialing"
            let plan = billingData["plan"] as? String ?? "free"
            let isActive = billingData["isActive"] as? Bool ?? true
            let isInGrace = billingData["isInGrace"] as? Bool ?? false
            
            return OrganizationBilling(
                status: status,
                plan: plan,
                trialEndsAt: (billingData["trialEndsAt"] as? Timestamp)?.dateValue(),
                currentPeriodEnd: (billingData["currentPeriodEnd"] as? Timestamp)?.dateValue(),
                graceEndsAt: (billingData["graceEndsAt"] as? Timestamp)?.dateValue(),
                stripeCustomerId: billingData["stripeCustomerId"] as? String,
                stripeSubscriptionId: billingData["stripeSubscriptionId"] as? String,
                isActive: isActive,
                isInGrace: isInGrace
            )
        } catch let catchError {
            error = ServiceError.networkError(catchError)
            return nil
        }
    }
}

// MARK: - Supporting Models

// Organization billing structure
struct OrganizationBilling {
    var status: String
    var plan: String
    var trialEndsAt: Date?
    var currentPeriodEnd: Date?
    var graceEndsAt: Date?
    var stripeCustomerId: String?
    var stripeSubscriptionId: String?
    var isActive: Bool
    var isInGrace: Bool
    
    var planTier: String {
        plan
    }
    
    var locationLimit: Int {
        switch plan.lowercased() {
        case "free", "starter":
            return 1
        case "studio":
            return 2
        case "academy":
            return 5
        case "enterprise":
            return 999
        default:
            return 1
        }
    }
}

// Simple user model for admin dropdown
struct SimpleUser: Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let athleteName: String
}
