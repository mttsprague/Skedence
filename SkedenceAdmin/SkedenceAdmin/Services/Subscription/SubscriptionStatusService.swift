import Foundation
import FirebaseFirestore
import Combine

/// Service to check organization subscription status and enforce access controls
class SubscriptionStatusService: ObservableObject {
    static let shared = SubscriptionStatusService()
    
    @Published var isReadOnly: Bool = false
    @Published var subscriptionStatus: String?
    @Published var subscriptionPlan: String?
    @Published var isDisabled: Bool = false
    @Published var statusMessage: String?
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    private init() {}
    
    /// Start monitoring subscription status for an organization
    func monitorOrgStatus(organizationId: String) {
        listener?.remove()
        
        listener = db.collection("organizations").document(organizationId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                
                if let error = error {
                    CrashlyticsService.shared.logError(error, context: "subscription_monitoring")
                    return
                }
                
                guard let data = snapshot?.data() else {
                    return
                }
                
                self.updateStatus(from: data)
            }
    }
    
    /// Stop monitoring subscription status
    func stopMonitoring() {
        listener?.remove()
        listener = nil
        resetStatus()
    }
    
    /// Check org status once (without continuous monitoring)
    func checkOrgStatus(organizationId: String) async throws -> OrgAccessStatus {
        let snapshot = try await db.collection("organizations").document(organizationId).getDocument()
        
        guard let data = snapshot.data() else {
            throw NSError(
                domain: "SubscriptionStatus",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Organization not found"]
            )
        }
        
        return parseAccessStatus(from: data)
    }
    
    /// Update status from Firestore data
    private func updateStatus(from data: [String: Any]) {
        DispatchQueue.main.async {
            self.isDisabled = data["disabled"] as? Bool ?? false
            
            // Get billing data from nested structure
            let billing = data["billing"] as? [String: Any]
            self.subscriptionStatus = billing?["status"] as? String
            self.subscriptionPlan = billing?["plan"] as? String
            
            let accessStatus = self.parseAccessStatus(from: data)
            self.isReadOnly = accessStatus.isReadOnly
            self.statusMessage = accessStatus.message
            
        }
    }
    
    /// Parse access status from data
    private func parseAccessStatus(from data: [String: Any]) -> OrgAccessStatus {
        let disabled = data["disabled"] as? Bool ?? false
        
        // Get status from billing nested structure
        let billing = data["billing"] as? [String: Any]
        let status = billing?["status"] as? String
        
        if disabled {
            return OrgAccessStatus(
                isReadOnly: true,
                isAllowed: false,
                message: "This organization has been disabled. Please contact support."
            )
        }
        
        switch status {
        case "active", "trialing":
            return OrgAccessStatus(
                isReadOnly: false,
                isAllowed: true,
                message: nil
            )
            
        case "past_due":
            return OrgAccessStatus(
                isReadOnly: true,
                isAllowed: true,
                message: "Your payment is past due. Please update your payment method to continue booking."
            )
            
        case "canceled", "incomplete":
            return OrgAccessStatus(
                isReadOnly: true,
                isAllowed: true,
                message: "Your subscription has expired. Please reactivate to continue booking."
            )
            
        case nil, "":
            return OrgAccessStatus(
                isReadOnly: true,
                isAllowed: true,
                message: "No active subscription. Please subscribe to start booking."
            )
            
        default:
            return OrgAccessStatus(
                isReadOnly: true,
                isAllowed: true,
                message: "Subscription status unknown. Please contact support."
            )
        }
    }
    
    /// Reset all status values
    private func resetStatus() {
        DispatchQueue.main.async {
            self.isReadOnly = false
            self.subscriptionStatus = nil
            self.subscriptionPlan = nil
            self.isDisabled = false
            self.statusMessage = nil
        }
    }
    
    /// Check if user can perform a specific action
    func canPerformAction(_ action: UserAction) -> Bool {
        if isDisabled {
            return false
        }
        
        switch action {
        case .viewContent:
            return true // Always allowed
            
        case .bookLesson, .registerForClass, .createAvailability, .purchasePackage:
            return !isReadOnly
            
        case .manageSettings:
            return !isDisabled
        }
    }
    
    /// Get user-friendly message for blocked actions
    func getBlockedActionMessage(for action: UserAction) -> String {
        if isDisabled {
            return "This organization has been disabled. Please contact support."
        }
        
        if isReadOnly {
            return statusMessage ?? "Your subscription has expired. Please update your subscription to continue."
        }
        
        return "This action is currently unavailable."
    }
}

// MARK: - Supporting Types

struct OrgAccessStatus {
    let isReadOnly: Bool
    let isAllowed: Bool
    let message: String?
}

enum UserAction {
    case viewContent
    case bookLesson
    case registerForClass
    case createAvailability
    case purchasePackage
    case manageSettings
}
