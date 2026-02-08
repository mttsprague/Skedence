//
//  UserProfile.swift
//  SkedenceAdmin
//
//  User profile and athlete information models
//

import Foundation

// Athlete information structure
struct AthleteInfo: Codable {
    var firstName: String?
    var lastName: String?
    var birthday: String?
    var schoolClubTeam: String?
    var experienceLevel: String?
    var position: String?
    
    var displayName: String {
        let f = (firstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (lastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return [f, l].filter { !$0.isEmpty }.joined(separator: " ")
    }
    
    // Initialize from Firestore dictionary
    init(from dictionary: [String: Any]) throws {
        self.firstName = dictionary["firstName"] as? String
        self.lastName = dictionary["lastName"] as? String
        self.birthday = dictionary["birthday"] as? String
        self.schoolClubTeam = dictionary["schoolClubTeam"] as? String
        self.experienceLevel = dictionary["experienceLevel"] as? String
        self.position = dictionary["position"] as? String
    }
    
    init(firstName: String? = nil, lastName: String? = nil, birthday: String? = nil,
         schoolClubTeam: String? = nil, experienceLevel: String? = nil, position: String? = nil) {
        self.firstName = firstName
        self.lastName = lastName
        self.birthday = birthday
        self.schoolClubTeam = schoolClubTeam
        self.experienceLevel = experienceLevel
        self.position = position
    }
}

// User profile structure
struct UserProfile: Identifiable {
    var id: String // Firebase Auth UID
    var referenceCode: String?
    var emailAddress: String
    var firstName: String
    var lastName: String
    var phoneNumber: String
    var photoURL: String?
    var active: Bool?
    var createdAt: Date?
    var updatedAt: Date?
    
    // Emergency contact
    var emergencyContactName: String
    var emergencyContactNumber: String
    
    // Referral
    var referredBy: String?
    
    // Notes
    var notesForCoach: String?
    
    // Athletes array
    var athletes: [AthleteInfo]
    
    // Legacy fields (for backward compatibility)
    var athleteFirstName: String?
    var athleteLastName: String?
    var athleteBirthday: String?
    var athleteSchoolClubTeam: String?
    var athleteExperienceLevel: String?
    var athletePosition: String?
    
    var athlete2FirstName: String?
    var athlete2LastName: String?
    var athlete2Birthday: String?
    var athlete2SchoolClubTeam: String?
    var athlete2ExperienceLevel: String?
    var athlete2Position: String?
    
    var fullName: String {
        "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
    }
}
