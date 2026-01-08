//
//  SkedenceApp.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import FirebaseCore
import StripePaymentSheet

@main
struct SkedenceApp: App {

    init() {
        // Configure Firebase
        FirebaseApp.configure()

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
