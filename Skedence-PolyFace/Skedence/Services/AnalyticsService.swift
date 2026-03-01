import Foundation
import Combine

/// Service for tracking conversion funnel events and user analytics
class AnalyticsService: ObservableObject {
    static let shared = AnalyticsService()
    
    // MARK: - ServiceProtocol Standard Properties
    // Note: Analytics is a write-only service, these properties are minimal
    
    @Published private(set) var items: [String] = [] // Event log for debugging
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: Error?
    
    private let repository = AnalyticsRepository()
    
    private init() {}
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch analytics events (not applicable for this write-only service)
    func fetch() async throws {
        // Analytics is write-only, no data to fetch
    }
    
    /// Refresh analytics events
    func refresh() async throws {
        try await fetch()
    }
    
    // MARK: - Conversion Funnel Events
    
    /// Track when a new organization is created
    func logOrganizationCreated(orgId: String, orgName: String) {
        repository.logOrganizationCreated(orgId: orgId, orgName: orgName)
    }
    
    /// Track when Stripe Connect is successfully connected
    func logStripeConnected(orgId: String, accountId: String) {
        repository.logStripeConnected(orgId: orgId, accountId: accountId)
    }
    
    /// Track when a lesson package is created
    func logPackageCreated(packageId: String, packageType: String, price: Double, lessons: Int) {
        repository.logPackageCreated(packageId: packageId, packageType: packageType, price: price, lessons: lessons)
    }
    
    /// Track when a client is invited to join
    func logClientInvited(orgId: String, inviteMethod: String) {
        repository.logClientInvited(orgId: orgId, inviteMethod: inviteMethod)
    }
    
    /// Track when the first booking is created for an organization
    func logFirstBookingCreated(orgId: String, trainerId: String, clientId: String) {
        repository.logFirstBookingCreated(orgId: orgId, trainerId: trainerId, clientId: clientId)
    }
    
    /// Track when a subscription is activated
    func logSubscriptionActivated(orgId: String, plan: String, price: Double) {
        repository.logEvent(name: "subscription_activated", parameters: [
            "org_id": orgId,
            "plan": plan,
            "price": price,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - User Journey Events
    
    /// Track user sign up
    func logUserSignUp(userId: String, method: String) {
        repository.logSignupCompleted(method: method, userId: userId)
    }
    
    /// Track user login
    func logUserLogin(userId: String, method: String) {
        repository.logLogin(method: method)
    }
    
    /// Track profile completion
    func logProfileCompleted(userId: String) {
        repository.logEvent(name: "profile_completed", parameters: [
            "user_id": userId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track waiver signed
    func logWaiverSigned(userId: String, orgId: String) {
        repository.logEvent(name: "waiver_signed", parameters: [
            "user_id": userId,
            "org_id": orgId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Engagement Events
    
    /// Track booking created
    func logBookingCreated(bookingId: String, trainerId: String, clientId: String) {
        repository.logEvent(name: "booking_created", parameters: [
            "booking_id": bookingId,
            "trainer_id": trainerId,
            "client_id": clientId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track booking canceled
    func logBookingCanceled(bookingId: String, reason: String) {
        repository.logEvent(name: "booking_canceled", parameters: [
            "booking_id": bookingId,
            "reason": reason,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track class registration
    func logClassRegistered(classId: String, className: String) {
        repository.logEvent(name: "class_registered", parameters: [
            "class_id": classId,
            "class_name": className,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track package purchase
    func logPackagePurchased(packageId: String, price: Double, method: String) {
        repository.logPaymentCompleted(packageId: packageId, amount: price, method: method)
    }
    
    // MARK: - Error Tracking
    
    /// Track errors (use this for non-crash errors)
    func logError(error: Error, context: String) {
        repository.logEvent(name: "error_occurred", parameters: [
            "error_description": error.localizedDescription,
            "context": context,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track specific error with custom message
    func logError(message: String, context: String) {
        repository.logEvent(name: "error_occurred", parameters: [
            "error_description": message,
            "context": context,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Screen View Tracking
    
    /// Track screen views
    func logScreenView(screenName: String, screenClass: String) {
        repository.logScreenView(screenName: screenName, screenClass: screenClass)
    }
    
    // MARK: - User Properties
    
    /// Set user properties for segmentation
    func setUserProperty(value: String?, forName: String) {
        repository.setUserProperty(value: value, forName: forName)
    }
    
    /// Set user ID
    func setUserId(_ userId: String?) {
        repository.setUserId(userId)
    }
    
    /// Set user role (client, trainer, admin)
    func setUserRole(_ role: String) {
        setUserProperty(value: role, forName: "user_role")
    }
    
    /// Set user's organization ID
    func setUserOrganization(_ orgId: String) {
        setUserProperty(value: orgId, forName: "organization_id")
    }
    
    /// Set user's subscription plan
    func setUserPlan(_ plan: String) {
        setUserProperty(value: plan, forName: "subscription_plan")
    }
}
