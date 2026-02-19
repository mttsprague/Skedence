//
//  SkedenceAdminApp.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI

#if canImport(FirebaseCore)
import FirebaseCore
import FirebaseFunctions
#endif

@main
struct SkedenceAdminApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    @StateObject private var dependencies = AdminAppDependencies()
    @State private var stripeConnectCompleted = false
    @State private var passwordSetupData: (token: String, email: String, trainerId: String)?
    @Environment(\.scenePhase) private var scenePhase
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var subscriptionStatus: SubscriptionStatusService { dependencies.subscription }

    var body: some Scene {
        WindowGroup {
            contentView
        }
    }
    
    @ViewBuilder
    private var contentView: some View {
        // Show password setup if coming from invitation link
        if let setupData = passwordSetupData {
            PasswordSetupView(
                setupToken: setupData.token,
                email: setupData.email,
                trainerId: setupData.trainerId
            )
            .environmentObject(dependencies)
            .onDisappear {
                // Clear setup data after view dismisses
                passwordSetupData = nil
            }
            .onOpenURL { url in
                handleDeepLink(url)
            }
        }
        // Show sign in page if not authenticated
        else if !auth.isAuthenticated {
            SignInView()
                .environmentObject(dependencies)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        } else {
            // Authenticated - go straight to main app
            ContentViewWrapper()
                .environmentObject(dependencies)
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
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }
    
    private func refreshBillingAfterCheckout() async {
        guard let orgId = auth.currentOrgId else { return }
        
        // Wait a moment for webhook to process
        try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // Reload org branding (which includes billing data)
        await auth.loadOrgBranding(orgId: orgId)
        
    }
    
    private func handleDeepLink(_ url: URL) {
        
        // Handle subscription success (skedenceadmin://subscription-success?session_id=xxx&orgId=xxx)
        if url.scheme == "skedenceadmin" && url.host == "subscription-success" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let queryItems = components.queryItems else {
                return
            }
            
            _ = queryItems.first(where: { $0.name == "session_id" })?.value
            let orgId = queryItems.first(where: { $0.name == "orgId" })?.value
            
            
            // Refresh billing data after subscription purchase
            Task {
                // Wait for webhook to process
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
                
                if let orgId = orgId ?? auth.currentOrgId {
                    await auth.loadOrgBranding(orgId: orgId)
                    subscriptionStatus.monitorOrgStatus(organizationId: orgId)
                }
                
                // Show success message
                await MainActor.run {
                    // TODO: Show a success alert or banner
                }
            }
            return
        }
        
        // Handle subscription cancel (skedenceadmin://subscription-cancel)
        if url.scheme == "skedenceadmin" && url.host == "subscription-cancel" {
            return
        }
        
        // Handle payment method added (skedenceadmin://payment-method-added?session_id=xxx)
        if url.scheme == "skedenceadmin" && url.host == "payment-method-added" {
            
            // Trigger refresh of payment method in InAppSubscriptionView
            NotificationCenter.default.post(name: NSNotification.Name("PaymentMethodAdded"), object: nil)
            return
        }
        
        // Handle payment method cancel (skedenceadmin://payment-method-cancel)
        if url.scheme == "skedenceadmin" && url.host == "payment-method-cancel" {
            return
        }
        
        // Handle password setup invitation (skedence://setup-password?token=xxx&email=xxx&trainerId=xxx)
        if url.scheme == "skedence" && url.host == "setup-password" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let queryItems = components.queryItems else {
                return
            }
            
            let token = queryItems.first(where: { $0.name == "token" })?.value
            let email = queryItems.first(where: { $0.name == "email" })?.value
            let trainerId = queryItems.first(where: { $0.name == "trainerId" })?.value
            
            guard let token = token, let email = email, let trainerId = trainerId else {
                return
            }
            
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
                            #endif
                        } catch {
                        }
                    }
                }
            }
        }
    }
}

