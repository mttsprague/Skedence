import Foundation
import FirebaseCrashlytics

/// Service for crash reporting and non-fatal error tracking
class CrashlyticsService {
    static let shared = CrashlyticsService()
    
    private let crashlytics = Crashlytics.crashlytics()
    
    private init() {
        // Configure Crashlytics
        configureCrashlytics()
    }
    
    private func configureCrashlytics() {
        #if DEBUG
        // Disable in debug mode to avoid noise
        crashlytics.setCrashlyticsCollectionEnabled(false)
        print("🔧 Crashlytics: Disabled in DEBUG mode")
        #else
        crashlytics.setCrashlyticsCollectionEnabled(true)
        print("🔧 Crashlytics: Enabled in RELEASE mode")
        #endif
    }
    
    // MARK: - User Identification
    
    /// Set user identifier for crash reports
    func setUserId(_ userId: String) {
        crashlytics.setUserID(userId)
        print("👤 Crashlytics: User ID set to \(userId)")
    }
    
    /// Set custom key-value pairs for crash context
    func setCustomValue(_ value: Any, forKey key: String) {
        if let stringValue = value as? String {
            crashlytics.setCustomValue(stringValue, forKey: key)
        } else if let intValue = value as? Int {
            crashlytics.setCustomValue(intValue, forKey: key)
        } else if let boolValue = value as? Bool {
            crashlytics.setCustomValue(boolValue, forKey: key)
        } else {
            crashlytics.setCustomValue(String(describing: value), forKey: key)
        }
    }
    
    /// Set user role for better crash segmentation
    func setUserRole(_ role: String) {
        setCustomValue(role, forKey: "user_role")
    }
    
    /// Set organization ID
    func setOrganizationId(_ orgId: String) {
        setCustomValue(orgId, forKey: "organization_id")
    }
    
    /// Set subscription plan
    func setSubscriptionPlan(_ plan: String) {
        setCustomValue(plan, forKey: "subscription_plan")
    }
    
    // MARK: - Error Logging
    
    /// Log a non-fatal error to Crashlytics
    func logError(_ error: Error, context: String? = nil) {
        let nsError = error as NSError
        if let context = context {
            crashlytics.setCustomValue(context, forKey: "error_context")
        }
        crashlytics.record(error: nsError)
        print("⚠️ Crashlytics: Logged error - \(error.localizedDescription)")
    }
    
    /// Log a custom error with message
    func logError(message: String, domain: String = "SkedenceError", code: Int = -1) {
        let error = NSError(
            domain: domain,
            code: code,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        crashlytics.record(error: error)
        print("⚠️ Crashlytics: Logged custom error - \(message)")
    }
    
    /// Log a message for debugging (breadcrumb)
    func log(_ message: String) {
        crashlytics.log(message)
    }
    
    // MARK: - Specific Use Cases
    
    /// Log booking errors
    func logBookingError(_ error: Error, bookingDetails: [String: Any]) {
        setCustomValue(bookingDetails, forKey: "booking_details")
        log("Booking error occurred: \(bookingDetails)")
        logError(error, context: "booking")
    }
    
    /// Log payment errors
    func logPaymentError(_ error: Error, amount: Double, method: String) {
        setCustomValue(amount, forKey: "payment_amount")
        setCustomValue(method, forKey: "payment_method")
        log("Payment error: $\(amount) via \(method)")
        logError(error, context: "payment")
    }
    
    /// Log authentication errors
    func logAuthError(_ error: Error, method: String) {
        setCustomValue(method, forKey: "auth_method")
        log("Authentication error via \(method)")
        logError(error, context: "authentication")
    }
    
    /// Log Firebase/Firestore errors
    func logFirestoreError(_ error: Error, operation: String, collection: String) {
        setCustomValue(operation, forKey: "firestore_operation")
        setCustomValue(collection, forKey: "firestore_collection")
        log("Firestore error: \(operation) on \(collection)")
        logError(error, context: "firestore")
    }
    
    /// Log API errors
    func logAPIError(_ error: Error, endpoint: String, statusCode: Int?) {
        setCustomValue(endpoint, forKey: "api_endpoint")
        if let statusCode = statusCode {
            setCustomValue(statusCode, forKey: "api_status_code")
        }
        log("API error: \(endpoint) - Status: \(statusCode ?? -1)")
        logError(error, context: "api")
    }
    
    // MARK: - Testing
    
    /// Force a test crash (use only for testing!)
    func testCrash() {
        #if DEBUG
        print("⚠️ Test crash would be triggered here (disabled in DEBUG)")
        // Uncomment to actually test:
        // fatalError("Test crash triggered")
        #else
        crashlytics.log("Test crash about to occur")
        fatalError("Test crash triggered by user")
        #endif
    }
    
    /// Log a test non-fatal error
    func testNonFatalError() {
        let testError = NSError(
            domain: "SkedenceTest",
            code: 999,
            userInfo: [NSLocalizedDescriptionKey: "This is a test non-fatal error"]
        )
        logError(testError, context: "test")
        print("✅ Test non-fatal error logged to Crashlytics")
    }
}
