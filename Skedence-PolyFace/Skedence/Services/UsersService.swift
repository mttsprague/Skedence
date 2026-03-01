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
    // MARK: - ServiceProtocol Standard Properties
    
    @Published private(set) var items: [UserProfile] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: Error?
    
    // MARK: - User-Specific Properties
    
    @Published private(set) var currentUser: UserProfile? {
        didSet {
            // Keep items in sync with currentUser
            items = currentUser.map { [$0] } ?? []
        }
    }

    private let repository = UsersRepository()
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch current user profile
    func fetch() async throws {
        await loadCurrentUserIfAvailable()
    }
    
    /// Refresh current user profile
    func refresh() async throws {
        await loadCurrentUserIfAvailable()
    }

    func loadCurrentUserIfAvailable() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        guard let uid = Auth.auth().currentUser?.uid else {
            currentUser = nil
            return
        }
        
        do {
            currentUser = try await repository.fetchCurrentUser(uid: uid)
        } catch RepositoryError.notFound {
            currentUser = nil
            // Don't sign out automatically - user may still be valid but Firestore doc not created yet
            print("⚠️ UsersService: User document not found for UID: \(uid). Auth session preserved.")
        } catch let catchError {
            error = mapRepositoryError(catchError)
            currentUser = nil
        }
    }
    
    // Legacy wrapper to maintain compatibility with older call sites
    func loadUserProfile() async throws {
        await loadCurrentUserIfAvailable()
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
        
        var updateData: [String: Any] = [:]
        
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
        
        try await repository.updateUserFields(userId: uid, fields: updateData)
        
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
            "emailAddress": emailAddress
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
        
        try await repository.updateUserFields(userId: uid, fields: updateData)
        
        // Activity logging handled by cloud functions
        
        // Reload the profile after update
        try await loadUserProfile()
    }
    
    private func getOrgIdForUser(_ userId: String) async -> String? {
        // UserProfile doesn't contain orgId - this would need to be fetched from a separate collection
        // For now, return nil to avoid crashes
        return nil
    }
    
    // MARK: - Helper Methods
    
    private func mapRepositoryError(_ error: Error) -> ServiceError {
        if let repoError = error as? RepositoryError {
            switch repoError {
            case .notFound:
                return ServiceError.notFound
            case .unauthorized:
                return ServiceError.notAuthenticated
            case .invalidData(let message):
                return ServiceError.invalidData(message)
            default:
                return ServiceError.networkError(error)
            }
        }
        return ServiceError.networkError(error)
    }
}
