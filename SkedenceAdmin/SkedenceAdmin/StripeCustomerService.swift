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
    @Published var paymentMethods: [PaymentMethodInfo] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let functions = Functions.functions()
    
    // Load saved payment methods for a specific user (used by admin)
    func loadPaymentMethodsForUser(userId: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let callable = functions.httpsCallable("getPaymentMethodsForUser")
            let result = try await callable.call(["userId": userId])
            
            guard let data = result.data as? [String: Any],
                  let methodsData = data["paymentMethods"] as? [[String: Any]] else {
                paymentMethods = []
                isLoading = false
                return
            }
            
            paymentMethods = methodsData.compactMap { methodData in
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
        } catch {
            errorMessage = error.localizedDescription
            paymentMethods = []
        }
        
        isLoading = false
    }
}

enum StripeCustomerError: Error, LocalizedError {
    case notAuthenticated
    case invalidResponse
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to manage payment methods"
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
}
