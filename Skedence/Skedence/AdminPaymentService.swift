//
//  AdminPaymentService.swift
//  Skedence
//
//  Service for admin payment processing using saved Stripe keys
//

import Foundation
import FirebaseAuth
import FirebaseFunctions
import FirebaseFirestore

@MainActor
final class AdminPaymentService: ObservableObject {
    @Published var isProcessing: Bool = false
    @Published var errorMessage: String?
    @Published var savedPaymentMethods: [SavedPaymentMethod] = []
    
    private let functions = Functions.functions()
    private let db = Firestore.firestore()
    
    // Charge a client's card
    func chargeClient(
        clientId: String,
        amount: Double, // in dollars
        description: String,
        saveCard: Bool
    ) async throws -> String {
        isProcessing = true
        errorMessage = nil
        
        defer { isProcessing = false }
        
        let amountInCents = Int(amount * 100)
        
        let callable = functions.httpsCallable("adminChargeClient")
        let data: [String: Any] = [
            "clientId": clientId,
            "amount": amountInCents,
            "description": description,
            "saveCard": saveCard
        ]
        
        do {
            let result = try await callable.call(data)
            guard let resultData = result.data as? [String: Any],
                  let clientSecret = resultData["clientSecret"] as? String,
                  let paymentIntentId = resultData["paymentIntentId"] as? String else {
                throw PaymentError.invalidResponse
            }
            
            return clientSecret
            
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }
    
    // Confirm payment after Stripe processing
    func confirmCharge(
        paymentIntentId: String,
        clientId: String,
        amount: Double,
        description: String
    ) async throws -> String {
        isProcessing = true
        errorMessage = nil
        
        defer { isProcessing = false }
        
        let callable = functions.httpsCallable("adminConfirmCharge")
        let data: [String: Any] = [
            "paymentIntentId": paymentIntentId,
            "clientId": clientId,
            "amount": Int(amount * 100),
            "description": description
        ]
        
        do {
            let result = try await callable.call(data)
            guard let resultData = result.data as? [String: Any],
                  let transactionId = resultData["transactionId"] as? String else {
                throw PaymentError.invalidResponse
            }
            
            return transactionId
            
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }
    
    // Load saved payment methods for a client
    func loadSavedPaymentMethods(clientId: String) async {
        do {
            let snapshot = try await db.collection("users")
                .document(clientId)
                .collection("paymentMethods")
                .getDocuments()
            
            savedPaymentMethods = snapshot.documents.compactMap { doc in
                let data = doc.data()
                return SavedPaymentMethod(
                    id: doc.documentID,
                    stripePaymentMethodId: data["stripePaymentMethodId"] as? String ?? "",
                    last4: data["last4"] as? String ?? "",
                    brand: data["brand"] as? String ?? "",
                    expiryMonth: data["expiryMonth"] as? Int ?? 0,
                    expiryYear: data["expiryYear"] as? Int ?? 0
                )
            }
        } catch {
            print("Error loading payment methods: \(error)")
            savedPaymentMethods = []
        }
    }
}

// MARK: - Models

struct SavedPaymentMethod: Identifiable {
    let id: String
    let stripePaymentMethodId: String
    let last4: String
    let brand: String
    let expiryMonth: Int
    let expiryYear: Int
    
    var displayName: String {
        "\(brand.capitalized) •••• \(last4)"
    }
    
    var expiryDisplay: String {
        String(format: "%02d/%d", expiryMonth, expiryYear)
    }
}

enum PaymentError: LocalizedError {
    case invalidResponse
    case notAuthenticated
    case paymentFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .notAuthenticated:
            return "User not authenticated"
        case .paymentFailed(let message):
            return "Payment failed: \(message)"
        }
    }
}
