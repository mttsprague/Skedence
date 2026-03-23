//
//  LessonPackage.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation

// STANDARD PATH: organizations/{orgId}/users/{userId}/packages/{packageId}
struct LessonPackage: Identifiable, Equatable {
    var id: String?
    let packageType: String
    let packageName: String? // Display name from pricing structure (e.g., "1 athlete private", "Class Pass")
    let packageCategory: String? // "pass" or "class" - determines what can be booked
    let totalLessons: Int
    var lessonsUsed: Int
    let purchaseDate: Date
    let expirationDate: Date
    let transactionId: String?
    
    // Tier Pricing (NEW)
    let pricingTierId: String? // e.g., "tier_master" - which tier this pass is valid for
    let pricingTierName: String? // e.g., "Master Trainer" - display name
    let pricePerLesson: Int? // Price per lesson in cents (for display)

    var lessonsRemaining: Int { totalLessons - lessonsUsed }

    // Convenience used by some UI examples
    var isValidAndAvailable: Bool {
        lessonsRemaining > 0 && expirationDate >= Date()
    }
    
    // Helper to check if this package can book lessons (not classes)
    var canBookLessons: Bool {
        // Always check packageType first as source of truth
        let isClassByType = (packageType == "class" || packageType == "class_pass")
        if isClassByType {
            return false // Class packages can't book lessons
        }
        // Also check category if set
        if let category = packageCategory {
            return category == "oneAthlete" || category == "twoAthlete" || 
                   category == "threeAthlete" || category == "fourAthlete" ||
                   category == "pass" // backward compatibility
        }
        return true // Default to true for backward compatibility
    }
    
    // Helper to check if this package can book classes
    var canBookClasses: Bool {
        // Always check packageType first as source of truth
        let isClassByType = (packageType == "class" || packageType == "class_pass")
        if isClassByType {
            return true // These are class packages
        }
        // Also check category if set
        if let category = packageCategory {
            return category == "classPass" || category == "class" // class for backward compatibility
        }
        return false // Default to false - not a class package
    }
    
    // Helper to check if this pass is valid for a specific trainer's tier
    func isValidForTrainer(_ trainer: Trainer) -> Bool {
        // If pass has no tier restriction, it works with any trainer (legacy passes)
        guard let passTierId = pricingTierId else {
            return true
        }
        
        // If trainer has no tier assigned, use legacy passes only
        guard let trainerTierId = trainer.pricingTierId else {
            return pricingTierId == nil
        }
        
        // Pass must match trainer's tier
        return passTierId == trainerTierId
    }
}
