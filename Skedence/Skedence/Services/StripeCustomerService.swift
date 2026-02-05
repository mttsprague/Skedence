//
//  StripeCustomerService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFunctions

struct PaymentMethodInfo: Identifiable {
    let id: String
    let brand: String
    let last4: String
    let expMonth: Int
    let expYear: Int
    
    var displayBrand: String {
        brand.capitalized
    }
    
    var expirationDisplay: String {
        String(format: "%02d/%d", expMonth, expYear % 100)
    }
}

@MainActor
final class StripeCustomerService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [PaymentMethodInfo] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var paymentMethods: [PaymentMethodInfo] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository = StripeCustomerRepository()
    private let functions = Functions.functions()
    private var currentOrgId: String?
    
    // MARK: - Public API
    
    /// Fetch payment methods for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        await loadPaymentMethods(orgId: orgId)
    }
    
    /// Refresh payment methods without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Get or create Stripe Customer ID for current user
    func getOrCreateCustomer() async throws -> String {
        guard let userId = Auth.auth().currentUser?.uid else {
            let authError = StripeCustomerError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        do {
            return try await repository.getOrCreateCustomer(userId: userId)
        } catch {
            self.error = mapRepositoryError(error)
            throw self.error!
        }
    }
    
    // Get existing Stripe Customer ID (returns nil if doesn't exist)
    func getStripeCustomerId() async throws -> String? {
        return try await getOrCreateCustomer()
    }
    
    /// Load saved payment methods
    func loadPaymentMethods(orgId: String) async {
        guard let userId = Auth.auth().currentUser?.uid else {
            items = []
            return
        }
        
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        do {
            let methodsData = try await repository.fetchPaymentMethods(orgId: orgId, userId: userId)
            
            items = methodsData.compactMap { methodData in
                guard let id = methodData["id"] as? String,
                      let brand = methodData["brand"] as? String,
                      let last4 = methodData["last4"] as? String,
                      let expMonth = methodData["expMonth"] as? Int,
                      let expYear = methodData["expYear"] as? Int else {
                    return nil
                }
                
                return PaymentMethodInfo(
                    id: id,
                    brand: brand,
                    last4: last4,
                    expMonth: expMonth,
                    expYear: expYear
                )
            }
        } catch let loadError {
            self.error = ServiceError.networkError(loadError)
            items = []
        }
        
        isLoading = false
    }
    
    /// Remove a payment method
    func removePaymentMethod(_ paymentMethodId: String) async throws {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw StripeCustomerError.notAuthenticated
        }
        
        let callable = functions.httpsCallable("detachPaymentMethod")
        _ = try await callable.call([
            "userId": userId,
            "paymentMethodId": paymentMethodId
        ])
        
        // Note: caller should refresh the list with the correct orgId
    }
    
    /// Set a human-readable error message (backward-compatible helper for views)
    func setErrorMessage(_ message: String) {
        self.error = ServiceError.invalidData(message)
    }
    
    // MARK: - Error Mapping
    
    private func mapRepositoryError(_ error: Error) -> Error {
        if let stripeError = error as? StripeCustomerError {
            return stripeError
        }
        return StripeCustomerError.unknownError(error.localizedDescription)
    }
}

enum StripeCustomerError: Error, LocalizedError {
    case notAuthenticated
    case invalidResponse
    case unknownError(String)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to manage payment methods"
        case .invalidResponse:
            return "Invalid response from server"
        case .unknownError(let message):
            return message
        }
    }
}

