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
    var athlete2FirstName: String?
    var athlete2LastName: String?
    var athlete2Birthday: String?
    var athlete3FirstName: String?
    var athlete3LastName: String?
    var athlete3Birthday: String?
    var athletePosition: String?
    var athlete2Position: String?
    var athlete3Position: String?

    var displayName: String {
        let f = (firstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (lastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return [f, l].filter { !$0.isEmpty }.joined(separator: " ")
    }
}
