//
//  ClassesRepository.swift
//  Skedence
//
//  Firebase repository for classes data access
//

import Foundation
import FirebaseFirestore
import FirebaseAuth

@MainActor
final class ClassesRepository: QueryableRepositoryProtocol {
    typealias DataType = GroupClass
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [GroupClass] {
        let snapshot = try await db.collection("classes")
            .whereField("orgId", isEqualTo: orgId)
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc in
            decodeClass(id: doc.documentID, data: doc.data())
        }
    }
    
    func fetchById(id: String, orgId: String) async throws -> GroupClass? {
        let doc = try await db.collection("classes").document(id).getDocument()
        
        guard doc.exists, let data = doc.data() else {
            throw RepositoryError.notFound
        }
        
        return decodeClass(id: doc.documentID, data: data)
    }
    
    func create(_ item: GroupClass, orgId: String) async throws -> String {
        let classData = encodeClass(item, orgId: orgId)
        
        // Generate human-readable ID
        let classId = try await IDGenerator.generateClassId(
            className: item.title,
            startTime: item.startTime
        )
        
        try await db.collection("classes").document(classId).setData(classData)
        return classId
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        try await db.collection("classes").document(id).updateData(data)
    }
    
    func delete(id: String, orgId: String) async throws {
        try await db.collection("classes").document(id).delete()
    }
    
    // MARK: - QueryableRepositoryProtocol Methods
    
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [GroupClass] {
        var query: Query = db.collection("classes")
        
        for (field, value) in conditions {
            query = query.whereField(field, isEqualTo: value)
        }
        
        query = query.whereField("orgId", isEqualTo: orgId)
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodeClass(id: $0.documentID, data: $0.data()) }
    }
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [GroupClass] {
        var query: Query = db.collection("classes")
            .whereField("orgId", isEqualTo: orgId)
            .order(by: field, descending: descending)
        
        if let limit = limit {
            query = query.limit(to: limit)
        }
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodeClass(id: $0.documentID, data: $0.data()) }
    }
    
    // MARK: - Class-Specific Methods
    
    /// Fetch open classes available for registration
    func fetchOpenClasses(orgId: String) async throws -> [GroupClass] {
        let snapshot = try await db.collection("classes")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("isOpenForRegistration", isEqualTo: true)
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { decodeClass(id: $0.documentID, data: $0.data()) }
    }
    
    /// Fetch upcoming classes after current date
    func fetchUpcomingClasses(orgId: String) async throws -> [GroupClass] {
        let now = Timestamp(date: Date())
        
        let snapshot = try await db.collection("classes")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("startTime", isGreaterThan: now)
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { decodeClass(id: $0.documentID, data: $0.data()) }
    }
    
    /// Fetch classes user is registered for
    func fetchUserRegistrations(userId: String, orgId: String) async throws -> [GroupClass] {
        
        // First get registration IDs
        let registrationsSnapshot = try await db.collection("classRegistrations")
            .whereField("clientId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        
        print("📋 Found \(registrationsSnapshot.documents.count) registrations")
        for doc in registrationsSnapshot.documents {
            print("  - Registration: \(doc.documentID), data: \(doc.data())")
        }
        
        let classIds = registrationsSnapshot.documents.compactMap { $0.data()["classId"] as? String }
        // Deduplicate so multiple registrations for the same class (e.g. 2 athletes) only return 1 entry
        var seen = Set<String>()
        let uniqueClassIds = classIds.filter { seen.insert($0).inserted }
        print("📝 Class IDs (unique): \(uniqueClassIds)")
        
        guard !uniqueClassIds.isEmpty else {
            print("⚠️ No class IDs found in registrations")
            return []
        }
        
        // Fetch classes in batches (Firestore 'in' query limit is 10)
        var allClasses: [GroupClass] = []
        for chunk in uniqueClassIds.chunked(into: 10) {
            let snapshot = try await db.collection("classes")
                .whereField(FieldPath.documentID(), in: chunk)
                .getDocuments()
            
            print("📚 Fetched \(snapshot.documents.count) classes for chunk \(chunk)")
            let classes = snapshot.documents.compactMap { decodeClass(id: $0.documentID, data: $0.data()) }
            allClasses.append(contentsOf: classes)
        }
        
        return allClasses.sorted { $0.startTime < $1.startTime }
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodeClass(id: String, data: [String: Any]) -> GroupClass? {
        guard
            let title = data["title"] as? String,
            let description = data["description"] as? String,
            let startTime = (data["startTime"] as? Timestamp)?.dateValue(),
            let endTime = (data["endTime"] as? Timestamp)?.dateValue(),
            let maxParticipants = data["maxParticipants"] as? Int,
            let currentParticipants = data["currentParticipants"] as? Int,
            let location = data["location"] as? String,
            let isOpenForRegistration = data["isOpenForRegistration"] as? Bool,
            let trainerId = data["trainerId"] as? String,
            let trainerName = data["trainerName"] as? String,
            let createdBy = data["createdBy"] as? String,
            let createdAt = (data["createdAt"] as? Timestamp)?.dateValue()
        else {
            return nil
        }
        
        let priceInCents = data["priceInCents"] as? Int ?? 2000
        
        // Eligible package IDs (defaults to empty array for backward compatibility)
        let eligiblePackageIds = data["eligiblePackageIds"] as? [String] ?? []
        
        // Multi-day series fields
        let seriesId = data["seriesId"] as? String
        let isPartOfSeries = data["isPartOfSeries"] as? Bool
        let totalSeriesClasses = data["totalSeriesClasses"] as? Int
        
        return GroupClass(
            id: id,
            title: title,
            description: description,
            startTime: startTime,
            endTime: endTime,
            maxParticipants: maxParticipants,
            currentParticipants: currentParticipants,
            location: location,
            isOpenForRegistration: isOpenForRegistration,
            trainerId: trainerId,
            trainerName: trainerName,
            createdBy: createdBy,
            createdAt: createdAt,
            priceInCents: priceInCents,
            eligiblePackageIds: eligiblePackageIds,
            seriesId: seriesId,
            isPartOfSeries: isPartOfSeries,
            totalSeriesClasses: totalSeriesClasses
        )
    }
    
    private func encodeClass(_ groupClass: GroupClass, orgId: String) -> [String: Any] {
        var data: [String: Any] = [
            "title": groupClass.title,
            "description": groupClass.description,
            "startTime": Timestamp(date: groupClass.startTime),
            "endTime": Timestamp(date: groupClass.endTime),
            "maxParticipants": groupClass.maxParticipants,
            "currentParticipants": groupClass.currentParticipants,
            "location": groupClass.location,
            "isOpenForRegistration": groupClass.isOpenForRegistration,
            "trainerId": groupClass.trainerId,
            "trainerName": groupClass.trainerName,
            "createdBy": groupClass.createdBy,
            "createdAt": Timestamp(date: groupClass.createdAt),
            "priceInCents": groupClass.priceInCents,
            "orgId": orgId
        ]
        
        // Add series fields if present
        if let seriesId = groupClass.seriesId {
            data["seriesId"] = seriesId
        }
        if let isPartOfSeries = groupClass.isPartOfSeries {
            data["isPartOfSeries"] = isPartOfSeries
        }
        if let totalSeriesClasses = groupClass.totalSeriesClasses {
            data["totalSeriesClasses"] = totalSeriesClasses
        }
        
        return data
    }
}

// Helper extension for chunking arrays
private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0 ..< Swift.min($0 + size, count)])
        }
    }
}
