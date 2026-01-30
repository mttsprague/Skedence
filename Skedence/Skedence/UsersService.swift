//
//  UsersService.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class UsersService: ObservableObject {
    @Published private(set) var currentUser: UserProfile?

    private let db = Firestore.firestore()

    func loadCurrentUserIfAvailable() async {
        guard let uid = Auth.auth().currentUser?.uid else {
            print("UsersService: No authenticated user")
            currentUser = nil
            return
        }
        
        print("UsersService: Loading profile for UID: \(uid)")
        do {
            let snapshot = try await db.collection("users").document(uid).getDocument()
            if snapshot.exists, let data = snapshot.data() {
                print("UsersService: ✅ User document found")
                currentUser = decodeUserProfile(id: snapshot.documentID, data: data)
            } else {
                print("UsersService: ❌ User document does NOT exist for UID: \(uid)")
                print("UsersService: This usually means the Firebase Auth UID doesn't match any Firestore user document.")
                print("UsersService: Automatically signing out to clear cached auth token...")
                currentUser = nil
                
                // Force sign out to clear the cached auth token
                try? Auth.auth().signOut()
            }
        } catch {
            print("UsersService: ❌ Error loading user profile: \(error)")
            currentUser = nil
        }
    }

    private func decodeUserProfile(id: String, data: [String: Any]) -> UserProfile {
        // Decode athletes array if available
        var athletes: [AthleteInfo]? = nil
        if let athletesData = data["athletes"] as? [[String: Any]] {
            athletes = athletesData.compactMap { athleteDict in
                AthleteInfo(
                    firstName: athleteDict["firstName"] as? String,
                    lastName: athleteDict["lastName"] as? String,
                    birthday: athleteDict["birthday"] as? String,
                    schoolClubTeam: athleteDict["schoolClubTeam"] as? String,
                    experienceLevel: athleteDict["experienceLevel"] as? String,
                    position: athleteDict["position"] as? String
                )
            }
        }
        
        return UserProfile(
            id: id,
            emailAddress: data["emailAddress"] as? String,
            firstName: data["firstName"] as? String,
            lastName: data["lastName"] as? String,
            phoneNumber: data["phoneNumber"] as? String,
            photoURL: data["photoURL"] as? String,
            active: data["active"] as? Bool,
            createdAt: Self.date(from: data["createdAt"]),
            updatedAt: Self.date(from: data["updatedAt"]),
            emergencyContactName: data["emergencyContactName"] as? String,
            emergencyContactNumber: data["emergencyContactNumber"] as? String,
            referredBy: data["referredBy"] as? String,
            notesForCoach: data["notesForCoach"] as? String,
            athletes: athletes,
            // Legacy fields for backward compatibility
            athleteFirstName: data["athleteFirstName"] as? String,
            athleteLastName: data["athleteLastName"] as? String,
            athleteBirthday: data["athleteBirthday"] as? String,
            athlete2FirstName: data["athlete2FirstName"] as? String,
            athlete2LastName: data["athlete2LastName"] as? String,
            athlete2Birthday: data["athlete2Birthday"] as? String,
            athlete3FirstName: data["athlete3FirstName"] as? String,
            athlete3LastName: data["athlete3LastName"] as? String,
            athlete3Birthday: data["athlete3Birthday"] as? String,
            athletePosition: data["athletePosition"] as? String,
            athlete2Position: data["athlete2Position"] as? String,
            athlete3Position: data["athlete3Position"] as? String
        )
    }

    private static func date(from any: Any?) -> Date? {
        if let ts = any as? Timestamp { return ts.dateValue() }
        if let d = any as? Date { return d }
        if let dict = any as? [String: Any], let seconds = dict["_seconds"] as? TimeInterval {
            return Date(timeIntervalSince1970: seconds)
        }
        return nil
    }
    
    var currentUserProfile: UserProfile? {
        return currentUser
    }
    
    // New method that accepts a UserProfile object directly
    func updateCurrentUser(_ profile: UserProfile) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw NSError(domain: "UsersService", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }
        
        var updateData: [String: Any] = [
            "updatedAt": FieldValue.serverTimestamp()
        ]
        
        // Add parent/guardian fields
        if let firstName = profile.firstName {
            updateData["firstName"] = firstName
        }
        if let lastName = profile.lastName {
            updateData["lastName"] = lastName
        }
        if let emailAddress = profile.emailAddress {
            updateData["emailAddress"] = emailAddress
        }
        if let phoneNumber = profile.phoneNumber {
            updateData["phoneNumber"] = phoneNumber
        }
        
        // Add emergency contact fields
        if let emergencyContactName = profile.emergencyContactName {
            updateData["emergencyContactName"] = emergencyContactName
        }
        if let emergencyContactNumber = profile.emergencyContactNumber {
            updateData["emergencyContactNumber"] = emergencyContactNumber
        }
        
        // Add referral field
        if let referredBy = profile.referredBy {
            updateData["referredBy"] = referredBy
        }
        
        // Add notes
        if let notesForCoach = profile.notesForCoach {
            updateData["notesForCoach"] = notesForCoach
        }
        
        // Add athletes array
        if let athletes = profile.athletes {
            let athletesData: [[String: Any]] = athletes.map { athlete in
                var athleteDict: [String: Any] = [:]
                if let firstName = athlete.firstName {
                    athleteDict["firstName"] = firstName
                }
                if let lastName = athlete.lastName {
                    athleteDict["lastName"] = lastName
                }
                if let birthday = athlete.birthday {
                    athleteDict["birthday"] = birthday
                }
                if let schoolClubTeam = athlete.schoolClubTeam {
                    athleteDict["schoolClubTeam"] = schoolClubTeam
                }
                if let experienceLevel = athlete.experienceLevel {
                    athleteDict["experienceLevel"] = experienceLevel
                }
                if let position = athlete.position {
                    athleteDict["position"] = position
                }
                return athleteDict
            }
            updateData["athletes"] = athletesData
        }
        
        try await db.collection("users").document(uid).updateData(updateData)
        
        // Reload the profile after update
        await loadCurrentUserIfAvailable()
    }
    
    // Legacy method - kept for backward compatibility
    func updateUserProfile(
        firstName: String,
        lastName: String,
        athleteFirstName: String,
        athleteLastName: String,
        athlete2FirstName: String?,
        athlete2LastName: String?,
        athlete3FirstName: String?,
        athlete3LastName: String?,
        athletePosition: String?,
        athlete2Position: String?,
        athlete3Position: String?,
        notesForCoach: String?,
        emailAddress: String,
        phoneNumber: String?
    ) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw NSError(domain: "UsersService", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }
        
        var updateData: [String: Any] = [
            "firstName": firstName,
            "lastName": lastName,
            "athleteFirstName": athleteFirstName,
            "athleteLastName": athleteLastName,
            "emailAddress": emailAddress,
            "updatedAt": FieldValue.serverTimestamp()
        ]
        
        // Add optional fields
        if let athlete2FirstName = athlete2FirstName {
            updateData["athlete2FirstName"] = athlete2FirstName
        }
        if let athlete2LastName = athlete2LastName {
            updateData["athlete2LastName"] = athlete2LastName
        }
        if let athlete3FirstName = athlete3FirstName {
            updateData["athlete3FirstName"] = athlete3FirstName
        }
        if let athlete3LastName = athlete3LastName {
            updateData["athlete3LastName"] = athlete3LastName
        }
        if let athletePosition = athletePosition {
            updateData["athletePosition"] = athletePosition
        }
        if let athlete2Position = athlete2Position {
            updateData["athlete2Position"] = athlete2Position
        }
        if let athlete3Position = athlete3Position {
            updateData["athlete3Position"] = athlete3Position
        }
        if let notesForCoach = notesForCoach {
            updateData["notesForCoach"] = notesForCoach
        }
        if let phoneNumber = phoneNumber {
            updateData["phoneNumber"] = phoneNumber
        }
        
        try await db.collection("users").document(uid).updateData(updateData)
        
        // Reload the profile after update
        await loadCurrentUserIfAvailable()
    }
}
