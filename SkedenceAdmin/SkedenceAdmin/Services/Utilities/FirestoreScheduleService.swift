//
//  FirestoreScheduleService.swift
//  SkedenceAdmin
//
//  Phase 3.1: Extracted from FirestoreService (schedule domain)
//

import Foundation

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

/// Domain-specific service for schedule-related Firestore operations
final class FirestoreScheduleService {
    static let shared = FirestoreScheduleService()
    private init() {}
    
    // MARK: - Schedule Operations
    
    func fetchTrainerSchedule(trainerId: String, from: Date, to: Date, orgId: String) async throws -> [TrainerScheduleSlot] {
        #if canImport(FirebaseFirestore)
        // Delegate to original implementation for now
        return try await FirestoreService.shared.fetchTrainerSchedule(trainerId: trainerId, from: from, to: to, orgId: orgId)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func upsertTrainerSlot(trainerId: String, orgId: String, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, location: String? = nil, createdByRole: String? = nil, createdById: String? = nil, isOrgWide: Bool = false) async throws {
        #if canImport(FirebaseFirestore)
        try await FirestoreService.shared.upsertTrainerSlot(trainerId: trainerId, orgId: orgId, startTime: startTime, endTime: endTime, status: status, location: location, createdByRole: createdByRole, createdById: createdById, isOrgWide: isOrgWide)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    func deleteTrainerSlot(trainerId: String, startTime: Date) async throws {
        #if canImport(FirebaseFirestore)
        try await FirestoreService.shared.deleteTrainerSlot(trainerId: trainerId, startTime: startTime)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
}
