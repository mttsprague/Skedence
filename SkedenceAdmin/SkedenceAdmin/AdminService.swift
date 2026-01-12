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
    @Published private(set) var isAdmin = false
    @Published private(set) var isLoading = false
    @Published private(set) var allUsers: [SimpleUser] = []
    @Published private(set) var organizationData: [String: Any]?
    
    private let db = Firestore.firestore()
    
    // Check if current user is admin
    func checkAdminStatus() async {
        guard let uid = Auth.auth().currentUser?.uid else {
            print("❌ No current user UID")
            isAdmin = false
            return
        }
        
        print("🔍 Checking admin status for UID: \(uid)")
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
                isAdmin = (role == "admin" || role == "owner")
                print("✅ User role from orgMembers: \(role), isAdmin = \(isAdmin)")
                
                // Load organization data if admin
                if isAdmin, let orgId = data["orgId"] as? String {
                    await loadOrganizationData(orgId: orgId)
                }
                
                isLoading = false
                return
            }
            
            // Fallback: Check isAdmin field in user document
            print("⚠️ No active orgMember found, checking user document...")
            let userDoc = try await db.collection("users").document(uid).getDocument()
            
            if userDoc.exists {
                let data = userDoc.data() ?? [:]
                isAdmin = data["isAdmin"] as? Bool ?? false
                print("✅ isAdmin from user document: \(isAdmin)")
                
                // Load organization data if admin and orgId exists
                if isAdmin, let orgId = data["orgId"] as? String {
                    await loadOrganizationData(orgId: orgId)
                }
            } else {
                print("❌ User document does not exist for UID: \(uid)")
                isAdmin = false
            }
        } catch {
            print("❌ Error checking admin status: \(error)")
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
                print("✅ Loaded organization data for: \(orgId)")
            } else {
                print("❌ Organization document does not exist: \(orgId)")
            }
        } catch {
            print("❌ Error loading organization data: \(error.localizedDescription)")
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
        trainerName: String
    ) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Not signed in"])
        }
        
        guard isAdmin else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Unauthorized"])
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
        
        // Fetch all trainers for this org
        let trainersSnapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        
        // Create a booking in ALL trainers' schedules to block off the time
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
        
        // Add slot to all trainers' schedules
        for trainerDoc in trainersSnapshot.documents {
            try await db.collection("trainers").document(trainerDoc.documentID)
                .collection("schedules").addDocument(data: bookingData)
        }
    }
    
    // Toggle class registration status
    func toggleClassRegistration(classId: String, isOpen: Bool) async throws {
        guard isAdmin else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Unauthorized"])
        }
        
        try await db.collection("classes").document(classId)
            .updateData(["isOpenForRegistration": isOpen])
    }
    
    // Delete a class
    func deleteClass(classId: String, orgId: String) async throws {
        guard isAdmin else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Unauthorized"])
        }
        
        // Delete the class document
        try await db.collection("classes").document(classId).delete()
        
        // Remove class bookings from all trainers' schedules
        let trainersSnapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        
        for trainerDoc in trainersSnapshot.documents {
            let schedulesQuery = db.collection("trainers").document(trainerDoc.documentID)
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
        trainerName: String
    ) async throws {
        guard isAdmin else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Unauthorized"])
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
        
        // Remove old bookings from all trainers' schedules
        let trainersSnapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        
        for trainerDoc in trainersSnapshot.documents {
            let schedulesQuery = db.collection("trainers").document(trainerDoc.documentID)
                .collection("schedules")
                .whereField("classId", isEqualTo: classId)
                .whereField("isClassBooking", isEqualTo: true)
            
            let schedulesSnapshot = try await schedulesQuery.getDocuments()
            
            for scheduleDoc in schedulesSnapshot.documents {
                try await scheduleDoc.reference.delete()
            }
        }
        
        // Create new bookings on all trainers' schedules with updated times
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
        
        for trainerDoc in trainersSnapshot.documents {
            try await db.collection("trainers").document(trainerDoc.documentID)
                .collection("schedules").addDocument(data: bookingData)
        }
    }
    
    // Load all users (admin only)
    func loadAllUsers(orgId: String) async {
        guard isAdmin else { return }
        
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
            
            allUsers = users.sorted { $0.lastName < $1.lastName }
            print("✅ Loaded \(allUsers.count) client users (excluding trainers)")
        } catch {
            print("Error loading users: \(error)")
            allUsers = []
        }
    }
    
    // Add pass to client (admin only)
    // passType parameter should be the packageType (e.g., "private", "2_athlete"), not the title
    func addPassToClient(clientId: String, passType: String, totalLessons: Int) async throws {
        guard isAdmin else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Unauthorized"])
        }
        
        // Get the user's orgId
        let userDoc = try await db.collection("users").document(clientId).getDocument()
        guard let orgId = userDoc.data()?["orgId"] as? String else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "User organization not found"])
        }
        
        let now = Date()
        let expirationDate = Calendar.current.date(byAdding: .year, value: 1, to: now) ?? now.addingTimeInterval(365 * 24 * 60 * 60)
        
        let passData: [String: Any] = [
            "packageType": passType, // This must be packageType (e.g., "private"), not title
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
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Unauthorized"])
        }
        
        // Get all packages for this client and pass type
        let packagesSnapshot = try await db.collection("users")
            .document(clientId)
            .collection("lessonPackages")
            .whereField("packageType", isEqualTo: passType)
            .getDocuments()
        
        guard !packagesSnapshot.documents.isEmpty else {
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "No passes of this type found for client"])
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
            throw NSError(domain: "AdminService", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Client only has \(lessonsToRemove - remainingToRemove) available passes of this type"])
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
            print("❌ Error fetching organization billing: \(error)")
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
