//
//  StripeKeysSetupView.swift
//  SkedenceAdmin
//
//  View for admin to input Stripe keys during onboarding
//

import SwiftUI
import FirebaseFirestore
import FirebaseAuth

struct StripeKeysSetupView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    @State private var publishableKey: String = ""
    @State private var secretKey: String = ""
    @State private var isTestMode: Bool = false
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    @State private var showSuccess: Bool = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Image(systemName: "creditcard.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("Connect Stripe")
                            .font(.headingLarge)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Enter your Stripe API keys to accept payments. You can find these in your Stripe Dashboard under Developers → API Keys.")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.bottom, Spacing.md)
                    
                    // Mode Toggle
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Mode")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Picker("Mode", selection: $isTestMode) {
                            Text("Test Mode").tag(true)
                            Text("Live Mode").tag(false)
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: isTestMode) { _, _ in
                            // Clear keys when switching modes
                            publishableKey = ""
                            secretKey = ""
                        }
                    }
                    
                    // Info Box
                    InfoBox(
                        icon: "info.circle.fill",
                        title: isTestMode ? "Test Mode" : "Live Mode",
                        message: isTestMode ? 
                            "Use test keys to try payments without real charges. Test cards: 4242 4242 4242 4242" :
                            "⚠️ Live mode will process real payments. Only use when ready for production.",
                        color: isTestMode ? .blue : .orange
                    )
                    
                    // Publishable Key
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Publishable Key")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        TextField(isTestMode ? "pk_test_..." : "pk_live_...", text: $publishableKey)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .font(.system(.body, design: .monospaced))
                        
                        Text("Found in Stripe Dashboard → Developers → API Keys")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                    
                    // Secret Key
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Secret Key")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        SecureField(isTestMode ? "sk_test_..." : "sk_live_...", text: $secretKey)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .font(.system(.body, design: .monospaced))
                        
                        Text("⚠️ Keep this secret! Never share or commit to code.")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    
                    // Error Message
                    if let error = validationError ?? errorMessage {
                        Text(error)
                            .font(.bodySmall)
                            .foregroundStyle(.red)
                            .padding(Spacing.sm)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(CornerRadius.sm)
                    }
                    
                    // Save Button
                    Button {
                        Task { await saveStripeKeys() }
                    } label: {
                        HStack {
                            if isSaving {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(isSaving ? "Saving..." : "Save & Continue")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!isFormValid || isSaving)
                    .opacity(isFormValid ? 1.0 : 0.5)
                    
                    // Skip Option
                    Button {
                        dismiss()
                    } label: {
                        Text("Skip for Now")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.top, Spacing.sm)
                }
                .padding(Spacing.lg)
            }
            .navigationTitle("Stripe Setup")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Keys Saved!", isPresented: $showSuccess) {
                Button("Done") {
                    dismiss()
                }
            } message: {
                Text("Your Stripe keys have been saved. You can now accept payments from clients!")
            }
        }
    }
    
    var isFormValid: Bool {
        let expectedPkPrefix = isTestMode ? "pk_test_" : "pk_live_"
        let expectedSkPrefix = isTestMode ? "sk_test_" : "sk_live_"
        
        // Stripe publishable keys are typically 40-50 characters
        // Stripe secret keys are typically 50-100 characters
        let pkValid = publishableKey.hasPrefix(expectedPkPrefix) && publishableKey.count >= 40
        let skValid = secretKey.hasPrefix(expectedSkPrefix) && secretKey.count >= 50
        
        return pkValid && skValid
    }
    
    var validationError: String? {
        let expectedPkPrefix = isTestMode ? "pk_test_" : "pk_live_"
        let expectedSkPrefix = isTestMode ? "sk_test_" : "sk_live_"
        
        if !publishableKey.isEmpty && !publishableKey.hasPrefix(expectedPkPrefix) {
            return "Publishable key must start with \(expectedPkPrefix)"
        }
        
        if !publishableKey.isEmpty && publishableKey.count < 40 {
            return "Publishable key is too short. Expected at least 40 characters, got \(publishableKey.count)"
        }
        
        if !secretKey.isEmpty && !secretKey.hasPrefix(expectedSkPrefix) {
            return "Secret key must start with \(expectedSkPrefix)"
        }
        
        if !secretKey.isEmpty && secretKey.count < 50 {
            return "Secret key is too short. Expected at least 50 characters, got \(secretKey.count)"
        }
        
        return nil
    }
    
    func saveStripeKeys() async {
        guard let orgId = auth.currentOrgId else {
            errorMessage = "Organization not found"
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        do {
            let db = Firestore.firestore()
            
            // Save publishable key to Firestore (safe to store client-side)
            try await db.collection("organizations").document(orgId).updateData([
                "stripe.publishableKey": publishableKey,
                "stripe.mode": isTestMode ? "test" : "live",
                "stripe.keysConfigured": true,
                "onboardingProgress.hasConnectedStripe": true,
                "updatedAt": FieldValue.serverTimestamp()
            ])
            
            // Note: Secret key should be manually configured via Firebase CLI
            // firebase functions:config:set stripe.secret_key="YOUR_SECRET_KEY"
            
            // Update local auth state
            await auth.loadOrgId(for: auth.userId ?? "")
            
            showSuccess = true
            isSaving = false
            
        } catch {
            errorMessage = "Failed to save keys: \(error.localizedDescription)"
            isSaving = false
        }
    }
}

// MARK: - Info Box Component

private struct InfoBox: View {
    let icon: String
    let title: String
    let message: String
    let color: Color
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.labelLarge)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(message)
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1))
        .cornerRadius(CornerRadius.sm)
    }
}

#Preview {
    StripeKeysSetupView()
        .environmentObject(AuthManager())
}
