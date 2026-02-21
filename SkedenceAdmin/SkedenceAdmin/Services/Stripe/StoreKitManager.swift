//
//  StoreKitManager.swift
//  SkedenceAdmin
//
//  Manages Apple In-App Purchase subscriptions using StoreKit 2
//  Handles purchase, restore, and subscription status checking
//

import Foundation
import StoreKit
import Combine
import FirebaseFunctions
import FirebaseAuth
import FirebaseFirestore
#if canImport(UIKit)
import UIKit
#endif
import Combine

@MainActor
class StoreKitManager: ObservableObject {
    // Product IDs from App Store Connect
    static let productIDs = [
        "skedence_starter_monthly",
        "skedence_studio_monthly",
        "skedence_academy_monthly",
        "skedence_enterprise_monthly"
    ]
    
    // Free trial offer IDs
    static let trialOfferIDs: [String: String] = [
        "skedence_starter_monthly": "starter_free_trial",
        "skedence_studio_monthly": "studio_free_trial",
        "skedence_academy_monthly": "free_trial",
        "skedence_enterprise_monthly": "14_day_free_trial"
    ]
    
    @Published private(set) var products: [Product] = []
    @Published private(set) var purchasedProductIDs: Set<String> = []
    @Published private(set) var subscriptionStatus: SubscriptionStatus?
    @Published var errorMessage: String?
    
    private var transactionUpdateTask: Task<Void, Never>?
    
    // Store the user's active subscription choice in UserDefaults
    private var activeSubscriptionKey = "activeSubscriptionProductID"
    private var activeSubscriptionProductID: String? {
        get { UserDefaults.standard.string(forKey: activeSubscriptionKey) }
        set { UserDefaults.standard.set(newValue, forKey: activeSubscriptionKey) }
    }
    
    struct SubscriptionStatus {
        let productID: String
        let planName: String
        let expirationDate: Date?
        let isInTrialPeriod: Bool
        let willAutoRenew: Bool
    }
    
    init() {
        transactionUpdateTask = observeTransactionUpdates()
    }
    deinit {
        transactionUpdateTask?.cancel()
    }
    
    // MARK: - Load Products
    
    func loadProducts() async {
        do {
            let storeProducts = try await Product.products(for: Self.productIDs)
            self.products = storeProducts.sorted { $0.price < $1.price }
        } catch {
            errorMessage = "Failed to load subscription options. Please try again."
        }
    }
    
    // MARK: - Check Subscription Status
    
    func checkSubscriptionStatus() async {
        // If user has explicitly chosen a subscription, use that one
        if let activeProductID = activeSubscriptionProductID {
            
            // Find the transaction for the user's chosen subscription
            for await result in StoreKit.Transaction.currentEntitlements {
                guard case .verified(let transaction) = result else { continue }
                
                if transaction.productID == activeProductID {
                    let planName = planName(from: transaction.productID)
                    
                    let isIntroductory: Bool
                    if #available(iOS 17.2, macOS 14.2, watchOS 10.2, tvOS 17.2, *) {
                        isIntroductory = (transaction.offer?.type == .introductory)
                    } else {
                        isIntroductory = (transaction.offerType == .introductory)
                    }
                    
                    subscriptionStatus = SubscriptionStatus(
                        productID: transaction.productID,
                        planName: planName,
                        expirationDate: transaction.expirationDate,
                        isInTrialPeriod: isIntroductory,
                        willAutoRenew: transaction.revocationDate == nil
                    )
                    
                    purchasedProductIDs.insert(transaction.productID)
                    await syncSubscriptionToBackend(transaction: transaction)
                    
                    return
                }
            }
            
        }
        
        // Fallback: Check for active subscription - find the most recent one
        var mostRecentTransaction: StoreKit.Transaction?
        var mostRecentDate: Date?
        
        for await result in StoreKit.Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            
            // Found an active subscription (ensure it's one of our known product IDs)
            if Self.productIDs.contains(transaction.productID) {
                let transactionDate = transaction.purchaseDate
                
                // Keep track of the most recent transaction
                if mostRecentDate == nil || transactionDate > mostRecentDate! {
                    mostRecentDate = transactionDate
                    mostRecentTransaction = transaction
                }
            }
        }
        
        // Use the most recent transaction
        if let transaction = mostRecentTransaction {
            let planName = planName(from: transaction.productID)
            
            let isIntroductory: Bool
            if #available(iOS 17.2, macOS 14.2, watchOS 10.2, tvOS 17.2, *) {
                isIntroductory = (transaction.offer?.type == .introductory)
            } else {
                // Fallback for earlier OS versions
                isIntroductory = (transaction.offerType == .introductory)
            }
            
            subscriptionStatus = SubscriptionStatus(
                productID: transaction.productID,
                planName: planName,
                expirationDate: transaction.expirationDate,
                isInTrialPeriod: isIntroductory,
                willAutoRenew: transaction.revocationDate == nil
            )
            
            purchasedProductIDs.insert(transaction.productID)
            
            // Sync to backend
            await syncSubscriptionToBackend(transaction: transaction)
            
            return
        }
        
        // No active subscription
        subscriptionStatus = nil
        purchasedProductIDs.removeAll()
    }
    
    // MARK: - Purchase Subscription
    
    func purchase(_ product: Product, organizationId: String) async -> Bool {
        do {
            // Check if eligible for free trial
            let isEligibleForTrial = await checkTrialEligibility(productID: product.id)
            
            // Add promotional offer if eligible for trial
            if isEligibleForTrial {
                // In sandbox, trials work automatically without explicit offer code
                // The subscription group in App Store Connect handles this
            }
            
            let result = try await product.purchase()
            
            switch result {
            case .success(let verification):
                // Check the verification result
                switch verification {
                case .verified(let transaction):
                    // Successful purchase
                    
                    // Cancel all other active subscriptions before activating this one
                    await cancelOtherSubscriptions(except: product.id)
                    
                    // Store user's choice persistently - this is what matters most
                    activeSubscriptionProductID = product.id
                    
                    // Use the product the user clicked, not what StoreKit returned
                    // In sandbox, transactions can be stale or wrong, so trust user intent
                    purchasedProductIDs.insert(product.id)
                    
                    let planName = planName(from: product.id)
                    let isIntroductory: Bool
                    if #available(iOS 17.2, macOS 14.2, watchOS 10.2, tvOS 17.2, *) {
                        isIntroductory = (transaction.offer?.type == .introductory)
                    } else {
                        isIntroductory = (transaction.offerType == .introductory)
                    }
                    
                    subscriptionStatus = SubscriptionStatus(
                        productID: product.id,  // Use what user clicked, not transaction.productID
                        planName: planName,
                        expirationDate: transaction.expirationDate,
                        isInTrialPeriod: isIntroductory,
                        willAutoRenew: transaction.revocationDate == nil
                    )
                    
                    
                    // Sync to backend BEFORE finishing the transaction
                    await syncSubscriptionToBackend(transaction: transaction)
                    
                    // Finish the transaction
                    await transaction.finish()
                    
                    return true
                    
                case .unverified(_, _):
                    errorMessage = "Purchase could not be verified. Please contact support."
                    return false
                }
                
            case .userCancelled:
                return false
                
            case .pending:
                errorMessage = "Purchase is pending approval."
                return false
                
            @unknown default:
                return false
            }
        } catch {
            errorMessage = "Purchase failed. Please try again."
            return false
        }
    }
    
    // MARK: - Restore Purchases
    
    func restorePurchases() async -> Bool {
        do {
            try await AppStore.sync()
            await checkSubscriptionStatus()
            
            if subscriptionStatus != nil {
                return true
            } else {
                errorMessage = "No previous subscriptions found."
                return false
            }
        } catch {
            errorMessage = "Failed to restore purchases. Please try again."
            return false
        }
    }
    
    // MARK: - Manage Subscription (opens App Store)
    
    func manageSubscription() async {
        #if canImport(UIKit)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            do {
                try await AppStore.showManageSubscriptions(in: scene)
            } catch {
                errorMessage = "Could not open subscription management."
            }
        }
        #else
        // Not supported on this platform
        #endif
    }
    
    // MARK: - Helper Methods
    
    private func cancelOtherSubscriptions(except productID: String) async {
        
        var canceledCount = 0
        for await result in StoreKit.Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            
            // Skip the one we just purchased
            if transaction.productID == productID {
                continue
            }
            
            // Finish the transaction
            await transaction.finish()
            canceledCount += 1
        }
        
    }
    
    private func checkTrialEligibility(productID: String) async -> Bool {
        // Check if user has ever subscribed to this product
        for await result in StoreKit.Transaction.all {
            guard case .verified(let transaction) = result else { continue }
            
            if transaction.productID == productID {
                // User has purchased this product before
                return false
            }
        }
        
        // User has never subscribed
        return true
    }
    
    private func planName(from productID: String) -> String {
        switch productID {
        case "skedence_starter_monthly": return "starter"
        case "skedence_studio_monthly": return "studio"
        case "skedence_academy_monthly": return "academy"
        case "skedence_enterprise_monthly": return "enterprise"
        default: return "free"
        }
    }
    
    private func syncSubscriptionToBackend(transaction: StoreKit.Transaction) async {
        guard let currentUser = Auth.auth().currentUser else {
            return
        }
        
        // Get organization ID from orgMembers collection (same as AuthManager)
        let db = Firestore.firestore()
        let orgId: String?
        
        do {
            let snapshot = try await db.collection("orgMembers")
                .whereField("authUserId", isEqualTo: currentUser.uid)  // Fixed: Use authUserId field, not userId
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first {
                orgId = doc.data()["orgId"] as? String
            } else {
                orgId = nil
            }
        } catch {
            return
        }
        
        guard let organizationId = orgId else {
            return
        }
        
        // Get receipt - try both methods for sandbox/production compatibility
        let receipt: String
        if let bundleReceipt = await getReceiptData() {
            receipt = bundleReceipt
        } else if let jwsRepresentation = await getJWSRepresentation(for: transaction) {
            // StoreKit 2 JWS token (works better in sandbox)
            receipt = jwsRepresentation
        } else {
            return
        }
        
        // Get trial status from StoreKit 2 transaction (more reliable than verifyReceipt)
        let isInTrial: Bool
        if #available(iOS 17.2, macOS 14.2, watchOS 10.2, tvOS 17.2, *) {
            isInTrial = (transaction.offer?.type == .introductory)
        } else {
            isInTrial = (transaction.offerType == .introductory)
        }
        
        let functions = Functions.functions()
        var data: [String: Any] = [
            "receipt": receipt,
            "productID": transaction.productID,
            "transactionID": String(transaction.id),
            "organizationId": organizationId,
            "isTrialPeriod": isInTrial  // Pass trial status from StoreKit 2
        ]
        
        // Add expiration date if available
        if let expirationDate = transaction.expirationDate {
            data["expiresAt"] = ISO8601DateFormatter().string(from: expirationDate)
        }
        
        
        do {
            _ = try await functions.httpsCallable("validateAppleReceipt").call(data)
        } catch {
            // Don't show error to user - subscription still works locally
        }
    }
    
    private func getJWSRepresentation(for transaction: StoreKit.Transaction) async -> String? {
        // Get the JWS representation which works in sandbox
        // jsonRepresentation is Data; base64-encode it to a String
        return transaction.jsonRepresentation.base64EncodedString()
    }
    
    private func getReceiptData() async -> String? {
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              let receiptData = try? Data(contentsOf: receiptURL) else {
            return nil
        }
        return receiptData.base64EncodedString()
    }
    
    // MARK: - Transaction Observer
    
    private func observeTransactionUpdates() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                
                await self?.handleTransactionUpdate(transaction)
                await transaction.finish()
            }
        }
    }
    
    private func handleTransactionUpdate(_ transaction: StoreKit.Transaction) async {
        
        // Only update if this is the most recent subscription
        // Check if we already have a newer subscription
        if let currentStatus = subscriptionStatus,
           let currentExpiration = currentStatus.expirationDate,
           let newExpiration = transaction.expirationDate,
           newExpiration <= currentExpiration {
            return
        }
        
        // This is the most recent subscription, update status
        let planName = planName(from: transaction.productID)
        let isIntroductory: Bool
        if #available(iOS 17.2, macOS 14.2, watchOS 10.2, tvOS 17.2, *) {
            isIntroductory = (transaction.offer?.type == .introductory)
        } else {
            isIntroductory = (transaction.offerType == .introductory)
        }
        
        subscriptionStatus = SubscriptionStatus(
            productID: transaction.productID,
            planName: planName,
            expirationDate: transaction.expirationDate,
            isInTrialPeriod: isIntroductory,
            willAutoRenew: transaction.revocationDate == nil
        )
        
        
        // Sync to backend
        await syncSubscriptionToBackend(transaction: transaction)
    }
    
    // MARK: - Product Display Helpers
    
    func displayPrice(for product: Product) -> String {
        return product.displayPrice
    }
    
    func isCurrentSubscription(_ product: Product) -> Bool {
        return subscriptionStatus?.productID == product.id
    }
}
