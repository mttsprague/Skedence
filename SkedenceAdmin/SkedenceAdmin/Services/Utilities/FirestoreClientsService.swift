//
//  FirestoreClientsService.swift
//  SkedenceAdmin
//
//  Phase 3.1: Extracted from FirestoreService (clients domain)
//

import Foundation
import Combine

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

/// Domain-specific service for client-related Firestore operations
final class FirestoreClientsService {
    static let shared = FirestoreClientsService()
    private init() {}
    
    // MARK: - Client Operations
    
    func fetchTrainerClients(trainerId: String, orgId: String) async throws -> [Client] {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchTrainerClients(trainerId: trainerId, orgId: orgId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func fetchClient(by uid: String) async throws -> Client? {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchClient(by: uid)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func fetchClientPackages(clientId: String) async throws -> [LessonPackage] {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchClientPackages(clientId: clientId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func adminBookLesson(trainerId: String, slotId: String, clientId: String, packageId: String, orgId: String) async throws {
        #if canImport(FirebaseFirestore)
        try await FirestoreService.shared.adminBookLesson(trainerId: trainerId, slotId: slotId, clientId: clientId, packageId: packageId, orgId: orgId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func fetchClientBookings(clientId: String, upcoming: Bool, orgId: String) async throws -> [ClientBooking] {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchClientBookings(clientId: clientId, upcoming: upcoming, orgId: orgId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func fetchClientDocuments(clientId: String) async throws -> [ClientDocument] {
        #if canImport(FirebaseFirestore)
        return try await FirestoreService.shared.fetchClientDocuments(clientId: clientId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
}
