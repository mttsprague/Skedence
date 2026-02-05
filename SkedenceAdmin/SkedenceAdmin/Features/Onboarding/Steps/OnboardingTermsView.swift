//
//  OnboardingTermsView.swift
//  SkedenceAdmin
//
//  Step 2: Accept Terms of Service and Privacy Policy
//

import SwiftUI
import FirebaseFirestore

struct OnboardingTermsView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var hasAcceptedTerms: Bool = false
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Header
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(AppTheme.primary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, Spacing.xs)
                    
                    Text("Legal Agreements")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Please review and accept our terms to continue")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                .padding(.bottom, Spacing.md)
                
                // What you're agreeing to
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("What You're Agreeing To")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        AgreementPoint(
                            icon: "shield.checkered",
                            title: "Platform Use",
                            description: "Skedence is a software platform for managing your training business"
                        )
                        
                        AgreementPoint(
                            icon: "creditcard.fill",
                            title: "Payment Terms",
                            description: "Payments are processed by Stripe, and subscriptions auto-renew monthly"
                        )
                        
                        AgreementPoint(
                            icon: "lock.fill",
                            title: "Data Protection",
                            description: "We protect your data and your clients' information with industry-standard security"
                        )
                        
                        AgreementPoint(
                            icon: "exclamationmark.triangle.fill",
                            title: "Your Responsibility",
                            description: "You're responsible for your services, client relationships, and cancellation policies"
                        )
                    }
                }
                .padding()
                .background(AppTheme.surfaceSecondary)
                .cornerRadius(CornerRadius.md)
                
                // Links to full documents
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Please Review:")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Link(destination: URL(string: "https://skedence.com/terms")!) {
                        HStack {
                            Image(systemName: "doc.text")
                                .foregroundStyle(AppTheme.primary)
                            Text("Terms of Service")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.primary)
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                        .padding()
                        .background(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                    
                    Link(destination: URL(string: "https://skedence.com/privacy")!) {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .foregroundStyle(AppTheme.primary)
                            Text("Privacy Policy")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.primary)
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                        .padding()
                        .background(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                }
                
                // Checkbox
                Button(action: {
                    hasAcceptedTerms.toggle()
                }) {
                    HStack(alignment: .top, spacing: Spacing.sm) {
                        Image(systemName: hasAcceptedTerms ? "checkmark.square.fill" : "square")
                            .font(.title3)
                            .foregroundStyle(hasAcceptedTerms ? AppTheme.primary : AppTheme.textTertiary)
                        
                        Text("I have read and agree to the Terms of Service and Privacy Policy")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                            .multilineTextAlignment(.leading)
                        
                        Spacer()
                    }
                    .padding()
                    .background(.white)
                    .cornerRadius(CornerRadius.md)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(hasAcceptedTerms ? AppTheme.primary : Color.gray.opacity(0.2), lineWidth: 2)
                    )
                }
                .buttonStyle(.plain)
                
                // Error message
                if let errorMessage {
                    Text(errorMessage)
                        .font(.bodySmall)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }
                
                // Continue button
                Button(action: acceptTermsAndContinue) {
                    HStack {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Continue")
                                .font(.headingSmall)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(hasAcceptedTerms ? AppTheme.primary : Color.gray.opacity(0.3))
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(!hasAcceptedTerms || isSaving)
                
                // Legal disclaimer
                Text("By continuing, you acknowledge that Skedence is a platform tool and you remain responsible for your own business operations, client services, and compliance with local regulations.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textTertiary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.top, Spacing.sm)
            }
            .padding(Spacing.lg)
        }
        .background(Color.platformBackground)
    }
    
    func acceptTermsAndContinue() {
        guard let orgId = coordinator.orgId else {
            errorMessage = "Organization not found. Please restart onboarding."
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                #if canImport(FirebaseFirestore)
                let db = Firestore.firestore()
                
                // Log acceptance
                let acceptanceData: [String: Any] = [
                    "termsAcceptedAt": Timestamp(date: Date()),
                    "termsAcceptedBy": coordinator.userId ?? "",
                    "termsVersion": "1.0", // Version the ToS for future updates
                    "updatedAt": Timestamp(date: Date())
                ]
                
                try await db.collection("organizations")
                    .document(orgId)
                    .updateData(acceptanceData)
                
                // Store in coordinator with type-safe model
                coordinator.data.termsAccepted = true
                coordinator.data.privacyAccepted = true
                
                coordinator.moveToNextStep()
                isSaving = false
                
                #endif
            } catch {
                errorMessage = "Failed to save: \(error.localizedDescription)"
                isSaving = false
            }
        }
    }
}

// MARK: - Agreement Point

private struct AgreementPoint: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(AppTheme.primary)
                .frame(width: 28)
            
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
}

#Preview {
    OnboardingTermsView()
        .environmentObject(OnboardingCoordinator())
}
