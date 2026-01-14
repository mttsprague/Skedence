import Foundation

struct PricingPlan: Identifiable, Codable {
    let id: String
    let name: String
    let price: Double
    let billingPeriod: String
    let trainerLimit: Int
    let locationLimit: Int
    let features: [String]
    let isPopular: Bool
    let stripePriceId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case price
        case billingPeriod
        case trainerLimit
        case locationLimit
        case features
        case isPopular
        case stripePriceId
    }
    
    init(
        id: String,
        name: String,
        price: Double,
        billingPeriod: String = "month",
        trainerLimit: Int,
        locationLimit: Int,
        features: [String],
        isPopular: Bool,
        stripePriceId: String?
    ) {
        self.id = id
        self.name = name
        self.price = price
        self.billingPeriod = billingPeriod
        self.trainerLimit = trainerLimit
        self.locationLimit = locationLimit
        self.features = features
        self.isPopular = isPopular
        self.stripePriceId = stripePriceId
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        price = try container.decode(Double.self, forKey: .price)
        billingPeriod = try container.decodeIfPresent(String.self, forKey: .billingPeriod) ?? "month"
        trainerLimit = try container.decode(Int.self, forKey: .trainerLimit)
        locationLimit = try container.decode(Int.self, forKey: .locationLimit)
        features = try container.decode([String].self, forKey: .features)
        isPopular = try container.decode(Bool.self, forKey: .isPopular)
        stripePriceId = try container.decodeIfPresent(String.self, forKey: .stripePriceId)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(price, forKey: .price)
        try container.encode(billingPeriod, forKey: .billingPeriod)
        try container.encode(trainerLimit, forKey: .trainerLimit)
        try container.encode(locationLimit, forKey: .locationLimit)
        try container.encode(features, forKey: .features)
        try container.encode(isPopular, forKey: .isPopular)
        try container.encodeIfPresent(stripePriceId, forKey: .stripePriceId)
    }
    
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
        stripePriceId: "price_1SnO1V2XPese4Q6CGv0X0Td1"
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
        stripePriceId: "price_1SnO4O2XPese4Q6Cxsz7EIsw"
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
        stripePriceId: "price_1SnO5p2XPese4Q6C76TJaivf"
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
        stripePriceId: "price_1SnO712XPese4Q6CZLdPS2VU"
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
        stripePriceId: "price_1SnO8C2XPese4Q6CgkCJm5dM"
    )
    
    static let additionalLocation = PricingAddOn(
        id: "additional_location",
        name: "Additional Location",
        price: 25,
        description: "Per location, per month (Academy+ only)",
        stripePriceId: "price_1SnO8z2XPese4Q6CB8ab3l89"
    )
    
    static let customDomain = PricingAddOn(
        id: "custom_domain",
        name: "Custom Booking Domain",
        price: 15,
        description: "book.yourclub.com",
        stripePriceId: "price_1SnO9k2XPese4Q6Ca9FrwOHt"
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
