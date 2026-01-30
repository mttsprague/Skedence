//
//  StoreKitManager.swift
//  SkedenceAdmin
//
//  Manages Apple In-App Purchase subscriptions using StoreKit 2
//  Handles purchase, restore, and subscription status checking
//

import Foundation
import StoreKit
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
            print("✅ Loaded \(storeProducts.count) products from App Store")
        } catch {
            print("❌ Failed to load products: \(error)")
            errorMessage = "Failed to load subscription options. Please try again."
        }
    }
    
    // MARK: - Check Subscription Status
    
    func checkSubscriptionStatus() async {
        // Check for active subscription - find the most recent one
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
            
            print("✅ Active subscription found: \(planName) (purchased: \(transaction.purchaseDate))")
            return
        }
        
        // No active subscription
        subscriptionStatus = nil
        purchasedProductIDs.removeAll()
        print("ℹ️ No active subscription")
    }
    
    // MARK: - Purchase Subscription
    
    func purchase(_ product: Product, organizationId: String) async -> Bool {
        do {
            // Check if eligible for free trial
            let isEligibleForTrial = await checkTrialEligibility(productID: product.id)
            
            let options: Set<Product.PurchaseOption> = []
            
            // Add promotional offer if eligible for trial
            if isEligibleForTrial, let offerID = Self.trialOfferIDs[product.id] {
                // Note: For promotional offers to work, you need to sign the offer
                // This requires App Store Connect API key setup
                print("ℹ️ User eligible for trial: \(offerID)")
            }
            
            let result = try await product.purchase(options: options)
            
            switch result {
            case .success(let verification):
                // Check the verification result
                switch verification {
                case .verified(let transaction):
                    // Successful purchase
                    print("✅ Purchase successful: \(product.id)")
                    
                    // Update local state with THIS transaction (don't scan all)
                    purchasedProductIDs.insert(product.id)
                    
                    // Set subscription status directly from the purchased transaction
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
                    
                    print("✅ Active subscription set: \(planName) (just purchased)")
                    
                    // Finish the transaction
                    await transaction.finish()
                    
                    // Sync to backend
                    await syncSubscriptionToBackend(transaction: transaction)
                    
                    return true
                    
                case .unverified(_, let error):
                    print("❌ Purchase verification failed: \(error)")
                    errorMessage = "Purchase could not be verified. Please contact support."
                    return false
                }
                
            case .userCancelled:
                print("ℹ️ User cancelled purchase")
                return false
                
            case .pending:
                print("⏳ Purchase pending (Ask to Buy)")
                errorMessage = "Purchase is pending approval."
                return false
                
            @unknown default:
                print("❌ Unknown purchase result")
                return false
            }
        } catch {
            print("❌ Purchase failed: \(error)")
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
                print("✅ Purchases restored successfully")
                return true
            } else {
                print("ℹ️ No previous purchases found")
                errorMessage = "No previous subscriptions found."
                return false
            }
        } catch {
            print("❌ Failed to restore purchases: \(error)")
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
                print("❌ Failed to show manage subscriptions: \(error)")
                errorMessage = "Could not open subscription management."
            }
        }
        #else
        // Not supported on this platform
        #endif
    }
    
    // MARK: - Helper Methods
    
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
            print("❌ Cannot sync: No authenticated user")
            return
        }
        
        // Get organization ID from orgMembers collection (same as AuthManager)
        let db = Firestore.firestore()
        let orgId: String?
        
        do {
            let snapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: currentUser.uid)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first {
                orgId = doc.data()["orgId"] as? String
            } else {
                orgId = nil
            }
        } catch {
            print("❌ Cannot sync: Failed to query orgMembers - \(error)")
            return
        }
        
        guard let organizationId = orgId else {
            print("❌ Cannot sync: User has no active organization in orgMembers")
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
            print("❌ Cannot sync: No receipt available")
            return
        }
        
        let functions = Functions.functions()
        let data: [String: Any] = [
            "receipt": receipt,
            "productID": transaction.productID,
            "transactionID": String(transaction.id),
            "organizationId": organizationId
        ]
        
        do {
            let result = try await functions.httpsCallable("validateAppleReceipt").call(data)
            print("✅ Synced subscription to backend: \(result.data)")
        } catch {
            print("❌ Failed to sync to backend: \(error)")
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
        print("📱 Transaction update received: \(transaction.productID)")
        await checkSubscriptionStatus()
    }
    
    // MARK: - Product Display Helpers
    
    func displayPrice(for product: Product) -> String {
        return product.displayPrice
    }
    
    func isCurrentSubscription(_ product: Product) -> Bool {
        return subscriptionStatus?.productID == product.id
    }
}
