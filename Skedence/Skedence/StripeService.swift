//
//  StripeService.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFunctions
import Stripe

@MainActor
final class StripeService: ObservableObject {
    private let functions = Functions.functions()
    @Published var lastPaymentIntentId: String?
    
    // Create a payment intent for a lesson package
    // Routes payment to trainer's organization Stripe Connect account
    func createPaymentIntent(
        packageType: String,
        amount: Int, // Amount in cents (e.g., 5000 = $50.00)
        trainerId: String,
        orgId: String? = nil // Organization receiving payment
    ) async throws -> String {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw StripeError.notAuthenticated
        }
        
        // Determine which Cloud Function to call based on whether orgId is provided
        let callable: HTTPSCallable
        var data: [String: Any]
        
        if let orgId = orgId {
            // Use Stripe Direct function - uses organization's own Stripe keys
            callable = functions.httpsCallable("createPaymentIntentDirect")
            data = [
                "orgId": orgId,
                "packageType": packageType,
                "amount": amount,
                "trainerId": trainerId,
                "userId": userId
            ]
        } else {
            // Fallback to legacy function (should not be used for client purchases)
            callable = functions.httpsCallable("createPaymentIntent")
            data = [
                "packageType": packageType,
                "amount": amount,
                "trainerId": trainerId,
                "userId": userId
            ]
        }
        
        do {
            let result = try await callable.call(data)
            guard let resultData = result.data as? [String: Any],
                  let clientSecret = resultData["clientSecret"] as? String else {
                throw StripeError.invalidResponse
            }
            
            // Store publishable key if provided (for direct Stripe integration)
            if let publishableKey = resultData["publishableKey"] as? String {
                // Use the organization's publishable key for this payment
                STPAPIClient.shared.publishableKey = publishableKey
            }
            
            // Payment intent ID not returned in direct mode, use client secret
            self.lastPaymentIntentId = clientSecret.components(separatedBy: "_secret_").first ?? ""
            return clientSecret
        } catch {
            print("Error creating payment intent: \(error)")
            throw StripeError.paymentFailed(error.localizedDescription)
        }
    }
    
    // Confirm payment and create lesson package
    func confirmPayment(paymentIntentId: String) async throws {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw StripeError.notAuthenticated
        }
        
        let callable = functions.httpsCallable("confirmPaymentAndCreatePackage")
        let data: [String: Any] = [
            "paymentIntentId": paymentIntentId,
            "userId": userId
        ]
        
        do {
            _ = try await callable.call(data)
        } catch {
            print("Error confirming payment: \(error)")
            throw StripeError.paymentFailed(error.localizedDescription)
        }
    }
    
    // Create and confirm payment using saved card
    func createAndConfirmPaymentWithSavedCard(
        packageType: String,
        amount: Int,
        trainerId: String,
        orgId: String,
        paymentMethodId: String
    ) async throws -> (paymentIntentId: String, clientSecret: String) {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw StripeError.notAuthenticated
        }
        
        let callable = functions.httpsCallable("createAndConfirmPaymentDirect")
        let data: [String: Any] = [
            "orgId": orgId,
            "packageType": packageType,
            "amount": amount,
            "trainerId": trainerId,
            "userId": userId,
            "paymentMethodId": paymentMethodId
        ]
        
        do {
            let result = try await callable.call(data)
            guard let resultData = result.data as? [String: Any],
                  let paymentIntentId = resultData["paymentIntentId"] as? String,
                  let clientSecret = resultData["clientSecret"] as? String else {
                throw StripeError.invalidResponse
            }
            
            self.lastPaymentIntentId = paymentIntentId
            return (paymentIntentId, clientSecret)
        } catch {
            print("Error creating payment with saved card: \(error)")
            throw StripeError.paymentFailed(error.localizedDescription)
        }
    }
    
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
