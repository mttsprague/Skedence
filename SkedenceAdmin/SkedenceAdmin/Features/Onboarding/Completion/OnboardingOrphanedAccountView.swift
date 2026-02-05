//
//  OnboardingOrphanedAccountView.swift
//  SkedenceAdmin
//
//  Handles edge case where user is authenticated but has no organization
//  (e.g., deleted Firebase data while still logged in)
//

import SwiftUI
import FirebaseAuth

struct OnboardingOrphanedAccountView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
    @State private var isSigningOut = false
    
    var body: some View {
        ZStack {
            // Gradient Background
            LinearGradient(
                gradient: Gradient(colors: [
                    AppTheme.primary,
                    AppTheme.primary.opacity(0.8)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: Spacing.xl) {
                Spacer()
                
                // Icon
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.white)
                    .padding(.bottom, Spacing.md)
                
                // Title
                Text("Account Issue Detected")
                    .font(.headingLarge)
                    .foregroundStyle(.white)
                
                // Message
                Text("Your account is signed in, but we couldn't find your organization data. This can happen if data was deleted or reset.")
                    .font(.bodyMedium)
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
                
                Spacer()
                
                // Actions
                VStack(spacing: Spacing.md) {
                    // Sign Out Button
                    Button(action: signOut) {
                        HStack {
                            if isSigningOut {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "arrow.right.square.fill")
                                Text("Sign Out & Start Fresh")
                                    .font(.labelLarge)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(.white)
                        .foregroundColor(AppTheme.primary)
                        .cornerRadius(CornerRadius.md)
                    }
                    .disabled(isSigningOut)
                    
                    Text("You'll be able to create a new organization after signing out")
                        .font(.labelSmall)
                        .foregroundStyle(.white.opacity(0.7))
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.xxl)
            }
        }
    }
    
    func signOut() {
        isSigningOut = true
        
        Task {
            do {
                try Auth.auth().signOut()
                // AuthManager will automatically update isAuthenticated
                await MainActor.run {
                    isSigningOut = false
                }
            } catch {
                await MainActor.run {
                    isSigningOut = false
                }
            }
        }
    }
}

#Preview {
    OnboardingOrphanedAccountView()
        .environmentObject(AuthManager())
}
