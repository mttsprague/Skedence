//
//  CloudFunctionsRepository.swift
//  Skedence
//
//  Phase 4.1: Cloud Functions call wrapper (base for Cancellation, Stripe, etc.)
//

import Foundation
import FirebaseFunctions
import FirebaseFirestore

/// Base repository for Cloud Functions calls
/// Used by services that primarily interact with backend functions rather than Firestore
@MainActor
class CloudFunctionsRepository {
    let functions = Functions.functions()
    
    /// Call a Cloud Function and return the result
    func callFunction(
        name: String,
        data: [String: Any]
    ) async throws -> [String: Any] {
        let callable = functions.httpsCallable(name)
        let result = try await callable.call(data)
        
        guard let resultData = result.data as? [String: Any] else {
            throw RepositoryError.invalidData("Invalid function response format")
        }
        
        return resultData
    }
    
    /// Call a Cloud Function that returns a string value
    func callFunctionForString(
        name: String,
        data: [String: Any],
        key: String
    ) async throws -> String {
        let result = try await callFunction(name: name, data: data)
        
        guard let value = result[key] as? String else {
            throw RepositoryError.invalidData("Missing or invalid \(key) in response")
        }
        
        return value
    }
    
    /// Call a Cloud Function that returns a boolean value
    func callFunctionForBool(
        name: String,
        data: [String: Any],
        key: String
    ) async throws -> Bool {
        let result = try await callFunction(name: name, data: data)
        
        guard let value = result[key] as? Bool else {
            throw RepositoryError.invalidData("Missing or invalid \(key) in response")
        }
        
        return value
    }
}

// MARK: - CancellationRepository

final class CancellationRepository: CloudFunctionsRepository {
    /// Cancel a lesson booking via Cloud Function
    func cancelLesson(bookingId: String) async throws -> [String: Any] {
        return try await callFunction(
            name: "cancelLesson",
            data: ["bookingId": bookingId]
        )
    }
}

// MARK: - StripeRepository

final class StripeRepository: CloudFunctionsRepository {
    /// Create a payment intent via Cloud Function
    func createPaymentIntent(
        packageType: String,
        amount: Int,
        trainerId: String,
        userId: String,
        orgId: String?
    ) async throws -> (clientSecret: String, publishableKey: String?) {
        let functionName = orgId != nil ? "createPaymentIntentDirect" : "createPaymentIntent"
        var data: [String: Any] = [
            "packageType": packageType,
            "amount": amount,
            "trainerId": trainerId,
            "userId": userId
        ]
        
        if let orgId = orgId {
            data["orgId"] = orgId
        }
        
        let result = try await callFunction(name: functionName, data: data)
        
        guard let clientSecret = result["clientSecret"] as? String else {
            throw RepositoryError.invalidData("Missing clientSecret in payment intent response")
        }
        
        let publishableKey = result["publishableKey"] as? String
        return (clientSecret, publishableKey)
    }
    
    /// Confirm a payment intent
    func confirmPaymentIntent(
        paymentIntentId: String,
        packageId: String
    ) async throws {
        _ = try await callFunction(
            name: "confirmPaymentAndCreatePackageDirect",
            data: [
                "paymentIntentId": paymentIntentId,
                "packageId": packageId
            ]
        )
    }
}

// MARK: - StripeCustomerRepository

final class StripeCustomerRepository: CloudFunctionsRepository {
    /// Get or create Stripe customer
    func getOrCreateCustomer(userId: String) async throws -> String {
        return try await callFunctionForString(
            name: "getOrCreateCustomer",
            data: ["userId": userId],
            key: "customerId"
        )
    }
    
    /// Attach payment method to customer
    func attachPaymentMethod(
        paymentMethodId: String,
        customerId: String
    ) async throws {
        _ = try await callFunction(
            name: "attachPaymentMethod",
            data: [
                "paymentMethodId": paymentMethodId,
                "customerId": customerId
            ]
        )
    }
    
    /// Detach payment method from customer
    func detachPaymentMethod(paymentMethodId: String) async throws {
        _ = try await callFunction(
            name: "detachPaymentMethod",
            data: ["paymentMethodId": paymentMethodId]
        )
    }
    
    /// Fetch payment methods for organization
    func fetchPaymentMethods(orgId: String, userId: String) async throws -> [[String: Any]] {
        let result = try await callFunction(
            name: "getPaymentMethodsDirect",
            data: [
                "orgId": orgId,
                "userId": userId
            ]
        )
        
        guard let methods = result["paymentMethods"] as? [[String: Any]] else {
            return []
        }
        
        return methods
    }
}

// MARK: - AdminPaymentRepository

final class AdminPaymentRepository: CloudFunctionsRepository {
    private let db = Firestore.firestore()
    
    /// Charge a client via admin payment function
    func chargeClient(
        clientId: String,
        amount: Int,
        description: String,
        saveCard: Bool
    ) async throws -> (clientSecret: String, paymentIntentId: String?) {
        let result = try await callFunction(
            name: "adminChargeClient",
            data: [
                "clientId": clientId,
                "amount": amount,
                "description": description,
                "saveCard": saveCard
            ]
        )
        
        guard let clientSecret = result["clientSecret"] as? String else {
            throw RepositoryError.invalidData("Missing clientSecret in charge response")
        }
        
        let paymentIntentId = result["paymentIntentId"] as? String
        return (clientSecret, paymentIntentId)
    }
    
    /// Fetch saved payment methods for a client
    func fetchSavedPaymentMethods(clientId: String) async throws -> [SavedPaymentMethod] {
        let snapshot = try await db.collection("users")
            .document(clientId)
            .collection("paymentMethods")
            .getDocuments()
        
        return snapshot.documents.compactMap { doc -> SavedPaymentMethod? in
            let data = doc.data()
            return decodeSavedPaymentMethod(id: doc.documentID, data: data)
        }
    }
    
    /// Charge using saved payment method
    func chargeWithSavedMethod(
        clientId: String,
        paymentMethodId: String,
        amount: Int,
        description: String
    ) async throws {
        _ = try await callFunction(
            name: "chargeWithSavedMethod",
            data: [
                "clientId": clientId,
                "paymentMethodId": paymentMethodId,
                "amount": amount,
                "description": description
            ]
        )
    }
    
    private func decodeSavedPaymentMethod(id: String, data: [String: Any]) -> SavedPaymentMethod {
        let brand = data["brand"] as? String ?? "Unknown"
        let last4 = data["last4"] as? String ?? "****"
        let expiryMonth = data["expMonth"] as? Int ?? 1
        let expiryYear = data["expYear"] as? Int ?? 2025
        
        return SavedPaymentMethod(
            id: id,
            stripePaymentMethodId: id,
            last4: last4,
            brand: brand,
            expiryMonth: expiryMonth,
            expiryYear: expiryYear
        )
    }
}
