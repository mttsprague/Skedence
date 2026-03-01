import Foundation
import Combine
import FirebaseFirestore

/// Service to check organization subscription status and enforce access controls
class SubscriptionStatusService: ObservableObject {
    static let shared = SubscriptionStatusService()
    
    // MARK: - ServiceProtocol Standard Properties
    
    @Published private(set) var items: [OrgAccessStatus] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: Error?
    
    // MARK: - Subscription-Specific Properties
    
    @Published var isReadOnly: Bool = false
    @Published var isDisabled: Bool = false
    @Published var statusMessage: String?
    @Published var subscriptionStatus: String?
    @Published var subscriptionPlan: String?
    
    private let repository = SubscriptionStatusRepository()
    private var listener: ListenerRegistration?
    
    private init() {}
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch organization status (alias for checkOrgStatus)
    func fetch() async throws {
        // Note: This service primarily uses monitorOrgStatus for real-time updates
        // fetch() is provided for protocol compliance but requires an orgId
        print("⚠️ SubscriptionStatusService: fetch() requires organizationId. Use checkOrgStatus(organizationId:) instead")
    }
    
    /// Refresh organization status
    func refresh() async throws {
        try await fetch()
    }
    
    /// Start monitoring subscription status for an organization
    func monitorOrgStatus(organizationId: String) {
        listener?.remove()
        
        listener = repository.listenToOrgStatus(organizationId: organizationId) { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let status):
                DispatchQueue.main.async {
                    self.items = [status]
                    self.isReadOnly = status.isReadOnly
                    self.isDisabled = !status.isAllowed
                    self.statusMessage = status.message
                }
            case .failure(let error):
                print("❌ Error monitoring org status: \(error.localizedDescription)")
                CrashlyticsService.shared.logError(error, context: "subscription_monitoring")
            }
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
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let status = try await repository.fetchOrgAccessStatus(organizationId: organizationId)
            items = [status]
            isReadOnly = status.isReadOnly
            isDisabled = !status.isAllowed
            statusMessage = status.message
            return status
        } catch let catchError {
            error = mapRepositoryError(catchError)
            throw error!
        }
    }
    
    // MARK: - Error Mapping
    
    private func mapRepositoryError(_ error: Error) -> Error {
        if let serviceError = error as? ServiceError {
            return serviceError
        }
        return ServiceError.networkError(error)
    }
    
    /// Update status from Firestore data
    private func updateStatus(from data: [String: Any]) {
        DispatchQueue.main.async {
            self.isDisabled = data["disabled"] as? Bool ?? false
            self.subscriptionStatus = data["subscriptionStatus"] as? String
            self.subscriptionPlan = data["subscriptionPlan"] as? String
            
            let accessStatus = self.parseAccessStatus(from: data)
            self.isReadOnly = accessStatus.isReadOnly
            self.statusMessage = accessStatus.message
            
            print("📊 Subscription Status Updated:")
            print("  - Plan: \(self.subscriptionPlan ?? "none")")
            print("  - Status: \(self.subscriptionStatus ?? "none")")
            print("  - Read-only: \(self.isReadOnly)")
            print("  - Disabled: \(self.isDisabled)")
        }
    }
    
    /// Parse access status from data
    private func parseAccessStatus(from data: [String: Any]) -> OrgAccessStatus {
        let disabled = data["disabled"] as? Bool ?? false
        let status = data["subscriptionStatus"] as? String
        
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
