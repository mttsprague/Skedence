import Foundation
import Combine

/// Service for crash reporting and non-fatal error tracking
class CrashlyticsService: ObservableObject {
    static let shared = CrashlyticsService()
    
    // MARK: - ServiceProtocol Standard Properties
    // Note: Crashlytics is a write-only service, these properties are minimal
    
    @Published private(set) var items: [String] = [] // Error log for debugging
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: Error?
    
    private let repository = CrashlyticsRepository()
    
    private init() {
        // Configure Crashlytics
        configureCrashlytics()
    }
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch crash reports (not applicable for this write-only service)
    func fetch() async throws {
        // Crashlytics is write-only, no data to fetch
        print("ℹ️ CrashlyticsService: This is a write-only service, no data to fetch")
    }
    
    /// Refresh crash reports
    func refresh() async throws {
        try await fetch()
    }
    
    private func configureCrashlytics() {
        #if DEBUG
        // Disable in debug mode to avoid noise
        repository.setCrashlyticsCollectionEnabled(false)
        print("🔧 Crashlytics: Disabled in DEBUG mode")
        #else
        repository.setCrashlyticsCollectionEnabled(true)
        print("🔧 Crashlytics: Enabled in RELEASE mode")
        #endif
    }
    
    // MARK: - User Identification
    
    /// Set user identifier for crash reports
    func setUserId(_ userId: String) {
        repository.setUserId(userId)
        print("👤 Crashlytics: User ID set to \(userId)")
    }
    
    /// Set custom key-value pairs for crash context
    func setCustomValue(_ value: Any, forKey key: String) {
        repository.setCustomValue(value, forKey: key)
    }
    
    /// Set user role for better crash segmentation
    func setUserRole(_ role: String) {
        repository.setUserRole(role)
    }
    
    /// Set organization ID
    func setOrganizationId(_ orgId: String) {
        repository.setOrganizationId(orgId)
    }
    
    /// Set subscription plan
    func setSubscriptionPlan(_ plan: String) {
        repository.setSubscriptionPlan(plan)
    }
    
    // MARK: - Error Logging
    
    /// Log a non-fatal error to Crashlytics
    func logError(_ error: Error, context: String? = nil) {
        repository.logError(error, context: context)
        print("⚠️ Crashlytics: Logged error - \(error.localizedDescription)")
    }
    
    /// Log a custom error with message
    func logError(message: String, domain: String = "SkedenceError", code: Int = -1) {
        let error = NSError(
            domain: domain,
            code: code,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        repository.logError(error)
        print("⚠️ Crashlytics: Logged custom error - \(message)")
    }
    
    /// Log a message for debugging (breadcrumb)
    func log(_ message: String) {
        repository.log(message)
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
        repository.log("Test crash about to occur")
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
        repository.logError(testError, context: "test")
        print("✅ Test non-fatal error logged to Crashlytics")
    }
}
