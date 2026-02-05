//
//  StripeSettingsView.swift
//  SkedenceAdmin
//
//  Two separate sections:
//  1. Platform Subscription - Pay platform fees (manage your subscription)
//  2. Stripe Connect - Receive payments from clients
//

import SwiftUI
import FirebaseFirestore
import FirebaseFunctions

struct StripeSettingsView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @Environment(\.dismiss) var dismiss
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
    
    @State private var selectedTab: SettingsTab = .payments
    @State private var stripeConnectStatus: StripeConnectStatus?
    @State private var isLoadingStatus = false
    @State private var isConnectingStripe = false
    @State private var errorMessage: String?
    
    enum SettingsTab: String, CaseIterable {
        case payments = "Accept Payments"
        case subscription = "Your Subscription"
    }
    
    struct StripeConnectStatus {
        var connectAccountId: String?
        var chargesEnabled: Bool
        var payoutsEnabled: Bool
        var detailsSubmitted: Bool
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("Settings", selection: $selectedTab) {
                    ForEach(SettingsTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        switch selectedTab {
                        case .payments:
                            acceptPaymentsContent
                        case .subscription:
                            subscriptionContent
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
                    .padding(Spacing.lg)
                }
            }
            .navigationTitle("Stripe Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await loadStripeConnectStatus()
            }
            .onAppear {
                // Refresh status when view appears (handles return from Stripe via deep link)
                Task {
                    await loadStripeConnectStatus()
                }
            }
        }
    }
    
    // MARK: - Accept Payments Content
    
    var acceptPaymentsContent: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Header
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Image(systemName: "creditcard.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(AppTheme.primary)
                
                Text("Accept Payments from Clients")
                    .font(.displaySmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Connect your Stripe account so clients can pay you for lessons and classes")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            // Current Status Card
            if isLoadingStatus {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let status = stripeConnectStatus, status.connectAccountId != nil {
                statusCard(status: status)
            } else {
                notConnectedCard
            }
            
            Divider()
            
            // Step-by-Step Instructions
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("How to Connect Your Stripe Account")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                instructionStep(
                    number: 1,
                    title: "Click 'Connect Stripe Account' below",
                    description: "This opens Stripe's secure connection page"
                )
                
                instructionStep(
                    number: 2,
                    title: "Choose Account Type",
                    description: "• Sign in to existing Stripe account OR\n• Create a new Stripe account"
                )
                
                instructionStep(
                    number: 3,
                    title: "Complete Stripe Onboarding",
                    description: "Provide:\n• Business or personal information\n• Bank account details (where money will be deposited)\n• Tax ID or SSN\n• Verify your identity if requested"
                )
                
                instructionStep(
                    number: 4,
                    title: "Start Accepting Payments",
                    description: "Once approved, clients can immediately purchase lessons and classes. Money goes directly to your bank account."
                )
            }
            .padding()
            .background(AppTheme.surfaceSecondary)
            .cornerRadius(CornerRadius.md)
            
            // Important Notes
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(AppTheme.primary)
                    Text("Important Notes")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    noteRow(icon: "💳", text: "Clients pay with real credit cards")
                    noteRow(icon: "💰", text: "Money is deposited directly into YOUR bank account")
                    noteRow(icon: "🔒", text: "Stripe handles all payment processing securely")
                    noteRow(icon: "📊", text: "View all transactions in your Stripe dashboard")
                    noteRow(icon: "⏱️", text: "Setup takes about 5-10 minutes")
                }
            }
            .padding()
            .background(.blue.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            
            // Connect Button
            if stripeConnectStatus?.connectAccountId == nil || stripeConnectStatus?.chargesEnabled == false {
                Button {
                    Task {
                        await connectStripeAccount()
                    }
                } label: {
                    HStack {
                        if isConnectingStripe {
                            ProgressView()
                                .tint(.white)
                                .scaleEffect(0.8)
                        }
                        Image(systemName: "link.circle.fill")
                        Text(isConnectingStripe ? "Connecting..." : (stripeConnectStatus?.connectAccountId == nil ? "Connect Stripe Account" : "Complete Stripe Setup"))
                            .font(.headingSmall)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(isConnectingStripe ? AppTheme.primary.opacity(0.6) : AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(isConnectingStripe)
            }
            
            // Reconnect button if needed
            if let status = stripeConnectStatus, status.connectAccountId != nil, status.chargesEnabled {
                Button {
                    Task { await loadStripeConnectStatus() }
                } label: {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("Refresh Status")
                            .font(.bodyMedium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                    .background(AppTheme.surfaceSecondary)
                    .foregroundStyle(AppTheme.textPrimary)
                    .cornerRadius(CornerRadius.md)
                }
            }
        }
    }
    
    // MARK: - Subscription Content
    
    var subscriptionContent: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Header
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Image(systemName: "star.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.orange)
                
                Text("Your Platform Subscription")
                    .font(.displaySmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("This is YOUR subscription fee to use this platform - separate from client payments")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            // Explanation Card
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(.orange)
                    Text("Two Different Things")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                
                VStack(alignment: .leading, spacing: Spacing.md) {
                    paymentTypeCard(
                        icon: "💳",
                        title: "Accept Payments (Previous Tab)",
                        description: "Where CLIENT money goes",
                        details: "• Clients pay YOU for lessons\n• Goes to YOUR bank account\n• Set up in 'Accept Payments' tab"
                    )
                    
                    Divider()
                    
                    paymentTypeCard(
                        icon: "⭐️",
                        title: "Platform Subscription (This Tab)",
                        description: "What YOU pay to use this platform",
            details: "• Monthly platform fee\n• Gives you access to features\n• Managed below"
                    )
                }
            }
            .padding()
            .background(.orange.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            
            // Subscription Management
            if let orgId = auth.currentOrgId {
                NavigationLink(destination: ManageSubscriptionView(orgId: orgId)
                    .environmentObject(dependencies)
                ) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Manage Your Subscription")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("View plan, billing, and payment methods")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(CornerRadius.md)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                }
                .buttonStyle(.plain)
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Manage Your Subscription")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("Organization not loaded yet")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundStyle(AppTheme.textTertiary)
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(CornerRadius.md)
                .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                .opacity(0.6)
            }
        }
    }
    
    // MARK: - Helper Views
    
    func statusCard(status: StripeConnectStatus) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: status.chargesEnabled ? "checkmark.circle.fill" : "clock.fill")
                    .foregroundStyle(status.chargesEnabled ? .green : .orange)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(status.chargesEnabled ? "Connected & Ready" : "Setup In Progress")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(status.chargesEnabled ? "You can accept payments from clients" : "Complete setup to accept payments")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
            }
            
            // Status Details
            VStack(alignment: .leading, spacing: 6) {
                statusRow(label: "Charges Enabled", value: status.chargesEnabled)
                statusRow(label: "Payouts Enabled", value: status.payoutsEnabled)
                statusRow(label: "Details Submitted", value: status.detailsSubmitted)
            }
            .padding(.top, Spacing.xs)
        }
        .padding()
        .background(status.chargesEnabled ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))
        .cornerRadius(CornerRadius.md)
    }
    
    var notConnectedCard: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundStyle(.red)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Not Connected")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Connect Stripe to accept payments from clients")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(CornerRadius.md)
    }
    
    func statusRow(label: String, value: Bool) -> some View {
        HStack {
            Text(label)
                .font(.bodySmall)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Image(systemName: value ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(value ? .green : .red)
        }
    }
    
    func instructionStep(number: Int, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary)
                    .frame(width: 32, height: 32)
                Text("\(number)")
                    .font(.headingSmall)
                    .foregroundStyle(.white)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.textPrimary)
                Text(description)
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }
    
    func noteRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(icon)
            Text(text)
                .font(.bodySmall)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
    
    func paymentTypeCard(icon: String, title: String, description: String, details: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Text(icon)
                    .font(.title2)
                Text(title)
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
            }
            
            Text(description)
                .font(.bodyMedium)
                .fontWeight(.semibold)
                .foregroundStyle(AppTheme.textSecondary)
            
            Text(details)
                .font(.bodySmall)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(CornerRadius.sm)
    }
    
    // MARK: - Functions
    
    func loadStripeConnectStatus() async {
        guard let orgId = auth.currentOrgId else { return }
        
        isLoadingStatus = true
        defer { isLoadingStatus = false }
        
        do {
            let doc = try await Firestore.firestore()
                .collection("organizations")
                .document(orgId)
                .getDocument()
            
            if let data = doc.data(),
               let stripeData = data["stripe"] as? [String: Any] {
                
                await MainActor.run {
                    self.stripeConnectStatus = StripeConnectStatus(
                        connectAccountId: stripeData["connectAccountId"] as? String,
                        chargesEnabled: stripeData["chargesEnabled"] as? Bool ?? false,
                        payoutsEnabled: stripeData["payoutsEnabled"] as? Bool ?? false,
                        detailsSubmitted: stripeData["detailsSubmitted"] as? Bool ?? false
                    )
                }
            }
        } catch {
        }
    }
    
    func configureCoordinatorForStripe() -> OnboardingCoordinator {
        let coordinator = OnboardingCoordinator()
        coordinator.currentStep = .stripeConnect // Jump directly to Stripe step
        // Prefill ids so the onboarding view can operate
        coordinator.orgId = auth.currentOrgId
        coordinator.userId = auth.userId
        return coordinator
    }
    
    func connectStripeAccount() async {
        guard let orgId = auth.currentOrgId,
              let email = auth.userEmail else {
            await MainActor.run {
                errorMessage = "User not authenticated"
            }
            return
        }
        
        await MainActor.run {
            isConnectingStripe = true
            errorMessage = nil
        }
        
        do {
            let functions = Functions.functions(region: "us-central1")
            
            // Get org name
            let orgDoc = try await Firestore.firestore()
                .collection("organizations")
                .document(orgId)
                .getDocument()
            
            let orgName = orgDoc.data()?["name"] as? String ?? "Training Business"
            
            // Create connect account if needed
            let callable = functions.httpsCallable("createConnectAccount")
            _ = try await callable.call([
                "orgId": orgId,
                "email": email,
                "businessName": orgName
            ])
            
            // Generate onboarding link
            let linkCallable = functions.httpsCallable("createConnectAccountLink")
            let linkResult = try await linkCallable.call(["orgId": orgId])
            
            if let data = linkResult.data as? [String: Any],
               let urlString = data["url"] as? String,
               let url = URL(string: urlString) {
                
                await MainActor.run {
                    // Open Stripe onboarding in Safari
                    UIApplication.shared.open(url)
                    isConnectingStripe = false
                }
                
                // Wait a moment then refresh status
                try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                await loadStripeConnectStatus()
            } else {
                await MainActor.run {
                    errorMessage = "Failed to get Stripe connection URL"
                    isConnectingStripe = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to connect Stripe: \(error.localizedDescription)"
                isConnectingStripe = false
            }
        }
    }
}

// MARK: - Preview

#Preview {
    StripeSettingsView()
        .environmentObject(AuthManager())
}
