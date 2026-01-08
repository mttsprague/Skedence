import Foundation
import FirebaseAnalytics

/// Service for tracking conversion funnel events and user analytics
class AnalyticsService {
    static let shared = AnalyticsService()
    
    private init() {}
    
    // MARK: - Conversion Funnel Events
    
    /// Track when a new organization is created
    func logOrganizationCreated(orgId: String, orgName: String) {
        Analytics.logEvent("org_created", parameters: [
            "org_id": orgId,
            "org_name": orgName,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Organization created - \(orgName)")
    }
    
    /// Track when Stripe Connect is successfully connected
    func logStripeConnected(orgId: String, accountId: String) {
        Analytics.logEvent("stripe_connected", parameters: [
            "org_id": orgId,
            "account_id": accountId,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Stripe connected for org \(orgId)")
    }
    
    /// Track when a lesson package is created
    func logPackageCreated(packageId: String, packageType: String, price: Double, lessons: Int) {
        Analytics.logEvent("package_created", parameters: [
            "package_id": packageId,
            "package_type": packageType,
            "price": price,
            "lessons": lessons,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Package created - \(packageType) (\(lessons) lessons at $\(price))")
    }
    
    /// Track when a client is invited to join
    func logClientInvited(orgId: String, inviteMethod: String) {
        Analytics.logEvent("client_invited", parameters: [
            "org_id": orgId,
            "invite_method": inviteMethod,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Client invited via \(inviteMethod)")
    }
    
    /// Track when the first booking is created for an organization
    func logFirstBookingCreated(orgId: String, trainerId: String, clientId: String) {
        Analytics.logEvent("first_booking_created", parameters: [
            "org_id": orgId,
            "trainer_id": trainerId,
            "client_id": clientId,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: First booking created for org \(orgId)")
    }
    
    /// Track when a subscription is activated
    func logSubscriptionActivated(orgId: String, plan: String, price: Double) {
        Analytics.logEvent("subscription_activated", parameters: [
            "org_id": orgId,
            "plan": plan,
            "price": price,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Subscription activated - \(plan) at $\(price)")
    }
    
    // MARK: - User Journey Events
    
    /// Track user sign up
    func logUserSignUp(userId: String, method: String) {
        Analytics.logEvent(AnalyticsEventSignUp, parameters: [
            AnalyticsParameterMethod: method,
            "user_id": userId,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: User signed up via \(method)")
    }
    
    /// Track user login
    func logUserLogin(userId: String, method: String) {
        Analytics.logEvent(AnalyticsEventLogin, parameters: [
            AnalyticsParameterMethod: method,
            "user_id": userId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track profile completion
    func logProfileCompleted(userId: String) {
        Analytics.logEvent("profile_completed", parameters: [
            "user_id": userId,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Profile completed")
    }
    
    /// Track waiver signed
    func logWaiverSigned(userId: String, orgId: String) {
        Analytics.logEvent("waiver_signed", parameters: [
            "user_id": userId,
            "org_id": orgId,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Waiver signed")
    }
    
    // MARK: - Engagement Events
    
    /// Track booking created
    func logBookingCreated(bookingId: String, trainerId: String, clientId: String) {
        Analytics.logEvent("booking_created", parameters: [
            "booking_id": bookingId,
            "trainer_id": trainerId,
            "client_id": clientId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track booking canceled
    func logBookingCanceled(bookingId: String, reason: String) {
        Analytics.logEvent("booking_canceled", parameters: [
            "booking_id": bookingId,
            "reason": reason,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track class registration
    func logClassRegistered(classId: String, className: String) {
        Analytics.logEvent("class_registered", parameters: [
            "class_id": classId,
            "class_name": className,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Track package purchase
    func logPackagePurchased(packageId: String, price: Double, method: String) {
        Analytics.logEvent(AnalyticsEventPurchase, parameters: [
            AnalyticsParameterValue: price,
            AnalyticsParameterCurrency: "USD",
            "package_id": packageId,
            "payment_method": method,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("📊 Analytics: Package purchased - $\(price) via \(method)")
    }
    
    // MARK: - Error Tracking
    
    /// Track errors (use this for non-crash errors)
    func logError(error: Error, context: String) {
        Analytics.logEvent("error_occurred", parameters: [
            "error_description": error.localizedDescription,
            "context": context,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("⚠️ Analytics: Error in \(context) - \(error.localizedDescription)")
    }
    
    /// Track specific error with custom message
    func logError(message: String, context: String) {
        Analytics.logEvent("error_occurred", parameters: [
            "error_description": message,
            "context": context,
            "timestamp": Date().timeIntervalSince1970
        ])
        print("⚠️ Analytics: Error in \(context) - \(message)")
    }
    
    // MARK: - Screen View Tracking
    
    /// Track screen views
    func logScreenView(screenName: String, screenClass: String) {
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName,
            AnalyticsParameterScreenClass: screenClass,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - User Properties
    
    /// Set user properties for segmentation
    func setUserProperty(value: String?, forName: String) {
        Analytics.setUserProperty(value, forName: forName)
    }
    
    /// Set user ID
    func setUserId(_ userId: String?) {
        Analytics.setUserID(userId)
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
