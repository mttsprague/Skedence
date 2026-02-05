//
//  Client.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation

struct Client: Identifiable, Codable, Hashable {
    var id: String
    var referenceCode: String? // Human-readable reference (e.g., "SMITH-J-001")
    var firstName: String
    var lastName: String
    var emailAddress: String
    var phoneNumber: String
    var photoURL: String?
    
    // Athlete 1
    var athleteFirstName: String?
    var athleteLastName: String?
    var athleteBirthday: String?
    var athletePosition: String?
    var athleteSchoolClubTeam: String?
    var athleteExperienceLevel: String?
    
    // Athlete 2
    var athlete2FirstName: String?
    var athlete2LastName: String?
    var athlete2Birthday: String?
    var athlete2Position: String?
    var athlete2SchoolClubTeam: String?
    var athlete2ExperienceLevel: String?
    
    // Athlete 3
    var athlete3FirstName: String?
    var athlete3LastName: String?
    var athlete3Birthday: String?
    var athlete3Position: String?
    var athlete3SchoolClubTeam: String?
    var athlete3ExperienceLevel: String?
    
    // Notes
    var notesForCoach: String?

    var fullName: String { "\(firstName) \(lastName)" }
    
    var initials: String {
        let first = firstName.prefix(1).uppercased()
        let last = lastName.prefix(1).uppercased()
        return "\(first)\(last)"
    }
    
    var athleteFullName: String? {
        let f = (athleteFirstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (athleteLastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let fullName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
        return fullName.isEmpty ? nil : fullName
    }
    
    var athlete2FullName: String? {
        let f = (athlete2FirstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (athlete2LastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let fullName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
        return fullName.isEmpty ? nil : fullName
    }
    
    var athlete3FullName: String? {
        let f = (athlete3FirstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let l = (athlete3LastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let fullName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
        return fullName.isEmpty ? nil : fullName
    }
}
