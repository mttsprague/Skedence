//
//  PricingStructure.swift
//  Skedence
//
//  Created on 1/9/26.
//

import Foundation

/// Package category - determines what this package can be used for and how many athletes
enum PackageCategory: String, Codable, CaseIterable {
    case oneAthlete = "oneAthlete"       // Private lessons for 1 athlete
    case twoAthlete = "twoAthlete"       // Private lessons for 2 athletes
    case threeAthlete = "threeAthlete"   // Private lessons for 3 athletes
    case fourAthlete = "fourAthlete"     // Private lessons for 4 athletes
    case classPass = "class"             // Group classes
    
    var displayName: String {
        switch self {
        case .oneAthlete: return "1 Athlete"
        case .twoAthlete: return "2 Athletes"
        case .threeAthlete: return "3 Athletes"
        case .fourAthlete: return "4 Athletes"
        case .classPass: return "Class"
        }
    }
    
    var athleteCount: Int {
        switch self {
        case .oneAthlete: return 1
        case .twoAthlete: return 2
        case .threeAthlete: return 3
        case .fourAthlete: return 4
        case .classPass: return 0
        }
    }
    
    var isPrivateLesson: Bool {
        self != .classPass
    }
}

/// Represents a single package option (e.g., "1 Athlete - $80")
struct PackageOption: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var title: String // e.g., "1 Athlete", "2 Athletes", "Small Group"
    var priceInCents: Int // e.g., 8000 = $80.00
    var packageType: String // Auto-generated from category and ID
    var packageCategory: PackageCategory = .oneAthlete // Determines athlete count or class
    var lessonCount: Int = 1 // Number of lessons/units in this package (e.g., 1, 5, 10)
    
    // Auto-generate packageType from category if not set
    mutating func ensurePackageType() {
        if packageType.isEmpty {
            packageType = "\(packageCategory.rawValue)_\(id.prefix(8))"
        }
    }
    var description: String = "" // Package description
    var expirationDays: Int = 365 // Days until pass expires after purchase
    var active: Bool = true // Whether this package is currently available for purchase
    
    /// Formatted price for display (e.g., "$80.00")
    var formattedPrice: String {
        let dollars = Double(priceInCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
    
    /// Price in dollars for input fields
    var priceInDollars: Double {
        get { Double(priceInCents) / 100.0 }
        set { priceInCents = Int(newValue * 100) }
    }
    
    /// Auto-generated packageType from title (backward compatibility)
    mutating func autoGeneratePackageType() {
        if packageType.isEmpty {
            packageType = title.lowercased().replacingOccurrences(of: " ", with: "_")
        }
    }
    
    /// Explicit memberwise initializer (needed because we implement a custom `init(from:)`)
    init(
        id: String = UUID().uuidString,
        title: String,
        priceInCents: Int,
        packageType: String,
        packageCategory: PackageCategory = .oneAthlete,
        lessonCount: Int = 1,
        description: String = "",
        expirationDays: Int = 365,
        active: Bool = true
    ) {
        self.id = id
        self.title = title
        self.priceInCents = priceInCents
        self.packageType = packageType
        self.packageCategory = packageCategory
        self.lessonCount = lessonCount
        self.description = description
        self.expirationDays = expirationDays
        self.active = active
    }
    
    // Custom decoding to handle missing fields for backward compatibility
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // id can be a UUID string (iOS-created) or a numeric timestamp string (web-created via Date.now())
        if let strId = try? container.decode(String.self, forKey: .id) {
            id = strId
        } else if let intId = try? container.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else if let dblId = try? container.decode(Double.self, forKey: .id) {
            id = String(Int(dblId))
        } else {
            id = UUID().uuidString
        }
        title = try container.decode(String.self, forKey: .title)
        // priceInCents can be Int or Double in JSON
        if let intPrice = try? container.decode(Int.self, forKey: .priceInCents) {
            priceInCents = intPrice
        } else if let dblPrice = try? container.decode(Double.self, forKey: .priceInCents) {
            priceInCents = Int(dblPrice)
        } else {
            priceInCents = 0
        }
        packageType = (try? container.decode(String.self, forKey: .packageType)) ?? ""
        // Handle "classPass" (web admin alias) and "class" (the actual rawValue for .classPass)
        if let rawCat = try? container.decode(String.self, forKey: .packageCategory) {
            packageCategory = PackageCategory(rawValue: rawCat)
                ?? (rawCat == "classPass" ? .classPass : .oneAthlete)
        } else {
            packageCategory = .oneAthlete
        }
        lessonCount = try container.decodeIfPresent(Int.self, forKey: .lessonCount) ?? 1
        description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        expirationDays = try container.decodeIfPresent(Int.self, forKey: .expirationDays) ?? 365
        active = try container.decodeIfPresent(Bool.self, forKey: .active) ?? true
    }
    
    // Custom encoding to ensure all fields are saved
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(title, forKey: .title)
        try container.encode(priceInCents, forKey: .priceInCents)
        try container.encode(packageType, forKey: .packageType)
        try container.encode(packageCategory, forKey: .packageCategory)
        try container.encode(lessonCount, forKey: .lessonCount)
        try container.encode(description, forKey: .description)
        try container.encode(expirationDays, forKey: .expirationDays)
        try container.encode(active, forKey: .active)
    }
    
    enum CodingKeys: String, CodingKey {
        case id, title, priceInCents, packageType, packageCategory, lessonCount, description, expirationDays, active
    }
}

/// Represents a pricing tier (e.g., "Master", "Elite", "Pro")
struct PricingTier: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var tierName: String // e.g., "Master", "Elite", "Pro", "Head"
    var packages: [PackageOption] // List of package options in this tier
    
    enum CodingKeys: String, CodingKey {
        case id, tierName, packages
    }
}

/// Complete pricing structure for an organization
struct PricingStructure: Codable {
    var tiers: [PricingTier]
    var lastUpdated: Date
    
    enum CodingKeys: String, CodingKey {
        case tiers, lastUpdated
    }
    
    /// Default pricing structure (backward compatibility)
    static var `default`: PricingStructure {
        PricingStructure(
            tiers: [
                PricingTier(
                    tierName: "Standard",
                    packages: [
                        PackageOption(title: "1 Athlete Private Lesson", priceInCents: 8000, packageType: "oneAthlete", packageCategory: .oneAthlete),
                        PackageOption(title: "2 Athlete Private Lesson", priceInCents: 12000, packageType: "twoAthlete", packageCategory: .twoAthlete),
                        PackageOption(title: "3 Athlete Private Lesson", priceInCents: 16000, packageType: "threeAthlete", packageCategory: .threeAthlete),
                        PackageOption(title: "Class Pass", priceInCents: 2000, packageType: "class_pass", packageCategory: .classPass)
                    ]
                )
            ],
            lastUpdated: Date()
        )
    }
    
    /// Get all packages across all tiers (flattened list)
    var allPackages: [PackageOption] {
        tiers.flatMap { $0.packages }
    }
    
    /// Find a package by title (case-insensitive)
    func package(withTitle title: String) -> PackageOption? {
        allPackages.first { $0.title.lowercased() == title.lowercased() }
    }
}
