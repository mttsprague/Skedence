//
//  AdminRepository.swift
//  Skedence
//
//  Phase 4.1: Admin operations data access layer
//

import Foundation
import FirebaseFirestore

@MainActor
final class AdminRepository: RepositoryProtocol {
    typealias DataType = SimpleUser
    
    private let db = Firestore.firestore()
    
    // MARK: - RepositoryProtocol Implementation
    
    func fetchAll(orgId: String) async throws -> [SimpleUser] {
        // Fetch all users for the organization
        let snapshot = try await db.collection("users")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc -> SimpleUser? in
            let data = doc.data()
            return decodeSimpleUser(id: doc.documentID, data: data)
        }
    }
    
    func fetchById(id: String, orgId: String) async throws -> SimpleUser? {
        let snapshot = try await db.collection("users").document(id).getDocument()
        
        guard snapshot.exists, let data = snapshot.data() else {
            return nil
        }
        
        // Verify user belongs to the organization
        if let userOrgId = data["orgId"] as? String, userOrgId != orgId {
            throw RepositoryError.unauthorized
        }
        
        return decodeSimpleUser(id: snapshot.documentID, data: data)
    }
    
    func create(_ item: SimpleUser, orgId: String) async throws -> String {
        throw RepositoryError.unsupportedOperation
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        try await db.collection("users").document(id).setData(data, merge: true)
    }
    
    func delete(id: String, orgId: String) async throws {
        // Soft delete by setting isActive to false in orgMembers
        let snapshot = try await db.collection("orgMembers")
            .whereField("userId", isEqualTo: id)
            .whereField("orgId", isEqualTo: orgId)
            .limit(to: 1)
            .getDocuments()
        
        guard let doc = snapshot.documents.first else {
            throw RepositoryError.notFound
        }
        
        try await db.collection("orgMembers").document(doc.documentID)
            .setData(["isActive": false], merge: true)
    }
    
    // MARK: - Admin-Specific Methods (Convenience wrappers)
    
    /// Update user with SimpleUser object
    func updateUser(_ item: SimpleUser, orgId: String) async throws {
        let data = encodeSimpleUser(item)
        try await update(id: item.id, data: data, orgId: orgId)
    }
    
    /// Check if user is admin for organization
    func checkAdminStatus(userId: String, orgId: String) async throws -> Bool {
        let snapshot = try await db.collection("orgMembers")
            .whereField("userId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .whereField("isActive", isEqualTo: true)
            .limit(to: 1)
            .getDocuments()
        
        guard let doc = snapshot.documents.first,
              let role = doc.data()["role"] as? String else {
            return false
        }
        
        return role == "admin" || role == "owner"
    }
    
    /// Fetch organization data
    func fetchOrganizationData(orgId: String) async throws -> [String: Any] {
        let snapshot = try await db.collection("organizations").document(orgId).getDocument()
        
        guard snapshot.exists, let data = snapshot.data() else {
            throw RepositoryError.notFound
        }
        
        return data
    }
    
    /// Fetch organization billing information
    func fetchOrganizationBilling(orgId: String) async throws -> OrganizationBilling? {
        let data = try await fetchOrganizationData(orgId: orgId)
        return decodeOrganizationBilling(data: data)
    }
    
    /// Update user role in organization
    func updateUserRole(userId: String, orgId: String, role: String) async throws {
        // Query by authUserId field (Firebase Auth UID) instead of userId (name-based ID)
        let snapshot = try await db.collection("orgMembers")
            .whereField("authUserId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .limit(to: 1)
            .getDocuments()
        
        guard let doc = snapshot.documents.first else {
            throw RepositoryError.notFound
        }
        
        try await db.collection("orgMembers").document(doc.documentID)
            .setData(["role": role, "updatedAt": Timestamp(date: Date())], merge: true)
    }
    
    // MARK: - Encoding/Decoding Helpers
    
    private func decodeSimpleUser(id: String, data: [String: Any]) -> SimpleUser {
        let firstName = data["firstName"] as? String ?? ""
        let lastName = data["lastName"] as? String ?? ""
        let athleteName = data["athleteName"] as? String ?? ""
        
        return SimpleUser(
            id: id,
            firstName: firstName,
            lastName: lastName,
            athleteName: athleteName
        )
    }
    
    private func encodeSimpleUser(_ user: SimpleUser) -> [String: Any] {
        return [
            "firstName": user.firstName,
            "lastName": user.lastName,
            "athleteName": user.athleteName
        ]
    }
    
    private func decodeOrganizationBilling(data: [String: Any]) -> OrganizationBilling? {
        guard let subscriptionStatus = data["subscriptionStatus"] as? String else {
            return nil
        }
        
        let subscriptionPlan = data["subscriptionPlan"] as? String ?? "free"
        let trialEndsAt = (data["trialEndsAt"] as? Timestamp)?.dateValue()
        let subscriptionEndsAt = (data["subscriptionEndsAt"] as? Timestamp)?.dateValue()
        let graceEndsAt = (data["graceEndsAt"] as? Timestamp)?.dateValue()
        let stripeCustomerId = data["stripeCustomerId"] as? String
        let stripeSubscriptionId = data["stripeSubscriptionId"] as? String
        let isActive = data["isActive"] as? Bool ?? false
        let isInGrace = data["isInGrace"] as? Bool ?? false
        
        return OrganizationBilling(
            status: subscriptionStatus,
            plan: subscriptionPlan,
            trialEndsAt: trialEndsAt,
            currentPeriodEnd: subscriptionEndsAt,
            graceEndsAt: graceEndsAt,
            stripeCustomerId: stripeCustomerId,
            stripeSubscriptionId: stripeSubscriptionId,
            isActive: isActive,
            isInGrace: isInGrace
        )
    }
}
