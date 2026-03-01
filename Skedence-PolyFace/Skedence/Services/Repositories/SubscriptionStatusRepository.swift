//
//  SubscriptionStatusRepository.swift
//  Skedence
//
//  Phase 4.1: Subscription status data access layer
//

import Foundation
import FirebaseFirestore

@MainActor
final class SubscriptionStatusRepository {
    private let db = Firestore.firestore()
    
    /// Fetch organization access status
    func fetchOrgAccessStatus(organizationId: String) async throws -> OrgAccessStatus {
        let snapshot = try await db.collection("organizations")
            .document(organizationId)
            .getDocument()
        
        guard snapshot.exists, let data = snapshot.data() else {
            throw RepositoryError.notFound
        }
        
        return decodeOrgAccessStatus(orgId: organizationId, data: data)
    }
    
    /// Start listening to organization status changes
    func listenToOrgStatus(
        organizationId: String,
        onChange: @escaping (Result<OrgAccessStatus, Error>) -> Void
    ) -> ListenerRegistration {
        return db.collection("organizations")
            .document(organizationId)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    onChange(.failure(RepositoryError.networkError(error)))
                    return
                }
                
                guard let data = snapshot?.data() else {
                    onChange(.failure(RepositoryError.notFound))
                    return
                }
                
                let status = self.decodeOrgAccessStatus(orgId: organizationId, data: data)
                onChange(.success(status))
            }
    }
    
    // MARK: - Decoding Helpers
    
    private func decodeOrgAccessStatus(orgId: String, data: [String: Any]) -> OrgAccessStatus {
        let subscriptionStatus = data["subscriptionStatus"] as? String ?? "trialing"
        let _ = data["subscriptionPlan"] as? String
        let isDisabled = data["isDisabled"] as? Bool ?? false
        let trialEndsAt = (data["trialEndsAt"] as? Timestamp)?.dateValue()
        let _ = (data["subscriptionEndsAt"] as? Timestamp)?.dateValue()
        
        // Determine if read-only
        let isReadOnly = isDisabled || 
                        subscriptionStatus == "past_due" ||
                        subscriptionStatus == "canceled" ||
                        subscriptionStatus == "unpaid"
        
        // Determine status message
        var statusMessage: String?
        if isDisabled {
            statusMessage = "Account disabled. Contact support."
        } else if subscriptionStatus == "trialing", let trialEnd = trialEndsAt {
            let daysRemaining = Calendar.current.dateComponents([.day], from: Date(), to: trialEnd).day ?? 0
            if daysRemaining <= 3 {
                statusMessage = "Trial ends in \(daysRemaining) day\(daysRemaining == 1 ? "" : "s")"
            }
        } else if subscriptionStatus == "past_due" {
            statusMessage = "Payment overdue. Update payment method."
        } else if subscriptionStatus == "canceled" {
            statusMessage = "Subscription canceled. Reactivate to continue."
        }
        
        return OrgAccessStatus(
            isReadOnly: isReadOnly,
            isAllowed: !isDisabled,
            message: statusMessage
        )
    }
}
