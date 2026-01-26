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
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    @StateObject private var auth = AuthManager()
    @StateObject private var subscriptionStatus = SubscriptionStatusService.shared
    @StateObject private var onboardingCoordinator = OnboardingCoordinator()
    @State private var stripeConnectCompleted = false
    @State private var passwordSetupData: (token: String, email: String, trainerId: String)?

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
                // Show password setup if coming from invitation link
                if let setupData = passwordSetupData {
                    PasswordSetupView(
                        setupToken: setupData.token,
                        email: setupData.email,
                        trainerId: setupData.trainerId
                    )
                    .environmentObject(auth)
                    .onDisappear {
                        // Clear setup data after view dismisses
                        passwordSetupData = nil
                    }
                }
                // Show onboarding if not authenticated OR if authenticated but onboarding not complete
                else if !auth.isAuthenticated {
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
        print("📱 Deep link received: \(url)")
        
        // Handle password setup invitation (skedence://setup-password?token=xxx&email=xxx&trainerId=xxx)
        if url.scheme == "skedence" && url.host == "setup-password" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let queryItems = components.queryItems else {
                print("❌ Invalid setup-password deep link")
                return
            }
            
            let token = queryItems.first(where: { $0.name == "token" })?.value
            let email = queryItems.first(where: { $0.name == "email" })?.value
            let trainerId = queryItems.first(where: { $0.name == "trainerId" })?.value
            
            guard let token = token, let email = email, let trainerId = trainerId else {
                print("❌ Missing parameters in setup-password deep link")
                return
            }
            
            print("✅ Password setup link parsed - email: \(email), trainerId: \(trainerId)")
            passwordSetupData = (token: token, email: email, trainerId: trainerId)
            return
        }
        
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
                            let functions = Functions.functions(region: "us-central1")
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
