//
//  OnboardingContinueView.swift
//  SkedenceAdmin
//
//  Continue onboarding for users who created account but didn't finish
//

import SwiftUI
import FirebaseFirestore

struct OnboardingContinueView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var coordinator = OnboardingCoordinator()
    @State private var isLoading = true
    
    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .tint(AppTheme.primary)
                    Text("Loading your setup...")
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
                                // Skip account - already created
                                EmptyView()
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
                }
                .environmentObject(coordinator)
            }
        }
        .task {
            await loadExistingData()
        }
    }
    
    func loadExistingData() async {
        guard let orgId = auth.currentOrgId,
              let userId = auth.userId else {
            isLoading = false
            return
        }
        
        // Load organization data to populate coordinator
        do {
            let db = Firestore.firestore()
            let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
            
            if let orgData = orgDoc.data() {
                // Populate coordinator with existing data
                coordinator.orgId = orgId
                coordinator.userId = userId
                coordinator.organizationData["name"] = orgData["name"] as? String
                
                if let inviteCode = orgData["inviteCode"] as? String {
                    coordinator.organizationData["inviteCode"] = inviteCode
                    // Skip invite code step if already exists
                    coordinator.currentStep = .location
                } else {
                    // Start from business details (skip account creation)
                    coordinator.currentStep = .businessDetails
                }
            }
            
            isLoading = false
        } catch {
            print("Failed to load organization data: \(error)")
            // Default to business details step
            coordinator.currentStep = .businessDetails
            coordinator.orgId = orgId
            coordinator.userId = userId
            isLoading = false
        }
    }
}

#Preview {
    OnboardingContinueView()
        .environmentObject(AuthManager())
}
