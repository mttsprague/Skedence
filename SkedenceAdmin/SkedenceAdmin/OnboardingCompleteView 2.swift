//
//  OnboardingCompleteView.swift
//  SkedenceAdmin
//
//  Step 7: Onboarding complete with next steps
//

import SwiftUI
import FirebaseFirestore

struct OnboardingCompleteView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ScrollView {
            VStack(alignment: .center, spacing: Spacing.xl) {
                Spacer()
                    .frame(height: Spacing.xxxl)
                
                // Success Icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.primary.opacity(0.2), AppTheme.primaryLight.opacity(0.2)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)
                    
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [AppTheme.primary, AppTheme.primaryLight],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
                
                // Congratulations
                VStack(spacing: Spacing.sm) {
                    Text("You're All Set!")
                        .font(.displayMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Your training business is ready to go")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                
                // What's next
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(AppTheme.primary)
                        Text("What's Next")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    
                    NextStepCard(
                        icon: "calendar.badge.plus",
                        title: "Set Your Availability",
                        description: "Let clients know when you're available for bookings",
                        action: "Go to Schedule"
                    )
                    
                    NextStepCard(
                        icon: "person.2.badge.gearshape",
                        title: "Add Team Members",
                        description: "Invite trainers to join your organization",
                        action: "Manage Team"
                    )
                    
                    NextStepCard(
                        icon: "square.and.arrow.up",
                        title: "Share Your Code",
                        description: "Send your invite code \(inviteCode) to clients",
                        action: "Share Now"
                    )
                    
                    NextStepCard(
                        icon: "gear.badge.checkmark",
                        title: "Customize Settings",
                        description: "Fine-tune booking rules and preferences",
                        action: "Open Settings"
                    )
                }
                .padding()
                .background(AppTheme.surfaceSecondary)
                .cornerRadius(CornerRadius.lg)
                
                // Trial info
                VStack(spacing: Spacing.xs) {
                    Text("🎉 14-Day Free Trial Active")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.primary)
                    
                    Text("Full access to all features • No credit card required")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(AppTheme.primary.opacity(0.1))
                .cornerRadius(CornerRadius.md)
                
                Spacer()
                
                // Continue Button
                Button(action: finishOnboarding) {
                    Text("Get Started")
                        .font(.headingSmall)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(
                            LinearGradient(
                                colors: [AppTheme.primary, AppTheme.primaryLight],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .cornerRadius(CornerRadius.md)
                }
                .heavyShadow()
            }
            .padding(Spacing.lg)
        }
        .background(Color(UIColor.systemBackground))
        .navigationBarBackButtonHidden(true)
    }
    
    var inviteCode: String {
        coordinator.organizationData["inviteCode"] as? String ?? "ABC123"
    }
    
    func finishOnboarding() {
        // Mark onboarding as complete in Firestore
        if let orgId = coordinator.orgId {
            Task {
                do {
                    let db = Firestore.firestore()
                    try await db.collection("organizations")
                        .document(orgId)
                        .updateData([
                            "onboardingCompletedAt": Timestamp(date: Date()),
                            "updatedAt": Timestamp(date: Date())
                        ])
                    
                    // IMPORTANT: Set onboardingComplete flag first so auth listener doesn't skip data load
                    auth.onboardingComplete = true
                    
                    // Now load org and all user data into AuthManager
                    if let userId = coordinator.userId {
                        await auth.loadOrgId(for: userId)
                        await auth.refreshTrainerStatus()
                        await auth.refreshTrainerProfileIfNeeded()
                    }
                    
                    print("✅ Onboarding complete! User can now access main app")
                    
                    // This will trigger the app to show the main interface
                } catch {
                    print("Failed to mark onboarding complete: \(error)")
                }
            }
        }
    }
}

// MARK: - Next Step Card

private struct NextStepCard: View {
    let icon: String
    let title: String
    let description: String
    let action: String
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.15))
                    .frame(width: 48, height: 48)
                
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(AppTheme.primary)
            }
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(description)
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
                
                Text(action)
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.primary)
                    .padding(.top, Spacing.xxs)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(AppTheme.textTertiary)
        }
        .padding()
        .background(.white)
        .cornerRadius(CornerRadius.md)
    }
}

#Preview {
    OnboardingCompleteView()
        .environmentObject(OnboardingCoordinator())
}
