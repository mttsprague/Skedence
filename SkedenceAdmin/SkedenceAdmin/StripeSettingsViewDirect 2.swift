//
//  StripeSettingsViewDirect.swift
//  SkedenceAdmin
//
//  Manage your own Stripe API keys for accepting payments
//

import SwiftUI
import FirebaseFirestore

struct StripeSettingsViewDirect: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    @State private var publishableKey: String = ""
    @State private var secretKey: String = ""
    @State private var isLoading = false
    @State private var isLoadingKeys = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var hasExistingKeys = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Image(systemName: "creditcard.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("Your Stripe API Keys")
                            .font(.displaySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Manage your Stripe keys to accept payments from clients")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    // Status card
                    if hasExistingKeys {
                        statusCard
                    }
                    
                    // Instructions
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("How to Get Your Keys")
                            .font(.headingMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        VStack(alignment: .leading, spacing: 10) {
                            InstructionStep(number: 1, text: "Open dashboard.stripe.com in Safari")
                            InstructionStep(number: 2, text: "Sign in to your Stripe account")
                            InstructionStep(number: 3, text: "Toggle OFF 'Test mode' in the top right")
                            InstructionStep(number: 4, text: "Click 'Developers' in the left sidebar")
                            InstructionStep(number: 5, text: "Click 'API keys' from the menu")
                            InstructionStep(number: 6, text: "Copy 'Publishable key' (pk_live_...)")
                            InstructionStep(number: 7, text: "Reveal and copy 'Secret key' (sk_live_...)")
                        }
                        
                        Text("💡 Keep the Stripe page open to easily copy both keys")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.primary)
                            .padding(.top, Spacing.xs)
                    }
                    .padding()
                    .background(AppTheme.surfaceSecondary)
                    .cornerRadius(CornerRadius.md)
                    
                    // Warning
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.orange)
                            Text("Use LIVE Mode Keys")
                                .font(.headingSmall)
                                .foregroundStyle(.orange)
                        }
                        
                        Text("Make sure keys start with pk_live_ and sk_live_")
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
                                .disabled(isLoadingKeys)
                            
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
                                .disabled(isLoadingKeys)
                            
                            Text("Starts with sk_live_ (keep secret!)")
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                    
                    // Save button
                    Button(action: saveKeys) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(isLoading ? "Saving..." : (hasExistingKeys ? "Update Keys" : "Save Keys"))
                                .font(.headingSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(isFormValid ? AppTheme.primary : AppTheme.primary.opacity(0.5))
                        .foregroundStyle(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                    .disabled(isLoading || !isFormValid || isLoadingKeys)
                    
                    // Success/Error messages
                    if let success = successMessage {
                        Text(success)
                            .font(.bodyMedium)
                            .foregroundStyle(.green)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(CornerRadius.md)
                    }
                    
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
            .navigationTitle("Stripe Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await loadKeys()
            }
        }
    }
    
    var statusCard: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Stripe Connected")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Payments are enabled for your account")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(.green.opacity(0.1))
        .cornerRadius(CornerRadius.md)
    }
    
    var isFormValid: Bool {
        publishableKey.starts(with: "pk_live_") &&
        secretKey.starts(with: "sk_live_") &&
        !publishableKey.isEmpty &&
        !secretKey.isEmpty
    }
    
    // MARK: - Actions
    
    func loadKeys() async {
        guard let orgId = auth.currentOrgId else { return }
        
        await MainActor.run {
            isLoadingKeys = true
        }
        
        do {
            let db = Firestore.firestore()
            let doc = try await db.collection("organizations")
                .document(orgId)
                .collection("stripe")
                .document("config")
                .getDocument()
            
            if let data = doc.data() {
                await MainActor.run {
                    publishableKey = data["publishableKey"] as? String ?? ""
                    hasExistingKeys = !publishableKey.isEmpty
                    isLoadingKeys = false
                }
            } else {
                await MainActor.run {
                    isLoadingKeys = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load keys: \(error.localizedDescription)"
                isLoadingKeys = false
            }
        }
    }
    
    func saveKeys() {
        guard let orgId = auth.currentOrgId else {
            errorMessage = "Organization not found"
            return
        }
        
        isLoading = true
        errorMessage = nil
        successMessage = nil
        
        Task {
            do {
                let db = Firestore.firestore()
                
                try await db.collection("organizations")
                    .document(orgId)
                    .collection("stripe")
                    .document("config")
                    .setData([
                        "publishableKey": publishableKey,
                        "secretKey": secretKey,
                        "mode": "live",
                        "updatedAt": FieldValue.serverTimestamp()
                    ])
                
                // Mark as complete
                try await db.collection("organizations")
                    .document(orgId)
                    .updateData([
                        "onboardingProgress.hasConnectedStripe": true
                    ])
                
                await MainActor.run {
                    hasExistingKeys = true
                    successMessage = "Keys saved successfully!"
                    isLoading = false
                }
                
                // Clear success message after 3 seconds
                try await Task.sleep(nanoseconds: 3_000_000_000)
                await MainActor.run {
                    successMessage = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save keys: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
}

#Preview {
    StripeSettingsViewDirect()
        .environmentObject(AuthManager())
}
