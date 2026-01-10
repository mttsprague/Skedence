//
//  ContentView.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var enforcement = SubscriptionEnforcementService()
    @State private var selectedTab = 0
    @State private var showingPricing = false
    @Environment(\.openURL) private var openURL
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ScheduleView()
                .tabItem {
                    Label("Schedule", systemImage: selectedTab == 0 ? "calendar" : "calendar")
                }
                .tag(0)

            ClientsView()
                .tabItem {
                    Label("Clients", systemImage: selectedTab == 1 ? "person.2.fill" : "person.2")
                }
                .tag(1)

            MoreView()
                .tabItem {
                    Label("Account", systemImage: selectedTab == 2 ? "person.crop.circle.fill" : "person.crop.circle")
                }
                .tag(2)

            // Only show Admin tab for owners and admins
            if auth.currentOrgRole == "owner" || auth.currentOrgRole == "admin" {
                SuperAdminView()
                    .tabItem {
                        Label("Admin", systemImage: selectedTab == 3 ? "star.fill" : "star")
                    }
                    .tag(3)
                    .environmentObject(auth)
            }
        }
        .tint(AppTheme.primary)
        .overlay {
            if let billing = enforcement.billing {
                CoachPaywallView(
                    billing: billing,
                    isOwner: enforcement.isOwner,
                    estimatedLostRevenue: enforcement.estimatedLostRevenue,
                    onUpgrade: {
                        showingPricing = true
                    },
                    onManageBilling: {
                        Task {
                            guard let orgId = auth.currentOrgId,
                                  let url = await enforcement.openBillingPortal(organizationId: orgId)
                            else { return }
                            openURL(url)
                        }
                    },
                    onContactSupport: {
                        if let url = URL(string: "mailto:support@skedence.com?subject=Billing%20Help") {
                            openURL(url)
                        }
                    },
                    onDismiss: {
                        // Dismiss the paywall overlay (e.g., to view schedule read-only)
                        enforcement.billing = nil
                    }
                )
            }
        }
        .sheet(isPresented: $showingPricing) {
            NavigationStack {
                PricingView(onPlanSelected: { selectedPlan in
                    Task { [enforcement] in
                        guard let orgId = auth.currentOrgId else { return }
                        guard let priceId = selectedPlan.stripePriceId else {
                            print("❌ Missing stripePriceId for plan: \(selectedPlan.id)")
                            return
                        }
                        
                        // Create Stripe Checkout session
                        if let checkoutUrl = await enforcement.createCheckoutSession(
                            organizationId: orgId,
                            priceId: priceId
                        ) {
                            await MainActor.run {
                                showingPricing = false
                                openURL(checkoutUrl)
                            }
                        }
                    }
                })
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") {
                            showingPricing = false
                        }
                    }
                }
            }
        }
        .onAppear {
            print("🔍 DEBUG: auth.currentOrgId = \(auth.currentOrgId ?? "nil")")
            print("🔍 DEBUG: auth.isAuthenticated = \(auth.isAuthenticated)")
            print("🔍 DEBUG: auth.isAdmin = \(auth.isAdmin)")
            print("🔍 DEBUG: auth.userId = \(auth.userId ?? "nil")")
            
            if let orgId = auth.currentOrgId {
                print("✅ Starting subscription monitoring for org: \(orgId)")
                enforcement.startMonitoring(organizationId: orgId)
            } else {
                print("❌ No organization ID found - cannot monitor subscription")
            }
        }
        .onChange(of: auth.currentOrgId) { _, newOrgId in
            print("🔄 Organization ID changed to: \(newOrgId ?? "nil")")
            if let orgId = newOrgId {
                print("✅ Starting subscription monitoring for org: \(orgId)")
                enforcement.startMonitoring(organizationId: orgId)
            }
        }
    }
}

struct MoreView: View {
    @EnvironmentObject private var auth: AuthManager
    @State private var isSignUp: Bool = true
    @State private var isBusy: Bool = false

    var body: some View {
        NavigationView {
            ScrollView {
                if auth.isAuthenticated {
                    VStack(spacing: Spacing.xl) {
                        // Profile Header
                        VStack(spacing: Spacing.md) {
                            ZStack {
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [AppTheme.primary, AppTheme.primaryLight],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 80, height: 80)
                                
                                Text(initials)
                                    .font(.displaySmall)
                                    .foregroundStyle(.white)
                            }
                            
                            VStack(spacing: Spacing.xxs) {
                                Text(trainerName)
                                    .font(.headingLarge)
                                    .foregroundStyle(AppTheme.textPrimary)
                                
                                Text(auth.userEmail ?? "")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            
                            // Show role badge with priority: owner > admin > trainer
                            if auth.currentOrgRole == "owner" {
                                BadgeView(text: "Owner", color: .purple)
                            } else if auth.currentOrgRole == "admin" {
                                BadgeView(text: "Admin", color: .blue)
                            } else if auth.isTrainer {
                                BadgeView(text: "Trainer", color: AppTheme.success)
                            }
                        }
                        .padding(.top, Spacing.xl)
                        
                        // Account Info Card
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text("Account Information")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                
                                VStack(spacing: Spacing.sm) {
                                    InfoRow(label: "Name", value: trainerName)
                                    Divider()
                                    InfoRow(label: "Email", value: auth.userEmail ?? "Unknown")
                                    Divider()
                                    InfoRow(label: "Role", value: {
                                        if auth.currentOrgRole == "owner" {
                                            return "Owner"
                                        } else if auth.currentOrgRole == "admin" {
                                            return "Admin"
                                        } else if auth.isTrainer {
                                            return "Trainer"
                                        }
                                        return "User"
                                    }())
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                        
                        // Sign Out Button
                        Button {
                            auth.signOut()
                        } label: {
                            Text("Sign Out")
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .padding(.horizontal, Spacing.lg)
                    }
                    .padding(.bottom, Spacing.xxxl)
                } else {
                    // Auth Screen
                    VStack(spacing: Spacing.xl) {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "person.crop.circle.badge.checkmark")
                                .font(.system(size: 60))
                                .foregroundStyle(AppTheme.primary)
                            
                            Text("Welcome to Skedence")
                                .font(.headingLarge)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            Text("Sign in to manage your training schedule")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, Spacing.xxxl)
                        
                        Picker("Mode", selection: $isSignUp) {
                            Text("Sign In").tag(false)
                            Text("Sign Up").tag(true)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, Spacing.lg)
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                TextField("Email", text: $auth.emailInput)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .padding(Spacing.sm)
                                    .background(Color(UIColor.systemGray6))
                                    .cornerRadius(CornerRadius.xs)
                                
                                SecureField("Password", text: $auth.passwordInput)
                                    .textContentType(.password)
                                    .padding(Spacing.sm)
                                    .background(Color(UIColor.systemGray6))
                                    .cornerRadius(CornerRadius.xs)
                                
                                if isSignUp {
                                    TextField("First name", text: $auth.firstNameInput)
                                        .textContentType(.givenName)
                                        .autocapitalization(.words)
                                        .padding(Spacing.sm)
                                        .background(Color(UIColor.systemGray6))
                                        .cornerRadius(CornerRadius.xs)
                                    
                                    TextField("Last name", text: $auth.lastNameInput)
                                        .textContentType(.familyName)
                                        .autocapitalization(.words)
                                        .padding(Spacing.sm)
                                        .background(Color(UIColor.systemGray6))
                                        .cornerRadius(CornerRadius.xs)
                                }
                                
                                Button {
                                    Task { await submitAuth(isSignUp: isSignUp) }
                                } label: {
                                    HStack(spacing: Spacing.xs) {
                                        if isBusy { ProgressView().tint(.white) }
                                        Text(isSignUp ? "Create Account" : "Sign In")
                                    }
                                }
                                .buttonStyle(PrimaryButtonStyle())
                                .disabled(isBusy || auth.emailInput.isEmpty || auth.passwordInput.isEmpty || (isSignUp && (auth.firstNameInput.isEmpty || auth.lastNameInput.isEmpty)))
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                        
                        if let error = auth.errorMessage, !error.isEmpty {
                            CardView {
                                HStack(spacing: Spacing.sm) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundStyle(AppTheme.error)
                                    Text(error)
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.error)
                                }
                            }
                            .padding(.horizontal, Spacing.lg)
                        }
                    }
                    .padding(.bottom, Spacing.xxxl)
                }
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
        }
        .navigationViewStyle(.stack)
    }
    
    private var initials: String {
        let firstName = auth.firstNameInput.isEmpty ? (auth.userEmail?.prefix(1).uppercased() ?? "U") : String(auth.firstNameInput.prefix(1))
        let lastName = auth.lastNameInput.isEmpty ? "" : String(auth.lastNameInput.prefix(1))
        return "\(firstName)\(lastName)".uppercased()
    }
    
    private var trainerName: String {
        if !auth.firstNameInput.isEmpty || !auth.lastNameInput.isEmpty {
            return "\(auth.firstNameInput) \(auth.lastNameInput)".trimmingCharacters(in: .whitespaces)
        }
        return "Trainer"
    }

    private func submitAuth(isSignUp: Bool) async {
        isBusy = true
        defer { isBusy = false }
        if isSignUp {
            await auth.signUp()
        } else {
            await auth.signIn()
        }
    }
}

// Helper view for info rows
struct InfoRow: View {
    let label: String
    let value: String
    var copyable: Bool = false
    
    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            if copyable {
                Text(value)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                    .textSelection(.enabled)
            } else {
                Text(value)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textPrimary)
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
}
