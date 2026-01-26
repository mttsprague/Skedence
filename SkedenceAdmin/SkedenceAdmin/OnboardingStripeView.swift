//
//  OnboardingStripeView.swift
//  SkedenceAdmin
//
//  Step 5: Connect Stripe for payments (streamlined)
//

import SwiftUI
import FirebaseFirestore
import FirebaseFunctions
import FirebaseCore

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
        .onAppear {
            // If we're in the waiting state when view appears, check status
            // This handles the case where user returns from Stripe via deep link
            if onboardingStep == .waiting {
                Task {
                    try? await Task.sleep(nanoseconds: 1_000_000_000) // Wait 1 second
                    checkStatus()
                }
            }
        }
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
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundStyle(.green)
                        .font(.title2)
                    Text("LIVE Mode - Real Payments")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .bold()
                }
                
                Text("This connects your REAL Stripe account for REAL payments.")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.bottom, Spacing.xs)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 8) {
                        Text("💳")
                        Text("Clients pay with real credit cards")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    HStack(alignment: .top, spacing: 8) {
                        Text("💰")
                        Text("Money goes directly to your bank account")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    HStack(alignment: .top, spacing: 8) {
                        Text("✅")
                        Text("Works with existing Stripe account OR create new one")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
            }
            .padding()
            .background(.green.opacity(0.1))
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
            // IMPORTANT: Check Live Mode
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                    Text("IMPORTANT: Verify Live Mode")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .bold()
                }
                
                Text("Check the Stripe page that opened:")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text("✅")
                        Text("CORRECT: Page says \"Live mode\" or has NO test banner")
                            .font(.bodySmall)
                            .foregroundStyle(.green)
                    }
                    HStack(spacing: 4) {
                        Text("❌")
                        Text("WRONG: Page says \"Test mode\" or \"Sandbox\"")
                            .font(.bodySmall)
                            .foregroundStyle(.red)
                    }
                }
                
                Text("If you see \"Test mode\", STOP and contact support. Your keys are not configured for live payments.")
                    .font(.bodySmall)
                    .foregroundStyle(.orange)
                    .padding(.top, 4)
            }
            .padding()
            .background(.orange.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            
            // Instructions
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Complete Setup in Stripe (Browser)")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Follow these steps in the Stripe browser window:")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.bottom, 4)
                
                VStack(alignment: .leading, spacing: 10) {
                    OnboardingInstructionStep(
                        number: 1,
                        text: "Choose one:\n   • \"Sign in\" - if you already have a Stripe account\n   • \"Create account\" - if you're new to Stripe"
                    )
                    OnboardingInstructionStep(
                        number: 2,
                        text: "Enter your business details:\n   • Business name and address\n   • Tax ID (EIN) or SSN\n   • Phone number"
                    )
                    OnboardingInstructionStep(
                        number: 3,
                        text: "Add your bank account:\n   • Account number and routing number\n   • This is where you'll receive payments"
                    )
                    OnboardingInstructionStep(
                        number: 4,
                        text: "Verify your identity:\n   • Upload photo ID if requested\n   • Answer security questions"
                    )
                    OnboardingInstructionStep(
                        number: 5,
                        text: "Review and agree to Stripe's terms"
                    )
                    OnboardingInstructionStep(
                        number: 6,
                        text: "Click \"Done\" or \"Submit\" in Stripe"
                    )
                    OnboardingInstructionStep(
                        number: 7,
                        text: "Come back here and tap \"I've Completed Setup\" below"
                    )
                }
                
                Text("💰 All payments go directly to your bank account")
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
        
        // Verify Firebase is configured
        #if canImport(FirebaseCore)
        if FirebaseApp.app() == nil {
            errorMessage = "Firebase is not configured. Please restart the app."
            return
        }
        #endif
        
        isLoading = true
        errorMessage = nil
        onboardingStep = .connecting
        
        Task {
            do {
                let functions = Functions.functions(region: "us-central1")
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
                let errorString = error.localizedDescription
                if errorString.contains("internal") {
                    errorMessage = "Failed to connect Stripe. Please try again. If the problem persists, check your internet connection."
                } else {
                    errorMessage = "Failed to connect Stripe: \(errorString)"
                }
                print("❌ Stripe connection error: \(error)")
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
                let functions = Functions.functions(region: "us-central1")
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

private struct OnboardingInstructionStep: View {
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
