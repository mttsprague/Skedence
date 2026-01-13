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
    @EnvironmentObject var auth: AuthManager
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
                            case .businessDetails:
                                OnboardingBusinessDetailsView()
                            case .inviteCode:
                                OnboardingInviteCodeView()
                            case .location:
                                OnboardingLocationView()
                            case .stripeConnect:
                                OnboardingStripeView()
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
                print("✅ Signed out and cancelled onboarding")
                // AuthManager will detect sign out and show landing page
            } catch {
                print("❌ Error signing out: \(error)")
            }
        }
    }
    
    func checkExistingAccount() async {
        print("🔍 OnboardingFlowView.checkExistingAccount() CALLED")
        print("   hasCheckedAccount flag: \(hasCheckedAccount)")
        print("   Coordinator orgId: \(coordinator.orgId ?? "nil")")
        print("   Coordinator userId: \(coordinator.userId ?? "nil")")
        
        // CRITICAL: If coordinator already has orgId OR userId, account creation is in progress
        // Don't run any checks that would change the step
        if coordinator.orgId != nil || coordinator.userId != nil {
            print("✅ OnboardingFlowView: Coordinator has data (orgId or userId), skipping all checks")
            print("   This means account creation is in progress - don't interfere!")
            hasCheckedAccount = true
            isLoading = false
            return
        }
        
        // Only check once to prevent clearing coordinator after account creation
        guard !hasCheckedAccount else {
            print("⏭️  OnboardingFlowView: Already checked account, skipping")
            isLoading = false
            return
        }
        
        // If onboarding is already complete, user shouldn't be in this flow
        // This prevents users from getting back into onboarding after completion
        if auth.onboardingComplete {
            print("✅ OnboardingFlowView: Onboarding already complete, exiting flow")
            hasCheckedAccount = true
            isLoading = false
            return
        }
        
        // Don't overwrite if coordinator is already past account step (account creation in progress)
        if coordinator.currentStep != .account {
            print("✅ OnboardingFlowView: Already past account step (\(coordinator.currentStep)), skipping check")
            hasCheckedAccount = true
            isLoading = false
            return
        }
        
        // Mark as checked BEFORE doing any async work to prevent race conditions
        hasCheckedAccount = true
        
        print("🔍 OnboardingFlowView: Checking for existing account data")
        print("   Current step before check: \(coordinator.currentStep)")
        
        // If user is already authenticated, they must have started onboarding but didn't finish
        // Skip account creation and go to business details (or later if they have org data)
        if auth.isAuthenticated, let userId = auth.userId {
            coordinator.userId = userId
            print("   Found authenticated user: \(userId)")
            
            // Try to load existing org if it exists
            if let orgId = auth.currentOrgId {
                coordinator.orgId = orgId
                print("   Found org in auth: \(orgId)")
                // Skip to business details or later based on what exists
                coordinator.currentStep = .businessDetails
                print("   ✏️  Set currentStep to: .businessDetails")
            } else {
                // No org exists - check if they have an orgMember record
                print("   No org in auth, checking orgMembers...")
                await loadOrgFromMembership(userId: userId)
            }
        } else {
            print("   No authenticated user, starting at account step")
            print("   Current step after check: \(coordinator.currentStep)")
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
                    coordinator.organizationData["name"] = orgData["name"] as? String
                    
                    if let inviteCode = orgData["inviteCode"] as? String {
                        coordinator.organizationData["inviteCode"] = inviteCode
                        coordinator.currentStep = .location // Skip to location
                    } else {
                        coordinator.currentStep = .businessDetails // Start from business details
                    }
                } else {
                    // Org doesn't exist - this is the orphaned case, show sign out screen
                    coordinator.currentStep = .account // Will show orphaned view
                }
            } else {
                // No orgMember found - user just created account, stay at business details
                print("   No orgMember found, staying at business details step")
                print("   ⚠️  CHANGING STEP: account → businessDetails (line 197)")
                coordinator.currentStep = .businessDetails
            }
        } catch {
            print("Error loading org from membership: \(error)")
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
