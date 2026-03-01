//
//  AnalyticsRepository.swift
//  Skedence
//
//  Phase 4.1: Analytics event tracking wrapper
//

import Foundation
import FirebaseAnalytics

/// Repository for Firebase Analytics (write-only)
final class AnalyticsRepository {
    
    /// Log a custom analytics event
    func logEvent(name: String, parameters: [String: Any]?) {
        Analytics.logEvent(name, parameters: parameters)
    }
    
    /// Log screen view
    func logScreenView(screenName: String, screenClass: String? = nil) {
        var params: [String: Any] = [
            AnalyticsParameterScreenName: screenName
        ]
        
        if let screenClass = screenClass {
            params[AnalyticsParameterScreenClass] = screenClass
        }
        
        Analytics.logEvent(AnalyticsEventScreenView, parameters: params)
    }
    
    /// Set user property
    func setUserProperty(value: String?, forName name: String) {
        Analytics.setUserProperty(value, forName: name)
    }
    
    /// Set user ID
    func setUserId(_ userId: String?) {
        Analytics.setUserID(userId)
    }
    
    /// Log organization created event
    func logOrganizationCreated(orgId: String, orgName: String) {
        logEvent(name: "org_created", parameters: [
            "org_id": orgId,
            "org_name": orgName,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log Stripe connected event
    func logStripeConnected(orgId: String, accountId: String) {
        logEvent(name: "stripe_connected", parameters: [
            "org_id": orgId,
            "account_id": accountId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log package created event
    func logPackageCreated(packageId: String, packageType: String, price: Double, lessons: Int) {
        logEvent(name: "package_created", parameters: [
            "package_id": packageId,
            "package_type": packageType,
            "price": price,
            "lessons": lessons,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log client invited event
    func logClientInvited(orgId: String, inviteMethod: String) {
        logEvent(name: "client_invited", parameters: [
            "org_id": orgId,
            "invite_method": inviteMethod,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log first booking created event
    func logFirstBookingCreated(orgId: String, trainerId: String, clientId: String) {
        logEvent(name: "first_booking_created", parameters: [
            "org_id": orgId,
            "trainer_id": trainerId,
            "client_id": clientId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log payment completed event
    func logPaymentCompleted(
        packageId: String,
        amount: Double,
        currency: String = "USD",
        method: String
    ) {
        logEvent(name: AnalyticsEventPurchase, parameters: [
            AnalyticsParameterTransactionID: packageId,
            AnalyticsParameterValue: amount,
            AnalyticsParameterCurrency: currency,
            "payment_method": method,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log payment failed event
    func logPaymentFailed(error: String, amount: Double) {
        logEvent(name: "payment_failed", parameters: [
            "error": error,
            "amount": amount,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log signup completed event
    func logSignupCompleted(method: String, userId: String) {
        logEvent(name: AnalyticsEventSignUp, parameters: [
            AnalyticsParameterMethod: method,
            "user_id": userId,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Log login event
    func logLogin(method: String) {
        logEvent(name: AnalyticsEventLogin, parameters: [
            AnalyticsParameterMethod: method,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
}
