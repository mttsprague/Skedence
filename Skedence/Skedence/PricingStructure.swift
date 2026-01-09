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
    
    enum CodingKeys: String, CodingKey {
        case id, title, priceInCents
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
                        PackageOption(title: "1 Athlete", priceInCents: 8000),
                        PackageOption(title: "2 Athletes", priceInCents: 12000),
                        PackageOption(title: "3 Athletes", priceInCents: 16000),
                        PackageOption(title: "Class", priceInCents: 2000)
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
