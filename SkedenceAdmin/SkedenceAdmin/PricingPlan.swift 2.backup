import Foundation

struct PricingPlan: Identifiable, Codable {
    let id: String
    let name: String
    let price: Double
    let billingPeriod: String = "month"
    let trainerLimit: Int
    let locationLimit: Int
    let features: [String]
    let isPopular: Bool
    let stripePriceId: String?
    
    static let starter = PricingPlan(
        id: "starter",
        name: "Starter",
        price: 29,
        trainerLimit: 1,
        locationLimit: 1,
        features: [
            "1 trainer",
            "Unlimited clients",
            "Lesson packages + payments",
            "Availability + booking",
            "Email confirmations & reminders",
            "Basic business settings",
            "Client invite links"
        ],
        isPopular: false,
        stripePriceId: nil // Set in production
    )
    
    static let studio = PricingPlan(
        id: "studio",
        name: "Studio",
        price: 99,
        trainerLimit: 5,
        locationLimit: 1,
        features: [
            "Up to 5 trainers",
            "Unlimited clients",
            "Multi-trainer scheduling",
            "Admin dashboard",
            "Cancellation & rescheduling policies",
            "Email reminders + follow-ups",
            "Payout & revenue tracking",
            "Branded booking link"
        ],
        isPopular: true,
        stripePriceId: nil // Set in production
    )
    
    static let academy = PricingPlan(
        id: "academy",
        name: "Academy",
        price: 249,
        trainerLimit: 15,
        locationLimit: 3,
        features: [
            "Up to 15 trainers",
            "Multiple locations",
            "Roles & permissions",
            "Advanced admin controls",
            "Analytics & reporting",
            "Revenue & utilization tracking",
            "Export & reporting tools",
            "Priority onboarding support"
        ],
        isPopular: false,
        stripePriceId: nil // Set in production
    )
    
    static let enterprise = PricingPlan(
        id: "enterprise",
        name: "Enterprise",
        price: 499,
        trainerLimit: 999,
        locationLimit: 999,
        features: [
            "Unlimited trainers & locations",
            "Custom domain (book.yourclub.com)",
            "Custom branding (colors/logo)",
            "Advanced permissions",
            "White-label options",
            "Dedicated support",
            "Custom integrations",
            "SLA guarantees"
        ],
        isPopular: false,
        stripePriceId: nil // Contact sales
    )
    
    static let allPlans = [starter, studio, academy, enterprise]
}

struct PricingAddOn: Identifiable {
    let id: String
    let name: String
    let price: Double
    let description: String
    let stripePriceId: String?
    
    static let additionalTrainer = PricingAddOn(
        id: "additional_trainer",
        name: "Additional Trainer",
        price: 10,
        description: "Per trainer, per month",
        stripePriceId: nil
    )
    
    static let additionalLocation = PricingAddOn(
        id: "additional_location",
        name: "Additional Location",
        price: 25,
        description: "Per location, per month (Academy+ only)",
        stripePriceId: nil
    )
    
    static let customDomain = PricingAddOn(
        id: "custom_domain",
        name: "Custom Booking Domain",
        price: 15,
        description: "book.yourclub.com",
        stripePriceId: nil
    )
    
    static let allAddOns = [additionalTrainer, additionalLocation, customDomain]
}

struct SubscriptionStatus: Codable {
    var planId: String
    var trialEndsAt: Date?
    var subscriptionStatus: String // active, trialing, past_due, canceled
    var currentPeriodEnd: Date?
    var trainerCount: Int = 0
    var locationCount: Int = 1
    var addOns: [String] = []
    
    var isActive: Bool {
        subscriptionStatus == "active" || subscriptionStatus == "trialing"
    }
    
    var isInTrial: Bool {
        if let trialEnd = trialEndsAt {
            return Date() < trialEnd
        }
        return false
    }
    
    var daysLeftInTrial: Int {
        guard let trialEnd = trialEndsAt else { return 0 }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: Date(), to: trialEnd).day ?? 0
        return max(0, days)
    }
    
    func canAddTrainer() -> Bool {
        guard let plan = PricingPlan.allPlans.first(where: { $0.id == planId }) else {
            return false
        }
        return trainerCount < plan.trainerLimit
    }
    
    func canAddLocation() -> Bool {
        guard let plan = PricingPlan.allPlans.first(where: { $0.id == planId }) else {
            return false
        }
        return locationCount < plan.locationLimit
    }
}
