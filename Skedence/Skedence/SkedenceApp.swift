//
//  SkedenceApp.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import Combine
import FirebaseCore
import FirebaseAuth
import FirebaseAppCheck
import FirebaseCrashlytics
import FirebaseAnalytics
import StripePaymentSheet

@main
struct SkedenceApp: App {
    @StateObject private var deepLinkManager = DeepLinkManager()

    init() {
        // Set App Check provider BEFORE Firebase configuration
        #if DEBUG
        // Use debug provider in development (requires debug token in Firebase Console)
        // Debug token: 8A00467A-7CFE-4B16-9F4E-BAD0B9B7C35F
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        print("🔧 App Check: Using DEBUG provider")
        #else
        // Use DeviceCheck provider in production (requires valid provisioning)
        AppCheck.setAppCheckProviderFactory(DeviceCheckProviderFactory())
        print("🔧 App Check: Using DeviceCheck provider")
        #endif
        
        // Configure Firebase
        FirebaseApp.configure()
        
        // Explicitly set auth persistence to ensure sessions persist across app launches
        // This stores auth tokens in iOS Keychain
        do {
            try Auth.auth().useUserAccessGroup(nil) // Use default keychain access group
            print("🔧 Auth: Configured with Keychain persistence")
        } catch {
            print("⚠️ Auth: Failed to configure persistence: \(error.localizedDescription)")
        }
        
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
