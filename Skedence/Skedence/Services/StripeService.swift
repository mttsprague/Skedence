//
//  StripeService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFunctions
import Stripe

@MainActor
final class StripeService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published var lastPaymentIntentId: String?
    @Published private(set) var isProcessing = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository = StripeRepository()
    private let functions = Functions.functions()
    
    // Create a payment intent for a lesson package
    // Routes payment to trainer's organization Stripe Connect account
    func createPaymentIntent(
        packageType: String,
        amount: Int, // Amount in cents (e.g., 5000 = $50.00)
        trainerId: String,
        orgId: String? = nil, // Organization receiving payment
        pricingTierId: String? = nil, // NEW: Tier ID for tier-based pricing
        pricingTierName: String? = nil, // NEW: Tier display name
        pricePerLesson: Int? = nil // NEW: Price per lesson in cents
    ) async throws -> (clientSecret: String, customerId: String?, ephemeralKeySecret: String?) {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw StripeError.notAuthenticated
        }
        
        do {
            let (clientSecret, publishableKey, customerId, ephemeralKeySecret) = try await repository.createPaymentIntent(
                packageType: packageType,
                amount: amount,
                trainerId: trainerId,
                userId: userId,
                orgId: orgId,
                pricingTierId: pricingTierId,
                pricingTierName: pricingTierName,
                pricePerLesson: pricePerLesson
            )
            
            // Store publishable key if provided (for direct Stripe integration)
            if let publishableKey = publishableKey {
                // Use the organization's publishable key for this payment
                STPAPIClient.shared.publishableKey = publishableKey
            }
            
            // Payment intent ID not returned in direct mode, use client secret
            self.lastPaymentIntentId = clientSecret.components(separatedBy: "_secret_").first ?? ""
            return (clientSecret, customerId, ephemeralKeySecret)
        } catch let createError {
            let wrappedError = StripeError.paymentFailed(createError.localizedDescription)
            self.error = wrappedError
            throw wrappedError
        }
    }
    
    /// Confirm payment and create lesson package
    func confirmPayment(paymentIntentId: String, isDirect: Bool = true) async throws {
        isProcessing = true
        error = nil
        defer { isProcessing = false }
        
        guard let userId = Auth.auth().currentUser?.uid else {
            let authError = StripeError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        // Use the appropriate function based on payment type
        let functionName = isDirect ? "confirmPaymentAndCreatePackageDirect" : "confirmPaymentAndCreatePackage"
        
        let callable = functions.httpsCallable(functionName)
        let data: [String: Any] = [
            "paymentIntentId": paymentIntentId,
            "userId": userId
        ]
        
        do {
            _ = try await callable.call(data)
        } catch let confirmError {
            let wrappedError = StripeError.paymentFailed(confirmError.localizedDescription)
            self.error = wrappedError
            throw wrappedError
        }
    }
    
    /// Create and confirm payment using saved card
    func createAndConfirmPaymentWithSavedCard(
        packageType: String,
        amount: Int,
        trainerId: String,
        orgId: String,
        paymentMethodId: String,
        pricingTierId: String? = nil,
        pricingTierName: String? = nil,
        pricePerLesson: Int? = nil
    ) async throws -> (paymentIntentId: String, clientSecret: String) {
        isProcessing = true
        error = nil
        defer { isProcessing = false }
        
        guard let userId = Auth.auth().currentUser?.uid else {
            let authError = StripeError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        let callable = functions.httpsCallable("createAndConfirmPaymentDirect")
        var data: [String: Any] = [
            "orgId": orgId,
            "packageType": packageType,
            "amount": amount,
            "trainerId": trainerId,
            "userId": userId,
            "paymentMethodId": paymentMethodId
        ]
        
        // Add tier pricing fields if present
        if let pricingTierId = pricingTierId {
            data["pricingTierId"] = pricingTierId
        }
        if let pricingTierName = pricingTierName {
            data["pricingTierName"] = pricingTierName
        }
        if let pricePerLesson = pricePerLesson {
            data["pricePerLesson"] = pricePerLesson
        }
        
        do {
            let result = try await callable.call(data)
            guard let resultData = result.data as? [String: Any],
                  let paymentIntentId = resultData["paymentIntentId"] as? String,
                  let clientSecret = resultData["clientSecret"] as? String else {
                throw StripeError.invalidResponse
            }
            
            self.lastPaymentIntentId = paymentIntentId
            return (paymentIntentId, clientSecret)
        } catch let paymentError {
            let wrappedError = StripeError.paymentFailed(paymentError.localizedDescription)
            self.error = wrappedError
            print("Error creating payment with saved card: \(paymentError)")
            throw wrappedError
        }
    }
    
    // MARK: - Error Types
    
    enum StripeError: LocalizedError {
        case notAuthenticated
        case invalidResponse
        case paymentFailed(String)
        
        var errorDescription: String? {
            switch self {
            case .notAuthenticated:
                return "You must be signed in to make a purchase"
            case .invalidResponse:
                return "Invalid response from payment service"
            case .paymentFailed(let message):
                return "Payment failed: \(message)"
            }
        }
    }
}
