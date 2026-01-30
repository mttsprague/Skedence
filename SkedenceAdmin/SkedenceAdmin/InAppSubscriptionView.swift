//
//  InAppSubscriptionView.swift
//  SkedenceAdmin
//
//  Apple In-App Purchase subscription flow using StoreKit 2
//  Browse plans, purchase subscriptions, manage via App Store
//

import SwiftUI
import StoreKit

struct InAppSubscriptionView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    @StateObject private var storeKit = StoreKitManager()
    
    let orgId: String
    
    @State private var isLoading = true
    @State private var isPurchasing = false
    @State private var showingSuccess = false
    @State private var showingManageSubscription = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    if isLoading {
                        ProgressView()
                            .padding(.vertical, 40)
                    } else {
                        // Current Subscription Status
                        if let subscription = storeKit.subscriptionStatus {
                            currentSubscriptionSection(subscription)
                        } else {
                            freeTrialBanner
                        }
                        
                        // Available Plans
                        plansSection
                        
                        // Error Message
                        if let error = storeKit.errorMessage {
                            Text(error)
                                .font(.callout)
                                .foregroundStyle(.red)
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(12)
                        }
                        
                        // Restore Purchases Button
                        Button {
                            Task {
                                await storeKit.restorePurchases()
                            }
                        } label: {
                            Text("Restore Purchases")
                                .font(.subheadline)
                                .foregroundStyle(.blue)
                        }
                        .padding(.top, 8)
                    }
                }
                .padding()
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Success!", isPresented: $showingSuccess) {
                Button("Done") {
                    dismiss()
                }
            } message: {
                Text("Your subscription is now active! Enjoy all premium features.")
            }
            .overlay {
                if isPurchasing {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()
                        
                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Processing subscription...")
                                .font(.headline)
                        }
                        .padding(32)
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                    }
                }
            }
            .task {
                await storeKit.loadProducts()
                await storeKit.checkSubscriptionStatus()
                isLoading = false
            }
        }
    }
    
    // MARK: - View Components
    
    private func currentSubscriptionSection(_ subscription: StoreKitManager.SubscriptionStatus) -> some View {
        VStack(spacing: 16) {
            VStack(spacing: 8) {
                Text("Current Plan")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                
                Text(subscription.planName.capitalized)
                    .font(.title)
                    .bold()
                
                if subscription.isInTrialPeriod {
                    Text("Free Trial")
                        .font(.caption)
                        .foregroundStyle(.green)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(12)
                }
                
                if let expirationDate = subscription.expirationDate {
                    let dateText = expirationDate.formatted(date: .abbreviated, time: .omitted)
                    if subscription.willAutoRenew {
                        Text("Renews \(dateText)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("Expires \(dateText)")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            // Manage Subscription Button
            Button {
                Task {
                    await storeKit.manageSubscription()
                }
            } label: {
                Label("Manage Subscription", systemImage: "gearshape.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(12)
            }
        }
    }
    
    private var freeTrialBanner: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 40))
                .foregroundStyle(.yellow)
            
            Text("Start Your Free Trial")
                .font(.title2)
                .bold()
            
            Text("Try any plan free for 14 days")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
    }
    
    private var plansSection: some View {
        VStack(spacing: 16) {
            Text("Choose Your Plan")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            ForEach(storeKit.products, id: \.id) { product in
                SubscriptionPlanCard(
                    product: product,
                    isCurrentPlan: storeKit.isCurrentSubscription(product),
                    onSelect: {
                        Task {
                            isPurchasing = true
                            let success = await storeKit.purchase(product, organizationId: orgId)
                            isPurchasing = false
                            if success {
                                showingSuccess = true
                            }
                        }
                    }
                )
            }
        }
    }
}

// MARK: - Subscription Plan Card

private struct SubscriptionPlanCard: View {
    let product: Product
    let isCurrentPlan: Bool
    let onSelect: () -> Void
    
    private var planDetails: (features: [String], badge: String?) {
        switch product.id {
        case "skedence_starter_monthly":
            return (
                ["1 trainer", "1 location", "Unlimited clients & bookings", "Client mobile app"],
                nil
            )
        case "skedence_studio_monthly":
            return (
                ["Up to 5 trainers", "3 locations", "Group classes", "Priority support"],
                "Most Popular"
            )
        case "skedence_academy_monthly":
            return (
                ["Up to 15 trainers", "10 locations", "Advanced analytics", "API access"],
                nil
            )
        case "skedence_enterprise_monthly":
            return (
                ["Unlimited trainers & locations", "Custom branding", "Dedicated support", "SLA"],
                nil
            )
        default:
            return ([], nil)
        }
    }
    
    private var planName: String {
        product.displayName.replacingOccurrences(of: " Plan", with: "")
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(planName)
                            .font(.title3)
                            .bold()
                        
                        if let badge = planDetails.badge {
                            Text(badge)
                                .font(.caption)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue)
                                .cornerRadius(8)
                        }
                    }
                    
                    Text(product.displayPrice + "/month")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                if isCurrentPlan {
                    Text("Current")
                        .font(.caption)
                        .foregroundStyle(.green)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(12)
                }
            }
            
            VStack(alignment: .leading, spacing: 8) {
                ForEach(planDetails.features, id: \.self) { feature in
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.caption)
                        Text(feature)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            
            if !isCurrentPlan {
                Button(action: onSelect) {
                    Text("Start Free Trial")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .cornerRadius(12)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCurrentPlan ? Color.blue : Color.clear, lineWidth: 2)
        )
    }
}
