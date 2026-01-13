//
//  ManageSubscriptionView.swift
//  SkedenceAdmin
//
//  STEP 10: Subscription management UI
//  View current plan, upgrade/downgrade, cancel subscription
//

import SwiftUI
import FirebaseFunctions

struct ManageSubscriptionView: View {
    @EnvironmentObject var auth: AuthManager
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
    @StateObject private var enforcement = SubscriptionEnforcementService()
    
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
                            
                            PlanCard(
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
                            
                            PlanCard(
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
                            
                            PlanCard(
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
                            
                            PlanCard(
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
                            
                            PlanCard(
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
            .task {
                await loadBillingStatus()
            }
            .refreshable {
                await loadBillingStatus()
            }
        }
    }
    
    func loadBillingStatus() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let functions = Functions.functions()
            let callable = functions.httpsCallable("getBillingStatus")
            
            let result = try await callable.call(["orgId": orgId])
            
            if let data = result.data as? [String: Any] {
                currentPlan = data["currentPlan"] as? String ?? "free"
                status = data["status"] as? String ?? "active"
                bookingsThisMonth = data["bookingsThisMonth"] as? Int ?? 0
                recommendedPlan = data["recommendedPlan"] as? String ?? "free"
                cancelAtPeriodEnd = data["cancelAtPeriodEnd"] as? Bool ?? false
                
                print("📊 Billing Status Loaded:")
                print("   - currentPlan: '\(currentPlan)'")
                print("   - status: '\(status)'")
                print("   - bookingsThisMonth: \(bookingsThisMonth)")
                print("   - recommendedPlan: '\(recommendedPlan)'")
                
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
                let functions = Functions.functions()
                let callable = functions.httpsCallable("cancelSubscription")
                
                _ = try await callable.call(["orgId": orgId])
                
                await loadBillingStatus()
                isProcessing = false
            } catch {
                errorMessage = "Failed to cancel subscription: \(error.localizedDescription)"
                isProcessing = false
            }
        }
    }    
    func upgradeSubscription(to plan: String) async {
        isProcessing = true
        errorMessage = nil
        
        // Map plan names to Stripe price IDs
        // TODO: Replace these with actual Stripe price IDs from your Stripe dashboard
        // Go to Stripe Dashboard > Products > Create subscription plans with these names
        // and copy the price IDs here
        let priceIds: [String: String] = [
            "starter": "price_1SkWFR2XPese4Q6C8OAznMnV",  // $29/month - Update with actual ID
            "studio": "price_1SkWFc2XPese4Q6CKdZVuZZu",   // $99/month - Update with actual ID
            "academy": "price_1SkWFt2XPese4Q6CYpqRBpCh",  // $249/month - Update with actual ID
            "enterprise": "price_1SkWG92XPese4Q6CnQVNYmZ9" // $499/month - Update with actual ID
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
                if status == "active" {
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
                Text("Renews on \(end.formatted(date: .abbreviated, time: .omitted))")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding()
        .background(AppTheme.primary.opacity(0.1))
        .cornerRadius(CornerRadius.md)
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

// MARK: - Plan Card

private struct PlanCard: View {
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
        .environmentObject(AuthManager())
}
