//
//  TrainersRepository.swift
//  Skedence
//
//  Firebase repository for trainers data access
//

import Foundation
import FirebaseFirestore

@MainActor
final class TrainersRepository: QueryableRepositoryProtocol {
    typealias DataType = Trainer
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [Trainer] {
        let snapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("active", isEqualTo: true)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc in
            decodeTrainer(id: doc.documentID, data: doc.data())
        }
    }
    
    func fetchById(id: String, orgId: String) async throws -> Trainer? {
        let doc = try await db.collection("trainers").document(id).getDocument()
        
        guard doc.exists else {
            throw RepositoryError.notFound
        }
        
        guard let data = doc.data() else {
            return nil
        }
        
        return decodeTrainer(id: doc.documentID, data: data)
    }
    
    func create(_ item: Trainer, orgId: String) async throws -> String {
        let trainerData = encodeTrainer(item, orgId: orgId)
        let ref = try await db.collection("trainers").addDocument(data: trainerData)
        return ref.documentID
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        try await db.collection("trainers").document(id).updateData(data)
    }
    
    func delete(id: String, orgId: String) async throws {
        // Soft delete by setting active = false
        try await db.collection("trainers").document(id).updateData([
            "active": false,
            "deactivatedAt": Timestamp(date: Date())
        ])
    }
    
    // MARK: - QueryableRepositoryProtocol Methods
    
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [Trainer] {
        var query: Query = db.collection("trainers")
        
        for (field, value) in conditions {
            query = query.whereField(field, isEqualTo: value)
        }
        
        query = query.whereField("orgId", isEqualTo: orgId)
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodeTrainer(id: $0.documentID, data: $0.data()) }
    }
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [Trainer] {
        var query: Query = db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("active", isEqualTo: true)
            .order(by: field, descending: descending)
        
        if let limit = limit {
            query = query.limit(to: limit)
        }
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodeTrainer(id: $0.documentID, data: $0.data()) }
    }
    
    // MARK: - Trainer-Specific Methods
    
    /// Fetch trainers with available slots in date range
    func fetchAvailable(from startDate: Date, to endDate: Date, orgId: String) async throws -> [Trainer] {
        // First get all trainers
        let trainers = try await fetchAll(orgId: orgId)
        
        // TODO: Filter by checking schedules collection for availability
        // For now, return all active trainers
        return trainers
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodeTrainer(id: String, data: [String: Any]) -> Trainer? {
        return Trainer(
            id: id,
            referenceCode: data["referenceCode"] as? String,
            firstName: data["firstName"] as? String,
            lastName: data["lastName"] as? String,
            email: data["email"] as? String,
            avatarUrl: data["avatarUrl"] as? String,
            photoURL: data["photoURL"] as? String,
            imageUrl: data["imageUrl"] as? String,
            active: data["active"] as? Bool,
            birthday: data["birthday"] as? String,
            trainerDescription: data["trainerDescription"] as? String
        )
    }
    
    private func encodeTrainer(_ trainer: Trainer, orgId: String) -> [String: Any] {
        var data: [String: Any] = [
            "active": trainer.active ?? true,
            "orgId": orgId,
            "createdAt": Timestamp(date: Date())
        ]
        
        if let referenceCode = trainer.referenceCode {
            data["referenceCode"] = referenceCode
        }
        
        if let firstName = trainer.firstName {
            data["firstName"] = firstName
        }
        
        if let lastName = trainer.lastName {
            data["lastName"] = lastName
        }
        
        if let email = trainer.email {
            data["email"] = email
        }
        
        if let avatarUrl = trainer.avatarUrl {
            data["avatarUrl"] = avatarUrl
        }
        
        if let photoURL = trainer.photoURL {
            data["photoURL"] = photoURL
        }
        
        if let imageUrl = trainer.imageUrl {
            data["imageUrl"] = imageUrl
        }
        
        if let birthday = trainer.birthday {
            data["birthday"] = birthday
        }
        
        if let trainerDescription = trainer.trainerDescription {
            data["trainerDescription"] = trainerDescription
        }
        
        return data
    }
}
