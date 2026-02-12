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

enum AdminServiceError: Error, LocalizedError {
    case notAuthenticated
    case notAuthorized
    case missingOrgId
    case invalidInput(String)
    case classNotFound
    case userNotFound
    case operationFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in"
        case .notAuthorized:
            return "You do not have permission to perform this action"
        case .missingOrgId:
            return "Organization ID is required"
        case .invalidInput(let message):
            return message
        case .classNotFound:
            return "Class not found"
        case .userNotFound:
            return "User not found"
        case .operationFailed(let message):
            return "Operation failed: \(message)"
        }
    }
}

@MainActor
final class AdminService: ObservableObject {
    @Published private(set) var isAdmin = false
    @Published private(set) var isLoading = false
    @Published private(set) var allUsers: [SimpleUser] = []
    @Published private(set) var organizationData: [String: Any]?
    
    private let db = Firestore.firestore()
    
    // Check if current user is admin
    func checkAdminStatus() async {
        guard let uid = Auth.auth().currentUser?.uid else {
            isAdmin = false
            return
        }
        
        isLoading = true
        
        do {
            // First, check orgMembers collection for admin/owner role (preferred method)
            let snapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: uid)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first {
                let data = doc.data()
                let role = data["role"] as? String ?? ""
                isAdmin = (role == "admin" || role == "owner" || role == "trainer")
                
                // Load organization data if admin
                if isAdmin, let orgId = data["orgId"] as? String {
                    await loadOrganizationData(orgId: orgId)
                }
                
                isLoading = false
                return
            }
            
            // Fallback 1: Check trainers collection (for trainers who don't have orgMembers doc)
            let trainerDoc = try await db.collection("trainers").document(uid).getDocument()
            if trainerDoc.exists {
                let data = trainerDoc.data() ?? [:]
                let isActive = data["isActive"] as? Bool ?? true
                if isActive {
                    isAdmin = true
                    
                    // Load organization data if orgId exists
                    if let orgId = data["orgId"] as? String {
                        await loadOrganizationData(orgId: orgId)
                    }
                    
                    isLoading = false
                    return
                }
            }
            
            // Fallback 2: Check isAdmin field in user document
            let userDoc = try await db.collection("users").document(uid).getDocument()
            
            if userDoc.exists {
                let data = userDoc.data() ?? [:]
                isAdmin = data["isAdmin"] as? Bool ?? false
                
                // Load organization data if admin and orgId exists
                if isAdmin, let orgId = data["orgId"] as? String {
                    await loadOrganizationData(orgId: orgId)
                }
            } else {
                isAdmin = false
            }
        } catch {
            isAdmin = false
        }
        
        isLoading = false
    }
    
    // Load organization data
    func loadOrganizationData(orgId: String) async {
        do {
            let doc = try await db.collection("organizations").document(orgId).getDocument()
            
            if doc.exists {
                organizationData = doc.data()
            }
        } catch {
            // Silently fail - not critical
        }
    }
    
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
        trainerName: String,
        priceInCents: Int,
        eligiblePackageIds: [String] = []
    ) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw AdminServiceError.notAuthenticated
        }
        
        guard isAdmin else {
            throw AdminServiceError.notAuthorized
        }
        
        guard !orgId.isEmpty else {
            throw AdminServiceError.missingOrgId
        }
        
        guard !title.isEmpty else {
            throw AdminServiceError.invalidInput("Class title is required")
        }
        
        guard maxParticipants > 0 else {
            throw AdminServiceError.invalidInput("Max participants must be greater than 0")
        }
        
        guard endTime > startTime else {
            throw AdminServiceError.invalidInput("End time must be after start time")
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
            "createdAt": Timestamp(date: Date()),
            "priceInCents": priceInCents,
            "eligiblePackageIds": eligiblePackageIds
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
        
        // Activity logging handled by cloud functions
    }
    
    // Toggle class registration status
    func toggleClassRegistration(classId: String, isOpen: Bool) async throws {
        guard isAdmin else {
            throw AdminServiceError.notAuthorized
        }
        
        guard !classId.isEmpty else {
            throw AdminServiceError.invalidInput("Class ID is required")
        }
        
        try await db.collection("classes").document(classId)
            .updateData(["isOpenForRegistration": isOpen])
    }
    
    // Delete a class
    func deleteClass(classId: String, orgId: String) async throws {
        guard isAdmin else {
            throw AdminServiceError.notAuthorized
        }
        
        guard !classId.isEmpty else {
            throw AdminServiceError.invalidInput("Class ID is required")
        }
        
        // Get the class data FIRST to know which trainer to clean up
        let classDoc = try await db.collection("classes").document(classId).getDocument()
        guard let classData = classDoc.data() else {
            throw AdminServiceError.classNotFound
        }
        
        let trainerId = classData["trainerId"] as? String
        
        // Delete all participants subcollection documents first
        let participantsSnapshot = try await db.collection("classes")
            .document(classId)
            .collection("participants")
            .getDocuments()
        
        for participantDoc in participantsSnapshot.documents {
            try await participantDoc.reference.delete()
        }
        
        // Delete the class document
        try await db.collection("classes").document(classId).delete()
        
        // Remove class bookings from the assigned trainer's schedule
        if let trainerId = trainerId {
            let schedulesQuery = db.collection("trainers").document(trainerId)
                .collection("schedules")
                .whereField("classId", isEqualTo: classId)
                .whereField("isClassBooking", isEqualTo: true)
            
            let schedulesSnapshot = try await schedulesQuery.getDocuments()
            
            for scheduleDoc in schedulesSnapshot.documents {
                try await scheduleDoc.reference.delete()
            }
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
        trainerName: String,
        priceInCents: Int
    ) async throws {
        guard isAdmin else {
            throw AdminServiceError.notAuthorized
        }
        
        guard !classId.isEmpty else {
            throw AdminServiceError.invalidInput("Class ID is required")
        }
        
        guard !title.isEmpty else {
            throw AdminServiceError.invalidInput("Class title is required")
        }
        
        guard maxParticipants > 0 else {
            throw AdminServiceError.invalidInput("Max participants must be greater than 0")
        }
        
        guard endTime > startTime else {
            throw AdminServiceError.invalidInput("End time must be after start time")
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
            "trainerName": trainerName,
            "priceInCents": priceInCents
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
    
    // Load all users (admin only)
    func loadAllUsers(orgId: String) async {
        guard !orgId.isEmpty else {
            allUsers = []
            return
        }
        
        do {
            // Query users directly by orgId (same as fetchTrainerClients)
            let usersSnapshot = try await db.collection("users")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            
            // Get staff IDs to exclude
            let trainersSnapshot = try await db.collection("trainers")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            let trainerIds = Set(trainersSnapshot.documents.map { $0.documentID })
            
            let orgMembersSnapshot = try await db.collection("orgMembers")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            let staffUserIds = Set(orgMembersSnapshot.documents.compactMap { doc -> String? in
                let role = doc.data()["role"] as? String ?? "client"
                if role == "trainer" || role == "admin" || role == "owner" {
                    return doc.data()["userId"] as? String
                }
                return nil
            })
            
            // Map users, excluding staff
            allUsers = usersSnapshot.documents.compactMap { doc in
                // Skip staff
                if trainerIds.contains(doc.documentID) || staffUserIds.contains(doc.documentID) {
                    return nil
                }
                
                let data = doc.data()
                let firstName = data["firstName"] as? String ?? ""
                let lastName = data["lastName"] as? String ?? ""
                let athleteFirst = data["athleteFirstName"] as? String ?? ""
                let athleteLast = data["athleteLastName"] as? String ?? ""
                
                let athleteName = [athleteFirst, athleteLast]
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                    .joined(separator: " ")
                
                return SimpleUser(
                    id: doc.documentID,
                    firstName: firstName,
                    lastName: lastName,
                    athleteName: athleteName
                )
            }.sorted { $0.lastName < $1.lastName }
        } catch {
            allUsers = []
        }
    }
    
    // Add pass to client (admin only)
    // passType parameter should be the packageType (e.g., "private", "2_athlete"), not the title
    func addPassToClient(clientId: String, passType: String, totalLessons: Int) async throws {
        guard isAdmin else {
            throw AdminServiceError.notAuthorized
        }
        
        guard !clientId.isEmpty else {
            throw AdminServiceError.invalidInput("Client ID is required")
        }
        
        guard !passType.isEmpty else {
            throw AdminServiceError.invalidInput("Pass type is required")
        }
        
        guard totalLessons > 0 else {
            throw AdminServiceError.invalidInput("Total lessons must be greater than 0")
        }
        
        // Get the user's orgId
        let userDoc = try await db.collection("users").document(clientId).getDocument()
        guard let orgId = userDoc.data()?["orgId"] as? String else {
            throw AdminServiceError.userNotFound
        }
        
        // Load pricing structure to get packageCategory and packageName
        let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
        guard let orgData = orgDoc.data(),
              let pricingData = orgData["pricingStructure"] as? [String: Any] else {
            throw AdminServiceError.operationFailed("Pricing structure not found")
        }
        
        var packageCategory: String = "pass" // Default to pass for backward compatibility
        var packageName: String? = nil
        var expirationDays: Int = 365 // Default to 1 year
        
        if let tiers = pricingData["tiers"] as? [[String: Any]] {
            // Search for the package in all tiers
            for tier in tiers {
                if let packages = tier["packages"] as? [[String: Any]] {
                    for package in packages {
                        if let pkgType = package["packageType"] as? String,
                           pkgType == passType {
                            if let category = package["packageCategory"] as? String {
                                packageCategory = category
                            }
                            if let title = package["title"] as? String {
                                packageName = title
                            }
                            if let expDays = package["expirationDays"] as? Int {
                                expirationDays = expDays
                            }
                            break
                        }
                    }
                }
            }
        }
        
        let now = Date()
        let expirationDate = Calendar.current.date(byAdding: .day, value: expirationDays, to: now) ?? now.addingTimeInterval(Double(expirationDays) * 24 * 60 * 60)
        
        var passData: [String: Any] = [
            "packageType": passType, // This must be packageType (e.g., "private"), not title
            "packageCategory": packageCategory, // "pass" or "class"
            "totalLessons": totalLessons,
            "lessonsUsed": 0,
            "purchaseDate": Timestamp(date: now),
            "expirationDate": Timestamp(date: expirationDate),
            "transactionId": "ADMIN_ADDED_\(UUID().uuidString)",
            "orgId": orgId
        ]
        
        // Add packageName if found
        if let packageName = packageName {
            passData["packageName"] = packageName
        }
        
        // Write to BOTH locations for compatibility:
        // 1. Old path (backward compatibility for users not in orgs or old client apps)
        try await db.collection("users")
            .document(clientId)
            .collection("lessonPackages")
            .addDocument(data: passData)
        
        // 2. New path (organizations/{orgId}/users/{userId}/packages) - where modern client apps read
        try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(clientId)
            .collection("packages")
            .addDocument(data: passData)
    }
    
    // Remove pass from client (admin only)
    func removePassFromClient(clientId: String, passType: String, lessonsToRemove: Int) async throws {
        guard isAdmin else {
            throw AdminServiceError.notAuthorized
        }
        
        guard !clientId.isEmpty else {
            throw AdminServiceError.invalidInput("Client ID is required")
        }
        
        guard !passType.isEmpty else {
            throw AdminServiceError.invalidInput("Pass type is required")
        }
        
        guard lessonsToRemove > 0 else {
            throw AdminServiceError.invalidInput("Lessons to remove must be greater than 0")
        }
        
        // Get all packages for this client and pass type
        let packagesSnapshot = try await db.collection("users")
            .document(clientId)
            .collection("lessonPackages")
            .whereField("packageType", isEqualTo: passType)
            .getDocuments()
        
        guard !packagesSnapshot.documents.isEmpty else {
            throw AdminServiceError.operationFailed("No passes of this type found for client")
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
            throw AdminServiceError.operationFailed("Client only has \(lessonsToRemove - remainingToRemove) available passes of this type")
        }
    }
    
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
        } catch {
            return nil
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
