import Foundation

// Athlete information structure
struct AthleteInfo: Codable {
    var firstName: String?
    var lastName: String?
    var birthday: String?
    var schoolClubTeam: String?
    var experienceLevel: String?
    var position: String? // Keep for backward compatibility
    
    var displayName: String {
        let f = (firstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (lastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return [f, l].filter { !$0.isEmpty }.joined(separator: " ")
    }
}

// /users/{uid}
struct UserProfile: Identifiable {
    var id: String? // Firebase Auth UID
    var emailAddress: String?
    var firstName: String?
    var lastName: String?
    var phoneNumber: String?
    var photoURL: String?
    var active: Bool?
    var createdAt: Date?
    var updatedAt: Date?
    
    // Emergency contact
    var emergencyContactName: String?
    var emergencyContactNumber: String?
    
    // Referral
    var referredBy: String?
    
    // Notes
    var notesForCoach: String?
    
    // Athletes array (new format)
    var athletes: [AthleteInfo]?
    
    // Legacy fields (for backward compatibility)
    var athleteFirstName: String?
    var athleteLastName: String?
    var athleteBirthday: String?
    var athleteSchoolClubTeam: String?
    var athleteExperienceLevel: String?
    var athlete2FirstName: String?
    var athlete2LastName: String?
    var athlete2Birthday: String?
    var athlete2SchoolClubTeam: String?
    var athlete2ExperienceLevel: String?
    var athlete3FirstName: String?
    var athlete3LastName: String?
    var athlete3Birthday: String?
    var athlete3SchoolClubTeam: String?
    var athlete3ExperienceLevel: String?
    var athletePosition: String?
    var athlete2Position: String?
    var athlete3Position: String?

    var displayName: String {
        let f = (firstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (lastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return [f, l].filter { !$0.isEmpty }.joined(separator: " ")
    }
    
    // Computed property for legacy athleteName
    var athleteName: String {
        // Check new format first
        if let firstAthlete = athletes?.first, !firstAthlete.displayName.isEmpty {
            return firstAthlete.displayName
        }
        // Fall back to legacy format
        let f = (athleteFirstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (athleteLastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return [f, l].filter { !$0.isEmpty }.joined(separator: " ")
    }
}
