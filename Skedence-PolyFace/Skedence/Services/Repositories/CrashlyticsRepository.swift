//
//  CrashlyticsRepository.swift
//  Skedence
//
//  Phase 4.1: Crashlytics error reporting wrapper
//

import Foundation
import FirebaseCrashlytics

/// Repository for Firebase Crashlytics (write-only)
final class CrashlyticsRepository {
    private let crashlytics = Crashlytics.crashlytics()
    
    /// Enable or disable Crashlytics collection
    func setCrashlyticsCollectionEnabled(_ enabled: Bool) {
        crashlytics.setCrashlyticsCollectionEnabled(enabled)
    }
    
    /// Set user identifier
    func setUserId(_ userId: String) {
        crashlytics.setUserID(userId)
    }
    
    /// Set custom key-value pair
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
    
    /// Log a non-fatal error
    func logError(_ error: Error, context: String? = nil) {
        if let context = context {
            crashlytics.setCustomValue(context, forKey: "error_context")
        }
        crashlytics.record(error: error)
    }
    
    /// Log a custom message
    func log(_ message: String) {
        crashlytics.log(message)
    }
    
    /// Record an exception (non-fatal)
    func recordException(
        name: String,
        reason: String?,
        stackTrace: [String]? = nil
    ) {
        let exceptionModel = ExceptionModel(
            name: name,
            reason: reason ?? "No reason provided"
        )
        
        if let stackTrace = stackTrace {
            crashlytics.log("Stack trace: \(stackTrace.joined(separator: "\n"))")
        }
        
        crashlytics.record(exceptionModel: exceptionModel)
    }
    
    /// Set user role for crash segmentation
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
    
    /// Set app version
    func setAppVersion(_ version: String) {
        setCustomValue(version, forKey: "app_version")
    }
}
