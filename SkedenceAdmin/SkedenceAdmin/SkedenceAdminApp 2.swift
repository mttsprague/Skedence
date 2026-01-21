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
import FirebaseFunctions
#endif

@main
struct SkedenceAdminApp: App {
    @StateObject private var auth = AuthManager()
    @StateObject private var subscriptionStatus = SubscriptionStatusService.shared
    @StateObject private var onboardingCoordinator = OnboardingCoordinator()
    @State private var stripeConnectCompleted = false

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
            Group {
                // Show onboarding if not authenticated OR if authenticated but onboarding not complete
                if !auth.isAuthenticated {
                    OnboardingLandingView()
                        .environmentObject(auth)
                        .environmentObject(onboardingCoordinator)
                        .onAppear {
                            // Reset coordinator when returning to landing (logged out state)
                            onboardingCoordinator.currentStep = .account
                            onboardingCoordinator.orgId = nil
                            onboardingCoordinator.userId = nil
                            onboardingCoordinator.organizationData = [:]
                        }
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
            .onOpenURL { url in
                handleDeepLink(url)
            }
        }
        .modelContainer(sharedModelContainer)
    }
    
    private func handleDeepLink(_ url: URL) {
        // Handle Stripe Connect completion
        if url.scheme == "skedenceadmin" && url.host == "stripe-connect" {
            if url.pathComponents.contains("complete") {
                // Notify that Stripe Connect was completed
                stripeConnectCompleted = true
                
                // Trigger a refresh of Stripe status
                if let orgId = auth.currentOrgId {
                    Task {
                        do {
                            #if canImport(FirebaseCore)
                            let functions = Functions.functions()
                            let callable = functions.httpsCallable("refreshConnectAccountStatus")
                            _ = try await callable.call(["orgId": orgId])
                            print("✅ Stripe Connect status refreshed after return")
                            #endif
                        } catch {
                            print("⚠️ Failed to refresh Stripe status: \(error)")
                        }
                    }
                }
            }
        }
    }
}

private func configureFirebaseIfAvailable() {
    #if canImport(FirebaseCore)
    if FirebaseApp.app() == nil {
        FirebaseApp.configure()
    }
    #endif
}
