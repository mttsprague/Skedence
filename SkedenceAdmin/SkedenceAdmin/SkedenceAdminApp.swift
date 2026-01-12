//
//  SkedenceAdminApp.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import SwiftData

#if canImport(FirebaseCore)
import FirebaseCore
#endif

@main
struct SkedenceAdminApp: App {
    @StateObject private var auth = AuthManager()
    @StateObject private var subscriptionStatus = SubscriptionStatusService.shared
    @StateObject private var onboardingCoordinator = OnboardingCoordinator()

    init() {
        configureFirebaseIfAvailable()
    }

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Item.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            // Show onboarding if not authenticated OR if authenticated but onboarding not complete
            if !auth.isAuthenticated {
                OnboardingLandingView()
                    .environmentObject(auth)
                    .environmentObject(onboardingCoordinator)
            } else if auth.isAuthenticated && !auth.onboardingComplete {
                // User is authenticated but hasn't finished onboarding
                // Show the onboarding flow which will handle both new and returning incomplete users
                OnboardingFlowView()
                    .environmentObject(auth)
                    .environmentObject(onboardingCoordinator)
            } else {
                ContentViewWrapper()
                    .environmentObject(auth)
                    .environmentObject(subscriptionStatus)
                    .task {
                        // Monitor subscription status after auth
                        if let orgId = auth.currentOrgId {
                            subscriptionStatus.monitorOrgStatus(organizationId: orgId)
                        }
                    }
            }
        }
        .modelContainer(sharedModelContainer)
    }
}

private func configureFirebaseIfAvailable() {
    #if canImport(FirebaseCore)
    if FirebaseApp.app() == nil {
        FirebaseApp.configure()
    }
    #endif
}
