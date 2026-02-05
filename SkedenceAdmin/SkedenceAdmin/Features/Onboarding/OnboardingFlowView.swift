//
//  OnboardingFlowView.swift
//  SkedenceAdmin
//
//  Main container for the complete onboarding flow
//

import SwiftUI
import FirebaseFirestore
import FirebaseAuth

struct OnboardingFlowView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @Environment(\.dismiss) var dismiss
    @State private var isLoading = true
    @State private var hasCheckedAccount = false // Prevent re-running check
    
    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .tint(AppTheme.primary)
                    Text("Setting up...")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            } else {
                NavigationStack {
                    VStack(spacing: 0) {
                        // Progress Bar
                        OnboardingProgressBar(
                            currentStep: coordinator.currentStep,
                            totalSteps: OnboardingStep.allCases.count
                        )
                        
                        // Current Step Content
                        Group {
                            switch coordinator.currentStep {
                            case .account:
                                OnboardingAccountView()
                            case .termsOfService:
                                OnboardingTermsView()
                            case .businessDetails:
                                OnboardingBusinessDetailsView()
                            case .inviteCode:
                                OnboardingInviteCodeView()
                            case .location:
                                OnboardingLocationView()
                            case .stripeConnect:
                                OnboardingStripeViewDirect()
                            case .packages:
                                OnboardingPackagesView()
                            case .complete:
                                OnboardingCompleteView()
                            }
                        }
                    }
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        // Back button (only show from step 2 onwards, not back to account creation)
                        ToolbarItem(placement: .navigationBarLeading) {
                            if coordinator.currentStep.rawValue > 1 && coordinator.currentStep != .complete {
                                Button(action: {
                                    coordinator.moveToPreviousStep()
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "chevron.left")
                                        Text("Back")
                                    }
                                }
                            }
                        }
                        
                        // Cancel button - signs out and returns to landing
                        if coordinator.currentStep != .complete {
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Cancel") {
                                    cancelOnboarding()
                                }
                                .foregroundColor(.red)
                            }
                        }
                    }
                }
                .environmentObject(coordinator)
            }
        }
        .onAppear {
            if !hasCheckedAccount {
                Task {
                    await checkExistingAccount()
                }
            }
        }
    }
    
    func cancelOnboarding() {
        Task {
            do {
                try Auth.auth().signOut()
                // AuthManager will detect sign out and show landing page
            } catch {
            }
        }
    }
    
    func checkExistingAccount() async {
        
        // CRITICAL: If coordinator already has orgId OR userId, account creation is in progress
        // Don't run any checks that would change the step
        if coordinator.orgId != nil || coordinator.userId != nil {
            hasCheckedAccount = true
            isLoading = false
            return
        }
        
        // Only check once to prevent clearing coordinator after account creation
        guard !hasCheckedAccount else {
            isLoading = false
            return
        }
        
        // If onboarding is already complete, user shouldn't be in this flow
        // This prevents users from getting back into onboarding after completion
        if auth.onboardingComplete {
            hasCheckedAccount = true
            isLoading = false
            return
        }
        
        // Don't overwrite if coordinator is already past account step (account creation in progress)
        if coordinator.currentStep != .account {
            hasCheckedAccount = true
            isLoading = false
            return
        }
        
        // Mark as checked BEFORE doing any async work to prevent race conditions
        hasCheckedAccount = true
        
        
        // If user is already authenticated, they must have started onboarding but didn't finish
        // Skip account creation and go to terms or later based on what exists
        if auth.isAuthenticated, let userId = auth.userId {
            coordinator.userId = userId
            
            // Try to load existing org if it exists
            if let orgId = auth.currentOrgId {
                coordinator.orgId = orgId
                // Skip to appropriate step based on what exists
                coordinator.currentStep = .termsOfService
            } else {
                // No org exists - check if they have an orgMember record
                await loadOrgFromMembership(userId: userId)
            }
        } else {
        }
        // else: user not authenticated, start at .account step (default)
        
        isLoading = false
    }
    
    func loadOrgFromMembership(userId: String) async {
        #if canImport(FirebaseFirestore)
        do {
            let db = Firestore.firestore()
            let snapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: userId)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first,
               let orgId = doc.data()["orgId"] as? String {
                // They have an org! Load it into coordinator
                coordinator.orgId = orgId
                coordinator.userId = userId
                
                // Try to load org data to see where they left off
                let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
                if let orgData = orgDoc.data() {
                    coordinator.data.organizationName = orgData["name"] as? String
                    
                    // Check if terms have been accepted
                    if orgData["termsAcceptedAt"] != nil {
                        coordinator.data.termsAccepted = true
                        
                        // Check for invite code
                        if let inviteCode = orgData["inviteCode"] as? String {
                            coordinator.data.inviteCode = inviteCode
                            coordinator.currentStep = .location // Skip to location
                        } else {
                            coordinator.currentStep = .businessDetails // Start from business details
                        }
                    } else {
                        // Terms not accepted yet, start there
                        coordinator.currentStep = .termsOfService
                    }
                } else {
                    // Org doesn't exist - this is the orphaned case, show sign out screen
                    coordinator.currentStep = .account // Will show orphaned view
                }
            } else {
                // No orgMember found - user just created account, start at terms
                coordinator.currentStep = .termsOfService
            }
        } catch {
            coordinator.currentStep = .account
        }
        #endif
    }
}

// MARK: - Progress Bar

struct OnboardingProgressBar: View {
    let currentStep: OnboardingStep
    let totalSteps: Int
    
    var body: some View {
        VStack(spacing: Spacing.sm) {
            // Progress indicator
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 8)
                    
                    // Progress
                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.primary, AppTheme.primaryLight],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * currentStep.progress, height: 8)
                        .animation(.spring(response: 0.3), value: currentStep)
                }
            }
            .frame(height: 8)
            .padding(.horizontal, Spacing.lg)
            
            // Step indicator text
            Text("Step \(currentStep.rawValue + 1) of \(totalSteps): \(currentStep.title)")
                .font(.labelMedium)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(.vertical, Spacing.md)
        .background(Color(UIColor.systemBackground))
    }
}

#Preview {
    OnboardingFlowView()
        .environmentObject(AuthManager())
}
