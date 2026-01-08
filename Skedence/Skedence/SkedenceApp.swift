//
//  SkedenceApp.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import FirebaseCore
import FirebaseCrashlytics
import FirebaseAnalytics
import StripePaymentSheet

@main
struct SkedenceApp: App {

    init() {
        // Configure Firebase
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
        // via the backend (e.g., organization.stripe.publishableKey).
        // Do not set a global default key here.
        // StripeAPI.defaultPublishableKey = ...
    }

    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
