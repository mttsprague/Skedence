//
//  OnboardingLandingView.swift
//  SkedenceAdmin
//
//  STEP 9: Landing page for new businesses
//  Shows when no account exists
//

import SwiftUI

struct OnboardingLandingView: View {
    @EnvironmentObject var auth: AuthManager
    @State private var showingCreateBusiness: Bool = false
    @State private var showingSignIn: Bool = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    Spacer()
                        .frame(height: 60)
                    
                    // Logo/Icon
                    Image(systemName: "calendar.badge.checkmark")
                        .font(.system(size: 100))
                        .foregroundStyle(.white)
                        .shadow(radius: 10)
                    
                    // Title
                    VStack(spacing: Spacing.sm) {
                        Text("Skedence")
                            .font(.displayLarge)
                            .foregroundStyle(.white)
                        
                        Text("Manage Your Training Business")
                            .font(.headingMedium)
                            .foregroundStyle(.white.opacity(0.9))
                    }
                    
                    // Features
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        FeatureRow(
                            icon: "calendar",
                            title: "Smart Scheduling",
                            description: "Manage availability and bookings in one place"
                        )
                        
                        FeatureRow(
                            icon: "person.2",
                            title: "Client Management",
                            description: "Track clients, packages, and session history"
                        )
                        
                        FeatureRow(
                            icon: "creditcard",
                            title: "Payments Made Easy",
                            description: "Accept payments and get paid automatically"
                        )
                        
                        FeatureRow(
                            icon: "chart.line.uptrend.xyaxis",
                            title: "Business Insights",
                            description: "Track revenue, bookings, and growth"
                        )
                    }
                    .padding()
                    .background(.white)
                    .cornerRadius(CornerRadius.lg)
                    .shadow(radius: 20)
                    
                    // CTA Buttons
                    VStack(spacing: Spacing.md) {
                        Button(action: { showingCreateBusiness = true }) {
                            Text("Create Business Account")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.md)
                                .background(.white)
                                .cornerRadius(CornerRadius.md)
                        }
                        .heavyShadow()
                        
                        Button(action: { showingSignIn = true }) {
                            Text("Sign In")
                                .font(.headingSmall)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.md)
                                .background(.white.opacity(0.2))
                                .cornerRadius(CornerRadius.md)
                        }
                    }
                    
                    Spacer()
                }
                .padding(Spacing.lg)
            }
        }
        .sheet(isPresented: $showingCreateBusiness) {
            CreateBusinessView()
                .environmentObject(auth)
        }
        .sheet(isPresented: $showingSignIn) {
            SignInView()
                .environmentObject(auth)
        }
    }
}

// MARK: - Feature Row

private struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.15))
                    .frame(width: 48, height: 48)
                
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(AppTheme.primary)
            }
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(description)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }
}

// MARK: - Sign In View (Simple)

private struct SignInView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var isSigningIn: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                // Email
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Email")
                        .font(.labelLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    TextField("you@example.com", text: $email)
                        .font(.bodyLarge)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .padding()
                        .background(AppTheme.surfaceSecondary)
                        .cornerRadius(CornerRadius.md)
                }
                
                // Password
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Password")
                        .font(.labelLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    SecureField("Password", text: $password)
                        .font(.bodyLarge)
                        .padding()
                        .background(AppTheme.surfaceSecondary)
                        .cornerRadius(CornerRadius.md)
                }
                
                // Error
                if let error = errorMessage {
                    Text(error)
                        .font(.bodyMedium)
                        .foregroundStyle(.red)
                }
                
                // Sign In Button
                Button(action: signIn) {
                    HStack {
                        if isSigningIn {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isSigningIn ? "Signing In..." : "Sign In")
                            .font(.headingSmall)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(email.isEmpty || password.isEmpty ? Color.gray : AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(email.isEmpty || password.isEmpty || isSigningIn)
                
                Spacer()
            }
            .padding(Spacing.lg)
            .navigationTitle("Sign In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    func signIn() {
        isSigningIn = true
        errorMessage = nil
        
        Task {
            do {
                _ = try await auth.signIn(email: email, password: password)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                isSigningIn = false
            }
        }
    }
}

#Preview {
    OnboardingLandingView()
        .environmentObject(AuthManager())
}
