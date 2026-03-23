//
//  Trainer.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation
import Combine

// /trainers/{trainerId}
struct Trainer: Identifiable, Hashable {
    var id: String?
    var referenceCode: String? // Human-readable reference (e.g., "TR-MIKE-001")
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarUrl: String?
    let photoURL: String?
    let imageUrl: String?
    let active: Bool?
    let birthday: String?
    let trainerDescription: String?
    
    // Tier Pricing (NEW)
    let pricingTierId: String? // e.g., "tier_master", "tier_advanced"
    let pricingTierName: String? // e.g., "Master Trainer", "Advanced Trainer"
    
    var name: String? {
        guard let first = firstName, let last = lastName else { return nil }
        return "\(first) \(last)".trimmingCharacters(in: .whitespaces)
    }
}
