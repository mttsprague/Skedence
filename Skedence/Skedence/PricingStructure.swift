//
//  PricingStructure.swift
//  Skedence
//
//  Created on 1/9/26.
//

import Foundation

/// Represents a single package option (e.g., "1 Athlete - $80")
struct PackageOption: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var title: String // e.g., "1 Athlete", "2 Athletes", "Small Group"
    var priceInCents: Int // e.g., 8000 = $80.00
    var packageType: String // e.g., "private", "2_athlete", "3_athlete", "class_pass"
    var lessonCount: Int = 1 // Number of lessons/units in this package (e.g., 1, 5, 10)
    
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
    
    enum CodingKeys: String, CodingKey {
        case id, title, priceInCents, packageType, lessonCount
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
                        PackageOption(title: "1 Athlete Private Lesson", priceInCents: 8000, packageType: "private"),
                        PackageOption(title: "2 Athlete Private Lesson", priceInCents: 12000, packageType: "2_athlete"),
                        PackageOption(title: "3 Athlete Private Lesson", priceInCents: 16000, packageType: "3_athlete"),
                        PackageOption(title: "Class Pass", priceInCents: 2000, packageType: "class_pass")
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
