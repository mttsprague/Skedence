//
//  OnboardingCoordinator.swift
//  SkedenceAdmin
//
//  Coordinates the multi-step onboarding flow
//

import SwiftUI
import Combine
import FirebaseFirestore

enum OnboardingStep: Int, CaseIterable {
    case account = 0        // Create account (existing CreateBusinessView)
    case businessDetails    // Phone, website, address
    case inviteCode         // Generate and preview invite code
    case location           // First location (optional)
    case stripeConnect      // Stripe payment setup
    case packages           // Create lesson packages
    case complete           // Welcome and next steps
    
    var title: String {
        switch self {
        case .account: return "Account"
        case .businessDetails: return "Business Details"
        case .inviteCode: return "Invite Code"
        case .location: return "Location"
        case .stripeConnect: return "Payments"
        case .packages: return "Packages"
        case .complete: return "Complete"
        }
    }
    
    var progress: Double {
        Double(rawValue + 1) / Double(OnboardingStep.allCases.count)
    }
}

class OnboardingCoordinator: ObservableObject {
    @Published var currentStep: OnboardingStep = .account
    @Published var orgId: String?
    @Published var userId: String?
    @Published var organizationData: [String: Any] = [:]
    
    func moveToNextStep() {
        let oldStep = currentStep
        if let nextStep = OnboardingStep(rawValue: currentStep.rawValue + 1) {
            print("⏭️  Coordinator.moveToNextStep(): \(oldStep) → \(nextStep)")
            currentStep = nextStep
        } else {
            print("⏭️  Coordinator.moveToNextStep(): Already at final step \(oldStep)")
        }
    }
    
    func moveToPreviousStep() {
        if let previousStep = OnboardingStep(rawValue: currentStep.rawValue - 1) {
            currentStep = previousStep
        }
    }
    
    func canSkipStep(_ step: OnboardingStep) -> Bool {
        switch step {
        case .location:
            return true // Location is optional
        default:
            return false
        }
    }
    
    func isStepComplete(_ step: OnboardingStep) -> Bool {
        // Check if each step has been completed
        switch step {
        case .account:
            return orgId != nil
        case .businessDetails:
            return organizationData["phone"] != nil || organizationData["contactEmail"] != nil
        case .inviteCode:
            return organizationData["inviteCode"] != nil
        case .location:
            return true // Optional step
        case .stripeConnect:
            return organizationData["stripeComplete"] as? Bool ?? false
        case .packages:
            return organizationData["packagesComplete"] as? Bool ?? false
        case .complete:
            return true
        }
    }
}
