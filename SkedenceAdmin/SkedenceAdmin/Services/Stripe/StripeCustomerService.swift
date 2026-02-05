//
//  StripeCustomerService.swift
//  SkedenceAdmin
//
//  Created by AI Assistant on 1/16/26.
//

import Foundation
import Combine
import FirebaseFunctions
import FirebaseAuth

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
class StripeCustomerService: ObservableObject {
    @Published private(set) var paymentMethodsState: LoadingState<[PaymentMethodInfo]> = .idle
    
    private let functions = Functions.functions(region: "us-central1")
    
    // Convenience accessors for backward compatibility
    var paymentMethods: [PaymentMethodInfo] { paymentMethodsState.data ?? [] }
    var isLoading: Bool { paymentMethodsState.isLoading }
    var errorMessage: String? { paymentMethodsState.errorMessage }
    
    // Load saved payment methods for a specific user (used by admin)
    func loadPaymentMethodsForUser(userId: String, orgId: String) async {
        guard !userId.isEmpty else {
            paymentMethodsState = .error(StripeCustomerServiceError.missingUserId)
            return
        }
        
        guard !orgId.isEmpty else {
            paymentMethodsState = .error(StripeCustomerServiceError.missingOrgId)
            return
        }
        
        paymentMethodsState = .loading
        
        do {
            // Use admin-specific function that allows viewing other users' payment methods
            let callable = functions.httpsCallable("getPaymentMethodsDirectAdmin")
            let result = try await callable.call(["userId": userId, "orgId": orgId])
            
            guard let data = result.data as? [String: Any],
                  let methodsData = data["paymentMethods"] as? [[String: Any]] else {
                paymentMethodsState = .loaded([])
                return
            }
            
            let methods = methodsData.compactMap { methodData -> PaymentMethodInfo? in
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
            
            paymentMethodsState = .loaded(methods)
        } catch {
            paymentMethodsState = .error(StripeCustomerServiceError.loadFailed(error.localizedDescription))
        }
    }
}

enum StripeCustomerServiceError: Error, LocalizedError {
    case notAuthenticated
    case invalidResponse
    case missingUserId
    case missingOrgId
    case loadFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to manage payment methods"
        case .invalidResponse:
            return "Invalid response from server"
        case .missingUserId:
            return "User ID is required"
        case .missingOrgId:
            return "Organization ID is required"
        case .loadFailed(let message):
            return "Failed to load payment methods: \(message)"
        }
    }
}
