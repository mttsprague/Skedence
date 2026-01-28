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
    @Environment(\.scenePhase) private var scenePhase

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
                        .onChange(of: scenePhase) { oldPhase, newPhase in
                            if newPhase == .active {
                                // Refresh billing when returning from Safari
                                Task {
                                    await refreshBillingAfterCheckout()
                                }
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
    
    private func refreshBillingAfterCheckout() async {
        guard let orgId = auth.currentOrgId else { return }
        
        // Wait a moment for webhook to process
        try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // Reload org branding (which includes billing data)
        await auth.loadOrgBranding(orgId: orgId)
        
        print("🔄 Billing refreshed after returning to app")
    }
    
    private func handleDeepLink(_ url: URL) {
        print("📱 Deep link received: \(url)")
        
        // Handle subscription success (skedenceadmin://subscription-success?session_id=xxx&orgId=xxx)
        if url.scheme == "skedenceadmin" && url.host == "subscription-success" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let queryItems = components.queryItems else {
                print("❌ Invalid subscription-success deep link")
                return
            }
            
            let sessionId = queryItems.first(where: { $0.name == "session_id" })?.value
            let orgId = queryItems.first(where: { $0.name == "orgId" })?.value
            
            print("✅ Subscription success! SessionId: \(sessionId ?? "unknown"), OrgId: \(orgId ?? "unknown")")
            
            // Refresh billing data after subscription purchase
            Task {
                // Wait for webhook to process
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
                
                if let orgId = orgId ?? auth.currentOrgId {
                    await auth.loadOrgBranding(orgId: orgId)
                    subscriptionStatus.monitorOrgStatus(organizationId: orgId)
                    print("🔄 Billing refreshed after subscription purchase")
                }
                
                // Show success message
                await MainActor.run {
                    // TODO: Show a success alert or banner
                    print("💰 Subscription activated successfully!")
                }
            }
            return
        }
        
        // Handle subscription cancel (skedenceadmin://subscription-cancel)
        if url.scheme == "skedenceadmin" && url.host == "subscription-cancel" {
            print("❌ User canceled subscription purchase")
            return
        }
        
        // Handle payment method added (skedenceadmin://payment-method-added?session_id=xxx)
        if url.scheme == "skedenceadmin" && url.host == "payment-method-added" {
            print("✅ Payment method added successfully!")
            
            // Trigger refresh of payment method in InAppSubscriptionView
            NotificationCenter.default.post(name: NSNotification.Name("PaymentMethodAdded"), object: nil)
            return
        }
        
        // Handle payment method cancel (skedenceadmin://payment-method-cancel)
        if url.scheme == "skedenceadmin" && url.host == "payment-method-cancel" {
            print("❌ User canceled adding payment method")
            return
        }
        
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

