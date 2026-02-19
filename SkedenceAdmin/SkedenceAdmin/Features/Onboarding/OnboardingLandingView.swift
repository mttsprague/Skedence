//
//  OnboardingLandingView.swift
//  SkedenceAdmin
//
//  STEP 9: Landing page for new businesses
//  Shows when no account exists
//

import SwiftUI

struct OnboardingLandingView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var showingCreateBusiness: Bool = false
    @State private var showingSignIn: Bool = false
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
    
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
            OnboardingFlowView()
                .environmentObject(dependencies)
                .environmentObject(coordinator)
        }
        .sheet(isPresented: $showingSignIn) {
            // Use the shared SignInView defined in SignInView.swift
            SignInView()
                .environmentObject(dependencies)
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

#Preview {
    OnboardingLandingView()
        .environmentObject(AdminAppDependencies())
        .environmentObject(OnboardingCoordinator())
}
