//
//  ScheduleRepository.swift
//  Skedence
//
//  Firebase repository for schedule/availability data access
//

import Foundation
import FirebaseFirestore

@MainActor
final class ScheduleRepository: QueryableRepositoryProtocol {
    typealias DataType = AvailabilitySlot
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [AvailabilitySlot] {
        // Schedule data is distributed across trainer documents
        // This method would need to aggregate from all trainers
        throw RepositoryError.invalidData("Use fetch methods with specific trainer ID")
    }
    
    func fetchById(id: String, orgId: String) async throws -> AvailabilitySlot? {
        // Need trainerId to fetch specific slot
        throw RepositoryError.invalidData("Use fetchById(id:trainerId:orgId:) instead")
    }
    
    func create(_ item: AvailabilitySlot, orgId: String) async throws -> String {
        guard let trainerId = item.trainerId else {
            throw RepositoryError.invalidData("Trainer ID required")
        }
        
        let slotData = encodeSlot(item, orgId: orgId)
        
        // Generate human-readable ID
        let scheduleId = IDGenerator.generateScheduleId(
            trainerId: trainerId,
            startTime: item.startTime
        )
        
        try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .document(scheduleId)
            .setData(slotData)
        
        return scheduleId
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        guard let trainerId = data["trainerId"] as? String else {
            throw RepositoryError.invalidData("Trainer ID required")
        }
        
        try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .document(id)
            .updateData(data)
    }
    
    func delete(id: String, orgId: String) async throws {
        throw RepositoryError.invalidData("Use delete(id:trainerId:orgId:) instead")
    }
    
    // MARK: - QueryableRepositoryProtocol Methods
    
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [AvailabilitySlot] {
        guard let trainerId = conditions["trainerId"] as? String else {
            throw RepositoryError.invalidData("Trainer ID required in conditions")
        }
        
        var query: Query = db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
        
        for (field, value) in conditions where field != "trainerId" {
            query = query.whereField(field, isEqualTo: value)
        }
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodeSlot(id: $0.documentID, data: $0.data(), trainerId: trainerId) }
    }
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [AvailabilitySlot] {
        throw RepositoryError.invalidData("Use fetchForTrainer method instead")
    }
    
    // MARK: - Schedule-Specific Methods
    
    /// Fetch availability slots for a specific trainer
    func fetchForTrainer(trainerId: String, orgId: String) async throws -> [AvailabilitySlot] {
        let snapshot = try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .whereField("status", isEqualTo: "available")
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { decodeSlot(id: $0.documentID, data: $0.data(), trainerId: trainerId) }
    }
    
    /// Fetch upcoming available slots across all trainers
    func fetchUpcomingSlots(orgId: String, limit: Int = 50) async throws -> [AvailabilitySlot] {
        let now = Timestamp(date: Date())
        
        // First get all trainers
        let trainersSnapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("active", isEqualTo: true)
            .getDocuments()
        
        var allSlots: [AvailabilitySlot] = []
        
        for trainerDoc in trainersSnapshot.documents {
            let trainerId = trainerDoc.documentID
            
            let slotsSnapshot = try await db.collection("trainers")
                .document(trainerId)
                .collection("schedules")
                .whereField("status", isEqualTo: "available")
                .whereField("startTime", isGreaterThan: now)
                .order(by: "startTime", descending: false)
                .limit(to: limit)
                .getDocuments()
            
            let slots = slotsSnapshot.documents.compactMap { 
                decodeSlot(id: $0.documentID, data: $0.data(), trainerId: trainerId)
            }
            
            allSlots.append(contentsOf: slots)
        }
        
        return allSlots
            .sorted { $0.startTime < $1.startTime }
            .prefix(limit)
            .map { $0 }
    }
    
    /// Fetch slots in date range for specific trainer
    func fetchInRange(from startDate: Date, to endDate: Date, trainerId: String, orgId: String) async throws -> [AvailabilitySlot] {
        let startTimestamp = Timestamp(date: startDate)
        let endTimestamp = Timestamp(date: endDate)
        
        let snapshot = try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .whereField("startTime", isGreaterThanOrEqualTo: startTimestamp)
            .whereField("startTime", isLessThanOrEqualTo: endTimestamp)
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { decodeSlot(id: $0.documentID, data: $0.data(), trainerId: trainerId) }
    }
    
    /// Delete slot by ID and trainer ID
    func delete(id: String, trainerId: String, orgId: String) async throws {
        try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .document(id)
            .delete()
    }
    
    /// Fetch slot by ID and trainer ID
    func fetchById(id: String, trainerId: String, orgId: String) async throws -> AvailabilitySlot? {
        let doc = try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .document(id)
            .getDocument()
        
        guard doc.exists, let data = doc.data() else {
            throw RepositoryError.notFound
        }
        
        return decodeSlot(id: doc.documentID, data: data, trainerId: trainerId)
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodeSlot(id: String, data: [String: Any], trainerId: String) -> AvailabilitySlot? {
        guard
            let startTime = (data["startTime"] as? Timestamp)?.dateValue(),
            let endTime = (data["endTime"] as? Timestamp)?.dateValue()
        else {
            return nil
        }
        
        return AvailabilitySlot(
            id: id,
            trainerId: trainerId,
            title: data["title"] as? String,
            status: data["status"] as? String,
            startTime: startTime,
            endTime: endTime,
            location: data["location"] as? String
        )
    }
    
    private func encodeSlot(_ slot: AvailabilitySlot, orgId: String) -> [String: Any] {
        var data: [String: Any] = [
            "startTime": Timestamp(date: slot.startTime),
            "endTime": Timestamp(date: slot.endTime),
            "orgId": orgId,
            "createdAt": Timestamp(date: Date())
        ]
        
        if let status = slot.status {
            data["status"] = status
        }
        
        if let title = slot.title {
            data["title"] = title
        }
        
        if let location = slot.location {
            data["location"] = location
        }
        
        return data
    }
}
