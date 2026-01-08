//
//  StripeOnboardingView.swift
//  SkedenceAdmin
//
//  STEP 9: Stripe Connect Onboarding
//  Guides business owner through connecting their Stripe account
//

import SwiftUI
import FirebaseFirestore
import FirebaseFunctions

struct StripeOnboardingView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    let orgId: String
    
    @State private var onboardingStep: OnboardingStep = .create
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @State private var stripeAccountId: String?
    @State private var onboardingUrl: String?
    
    enum OnboardingStep {
        case create          // Creating Connect account
        case link            // Showing onboarding link
        case waiting         // Waiting for user to complete
        case complete        // Onboarding complete
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Step Indicator
                    StepIndicator(currentStep: stepNumber)
                    
                    // Content based on step
                    switch onboardingStep {
                    case .create:
                        CreateAccountContent(
                            isLoading: isLoading,
                            onContinue: createStripeAccount
                        )
                        
                    case .link:
                        LinkAccountContent(
                            onboardingUrl: onboardingUrl,
                            onOpenLink: openStripeLink,
                            onSkip: checkStatus
                        )
                        
                    case .waiting:
                        WaitingContent(
                            isLoading: isLoading,
                            onCheckStatus: checkStatus
                        )
                        
                    case .complete:
                        CompleteContent(
                            onDone: finishOnboarding
                        )
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
            .navigationTitle("Connect Stripe")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    var stepNumber: Int {
        switch onboardingStep {
        case .create: return 1
        case .link, .waiting: return 2
        case .complete: return 3
        }
    }
    
    func createStripeAccount() {
        guard let userId = auth.userId, let email = auth.userEmail else {
            errorMessage = "User not authenticated"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let functions = Functions.functions()
                let callable = functions.httpsCallable("createConnectAccount")
                
                let result = try await callable.call([
                    "orgId": orgId,
                    "email": email,
                    "businessName": "My Training Business" // Will be loaded from org
                ])
                
                if let data = result.data as? [String: Any],
                   let accountId = data["accountId"] as? String {
                    stripeAccountId = accountId
                    onboardingStep = .link
                    
                    // Generate onboarding link
                    await generateOnboardingLink()
                }
                
                isLoading = false
            } catch {
                errorMessage = "Failed to create Stripe account: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }
    
    func generateOnboardingLink() async {
        isLoading = true
        
        do {
            let functions = Functions.functions()
            let callable = functions.httpsCallable("createConnectAccountLink")
            
            let result = try await callable.call([
                "orgId": orgId
            ])
            
            if let data = result.data as? [String: Any],
               let url = data["url"] as? String {
                onboardingUrl = url
            }
            
            isLoading = false
        } catch {
            errorMessage = "Failed to generate onboarding link: \(error.localizedDescription)"
            isLoading = false
        }
    }
    
    func openStripeLink() {
        guard let urlString = onboardingUrl,
              let url = URL(string: urlString) else {
            errorMessage = "Invalid onboarding URL"
            return
        }
        
        // Open in Safari
        UIApplication.shared.open(url)
        onboardingStep = .waiting
    }
    
    func checkStatus() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let functions = Functions.functions()
                let callable = functions.httpsCallable("refreshConnectAccountStatus")
                
                let result = try await callable.call([
                    "orgId": orgId
                ])
                
                if let data = result.data as? [String: Any],
                   let onboardingComplete = data["onboardingComplete"] as? Bool,
                   let chargesEnabled = data["chargesEnabled"] as? Bool {
                    
                    if onboardingComplete && chargesEnabled {
                        onboardingStep = .complete
                    } else {
                        errorMessage = "Stripe onboarding not yet complete. Please finish setup in Stripe."
                    }
                }
                
                isLoading = false
            } catch {
                errorMessage = "Failed to check status: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }
    
    func finishOnboarding() {
        dismiss()
    }
}

// MARK: - Step Indicator

private struct StepIndicator: View {
    let currentStep: Int
    
    var body: some View {
        HStack(spacing: Spacing.md) {
            ForEach(1...3, id: \.self) { step in
                HStack(spacing: Spacing.xs) {
                    Circle()
                        .fill(step <= currentStep ? AppTheme.primary : Color.gray.opacity(0.3))
                        .frame(width: 32, height: 32)
                        .overlay(
                            Text("\(step)")
                                .font(.labelLarge)
                                .foregroundStyle(.white)
                        )
                    
                    if step < 3 {
                        Rectangle()
                            .fill(step < currentStep ? AppTheme.primary : Color.gray.opacity(0.3))
                            .frame(height: 2)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding(.bottom, Spacing.lg)
    }
}

// MARK: - Content Views

private struct CreateAccountContent: View {
    let isLoading: Bool
    let onContinue: () -> Void
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "creditcard.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(AppTheme.primary)
            
            Text("Connect Your Stripe Account")
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("To accept payments from clients, you'll need to connect a Stripe account. This takes about 5 minutes.")
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            
            VStack(alignment: .leading, spacing: Spacing.sm) {
                BenefitRow(icon: "checkmark.circle.fill", text: "Accept credit card payments")
                BenefitRow(icon: "checkmark.circle.fill", text: "Automatic payouts to your bank")
                BenefitRow(icon: "checkmark.circle.fill", text: "No monthly fees")
                BenefitRow(icon: "checkmark.circle.fill", text: "PCI compliant security")
            }
            .padding()
            .background(AppTheme.primary.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            
            Button(action: onContinue) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isLoading ? "Creating Account..." : "Continue")
                        .font(.headingSmall)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(AppTheme.primary)
                .foregroundStyle(.white)
                .cornerRadius(CornerRadius.md)
            }
            .disabled(isLoading)
            .heavyShadow()
        }
    }
}

private struct LinkAccountContent: View {
    let onboardingUrl: String?
    let onOpenLink: () -> Void
    let onSkip: () -> Void
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "link.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(AppTheme.primary)
            
            Text("Complete Stripe Setup")
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("Click below to open Stripe and complete your account setup. You'll need to provide:")
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            
            VStack(alignment: .leading, spacing: Spacing.sm) {
                RequirementRow(text: "Business details")
                RequirementRow(text: "Bank account information")
                RequirementRow(text: "Identity verification")
            }
            .padding()
            .background(AppTheme.surfaceSecondary)
            .cornerRadius(CornerRadius.md)
            
            Button(action: onOpenLink) {
                HStack {
                    Text("Open Stripe Setup")
                        .font(.headingSmall)
                    Image(systemName: "arrow.up.right")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(AppTheme.primary)
                .foregroundStyle(.white)
                .cornerRadius(CornerRadius.md)
            }
            .disabled(onboardingUrl == nil)
            .heavyShadow()
            
            Button("I'll do this later", action: onSkip)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
        }
    }
}

private struct WaitingContent: View {
    let isLoading: Bool
    let onCheckStatus: () -> Void
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "hourglass.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(AppTheme.primary)
            
            Text("Finish Setup in Stripe")
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("Complete the Stripe setup process in your browser. When you're done, come back here and check status.")
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            
            Button(action: onCheckStatus) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isLoading ? "Checking..." : "I've Finished - Check Status")
                        .font(.headingSmall)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(AppTheme.primary)
                .foregroundStyle(.white)
                .cornerRadius(CornerRadius.md)
            }
            .disabled(isLoading)
            .heavyShadow()
        }
    }
}

private struct CompleteContent: View {
    let onDone: () -> Void
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.green)
            
            Text("All Set!")
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("Your Stripe account is connected and ready to accept payments. You can now start inviting clients and taking bookings.")
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            
            Button(action: onDone) {
                Text("Get Started")
                    .font(.headingSmall)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
            }
            .heavyShadow()
        }
    }
}

// MARK: - Helper Views

private struct BenefitRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(.green)
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

private struct RequirementRow: View {
    let text: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(AppTheme.primary)
                .frame(width: 6, height: 6)
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

#Preview {
    StripeOnboardingView(orgId: "test_org_123")
        .environmentObject(AuthManager())
}
