//
//  AdminPaymentService.swift
//  Skedence
//
//  Service for admin payment processing using saved Stripe keys
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFunctions
import FirebaseFirestore

@MainActor
final class AdminPaymentService: ObservableObject {
    // MARK: - ServiceProtocol Standard Properties
    
    @Published private(set) var items: [SavedPaymentMethod] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: Error?
    
    // MARK: - Backward Compatibility
    
    /// Alias for items - maintains backward compatibility
    var savedPaymentMethods: [SavedPaymentMethod] { items }
    
    /// Alias for error message - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    /// Legacy processing state - maps to isLoading
    var isProcessing: Bool { isLoading }
    
    @Published var lastPaymentIntentId: String?
    
    private let repository = AdminPaymentRepository()
    private let functions = Functions.functions()
    private let db = Firestore.firestore()
    
    // MARK: - Error Mapping
    
    private func mapRepositoryError(_ error: Error) -> ServiceError {
        if let repoError = error as? RepositoryError {
            switch repoError {
            case .notFound:
                return ServiceError.notFound
            case .unauthorized:
                return ServiceError.unauthorized
            default:
                return ServiceError.networkError(error)
            }
        }
        return ServiceError.networkError(error)
    }
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch saved payment methods for a client
    func fetch(clientId: String) async throws {
        await loadSavedPaymentMethods(clientId: clientId)
    }
    
    /// Refresh saved payment methods for a client  
    func refresh(clientId: String) async throws {
        try await fetch(clientId: clientId)
    }
    
    // Charge a client's card
    func chargeClient(
        clientId: String,
        amount: Double, // in dollars
        description: String,
        saveCard: Bool
    ) async throws -> String {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        let amountInCents = Int(amount * 100)
        
        do {
            let (clientSecret, paymentIntentId) = try await repository.chargeClient(
                clientId: clientId,
                amount: amountInCents,
                description: description,
                saveCard: saveCard
            )
            
            // Store paymentIntentId if provided by backend
            if let paymentIntentId = paymentIntentId {
                self.lastPaymentIntentId = paymentIntentId
            }
            
            return clientSecret
            
        } catch let catchError {
            error = mapRepositoryError(catchError)
            throw error!
        }
    }
    
    // Confirm payment after Stripe processing
    func confirmCharge(
        paymentIntentId: String,
        clientId: String,
        amount: Double,
        description: String
    ) async throws -> String {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
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
            
        } catch let catchError {
            error = ServiceError.networkError(catchError)
            throw catchError
        }
    }
    
    // Load saved payment methods for a client
    func loadSavedPaymentMethods(clientId: String) async {
        do {
            let snapshot = try await db.collection("users")
                .document(clientId)
                .collection("paymentMethods")
                .getDocuments()
            
            items = snapshot.documents.compactMap { doc in
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
        } catch let catchError {
            print("Error loading payment methods: \(catchError)")
            error = ServiceError.networkError(catchError)
            items = []
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

