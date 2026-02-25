//
//  StripeService.swift
//  SkedenceAdmin
//
//  Payment processing service for admin-initiated purchases
//  Allows admins to purchase passes for clients using their saved cards or new cards
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFunctions

@MainActor
final class StripeService: ObservableObject {
    // MARK: - Published State
    
    @Published var lastPaymentIntentId: String?
    @Published private(set) var isProcessing = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties
    
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let functions = Functions.functions()
    
    // MARK: - Payment Processing
    
    /// Create and confirm payment using saved card (admin purchasing for client)
    /// - Parameters:
    ///   - clientUserId: The client's Firebase Auth UID
    ///   - packageType: Package type identifier (e.g., "private", "2_athlete")
    ///   - amount: Amount in cents (e.g., 8000 = $80.00)
    ///   - trainerId: Optional trainer ID
    ///   - orgId: Organization ID
    ///   - paymentMethodId: Client's saved payment method ID
    /// - Returns: Payment intent ID and client secret
    func createAndConfirmPaymentForClient(
        clientUserId: String,
        packageType: String,
        amount: Int,
        trainerId: String?,
        orgId: String,
        paymentMethodId: String
    ) async throws -> (paymentIntentId: String, clientSecret: String) {
        isProcessing = true
        error = nil
        defer { isProcessing = false }
        
        guard Auth.auth().currentUser != nil else {
            let authError = StripeError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        let callable = functions.httpsCallable("createAndConfirmPaymentDirect")
        var data: [String: Any] = [
            "orgId": orgId,
            "packageType": packageType,
            "amount": amount,
            "userId": clientUserId, // The client's user ID
            "paymentMethodId": paymentMethodId
        ]
        
        // Add trainerId if provided
        if let trainerId = trainerId, !trainerId.isEmpty {
            data["trainerId"] = trainerId
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
            print("❌ Error creating payment for client with saved card: \(paymentError)")
            throw wrappedError
        }
    }
    
    /// Create a payment intent for a lesson package (for new card entry)
    /// - Parameters:
    ///   - clientUserId: The client's Firebase Auth UID
    ///   - packageType: Package type identifier
    ///   - amount: Amount in cents
    ///   - trainerId: Optional trainer ID
    ///   - orgId: Organization ID
    /// - Returns: Client secret for Stripe Payment Sheet
    func createPaymentIntentForClient(
        clientUserId: String,
        packageType: String,
        amount: Int,
        trainerId: String?,
        orgId: String
    ) async throws -> String {
        guard Auth.auth().currentUser != nil else {
            let authError = StripeError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        let callable = functions.httpsCallable("createPaymentIntentDirect")
        var data: [String: Any] = [
            "orgId": orgId,
            "packageType": packageType,
            "amount": amount,
            "userId": clientUserId
        ]
        
        // Add trainerId if provided
        if let trainerId = trainerId, !trainerId.isEmpty {
            data["trainerId"] = trainerId
        }
        
        do {
            let result = try await callable.call(data)
            guard let resultData = result.data as? [String: Any],
                  let clientSecret = resultData["clientSecret"] as? String else {
                throw StripeError.invalidResponse
            }
            
            // Extract payment intent ID from client secret
            self.lastPaymentIntentId = clientSecret.components(separatedBy: "_secret_").first ?? ""
            return clientSecret
        } catch let createError {
            let wrappedError = StripeError.paymentFailed(createError.localizedDescription)
            self.error = wrappedError
            throw wrappedError
        }
    }
    
    /// Confirm payment and create lesson package (after Payment Sheet completion)
    /// - Parameters:
    ///   - paymentIntentId: Payment intent ID
    ///   - clientUserId: Client's Firebase Auth UID
    func confirmPaymentForClient(paymentIntentId: String, clientUserId: String) async throws {
        isProcessing = true
        error = nil
        defer { isProcessing = false }
        
        guard Auth.auth().currentUser != nil else {
            let authError = StripeError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        let callable = functions.httpsCallable("confirmPaymentAndCreatePackageDirect")
        let data: [String: Any] = [
            "paymentIntentId": paymentIntentId,
            "userId": clientUserId
        ]
        
        do {
            _ = try await callable.call(data)
        } catch let confirmError {
            let wrappedError = StripeError.paymentFailed(confirmError.localizedDescription)
            self.error = wrappedError
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
                return "Admin must be signed in to process payments"
            case .invalidResponse:
                return "Invalid response from payment server"
            case .paymentFailed(let message):
                return "Payment failed: \(message)"
            }
        }
    }
}
