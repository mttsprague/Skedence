//
//  OnboardingStripeViewDirect.swift
//  SkedenceAdmin
//
//  Step 5: Add your Stripe API keys for payments (direct integration)
//

import SwiftUI
import FirebaseFirestore
import FirebaseCore

struct OnboardingStripeViewDirect: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var publishableKey: String = ""
    @State private var secretKey: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @State private var showSuccess: Bool = false
    
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
                    
                    Text("Add Your Stripe Keys")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Use your own Stripe account to accept payments")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, Spacing.md)
                
                if showSuccess {
                    successContent
                } else {
                    mainContent
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
    
    // MARK: - Main Content
    
    var mainContent: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Info box
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("How to Get Your Stripe Keys")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(alignment: .leading, spacing: 10) {
                    InstructionStep(number: 1, text: "Open dashboard.stripe.com in Safari")
                    InstructionStep(number: 2, text: "Sign in to your Stripe account (or create one)")
                    InstructionStep(number: 3, text: "Toggle OFF 'Test mode' in the top right corner")
                    InstructionStep(number: 4, text: "Click 'Developers' in the left sidebar")
                    InstructionStep(number: 5, text: "Click 'API keys' from the Developers menu")
                    InstructionStep(number: 6, text: "Find 'Publishable key' - it starts with pk_live_")
                    InstructionStep(number: 7, text: "Find 'Secret key' - click 'Reveal test key' then copy")
                    InstructionStep(number: 8, text: "Paste both keys in the fields below")
                }
                
                Text("💡 Tip: Keep the Stripe page open so you can easily copy both keys")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.primary)
                    .padding(.top, Spacing.xs)
            }
            .padding()
            .background(AppTheme.surfaceSecondary)
            .cornerRadius(CornerRadius.md)
            
            // Warning about live mode
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                    Text("Important: Use LIVE Mode Keys")
                        .font(.headingSmall)
                        .foregroundStyle(.orange)
                }
                
                Text("Make sure you're using LIVE keys (pk_live_... and sk_live_...), not test keys. Test keys won't process real payments.")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding()
            .background(.orange.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            
            // Input fields
            VStack(alignment: .leading, spacing: Spacing.md) {
                // Publishable Key
                VStack(alignment: .leading, spacing: 4) {
                    Text("Publishable Key")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    TextField("pk_live_...", text: $publishableKey)
                        .textFieldStyle(.plain)
                        .font(.bodyMedium)
                        .padding(Spacing.md)
                        .background(AppTheme.surfaceSecondary)
                        .cornerRadius(CornerRadius.md)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                    
                    Text("Starts with pk_live_")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                // Secret Key
                VStack(alignment: .leading, spacing: 4) {
                    Text("Secret Key")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    SecureField("sk_live_...", text: $secretKey)
                        .textFieldStyle(.plain)
                        .font(.bodyMedium)
                        .padding(Spacing.md)
                        .background(AppTheme.surfaceSecondary)
                        .cornerRadius(CornerRadius.md)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                    
                    Text("Starts with sk_live_ (keep this secret!)")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            
            // Skip button
            Button(action: skipStep) {
                Text("Skip for Now")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
            }
            .disabled(isLoading)
            
            // Save button
            Button(action: saveKeys) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isLoading ? "Saving..." : "Save Keys")
                        .font(.headingSmall)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(isFormValid ? AppTheme.primary : AppTheme.primary.opacity(0.5))
                .foregroundStyle(.white)
                .cornerRadius(CornerRadius.md)
            }
            .disabled(isLoading || !isFormValid)
        }
    }
    
    // MARK: - Success Content
    
    var successContent: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.green)
            
            Text("Stripe Keys Saved!")
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text("You're ready to accept payments from clients")
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            
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
    }
    
    // MARK: - Computed Properties
    
    var isFormValid: Bool {
        publishableKey.starts(with: "pk_live_") &&
        secretKey.starts(with: "sk_live_") &&
        !publishableKey.isEmpty &&
        !secretKey.isEmpty
    }
    
    // MARK: - Actions
    
    func saveKeys() {
        guard let orgId = coordinator.orgId else {
            errorMessage = "Organization not found"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let db = Firestore.firestore()
                
                // Save to organizations/{orgId}/stripe
                try await db.collection("organizations")
                    .document(orgId)
                    .collection("stripe")
                    .document("config")
                    .setData([
                        "publishableKey": publishableKey,
                        "secretKey": secretKey, // Store securely - consider using Cloud Functions instead
                        "mode": "live",
                        "updatedAt": FieldValue.serverTimestamp()
                    ])
                
                // Mark as complete in onboarding progress
                try await db.collection("organizations")
                    .document(orgId)
                    .updateData([
                        "onboardingProgress.hasConnectedStripe": true
                    ])
                
                await MainActor.run {
                    showSuccess = true
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save keys: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
    
    func skipStep() {
        continueToNextStep()
    }
    
    func continueToNextStep() {
        coordinator.moveToNextStep()
    }
}

// MARK: - Supporting Views

struct InstructionStep: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.bodyMedium)
                .fontWeight(.bold)
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
    OnboardingStripeViewDirect()
        .environmentObject(AuthManager())
        .environmentObject(OnboardingCoordinator())
}
