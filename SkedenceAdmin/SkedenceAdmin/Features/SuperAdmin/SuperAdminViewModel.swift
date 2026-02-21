//
//  SuperAdminViewModel.swift
//  SkedenceAdmin
//
//  ViewModels for Super Admin functionality
//

import Foundation
import FirebaseFirestore
import FirebaseAuth
import FirebaseFunctions
import Combine

// MARK: - Main SuperAdmin ViewModel

@MainActor
class SuperAdminViewModel: ObservableObject {
    @Published var organizations: [Organization] = []
    @Published var trainers: [AdminTrainer] = []
    @Published var allUsers: [AdminUser] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    private var currentOrgId: String?
    
    func loadOrganizations() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Get current user's org ID
            guard let userId = Auth.auth().currentUser?.uid else {
                errorMessage = "Not authenticated"
                isLoading = false
                return
            }
            
            // Query orgMembers to find user's organization
            // Use authUserId field (Firebase Auth UID) instead of userId (name-based)
            let memberSnapshot = try await db.collection("orgMembers")
                .whereField("authUserId", isEqualTo: userId)
                .limit(to: 1)
                .getDocuments()
            
            guard let memberDoc = memberSnapshot.documents.first,
                  let orgId = memberDoc.data()["orgId"] as? String,
                  !orgId.isEmpty else {
                errorMessage = "No organization found"
                isLoading = false
                return
            }
            
            currentOrgId = orgId
            
            // Load the organization
            let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
            if let data = orgDoc.data() {
                // Extract nested billing fields
                let billing = data["billing"] as? [String: Any] ?? [:]
                let stripe = data["stripe"] as? [String: Any] ?? [:]
                
                organizations = [Organization(
                    id: orgDoc.documentID,
                    name: data["name"] as? String ?? "Unknown",
                    subscriptionPlan: billing["plan"] as? String,
                    subscriptionStatus: billing["status"] as? String,
                    stripeAccountId: stripe["connectAccountId"] as? String,
                    stripeCustomerId: billing["customerId"] as? String
                )]
            }
            
        } catch {
            errorMessage = "Failed to load organizations: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func loadTrainers(orgId: String? = nil) async {
        isLoading = true
        errorMessage = nil
        
        do {
            var query: Query = db.collection("trainers")
            
            // Filter by orgId if provided
            if let orgId = orgId {
                query = query.whereField("orgId", isEqualTo: orgId)
            } else {
            }
            
            let snapshot = try await query.getDocuments()
            trainers = snapshot.documents.compactMap { doc in
                let data = doc.data()
                
                // Only show active trainers in the Trainers tab
                let isActive = data["active"] as? Bool ?? true
                guard isActive else {
                    return nil
                }
                
                let firstName = data["firstName"] as? String ?? ""
                let lastName = data["lastName"] as? String ?? ""
                
                return AdminTrainer(
                    id: doc.documentID,
                    firstName: firstName,
                    lastName: lastName,
                    email: data["email"] as? String,
                    orgId: data["orgId"] as? String,
                    organizationName: nil, // Will be populated separately if needed
                    role: data["role"] as? String,
                    active: data["active"] as? Bool
                )
            }
        } catch {
            errorMessage = "Failed to load trainers: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func loadAllUsers() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Get current user's org to filter users
            guard let userId = Auth.auth().currentUser?.uid else {
                errorMessage = "Not authenticated"
                isLoading = false
                return
            }
            
            // Query orgMembers to find user's org if not already loaded
            // Use authUserId field (Firebase Auth UID) instead of userId (name-based)
            if currentOrgId == nil {
                let memberSnapshot = try await db.collection("orgMembers")
                    .whereField("authUserId", isEqualTo: userId)
                    .limit(to: 1)
                    .getDocuments()
                
                if let memberDoc = memberSnapshot.documents.first {
                    currentOrgId = memberDoc.data()["orgId"] as? String
                }
            }
            
            guard let orgId = currentOrgId, !orgId.isEmpty else {
                errorMessage = "No organization found"
                isLoading = false
                return
            }
            
            // Query orgMembers to find users in the same org
            let membersSnapshot = try await db.collection("orgMembers")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            
            var users: [AdminUser] = []
            
            for memberDoc in membersSnapshot.documents {
                let memberData = memberDoc.data()
                guard let memberId = memberData["userId"] as? String, !memberId.isEmpty else {
                    continue
                }
                
                // Get authUserId for orgMembers document ID construction
                guard let authUserId = memberData["authUserId"] as? String else {
                    continue
                }
                
                // Members tab should only show staff: trainers, admins, owners (NOT clients)
                // NOTE: Staff are stored in trainers collection, clients in users collection
                let role = memberData["role"] as? String ?? "client"
                let isActive = memberData["isActive"] as? Bool ?? true
                if role == "client" {
                    continue
                }
                
                
                // Staff (trainers/admins/owners) are in trainers collection
                // The userId in orgMembers should be the trainer document ID
                var firstName = ""
                var lastName = ""
                var email: String?
                var foundTrainerDoc = false
                
                // First, try to find trainer by the memberId (which should be trainerId)
                // Use silent error handling to avoid permission errors for non-existent docs
                do {
                    let trainerDoc = try await db.collection("trainers").document(memberId).getDocument()
                    if trainerDoc.exists, let trainerData = trainerDoc.data() {
                        firstName = trainerData["firstName"] as? String ?? ""
                        lastName = trainerData["lastName"] as? String ?? ""
                        email = trainerData["email"] as? String ?? trainerData["emailAddress"] as? String
                        foundTrainerDoc = true
                    }
                } catch {
                    // Document doesn't exist or permission denied - this is expected for non-trainers
                }
                
                // Fallback: If trainer doc not found by memberId, search by Firebase Auth UID
                // This handles legacy data where trainers might still have user documents
                if !foundTrainerDoc {
                    do {
                        let trainerQuery = try await db.collection("trainers")
                            .whereField("userId", isEqualTo: memberId)
                            .limit(to: 1)
                            .getDocuments()
                        
                        if let trainerDoc = trainerQuery.documents.first {
                            let trainerData = trainerDoc.data()
                            firstName = trainerData["firstName"] as? String ?? ""
                            lastName = trainerData["lastName"] as? String ?? ""
                            email = trainerData["email"] as? String ?? trainerData["emailAddress"] as? String
                            foundTrainerDoc = true
                        }
                    } catch {
                        // Query failed - this is expected if no matching trainer exists
                    }
                }
                
                // If no trainer doc found, use data from orgMember document
                if !foundTrainerDoc {
                    // For non-trainers (admins/owners), we might not have a trainer doc
                    // Use whatever info we have from the orgMember doc
                    firstName = memberData["firstName"] as? String ?? ""
                    lastName = memberData["lastName"] as? String ?? ""
                    email = memberData["email"] as? String ?? memberData["emailAddress"] as? String
                    
                    if firstName.isEmpty && lastName.isEmpty && email == nil {
                        continue
                    }
                }
                
                
                users.append(AdminUser(
                    id: memberId,
                    authUserId: authUserId,
                    firstName: firstName,
                    lastName: lastName,
                    emailAddress: email,
                    orgId: orgId,
                    organizationName: nil,
                    role: role,
                    isActive: isActive
                ))
            }
            
            allUsers = users
        } catch {
            errorMessage = "Failed to load users: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func updateUserRole(userId: String, orgId: String, newRole: String) async {
        guard !userId.isEmpty, !orgId.isEmpty else {
            return
        }
        
        do {
            // Find the user to get their authUserId
            guard let user = allUsers.first(where: { $0.id == userId }) else {
                errorMessage = "User not found"
                return
            }
            
            // Use auth-based pattern: {authUserId}_{orgId}
            let memberDocId = "\(user.authUserId)_\(orgId)"
            try await db.collection("orgMembers").document(memberDocId).updateData([
                "role": newRole
            ])
            
            await loadAllUsers() // Refresh list
        } catch {
            errorMessage = "Failed to update role: \(error.localizedDescription)"
        }
    }
    
    func deactivateTrainer(trainerId: String, orgId: String?) async {
        do {
            // Update trainer document to set active = false
            try await db.collection("trainers").document(trainerId).updateData([
                "active": false
            ])
            
            // Also update the orgMembers document
            if let orgId = orgId {
                let memberDocId = "\(trainerId)_\(orgId)"
                try await db.collection("orgMembers").document(memberDocId).updateData([
                    "isActive": false
                ])
            }
            
            await loadTrainers(orgId: orgId) // Refresh trainers list
            await loadAllUsers() // Refresh users list to show in Members tab
        } catch {
            errorMessage = "Failed to deactivate trainer: \(error.localizedDescription)"
        }
    }
}

// MARK: - Create Organization ViewModel

@MainActor
class CreateOrgViewModel: ObservableObject {
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    
    func createOrganization(
        name: String,
        plan: String,
        isFree: Bool,
        ownerEmail: String,
        ownerFirstName: String,
        ownerLastName: String
    ) async -> String? {
        errorMessage = nil
        
        do {
            // Create organization
            let orgRef = db.collection("organizations").document()
            let orgId = orgRef.documentID
            
            guard !orgId.isEmpty else {
                errorMessage = "Failed to generate organization ID"
                return nil
            }
            
            // Generate unique invite code
            let inviteCode = await generateUniqueInviteCode()
            
            let orgData: [String: Any] = [
                "name": name,
                "subscriptionPlan": plan,
                "subscriptionStatus": isFree ? "active" : "trialing",
                "disabled": false,
                "createdAt": Timestamp(),
                "inviteCode": inviteCode,
                "inviteCodeCreatedAt": Timestamp(),
                "billing": [
                    "isActive": true,
                    "isFree": isFree
                ]
            ]
            
            try await orgRef.setData(orgData)
            
            // Create owner user (if provided)
            if !ownerEmail.isEmpty {
                let userId = UUID().uuidString
                
                let firstName = ownerFirstName.isEmpty ? "Owner" : ownerFirstName
                let lastName = ownerLastName.isEmpty ? "" : ownerLastName
                
                // Generate reference code
                let referenceCode = try await ReferenceCodeGenerator.generateUserCode(
                    firstName: firstName,
                    lastName: lastName
                )
                
                let userData: [String: Any] = [
                    "emailAddress": ownerEmail,
                    "referenceCode": referenceCode,
                    "firstName": firstName,
                    "lastName": lastName,
                    "orgId": orgId,
                    "active": true,
                    "createdAt": Timestamp(),
                    "updatedAt": Timestamp()
                ]
                
                try await db.collection("users").document(userId).setData(userData)
                
                // Create orgMembers entry
                let memberData: [String: Any] = [
                    "userId": userId,
                    "orgId": orgId,
                    "role": "owner",
                    "isActive": true,
                    "joinedAt": Timestamp()
                ]
                
                try await db.collection("orgMembers")
                    .document("\(userId)_\(orgId)")
                    .setData(memberData)
            }
            
            return orgId
        } catch {
            errorMessage = "Failed to create organization: \(error.localizedDescription)"
            return nil
        }
    }
    
    // MARK: - Invite Code Generation
    
    /// Generate a random 6-character alphanumeric invite code
    /// Excludes similar characters (O/0, I/1) to avoid confusion
    private func generateInviteCode() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude O, 0, I, 1
        return String((0..<6).map { _ in chars.randomElement()! })
    }
    
    /// Check if an invite code already exists in Firestore
    private func codeExists(_ code: String) async -> Bool {
        do {
            let snapshot = try await db.collection("organizations")
                .whereField("inviteCode", isEqualTo: code)
                .limit(to: 1)
                .getDocuments()
            return !snapshot.documents.isEmpty
        } catch {
            return false
        }
    }
    
    /// Generate a unique invite code by checking against existing codes
    private func generateUniqueInviteCode() async -> String {
        var code = generateInviteCode()
        var attempts = 0
        let maxAttempts = 10
        
        while await codeExists(code) && attempts < maxAttempts {
            code = generateInviteCode()
            attempts += 1
        }
        
        if attempts >= maxAttempts {
        }
        
        return code
    }
}

// MARK: - Add Trainer ViewModel

@MainActor
class AddTrainerViewModel: ObservableObject {
    @Published var organizations: [Organization] = []
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    
    func loadOrganizations() async {
        do {
            let snapshot = try await db.collection("organizations").getDocuments()
            organizations = snapshot.documents.compactMap { doc in
                let data = doc.data()
                return Organization(
                    id: doc.documentID,
                    name: data["name"] as? String ?? "Unknown",
                    subscriptionPlan: data["subscriptionPlan"] as? String,
                    subscriptionStatus: data["subscriptionStatus"] as? String,
                    stripeAccountId: data["stripeAccountId"] as? String,
                    stripeCustomerId: data["stripeCustomerId"] as? String
                )
            }
        } catch {
            errorMessage = "Failed to load organizations: \(error.localizedDescription)"
        }
    }
    
    func addTrainer(
        orgId: String,
        email: String,
        firstName: String,
        lastName: String,
        role: String
    ) async -> String? {
        errorMessage = nil
        
        do {
            // NOTE: Trainers are NOT added to users collection
            // Users collection is for clients only
            // Trainers go in trainers collection and orgMembers
            
            // Generate a unique ID for this trainer based on name
            let trainerId = try await IDGenerator.generateTrainerId(firstName: firstName, lastName: lastName)
            let trainerRef = db.collection("trainers").document(trainerId)
            
            guard !trainerId.isEmpty else {
                errorMessage = "Failed to generate trainer ID"
                return nil
            }
            
            // Use trainerId as the userId for orgMembers (trainers don't need separate user docs)
            let userId = trainerId
            
            // Generate secure setup token (valid for 7 days)
            let setupToken = UUID().uuidString
            let setupTokenExpiry = Date().addingTimeInterval(7 * 24 * 60 * 60) // 7 days
            
            // Create trainer document (already have trainerRef from above)
            let trainerData: [String: Any] = [
                "firstName": firstName,
                "lastName": lastName,
                "email": email,
                "orgId": orgId,
                "emailAddress": email,
                "needsPasswordSetup": true,
                "setupToken": setupToken,
                "setupTokenExpiry": Timestamp(date: setupTokenExpiry),
                "active": true,
                "createdAt": Timestamp()
            ]
            
            try await trainerRef.setData(trainerData)
            
            // Create orgMembers entry
            guard !userId.isEmpty, !orgId.isEmpty else {
                errorMessage = "Invalid user or org ID"
                return nil
            }
            
            let memberData: [String: Any] = [
                "userId": userId,
                "orgId": orgId,
                "role": role,
                "isActive": true,
                "joinedAt": Timestamp()
            ]
            
            try await db.collection("orgMembers")
                .document("\(userId)_\(orgId)")
                .setData(memberData)
            
            // The trainer will receive an invitation email via Cloud Function
            // triggered when the trainer document is created
            
            return trainerId
        } catch {
            errorMessage = "Failed to add trainer: \(error.localizedDescription)"
            return nil
        }
    }
}

// MARK: - Models

struct Organization: Identifiable {
    var id: String?
    let name: String
    let subscriptionPlan: String?
    let subscriptionStatus: String?
    let stripeAccountId: String?
    let stripeCustomerId: String?
}

struct AdminTrainer: Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String?
    let orgId: String?
    var organizationName: String?
    let role: String?
    let active: Bool?
    
    var displayName: String {
        "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
    }
}

struct AdminUser: Identifiable {
    let id: String
    let authUserId: String // Firebase Auth UID for orgMembers queries
    let firstName: String
    let lastName: String
    let emailAddress: String?
    let orgId: String
    var organizationName: String?
    var role: String?
    var isActive: Bool?
}
