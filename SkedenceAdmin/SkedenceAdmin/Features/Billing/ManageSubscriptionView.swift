//
//  ManageSubscriptionView.swift
//  SkedenceAdmin
//
//  STEP 10: Subscription management UI
//  View current plan, upgrade/downgrade, cancel subscription
//

import SwiftUI
import FirebaseAuth
import FirebaseFunctions
import FirebaseFirestore
import Combine
#if os(macOS)
import AppKit
#endif

struct ManageSubscriptionView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @Environment(\.dismiss) var dismiss
    
    let orgId: String
    
    @State private var isLoading = true
    @State private var currentPlan = "free"
    @State private var status = "active"
    @State private var bookingsThisMonth = 0
    @State private var recommendedPlan = "free"
    @State private var currentPeriodEnd: Date?
    @State private var cancelAtPeriodEnd = false
    @State private var errorMessage: String?
    @State private var showingUpgrade = false
    @State private var isProcessing = false
    @State private var selectedPlanForUpgrade: String?
    @State private var showSuccessAlert = false
    @State private var successMessage = ""
    
    // Convenience accessor
    private var enforcement: SubscriptionEnforcementService { dependencies.enforcement }
    @StateObject private var billingListener = BillingListener()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    if isLoading {
                        ProgressView()
                            .padding(.vertical, Spacing.xxl)
                    } else {
                        // Current Plan Section
                        CurrentPlanCard(
                            plan: currentPlan,
                            status: status,
                            periodEnd: currentPeriodEnd,
                            cancelAtPeriodEnd: cancelAtPeriodEnd
                        )
                        
                        // Usage Section
                        UsageCard(
                            bookingsThisMonth: bookingsThisMonth,
                            currentPlan: currentPlan,
                            recommendedPlan: recommendedPlan
                        )
                        
                        // Plans Section
                        VStack(spacing: Spacing.md) {
                            Text("Available Plans")
                                .font(.headingMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            SubscriptionPlanCard(
                                name: "Free",
                                price: "$0",
                                features: [
                                    "Up to 50 bookings/month",
                                    "Basic scheduling",
                                    "Client management",
                                ],
                                isCurrentPlan: currentPlan == "free",
                                onSelect: {}
                            )
                            .disabled(true)
                            
                            SubscriptionPlanCard(
                                name: "Starter",
                                price: "$29",
                                features: [
                                    "Up to 200 bookings/month",
                                    "Advanced scheduling",
                                    "Client packages",
                                    "Payment processing",
                                    "Email support",
                                ],
                                isCurrentPlan: currentPlan == "starter",
                                isRecommended: recommendedPlan == "starter" && currentPlan == "free",
                                onSelect: {
                                    if currentPlan != "starter" {
                                        selectedPlanForUpgrade = "starter"
                                        Task {
                                            await upgradeSubscription(to: "starter")
                                        }
                                    }
                                }
                            )
                            
                            SubscriptionPlanCard(
                                name: "Studio",
                                price: "$99",
                                features: [
                                    "Up to 5 trainers",
                                    "Unlimited clients",
                                    "Multi-trainer scheduling",
                                    "Admin dashboard",
                                    "Cancellation policies",
                                    "Email reminders",
                                ],
                                isCurrentPlan: currentPlan == "studio",
                                isRecommended: recommendedPlan == "studio",
                                onSelect: {
                                    if currentPlan != "studio" {
                                        selectedPlanForUpgrade = "studio"
                                        Task {
                                            await upgradeSubscription(to: "studio")
                                        }
                                    }
                                }
                            )
                            
                            SubscriptionPlanCard(
                                name: "Academy",
                                price: "$249",
                                features: [
                                    "Up to 15 trainers",
                                    "Multiple locations",
                                    "Roles & permissions",
                                    "Advanced analytics",
                                    "Revenue tracking",
                                    "Priority support",
                                ],
                                isCurrentPlan: currentPlan == "academy",
                                isRecommended: recommendedPlan == "academy",
                                onSelect: {
                                    if currentPlan != "academy" {
                                        selectedPlanForUpgrade = "academy"
                                        Task {
                                            await upgradeSubscription(to: "academy")
                                        }
                                    }
                                }
                            )
                            
                            SubscriptionPlanCard(
                                name: "Enterprise",
                                price: "$499",
                                features: [
                                    "Unlimited trainers",
                                    "White-label branding",
                                    "Custom domain",
                                    "API access",
                                    "Dedicated support",
                                    "Custom integrations",
                                ],
                                isCurrentPlan: currentPlan == "enterprise",
                                onSelect: {
                                    if currentPlan != "enterprise" {
                                        selectedPlanForUpgrade = "enterprise"
                                        Task {
                                            await upgradeSubscription(to: "enterprise")
                                        }
                                    }
                                }
                            )
                        }
                        
                        // Cancel Subscription Button
                        if currentPlan != "free" && !cancelAtPeriodEnd {
                            Button(action: cancelSubscription) {
                                Text("Cancel Subscription")
                                    .font(.bodyMedium)
                                    .foregroundStyle(.red)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, Spacing.sm)
                            }
                        }
                        
                        // Error Message
                        if let error = errorMessage {
                            Text(error)
                                .font(.bodyMedium)
                                .foregroundStyle(.red)
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(CornerRadius.md)
                        }
                    }
                }
                .padding(Spacing.lg)
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Success", isPresented: $showSuccessAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(successMessage)
            }
            .task {
                await loadBillingStatus()
                
                // Start realtime listener
                billingListener.startListening(orgId: orgId) { billing in
                    
                    if let plan = billing["plan"] as? String {
                        currentPlan = plan
                    }
                    if let billingStatus = billing["status"] as? String {
                        status = billingStatus
                    }
                    if let cancel = billing["cancelAtPeriodEnd"] as? Bool {
                        cancelAtPeriodEnd = cancel
                    }
                    if let timestamp = billing["currentPeriodEnd"] as? Timestamp {
                        currentPeriodEnd = timestamp.dateValue()
                    }
                }
            }
            .refreshable {
                await loadBillingStatus()
            }
            .onDisappear {
                billingListener.stopListening()
            }
        }
    }
    
    func loadBillingStatus() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Ensure user is authenticated and token is fresh
            if let currentUser = Auth.auth().currentUser {
                _ = try await currentUser.getIDToken(forcingRefresh: true)
            }
            
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("getBillingStatus")
            
            let result = try await callable.call(["orgId": orgId])
            
            if let data = result.data as? [String: Any] {
                currentPlan = data["currentPlan"] as? String ?? "free"
                status = data["status"] as? String ?? "active"
                bookingsThisMonth = data["bookingsThisMonth"] as? Int ?? 0
                recommendedPlan = data["recommendedPlan"] as? String ?? "free"
                cancelAtPeriodEnd = data["cancelAtPeriodEnd"] as? Bool ?? false
                
                
                if let timestamp = data["currentPeriodEnd"] as? [String: Any],
                   let seconds = timestamp["_seconds"] as? Double {
                    currentPeriodEnd = Date(timeIntervalSince1970: seconds)
                }
            }
            
            isLoading = false
        } catch {
            errorMessage = "Failed to load billing status: \(error.localizedDescription)"
            isLoading = false
        }
    }
    
    func cancelSubscription() {
        
        isProcessing = true
        errorMessage = nil
        
        Task {
            do {
                // Ensure user is authenticated and token is fresh
                guard let currentUser = Auth.auth().currentUser else {
                    throw NSError(domain: "ManageSubscription", code: -1, 
                                userInfo: [NSLocalizedDescriptionKey: "No authenticated user found"])
                }
                
                
                // Force token refresh to ensure valid authentication
                _ = try await currentUser.getIDToken(forcingRefresh: true)
                
                let functions = Functions.functions(region: "us-central1")
                let callable = functions.httpsCallable("cancelSubscription")
                
                _ = try await callable.call(["orgId": orgId])
                
                await loadBillingStatus()
                
                // Show success notification
                successMessage = "Subscription canceled successfully. You have been moved to the Free plan."
                showSuccessAlert = true
                
                isProcessing = false
            } catch let error as NSError {
                errorMessage = "Failed to cancel subscription: \(error.localizedDescription)"
                isProcessing = false
            }
        }
    }    
    func syncBillingFromStripe() async {
        isProcessing = true
        errorMessage = nil
        
        do {
            // Ensure user is authenticated
            guard let currentUser = Auth.auth().currentUser else {
                throw NSError(domain: "ManageSubscription", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "No authenticated user found"])
            }
            
            _ = try await currentUser.getIDToken(forcingRefresh: true)
            
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("syncBillingFromStripe")
            
            let result = try await callable.call(["orgId": orgId])
            
            if result.data as? [String: Any] != nil {
                
                // Reload billing status
                await loadBillingStatus()
                
                successMessage = "Billing synced successfully from Stripe"
                showSuccessAlert = true
            }
            
            isProcessing = false
        } catch {
            errorMessage = "Failed to sync billing: \(error.localizedDescription)"
            isProcessing = false
        }
    }
    
    func upgradeSubscription(to plan: String) async {
        isProcessing = true
        errorMessage = nil
        
        // Map plan names to Stripe price IDs (LIVE MODE)
        let priceIds: [String: String] = [
            "starter": "price_1SpKItFIh2MhEffNfsBy4HyT",     // $29/month
            "studio": "price_1SpKMkFIh2MhEffNgGdbgMr5",      // $99/month
            "academy": "price_1SpKNrFIh2MhEffNqZf64sPA",     // $249/month
            "enterprise": "price_1SpKOrFIh2MhEffNjU5v5X4P"  // $499/month
        ]
        
        guard let priceId = priceIds[plan] else {
            errorMessage = "Invalid plan selected"
            isProcessing = false
            return
        }
        
        // Use enforcement service to create checkout session
        if let checkoutUrl = await enforcement.createCheckoutSession(
            organizationId: orgId,
            priceId: priceId
        ) {
            // Open the Stripe checkout page
            await MainActor.run {
                #if os(iOS)
                UIApplication.shared.open(checkoutUrl)
                #else
                NSWorkspace.shared.open(checkoutUrl)
                #endif
            }
        } else {
            errorMessage = "Failed to create checkout session. Please check your Stripe configuration and ensure subscription prices are set up in your Stripe dashboard."
        }
        
        isProcessing = false
    }}

// MARK: - Current Plan Card

private struct CurrentPlanCard: View {
    let plan: String
    let status: String
    let periodEnd: Date?
    let cancelAtPeriodEnd: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Current Plan")
                        .font(.labelLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    Text(plan.capitalized)
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                
                Spacer()
                
                // Status Badge
                if status == "trialing" {
                    BadgeView(text: "Trial", color: .blue)
                } else if status == "active" {
                    BadgeView(text: "Active", color: .green)
                } else if status == "past_due" {
                    BadgeView(text: "Past Due", color: .red)
                } else if status == "canceled" {
                    BadgeView(text: "Canceled", color: .gray)
                }
            }
            
            if cancelAtPeriodEnd, let end = periodEnd {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "info.circle")
                        .foregroundStyle(.orange)
                    Text("Cancels on \(end.formatted(date: .abbreviated, time: .omitted))")
                        .font(.bodyMedium)
                        .foregroundStyle(.orange)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(CornerRadius.sm)
            } else if let end = periodEnd, plan != "free" {
                // Calculate amount based on plan
                let amount = planAmount(for: plan)
                let dateText = end.formatted(date: .abbreviated, time: .omitted)
                
                HStack(spacing: Spacing.xs) {
                    Image(systemName: status == "trialing" ? "calendar.badge.clock" : "arrow.clockwise")
                        .foregroundStyle(AppTheme.primary)
                    
                    if status == "trialing" {
                        Text("Trial ends \(dateText) • First charge: $\(amount)")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    } else {
                        Text("Next billing: \(dateText) • $\(amount)")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .padding()
                .background(AppTheme.primary.opacity(0.05))
                .cornerRadius(CornerRadius.sm)
            }
        }
        .padding()
        .background(AppTheme.primary.opacity(0.1))
        .cornerRadius(CornerRadius.md)
    }
    
    private func planAmount(for plan: String) -> Int {
        switch plan.lowercased() {
        case "starter": return 29
        case "studio": return 99
        case "academy": return 249
        case "enterprise": return 499
        default: return 0
        }
    }
}

// MARK: - Usage Card

private struct UsageCard: View {
    let bookingsThisMonth: Int
    let currentPlan: String
    let recommendedPlan: String
    
    var limitForPlan: Int {
        switch currentPlan {
        case "free": return 50
        case "starter": return 200
        default: return Int.max
        }
    }
    
    var usagePercentage: Double {
        guard limitForPlan != Int.max else { return 0 }
        return Double(bookingsThisMonth) / Double(limitForPlan)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Usage This Month")
                .font(.headingSmall)
                .foregroundStyle(AppTheme.textPrimary)
            
            HStack(alignment: .bottom, spacing: Spacing.xs) {
                Text("\(bookingsThisMonth)")
                    .font(.displayMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if limitForPlan != Int.max {
                    Text("/ \(limitForPlan)")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Text("bookings")
                    .font(.bodyLarge)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            if limitForPlan != Int.max {
                // Progress Bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 8)
                            .cornerRadius(4)
                        
                        Rectangle()
                            .fill(usagePercentage > 0.8 ? Color.red : AppTheme.primary)
                            .frame(
                                width: geometry.size.width * min(usagePercentage, 1.0),
                                height: 8
                            )
                            .cornerRadius(4)
                    }
                }
                .frame(height: 8)
                
                if usagePercentage > 0.8 && recommendedPlan != currentPlan {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                        Text("Consider upgrading to \(recommendedPlan.capitalized)")
                            .font(.bodyMedium)
                            .foregroundStyle(.orange)
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(CornerRadius.sm)
                }
            }
        }
        .padding()
        .background(AppTheme.surfaceSecondary)
        .cornerRadius(CornerRadius.md)
    }
}

// MARK: - Subscription Plan Card

private struct SubscriptionPlanCard: View {
    let name: String
    let price: String
    let features: [String]
    let isCurrentPlan: Bool
    var isRecommended: Bool = false
    let onSelect: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(name)
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    HStack(alignment: .bottom, spacing: 2) {
                        Text(price)
                            .font(.displaySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        if price != "$0" {
                            Text("/month")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                }
                
                Spacer()
                
                if isCurrentPlan {
                    BadgeView(text: "Current", color: AppTheme.primary)
                } else if isRecommended {
                    BadgeView(text: "Recommended", color: .orange)
                }
            }
            
            VStack(alignment: .leading, spacing: Spacing.xs) {
                ForEach(features, id: \.self) { feature in
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.system(size: 14))
                        Text(feature)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
            }
            
            if !isCurrentPlan {
                Button(action: onSelect) {
                    Text("Select Plan")
                        .font(.labelLarge)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.sm)
                        .background(AppTheme.primary)
                        .foregroundStyle(.white)
                        .cornerRadius(CornerRadius.md)
                }
            }
        }
        .padding()
        .background(isCurrentPlan ? AppTheme.primary.opacity(0.1) : AppTheme.surfaceSecondary)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(isCurrentPlan ? AppTheme.primary : Color.clear, lineWidth: 2)
        )
        .cornerRadius(CornerRadius.md)
    }
}

#Preview {
    ManageSubscriptionView(orgId: "test_org_123")
        .environmentObject(AdminAppDependencies())
}

// MARK: - Billing Listener

class BillingListener: ObservableObject {
    private var listener: ListenerRegistration?
    
    func startListening(orgId: String, onChange: @escaping ([String: Any]) -> Void) {
        let db = Firestore.firestore()
        
        listener = db.collection("organizations").document(orgId).addSnapshotListener { snapshot, error in
            guard let data = snapshot?.data(),
                  let billing = data["billing"] as? [String: Any] else {
                return
            }
            
            DispatchQueue.main.async {
                onChange(billing)
            }
        }
    }
    
    func stopListening() {
        listener?.remove()
        listener = nil
    }
    
    deinit {
        stopListening()
    }
}
