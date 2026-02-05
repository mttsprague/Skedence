//
//  LocationsRepository.swift
//  Skedence
//
//  Firebase repository for locations data access with real-time listener support
//

import Foundation
import FirebaseFirestore

@MainActor
final class LocationsRepository: ListenerRepositoryProtocol {
    typealias DataType = Location
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [Location] {
        let snapshot = try await db.collection("locations")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc in
            decodeLocation(id: doc.documentID, data: doc.data())
        }
    }
    
    func fetchById(id: String, orgId: String) async throws -> Location? {
        let doc = try await db.collection("locations")
            .document(id)
            .getDocument()
        
        guard doc.exists, let data = doc.data() else {
            throw RepositoryError.notFound
        }
        
        return decodeLocation(id: doc.documentID, data: data)
    }
    
    func create(_ item: Location, orgId: String) async throws -> String {
        var locationData = encodeLocation(item)
        locationData["orgId"] = orgId
        locationData["createdAt"] = Timestamp(date: Date())
        locationData["updatedAt"] = Timestamp(date: Date())
        locationData["isActive"] = true
        
        let ref = try await db.collection("locations").addDocument(data: locationData)
        return ref.documentID
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        var updateData = data
        updateData["updatedAt"] = Timestamp(date: Date())
        
        try await db.collection("locations")
            .document(id)
            .updateData(updateData)
    }
    
    func delete(id: String, orgId: String) async throws {
        // Soft delete - mark as inactive
        try await db.collection("locations")
            .document(id)
            .updateData([
                "isActive": false,
                "updatedAt": Timestamp(date: Date())
            ])
    }
    
    // MARK: - ListenerRepositoryProtocol Methods
    
    func startListening(orgId: String, onChange: @escaping ([Location]) -> Void) -> ListenerRegistration {
        listener?.remove()
        
        listener = db.collection("locations")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { snapshot, _ in
                if snapshot == nil {
                    return
                }
                
                let locations = snapshot?.documents.compactMap { doc in
                    self.decodeLocation(id: doc.documentID, data: doc.data())
                } ?? []
                
                onChange(locations)
            }
        
        return listener!
    }
    
    func stopListening() {
        listener?.remove()
        listener = nil
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodeLocation(id: String, data: [String: Any]) -> Location? {
        guard let name = data["name"] as? String,
              let addressLine1 = data["addressLine1"] as? String,
              let city = data["city"] as? String,
              let state = data["state"] as? String,
              let zipCode = data["zipCode"] as? String,
              let orgId = data["orgId"] as? String else {
            return nil
        }
        
        return Location(
            id: id,
            name: name,
            addressLine1: addressLine1,
            addressLine2: data["addressLine2"] as? String,
            city: city,
            state: state,
            zipCode: zipCode,
            orgId: orgId,
            createdAt: data["createdAt"] as? Timestamp,
            updatedAt: data["updatedAt"] as? Timestamp,
            isActive: data["isActive"] as? Bool ?? true
        )
    }
    
    private func encodeLocation(_ location: Location) -> [String: Any] {
        var data: [String: Any] = [
            "name": location.name,
            "addressLine1": location.addressLine1,
            "city": location.city,
            "state": location.state,
            "zipCode": location.zipCode,
            "orgId": location.orgId,
            "isActive": location.isActive,
            "createdAt": Timestamp(date: Date())
        ]
        
        if let addressLine2 = location.addressLine2 {
            data["addressLine2"] = addressLine2
        }
        
        return data
    }
}
