//
//  OnboardingCoordinator.swift
//  SkedenceAdmin
//
//  Coordinates the multi-step onboarding flow
//

import SwiftUI
import Combine
import FirebaseFirestore

// MARK: - Onboarding Data Model

struct OnboardingData {
    // Account Info
    var orgId: String?
    var userId: String?
    var organizationName: String?
    var timezone: String?
    var currency: String?
    
    // Terms & Privacy
    var termsAccepted: Bool = false
    var privacyAccepted: Bool = false
    
    // Business Details
    var contactPhone: String?
    var contactEmail: String?
    var website: String?
    var address: Address?
    
    // Invite Code
    var inviteCode: String?
    
    // Location
    var firstLocationId: String?
    
    // Stripe
    var stripeComplete: Bool = false
    var stripeAccountId: String?
    
    // Packages
    var packagesComplete: Bool = false
    var createdPackageIds: [String] = []
    
    struct Address: Codable {
        var line1: String
        var line2: String?
        var city: String
        var state: String
        var zipCode: String
    }
}

// MARK: - Onboarding Step

enum OnboardingStep: Int, CaseIterable {
    case account = 0        // Create account (existing CreateBusinessView)
    case termsOfService     // Accept Terms of Service and Privacy Policy
    case businessDetails    // Phone, website, address
    case inviteCode         // Generate and preview invite code
    case location           // First location (optional)
    case stripeConnect      // Stripe payment setup
    case packages           // Create lesson packages
    case complete           // Welcome and next steps
    
    var title: String {
        switch self {
        case .account: return "Account"
        case .termsOfService: return "Terms & Privacy"
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

// MARK: - Onboarding Coordinator

class OnboardingCoordinator: ObservableObject {
    @Published var currentStep: OnboardingStep = .account
    @Published var data = OnboardingData()
    
    // Convenience accessors for backward compatibility
    var orgId: String? {
        get { data.orgId }
        set { data.orgId = newValue }
    }
    
    var userId: String? {
        get { data.userId }
        set { data.userId = newValue }
    }
    
    func moveToNextStep() {
        if let nextStep = OnboardingStep(rawValue: currentStep.rawValue + 1) {
            currentStep = nextStep
        } else {
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
            return data.orgId != nil
        case .termsOfService:
            return data.termsAccepted
        case .businessDetails:
            return data.contactPhone != nil || data.contactEmail != nil
        case .inviteCode:
            return data.inviteCode != nil
        case .location:
            return true // Optional step
        case .stripeConnect:
            return data.stripeComplete
        case .packages:
            return data.packagesComplete
        case .complete:
            return true
        }
    }
}
