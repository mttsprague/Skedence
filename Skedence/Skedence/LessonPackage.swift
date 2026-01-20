//
//  LessonPackage.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation

// /users/{uid}/lessonPackages/{packageId}
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

    var lessonsRemaining: Int { totalLessons - lessonsUsed }

    // Convenience used by some UI examples
    var isValidAndAvailable: Bool {
        lessonsRemaining > 0 && expirationDate >= Date()
    }
    
    // Helper to check if this package can book lessons (not classes)
    var canBookLessons: Bool {
        // Check packageCategory first, then fall back to packageType
        if let category = packageCategory {
            return category == "pass"
        }
        // Fallback: check packageType for backward compatibility
        return packageType != "class" && packageType != "class_pass"
    }
    
    // Helper to check if this package can book classes
    var canBookClasses: Bool {
        // Check packageCategory first, then fall back to packageType
        if let category = packageCategory {
            return category == "class"
        }
        // Fallback: check packageType for backward compatibility
        return packageType == "class" || packageType == "class_pass"
    }
}
