//
//  SkedenceApp.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import Combine
import FirebaseCore
import FirebaseAppCheck
import FirebaseCrashlytics
import FirebaseAnalytics
import StripePaymentSheet

@main
struct SkedenceApp: App {
    @StateObject private var deepLinkManager = DeepLinkManager()

    init() {
        // CRITICAL: Set App Check provider BEFORE Firebase configuration
        #if DEBUG
        // Use debug provider in development
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #else
        // Use DeviceCheck provider in production
        let providerFactory = AppAttestProviderFactory()
        AppCheck.setAppCheckProviderFactory(providerFactory)
        #endif
        
        // Configure Firebase AFTER setting App Check provider
        FirebaseApp.configure()
        
        // Initialize Analytics and Crashlytics services
        _ = AnalyticsService.shared
        _ = CrashlyticsService.shared
        
        // Enable Analytics collection
        #if DEBUG
        Analytics.setAnalyticsCollectionEnabled(false)
        print("🔧 Analytics: Disabled in DEBUG mode")
        #else
        Analytics.setAnalyticsCollectionEnabled(true)
        print("🔧 Analytics: Enabled in RELEASE mode")
        #endif

        // Stripe publishable key is now loaded dynamically per organization
        // from organizations/{orgId}/stripe/config via direct API key integration.
        // Each organization provides their own Stripe keys during setup.
        // The key is set dynamically when creating payment intents.
        // Do not set a global default key here.
        // StripeAPI.defaultPublishableKey = ...
    }

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(deepLinkManager)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }
    
    private func handleDeepLink(_ url: URL) {
        print("🔗 Deep link received: \(url)")
        
        // Parse skedence://register?orgCode=POLY24
        guard url.scheme == "skedence" else {
            print("❌ Invalid URL scheme: \(url.scheme ?? "none")")
            return
        }
        
        if url.host == "register" {
            // Extract query parameters
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let queryItems = components.queryItems else {
                print("❌ No query parameters found")
                return
            }
            
            if let orgCode = queryItems.first(where: { $0.name == "orgCode" })?.value {
                print("✅ Organization code from deep link: \(orgCode)")
                deepLinkManager.organizationCode = orgCode
                deepLinkManager.shouldNavigateToRegister = true
            }
        }
    }
}

// Deep Link Manager
class DeepLinkManager: ObservableObject {
    @Published var organizationCode: String?
    @Published var shouldNavigateToRegister: Bool = false
}
