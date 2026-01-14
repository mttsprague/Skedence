//
//  OnboardingStripeView.swift
//  SkedenceAdmin
//
//  Step 5: Connect Stripe for payments (streamlined)
//

import SwiftUI
import FirebaseFirestore
import FirebaseFunctions

struct OnboardingStripeView: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var onboardingStep: StripeStep = .intro
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @State private var onboardingUrl: String?
    
    enum StripeStep {
        case intro
        case connecting
        case waiting
        case complete
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Header
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "creditcard.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(AppTheme.primary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, Spacing.xs)
                    
                    Text("Connect Stripe")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Start accepting payments from clients")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, Spacing.md)
                
                // Content based on step
                Group {
                    switch onboardingStep {
                    case .intro:
                        introContent
                    case .connecting:
                        connectingContent
                    case .waiting:
                        waitingContent
                    case .complete:
                        completeContent
                    }
                }
                
                // Error
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
        .background(Color(UIColor.systemBackground))
    }
    
    // MARK: - Intro Content
    
    var introContent: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Benefits
            VStack(alignment: .leading, spacing: Spacing.md) {
                BenefitRow(
                    icon: "checkmark.circle.fill",
                    text: "Secure payment processing"
                )
                BenefitRow(
                    icon: "checkmark.circle.fill",
                    text: "Get paid directly to your bank account"
                )
                BenefitRow(
                    icon: "checkmark.circle.fill",
                    text: "Automatic billing and invoicing"
                )
                BenefitRow(
                    icon: "checkmark.circle.fill",
                    text: "No setup fees - pay only per transaction"
                )
            }
            .padding()
            .background(AppTheme.surfaceSecondary)
            .cornerRadius(CornerRadius.md)
            
            // Important info box
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(AppTheme.primary)
                    Text("How This Works:")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                
                Text("Stripe processes all client payments directly to YOUR bank account.")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.bottom, Spacing.xs)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("✅ Have Stripe already? Sign in to connect your existing account")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text("✅ New to Stripe? Create a new account during setup (takes 5 min)")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text("✅ This uses LIVE mode - real payments to your bank")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .bold()
                }
            }
            .padding()
            .background(AppTheme.primary.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            
            // What you'll need
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("You'll need (for new accounts):")
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("• Business bank account\n• Tax ID or SSN\n• Business address\n• About 5 minutes")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding()
            .background(AppTheme.surfaceSecondary)
            .cornerRadius(CornerRadius.md)
            
            Spacer()
            
            // Buttons
            VStack(spacing: Spacing.sm) {
                Button(action: startStripeConnection) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isLoading ? "Setting up..." : "Connect Your Stripe Account")
                            .font(.headingSmall)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(isLoading)
                
                Button(action: skipForNow) {
                    Text("Skip for Now")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
    }
    
    // MARK: - Connecting Content
    
    var connectingContent: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .tint(AppTheme.primary)
                .scaleEffect(1.5)
            
            Text("Creating your Stripe account...")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("This will only take a moment")
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxxl)
    }
    
    // MARK: - Waiting Content
    
    var waitingContent: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Instructions
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Complete Setup in Stripe")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("A browser window should have opened. Follow these steps:")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.bottom, 4)
                
                VStack(alignment: .leading, spacing: 8) {
                    InstructionStep(number: 1, text: "On the Stripe page, choose:\n   • \"Sign in to existing account\" if you have Stripe\n   • \"Create new account\" if you're new to Stripe")
                    InstructionStep(number: 2, text: "If creating new account, enter:\n   • Email and password\n   • Business information\n   • Tax ID or SSN")
                    InstructionStep(number: 3, text: "Connect your bank account (where you'll receive payments)")
                    InstructionStep(number: 4, text: "Verify your identity (photo ID may be required)")
                    InstructionStep(number: 5, text: "Click \"Done\" or \"Finish\" in Stripe")
                    InstructionStep(number: 6, text: "Return to this app and tap \"I've Completed Setup\"")
                }
                
                Text("💡 All client payments go directly to YOUR bank account via Stripe")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.primary)
                    .padding(.top, Spacing.xs)
            }
            .padding()
            .background(AppTheme.surfaceSecondary)
            .cornerRadius(CornerRadius.md)
            
            // Reopen link button
            if let url = onboardingUrl {
                Button(action: { openURL(url) }) {
                    HStack {
                        Image(systemName: "arrow.up.right.square")
                        Text("Reopen Stripe Setup")
                    }
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primary.opacity(0.1))
                    .cornerRadius(CornerRadius.md)
                }
            }
            
            Spacer()
            
            // Check status button
            Button(action: checkStatus) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isLoading ? "Checking..." : "I've Completed Setup")
                        .font(.headingSmall)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(AppTheme.primary)
                .foregroundStyle(.white)
                .cornerRadius(CornerRadius.md)
            }
            .disabled(isLoading)
        }
    }
    
    // MARK: - Complete Content
    
    var completeContent: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.green)
            
            Text("Stripe Connected!")
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("You're ready to accept payments")
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
            
            Spacer()
            
            Button(action: continueToNextStep) {
                Text("Continue")
                    .font(.headingSmall)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
            }
        }
        .padding(.vertical, Spacing.xl)
    }
    
    // MARK: - Actions
    
    func startStripeConnection() {
        guard let orgId = coordinator.orgId else { return }
        
        isLoading = true
        errorMessage = nil
        onboardingStep = .connecting
        
        Task {
            do {
                let functions = Functions.functions()
                let callable = functions.httpsCallable("createConnectAccount")
                
                let orgName = coordinator.organizationData["name"] as? String ?? "Training Business"
                _ = try await callable.call([
                    "orgId": orgId,
                    "email": auth.userEmail ?? "",
                    "businessName": orgName
                ])
                
                // Generate onboarding link
                let linkCallable = functions.httpsCallable("createConnectAccountLink")
                let linkResult = try await linkCallable.call(["orgId": orgId])
                
                if let data = linkResult.data as? [String: Any],
                   let url = data["url"] as? String {
                    onboardingUrl = url
                    openURL(url)
                    onboardingStep = .waiting
                }
                
                isLoading = false
            } catch {
                errorMessage = "Failed to connect Stripe: \(error.localizedDescription)"
                isLoading = false
                onboardingStep = .intro
            }
        }
    }
    
    func openURL(_ urlString: String) {
        if let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
    }
    
    func checkStatus() {
        guard let orgId = coordinator.orgId else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let functions = Functions.functions()
                let callable = functions.httpsCallable("refreshConnectAccountStatus")
                
                let result = try await callable.call(["orgId": orgId])
                
                if let data = result.data as? [String: Any],
                   let onboardingComplete = data["onboardingComplete"] as? Bool,
                   let chargesEnabled = data["chargesEnabled"] as? Bool {
                    
                    if onboardingComplete && chargesEnabled {
                        coordinator.organizationData["stripeComplete"] = true
                        onboardingStep = .complete
                    } else {
                        errorMessage = "Please complete the Stripe setup process first"
                    }
                }
                
                isLoading = false
            } catch {
                errorMessage = "Failed to verify status: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }
    
    func skipForNow() {
        coordinator.moveToNextStep()
    }
    
    func continueToNextStep() {
        coordinator.moveToNextStep()
    }
}

// MARK: - Benefit Row

private struct BenefitRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(.green)
                .font(.title3)
            
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

// MARK: - Instruction Step

private struct InstructionStep: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Text("\(number)")
                .font(.bodyMedium)
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(AppTheme.primary)
                .clipShape(Circle())
            
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

#Preview {
    OnboardingStripeView()
        .environmentObject(AuthManager())
        .environmentObject(OnboardingCoordinator())
}
