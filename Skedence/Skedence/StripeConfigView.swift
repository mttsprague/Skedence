//
//  StripeConfigView.swift
//  Skedence
//
//  Configure Stripe API keys for your organization
//

import SwiftUI
import FirebaseFirestore
import FirebaseAuth

struct StripeConfigView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    @State private var publishableKey: String = ""
    @State private var secretKey: String = ""
    @State private var isLoading: Bool = false
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    
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
                    
                    Text("Configure Stripe")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Connect your Stripe account to accept payments")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, Spacing.md)
                
                // Info box
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("How to Get Your Stripe Keys")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    VStack(alignment: .leading, spacing: 10) {
                        InstructionStep(number: 1, text: "Go to dashboard.stripe.com")
                        InstructionStep(number: 2, text: "Sign in or create an account")
                        InstructionStep(number: 3, text: "Click 'Developers' → 'API keys'")
                        InstructionStep(number: 4, text: "Copy your keys below")
                    }
                }
                .padding()
                .background(AppTheme.primary.opacity(0.1))
                .cornerRadius(CornerRadius.md)
                
                // Web Portal Link
                Link(destination: URL(string: "https://skedence.com/stripe-keys.html")!) {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: "safari.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.white)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Open Stripe Key Helper")
                                .font(.bodyMedium.weight(.semibold))
                                .foregroundStyle(.white)
                            Text("Step-by-step guide in Safari")
                                .font(.labelSmall)
                                .foregroundStyle(.white.opacity(0.8))
                        }
                        
                        Spacer()
                        
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    .padding()
                    .background(AppTheme.primary)
                    .cornerRadius(CornerRadius.md)
                }
                
                // Input fields
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Your Stripe Keys")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Publishable Key")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        TextField("pk_live_...", text: $publishableKey)
                            .textFieldStyle(.plain)
                            .font(.system(.body, design: .monospaced))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .padding()
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .cornerRadius(CornerRadius.sm)
                    }
                    
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Secret Key")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        SecureField("sk_live_...", text: $secretKey)
                            .textFieldStyle(.plain)
                            .font(.system(.body, design: .monospaced))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .padding()
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .cornerRadius(CornerRadius.sm)
                    }
                }
                
                // Security note
                HStack(alignment: .top, spacing: Spacing.sm) {
                    Image(systemName: "lock.shield.fill")
                        .foregroundStyle(AppTheme.success)
                        .font(.system(size: 20))
                    
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Secure Storage")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Your keys are encrypted and stored securely in your organization's private database.")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppTheme.success.opacity(0.1))
                .cornerRadius(CornerRadius.md)
                
                // Success message
                if let success = successMessage {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(AppTheme.success)
                        Text(success)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.success)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.success.opacity(0.1))
                    .cornerRadius(CornerRadius.md)
                }
                
                // Error message
                if let error = errorMessage {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                        Text(error)
                            .font(.bodyMedium)
                            .foregroundStyle(.red)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(CornerRadius.md)
                }
                
                // Save button
                Button(action: saveStripeKeys) {
                    HStack {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Save Stripe Keys")
                                .font(.headingSmall)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(canSave ? AppTheme.primary : AppTheme.textTertiary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(!canSave || isSaving)
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("Stripe Configuration")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadExistingKeys()
        }
    }
    
    var canSave: Bool {
        !publishableKey.isEmpty && !secretKey.isEmpty &&
        (publishableKey.hasPrefix("pk_live_") || publishableKey.hasPrefix("pk_test_")) &&
        (secretKey.hasPrefix("sk_live_") || secretKey.hasPrefix("sk_test_"))
    }
    
    func loadExistingKeys() async {
        guard let orgId = auth.currentOrgId else {
            errorMessage = "No organization found"
            return
        }
        
        isLoading = true
        
        do {
            let db = Firestore.firestore()
            let doc = try await db.collection("organizations")
                .document(orgId)
                .collection("stripe")
                .document("config")
                .getDocument()
            
            if let data = doc.data() {
                publishableKey = data["publishableKey"] as? String ?? ""
                // Don't show secret key for security
                if data["secretKey"] != nil {
                    secretKey = "••••••••••••••••••••••••"
                }
            }
        } catch {
            print("Error loading existing keys: \(error)")
        }
        
        isLoading = false
    }
    
    func saveStripeKeys() {
        guard let orgId = auth.currentOrgId else {
            errorMessage = "No organization found"
            return
        }
        
        // Don't save if secret key is masked (user didn't change it)
        if secretKey == "••••••••••••••••••••••••" {
            errorMessage = "Please enter your secret key"
            return
        }
        
        isSaving = true
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
                        "updatedAt": FieldValue.serverTimestamp(),
                        "updatedBy": Auth.auth().currentUser?.uid ?? "unknown"
                    ])
                
                print("✅ Stripe keys saved successfully")
                successMessage = "Stripe keys saved successfully!"
                
                // Dismiss after a delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    dismiss()
                }
            } catch {
                errorMessage = "Failed to save: \(error.localizedDescription)"
            }
            
            isSaving = false
        }
    }
}

struct InstructionStep: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary)
                    .frame(width: 24, height: 24)
                Text("\(number)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
            }
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

#Preview {
    NavigationStack {
        StripeConfigView()
            .environmentObject(AuthManager())
    }
}
