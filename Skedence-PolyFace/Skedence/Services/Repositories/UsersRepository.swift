//
//  UsersRepository.swift
//  Skedence
//
//  Phase 4.1: User profile data access layer
//

import Foundation
import FirebaseFirestore

@MainActor
final class UsersRepository: RepositoryProtocol {
    typealias DataType = UserProfile
    
    private let db = Firestore.firestore()
    
    // MARK: - RepositoryProtocol Implementation
    
    func fetchAll(orgId: String) async throws -> [UserProfile] {
        // Users are not scoped to organizations in this collection
        throw RepositoryError.unsupportedOperation
    }
    
    func fetchById(id: String, orgId: String) async throws -> UserProfile? {
        let snapshot = try await db.collection("users").document(id).getDocument()
        
        guard snapshot.exists else {
            return nil
        }
        
        guard let data = snapshot.data() else {
            return nil
        }
        return decodeUserProfile(id: snapshot.documentID, data: data)
    }
    
    func create(_ item: UserProfile, orgId: String) async throws -> String {
        guard let userId = item.id else {
            throw RepositoryError.invalidData("User ID is required")
        }
        let data = encodeUserProfile(item)
        try await db.collection("users").document(userId).setData(data)
        return userId
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        try await db.collection("users").document(id).setData(data, merge: true)
    }
    
    func delete(id: String, orgId: String) async throws {
        try await db.collection("users").document(id).delete()
    }
    
    // MARK: - User-Specific Methods (Convenience wrappers)
    
    /// Update user with UserProfile object
    func updateUser(_ item: UserProfile, orgId: String) async throws {
        guard let userId = item.id else {
            throw RepositoryError.invalidData("User ID is required")
        }
        let data = encodeUserProfile(item)
        try await update(id: userId, data: data, orgId: orgId)
    }
    
    /// Fetch current authenticated user's profile
    func fetchCurrentUser(uid: String) async throws -> UserProfile {
        // Query by authUserId field since document IDs are name-based
        let snapshot = try await db.collection("users")
            .whereField("authUserId", isEqualTo: uid)
            .limit(to: 1)
            .getDocuments()
        
        guard let document = snapshot.documents.first else {
            throw RepositoryError.notFound
        }
        
        let data = document.data()
        return decodeUserProfile(id: document.documentID, data: data)
    }
    
    /// Update specific fields for a user
    func updateUserFields(userId: String, fields: [String: Any]) async throws {
        try await db.collection("users").document(userId).setData(fields, merge: true)
    }
    
    // MARK: - Encoding/Decoding Helpers
    
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
            referenceCode: data["referenceCode"] as? String,
            emailAddress: data["emailAddress"] as? String,
            firstName: data["firstName"] as? String,
            lastName: data["lastName"] as? String,
            phoneNumber: data["phoneNumber"] as? String,
            photoURL: data["photoURL"] as? String,
            active: data["active"] as? Bool,
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue(),
            updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue(),
            emergencyContactName: data["emergencyContactName"] as? String,
            emergencyContactNumber: data["emergencyContactNumber"] as? String,
            referredBy: data["referredBy"] as? String,
            notesForCoach: data["notesForCoach"] as? String,
            athletes: athletes,
            athleteFirstName: data["athleteFirstName"] as? String,
            athleteLastName: data["athleteLastName"] as? String,
            athleteBirthday: data["athleteBirthday"] as? String,
            athleteSchoolClubTeam: data["athleteSchoolClubTeam"] as? String,
            athleteExperienceLevel: data["athleteExperienceLevel"] as? String,
            athlete2FirstName: data["athlete2FirstName"] as? String,
            athlete2LastName: data["athlete2LastName"] as? String,
            athlete2Birthday: data["athlete2Birthday"] as? String,
            athlete2SchoolClubTeam: data["athlete2SchoolClubTeam"] as? String,
            athlete2ExperienceLevel: data["athlete2ExperienceLevel"] as? String,
            athlete3FirstName: data["athlete3FirstName"] as? String,
            athlete3LastName: data["athlete3LastName"] as? String,
            athlete3Birthday: data["athlete3Birthday"] as? String,
            athlete3SchoolClubTeam: data["athlete3SchoolClubTeam"] as? String,
            athlete3ExperienceLevel: data["athlete3ExperienceLevel"] as? String,
            athletePosition: data["athletePosition"] as? String,
            athlete2Position: data["athlete2Position"] as? String,
            athlete3Position: data["athlete3Position"] as? String
        )
    }
    
    private func encodeUserProfile(_ profile: UserProfile) -> [String: Any] {
        var data: [String: Any] = [:]
        
        if let referenceCode = profile.referenceCode {
            data["referenceCode"] = referenceCode
        }
        if let emailAddress = profile.emailAddress {
            data["emailAddress"] = emailAddress
        }
        if let firstName = profile.firstName {
            data["firstName"] = firstName
        }
        if let lastName = profile.lastName {
            data["lastName"] = lastName
        }
        if let phoneNumber = profile.phoneNumber {
            data["phoneNumber"] = phoneNumber
        }
        if let photoURL = profile.photoURL {
            data["photoURL"] = photoURL
        }
        if let active = profile.active {
            data["active"] = active
        }
        if let createdAt = profile.createdAt {
            data["createdAt"] = Timestamp(date: createdAt)
        }
        if let updatedAt = profile.updatedAt {
            data["updatedAt"] = Timestamp(date: updatedAt)
        }
        if let emergencyContactName = profile.emergencyContactName {
            data["emergencyContactName"] = emergencyContactName
        }
        if let emergencyContactNumber = profile.emergencyContactNumber {
            data["emergencyContactNumber"] = emergencyContactNumber
        }
        if let referredBy = profile.referredBy {
            data["referredBy"] = referredBy
        }
        if let notesForCoach = profile.notesForCoach {
            data["notesForCoach"] = notesForCoach
        }
        
        return data
    }
}
