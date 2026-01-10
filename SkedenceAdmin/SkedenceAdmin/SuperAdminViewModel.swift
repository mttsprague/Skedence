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
            let memberSnapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: userId)
                .limit(to: 1)
                .getDocuments()
            
            guard let memberDoc = memberSnapshot.documents.first,
                  let orgId = memberDoc.data()["orgId"] as? String else {
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
            
            print("✅ Loaded organization: \(orgId)")
        } catch {
            errorMessage = "Failed to load organizations: \(error.localizedDescription)"
            print("❌ Error loading organizations: \(error)")
        }
        
        isLoading = false
    }
    
    func loadTrainers() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let snapshot = try await db.collection("trainers").getDocuments()
            trainers = snapshot.documents.compactMap { doc in
                let data = doc.data()
                
                return AdminTrainer(
                    id: doc.documentID,
                    firstName: data["firstName"] as? String ?? "",
                    lastName: data["lastName"] as? String ?? "",
                    email: data["email"] as? String,
                    orgId: data["orgId"] as? String,
                    organizationName: nil, // Will be populated separately if needed
                    role: data["role"] as? String,
                    active: data["active"] as? Bool
                )
            }
            print("✅ Loaded \(trainers.count) trainers")
        } catch {
            errorMessage = "Failed to load trainers: \(error.localizedDescription)"
            print("❌ Error loading trainers: \(error)")
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
            if currentOrgId == nil {
                let memberSnapshot = try await db.collection("orgMembers")
                    .whereField("userId", isEqualTo: userId)
                    .limit(to: 1)
                    .getDocuments()
                
                if let memberDoc = memberSnapshot.documents.first {
                    currentOrgId = memberDoc.data()["orgId"] as? String
                }
            }
            
            guard let orgId = currentOrgId else {
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
                guard let memberId = memberData["userId"] as? String else { continue }
                
                // Load user document
                if let userDoc = try? await db.collection("users").document(memberId).getDocument(),
                   let userData = userDoc.data() {
                    
                    users.append(AdminUser(
                        id: userDoc.documentID,
                        firstName: userData["firstName"] as? String ?? "",
                        lastName: userData["lastName"] as? String ?? "",
                        emailAddress: userData["emailAddress"] as? String ?? userData["email"] as? String,
                        orgId: userData["orgId"] as? String ?? orgId,
                        organizationName: nil,
                        role: memberData["role"] as? String
                    ))
                }
            }
            
            allUsers = users
            print("✅ Loaded \(allUsers.count) users")
        } catch {
            errorMessage = "Failed to load users: \(error.localizedDescription)"
            print("❌ Error loading users: \(error)")
        }
        
        isLoading = false
    }
    
    func updateUserRole(userId: String, orgId: String, newRole: String) async {
        do {
            let memberDocId = "\(userId)_\(orgId)"
            try await db.collection("orgMembers").document(memberDocId).updateData([
                "role": newRole
            ])
            
            print("✅ Updated user \(userId) role to \(newRole)")
            await loadAllUsers() // Refresh list
        } catch {
            errorMessage = "Failed to update role: \(error.localizedDescription)"
            print("❌ Error updating role: \(error)")
        }
    }
    
    func deleteTrainer(trainerId: String) async {
        do {
            // Call Cloud Function to delete trainer and all associated data
            let functions = Functions.functions()
            let callable = functions.httpsCallable("deleteTrainer")
            
            let result = try await callable.call(["trainerId": trainerId])
            
            if let data = result.data as? [String: Any],
               let success = data["success"] as? Bool,
               success {
                print("✅ Successfully deleted trainer: \(trainerId)")
                await loadTrainers() // Refresh trainers list
                await loadAllUsers() // Refresh users list as well
            } else {
                let message = (result.data as? [String: Any])?["message"] as? String ?? "Unknown error"
                errorMessage = "Failed to delete trainer: \(message)"
                print("❌ Error deleting trainer: \(message)")
            }
        } catch {
            errorMessage = "Failed to delete trainer: \(error.localizedDescription)"
            print("❌ Error deleting trainer: \(error)")
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
            
            let orgData: [String: Any] = [
                "name": name,
                "subscriptionPlan": plan,
                "subscriptionStatus": isFree ? "active" : "trialing",
                "disabled": false,
                "createdAt": Timestamp(),
                "billing": [
                    "isActive": true,
                    "isFree": isFree
                ]
            ]
            
            try await orgRef.setData(orgData)
            print("✅ Created organization: \(orgId)")
            
            // Create owner user (if provided)
            if !ownerEmail.isEmpty {
                let userId = UUID().uuidString
                
                let userData: [String: Any] = [
                    "emailAddress": ownerEmail,
                    "firstName": ownerFirstName.isEmpty ? "Owner" : ownerFirstName,
                    "lastName": ownerLastName.isEmpty ? "" : ownerLastName,
                    "orgId": orgId,
                    "active": true,
                    "createdAt": Timestamp(),
                    "updatedAt": Timestamp()
                ]
                
                try await db.collection("users").document(userId).setData(userData)
                print("✅ Created owner user: \(userId)")
                
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
                print("✅ Created orgMember: \(userId)_\(orgId)")
            }
            
            return orgId
        } catch {
            errorMessage = "Failed to create organization: \(error.localizedDescription)"
            print("❌ Error creating organization: \(error)")
            return nil
        }
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
            // Check if user already exists with this email
            let userQuery = try await db.collection("users")
                .whereField("emailAddress", isEqualTo: email)
                .limit(to: 1)
                .getDocuments()
            
            var userId: String
            var isNewUser = false
            
            if let existingUserDoc = userQuery.documents.first {
                // User already exists
                userId = existingUserDoc.documentID
                print("✅ Found existing user: \(userId)")
                
                // Update user with orgId
                try await db.collection("users").document(userId).updateData([
                    "orgId": orgId,
                    "updatedAt": Timestamp()
                ])
            } else {
                // Create new user document with temporary data
                // They'll need to complete registration via the app
                isNewUser = true
                let userRef = db.collection("users").document()
                userId = userRef.documentID
                
                let userData: [String: Any] = [
                    "emailAddress": email,
                    "firstName": firstName,
                    "lastName": lastName,
                    "orgId": orgId,
                    "active": true,
                    "needsPasswordSetup": true, // Flag to indicate they need to set password
                    "createdAt": Timestamp(),
                    "updatedAt": Timestamp()
                ]
                
                try await userRef.setData(userData)
                print("✅ Created user document: \(userId)")
            }
            
            // Create trainer document
            let trainerRef = db.collection("trainers").document()
            let trainerId = trainerRef.documentID
            
            let trainerData: [String: Any] = [
                "firstName": firstName,
                "lastName": lastName,
                "email": email,
                "orgId": orgId,
                "userId": userId,
                "active": true,
                "createdAt": Timestamp()
            ]
            
            try await trainerRef.setData(trainerData)
            print("✅ Created trainer: \(trainerId)")
            
            // Create orgMembers entry
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
            print("✅ Created orgMember for user: \(userId)")
            
            // If this is a new user, we should send them an invitation email
            // This would be handled by a Cloud Function trigger on user creation
            // or we can call a Cloud Function here
            if isNewUser {
                print("📧 New user created. They will need to register via the app with email: \(email)")
                // TODO: Call Cloud Function to send invitation email
            }
            
            return trainerId
        } catch {
            errorMessage = "Failed to add trainer: \(error.localizedDescription)"
            print("❌ Error adding trainer: \(error)")
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
    let firstName: String
    let lastName: String
    let emailAddress: String?
    let orgId: String
    var organizationName: String?
    var role: String?
}
