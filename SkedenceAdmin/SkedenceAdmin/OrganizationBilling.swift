import Foundation
import FirebaseFirestore

enum SubscriptionState: String, Codable {
    case trialActive = "trialing"
    case active = "active"
    case pastDue = "past_due"
    case canceled = "canceled"
    case incomplete = "incomplete"
}

enum SubscriptionPlanTier: String, Codable {
    case starter = "starter"
    case studio = "studio"
    case academy = "academy"
    case enterprise = "enterprise"
}

struct OrganizationBilling: Codable {
    var status: String // trialing, active, past_due, canceled
    var plan: String // starter, studio, academy, enterprise
    var trialEndsAt: Date?
    var currentPeriodEnd: Date?
    var graceEndsAt: Date?
    var stripeCustomerId: String?
    var stripeSubscriptionId: String?
    var isActive: Bool
    var isInGrace: Bool
    
    // Computed properties
    var state: SubscriptionState {
        SubscriptionState(rawValue: status) ?? .incomplete
    }
    
    var planTier: SubscriptionPlanTier {
        SubscriptionPlanTier(rawValue: plan) ?? .starter
    }
    
    var isTrialing: Bool {
        status == "trialing"
    }
    
    var isPastDue: Bool {
        status == "past_due"
    }
    
    var isCanceled: Bool {
        status == "canceled"
    }
    
    var daysLeftInTrial: Int {
        guard let trialEnd = trialEndsAt else { return 0 }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: Date(), to: trialEnd).day ?? 0
        return max(0, days)
    }
    
    var daysLeftInGrace: Int {
        guard let graceEnd = graceEndsAt else { return 0 }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: Date(), to: graceEnd).day ?? 0
        return max(0, days)
    }
    
    var canAcceptBookings: Bool {
        isActive
    }
    
    var requiresAction: Bool {
        isPastDue || isCanceled
    }
    
    // Banner/paywall state
    enum PaywallState {
        case none // Fully active, no banner
        case trialBanner(daysLeft: Int)
        case graceBanner(daysLeft: Int)
        case fullBlock // Expired, show full screen modal
    }
    
    var paywallState: PaywallState {
        if isCanceled || (!isActive && !isInGrace) {
            return .fullBlock
        }
        
        if isPastDue && isInGrace {
            return .graceBanner(daysLeft: daysLeftInGrace)
        }
        
        if isTrialing {
            return .trialBanner(daysLeft: daysLeftInTrial)
        }
        
        return .none
    }
}

// Extension to Organization model
extension OrganizationBilling {
    static var mockTrial: OrganizationBilling {
        OrganizationBilling(
            status: "trialing",
            plan: "studio",
            trialEndsAt: Date().addingTimeInterval(9 * 24 * 60 * 60),
            currentPeriodEnd: nil,
            graceEndsAt: nil,
            stripeCustomerId: nil,
            stripeSubscriptionId: nil,
            isActive: true,
            isInGrace: false
        )
    }
    
    static var mockActive: OrganizationBilling {
        OrganizationBilling(
            status: "active",
            plan: "studio",
            trialEndsAt: nil,
            currentPeriodEnd: Date().addingTimeInterval(30 * 24 * 60 * 60),
            graceEndsAt: nil,
            stripeCustomerId: "cus_123",
            stripeSubscriptionId: "sub_123",
            isActive: true,
            isInGrace: false
        )
    }
    
    static var mockPastDue: OrganizationBilling {
        OrganizationBilling(
            status: "past_due",
            plan: "studio",
            trialEndsAt: nil,
            currentPeriodEnd: Date().addingTimeInterval(-5 * 24 * 60 * 60),
            graceEndsAt: Date().addingTimeInterval(3 * 24 * 60 * 60),
            stripeCustomerId: "cus_123",
            stripeSubscriptionId: "sub_123",
            isActive: true,
            isInGrace: true
        )
    }
    
    static var mockExpired: OrganizationBilling {
        OrganizationBilling(
            status: "canceled",
            plan: "studio",
            trialEndsAt: nil,
            currentPeriodEnd: Date().addingTimeInterval(-10 * 24 * 60 * 60),
            graceEndsAt: nil,
            stripeCustomerId: "cus_123",
            stripeSubscriptionId: nil,
            isActive: false,
            isInGrace: false
        )
    }
}
