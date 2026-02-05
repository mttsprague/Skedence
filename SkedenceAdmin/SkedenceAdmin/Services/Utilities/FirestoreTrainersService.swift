//
//  FirestoreTrainersService.swift
//  SkedenceAdmin
//
//  Phase 3.1: Extracted from FirestoreService (trainers domain)
//

import Foundation

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

/// Domain-specific service for trainer-related Firestore operations
final class FirestoreTrainersService {
    static let shared = FirestoreTrainersService()
    private init() {}
    
    // MARK: - Trainer Operations
    
    func fetchAllTrainers(orgId: String) async throws -> [Trainer] {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchAllTrainers(orgId: orgId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func fetchTrainer(by id: String) async throws -> Trainer? {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchTrainer(by: id)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func createOrUpdateUserProfile(uid: String, firstName: String, lastName: String, emailAddress: String, phoneNumber: String? = nil, photoURL: String? = nil, active: Bool = true) async throws {
        #if canImport(FirebaseFirestore)
        try await FirestoreService.shared.createOrUpdateUserProfile(uid: uid, firstName: firstName, lastName: lastName, emailAddress: emailAddress, phoneNumber: phoneNumber, photoURL: photoURL, active: active)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func createOrUpdateTrainerProfile(trainerId: String, firstName: String, lastName: String, email: String, avatarUrl: String? = nil, photoURL: String? = nil, imageUrl: String? = nil, active: Bool = true) async throws {
        #if canImport(FirebaseFirestore)
        try await FirestoreService.shared.createOrUpdateTrainerProfile(trainerId: trainerId, firstName: firstName, lastName: lastName, email: email, avatarUrl: avatarUrl, photoURL: photoURL, imageUrl: imageUrl, active: active)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
}
