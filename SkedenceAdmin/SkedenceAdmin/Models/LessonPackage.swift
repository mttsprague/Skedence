//
//  LessonPackage.swift
//  SkedenceAdmin
//
//  Created by GitHub Copilot
//

import Foundation

struct LessonPackage: Identifiable, Codable, Hashable {
    var id: String
    var packageType: String
    var packageCategory: String? // "pass" or "class" - determines what can be booked
    var packageName: String? // Custom package name from pricing
    var trainerId: String? // Trainer-specific package
    var totalLessons: Int
    var lessonsUsed: Int
    var purchaseDate: Date
    var expirationDate: Date?
    var transactionId: String?
    
    var lessonsRemaining: Int {
        max(0, totalLessons - lessonsUsed)
    }
    
    var isExpired: Bool {
        guard let expiration = expirationDate else { return false }
        return expiration < Date()
    }
    
    // Helper to check if this package can book lessons (not classes)
    var canBookLessons: Bool {
        packageCategory == "pass" || packageCategory == nil // nil for backward compatibility
    }
    
    // Helper to check if this package can book classes
    var canBookClasses: Bool {
        packageCategory == "class"
    }
    
    var packageDisplayName: String {
        // Use custom package name if available
        if let customName = packageName, !customName.isEmpty {
            return customName
        }
        
        // Fallback to packageType mapping
        switch packageType {
        case "single": return "Single Lesson"
        case "private": return "Private Lesson"
        case "two_athlete", "2_athlete": return "2 Athletes"
        case "three_athlete", "3_athlete": return "3 Athletes"
        case "class_pass": return "Class Pass"
        default: return packageType.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
    
    var statusText: String {
        if isExpired {
            return "Expired"
        } else if lessonsRemaining == 0 {
            return "Used"
        } else {
            return "\(lessonsRemaining) of \(totalLessons) remaining"
        }
    }
    
    var statusColor: String {
        if isExpired || lessonsRemaining == 0 {
            return "secondary"
        } else if lessonsRemaining <= 1 {
            return "orange"
        } else {
            return "green"
        }
    }
}

struct ClientBooking: Identifiable, Codable {
    var id: String
    var trainerId: String
    var trainerName: String
    var startTime: Date
    var endTime: Date
    var status: String
    var location: String? // Dynamic location from booking
    var bookedAt: Date?
    var isClassBooking: Bool?
    var classId: String?
    var packageId: String?
    var packageType: String?
    var athleteName: String? // Name of athlete for this lesson
    var secondAthleteName: String? // Second participant name
    var lessonNotes: String? // Lesson-specific notes from client
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: startTime)
    }
    
    var duration: String {
        let components = Calendar.current.dateComponents([.hour, .minute], from: startTime, to: endTime)
        if let hours = components.hour, hours > 0 {
            return "\(hours)h"
        } else if let minutes = components.minute {
            return "\(minutes)m"
        }
        return "1h"
    }
    
    var packageTypeName: String {
        guard let type = packageType else { return "Private Lesson" }
        switch type {
        case "private", "single": return "Private Lesson"
        case "2_athlete", "two_athlete": return "2-Athlete Private Lesson"
        case "3_athlete", "three_athlete": return "3-Athlete Private Lesson"
        case "class_pass": return "Class Pass"
        default: return "Private Lesson"
        }
    }
}

struct ClientDocument: Identifiable, Codable {
    var id: String
    var name: String
    var type: String
    var uploadedAt: Date
    var url: String?
    var storedDisplayName: String? // Stored display name from Firestore
    var athleteName: String? // Name of athlete this document is for
    
    var displayName: String {
        // Use stored display name if available
        if let storedDisplayName = storedDisplayName {
            return storedDisplayName
        }
        
        // If we have an athlete name, format it with the document type
        if let athleteName = athleteName, !athleteName.isEmpty {
            switch type {
            case "waiver": return "\(athleteName) - Waiver"
            case "medical": return "\(athleteName) - Medical Form"
            case "emergency_contact": return "\(athleteName) - Emergency Contact"
            default: return "\(athleteName) - \(name)"
            }
        }
        
        // Fall back to type-based naming
        switch type {
        case "waiver": return "Waiver"
        case "medical": return "Medical Form"
        case "emergency_contact": return "Emergency Contact"
        default: return name
        }
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, type, uploadedAt, url, athleteName
        case storedDisplayName = "displayName"
    }
    
    var icon: String {
        switch type {
        case "waiver": return "doc.text.fill"
        case "medical": return "cross.circle.fill"
        case "emergency_contact": return "phone.circle.fill"
        default: return "doc.fill"
        }
    }
}
