//
//  PricingRepository.swift
//  Skedence
//
//  Firebase repository for pricing structure data access
//

import Foundation
import FirebaseFirestore

@MainActor
final class PricingRepository: RepositoryProtocol {
    typealias DataType = PricingStructure
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [PricingStructure] {
        // Pricing is a single document, return array with one item
        if let pricing = try await fetchById(id: orgId, orgId: orgId) {
            return [pricing]
        }
        return []
    }
    
    func fetchById(id: String, orgId: String) async throws -> PricingStructure? {
        // Pricing structure stored in organizations/{orgId} under pricingStructure field
        let docRef = db.collection("organizations").document(orgId)
        let document = try await docRef.getDocument()
        
        guard document.exists else {
            // No pricing structure set yet, return empty
            return PricingStructure(tiers: [], lastUpdated: Date())
        }
        
        // Check if pricingStructure field exists
        guard let data = document.data(),
              let pricingData = data["pricingStructure"] as? [String: Any] else {
            // No pricing structure field, return empty
            return PricingStructure(tiers: [], lastUpdated: Date())
        }
        
        return try decodePricing(pricingData)
    }
    
    func create(_ item: PricingStructure, orgId: String) async throws -> String {
        // Pricing is stored in org document, use update instead
        try await update(id: orgId, data: ["pricingStructure": try encodePricing(item)], orgId: orgId)
        return orgId
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        let docRef = db.collection("organizations").document(orgId)
        try await docRef.setData(data, merge: true)
    }
    
    func delete(id: String, orgId: String) async throws {
        // Delete pricing structure by setting to empty
        let empty = PricingStructure(tiers: [], lastUpdated: Date())
        try await update(id: orgId, data: ["pricingStructure": try encodePricing(empty)], orgId: orgId)
    }
    
    // MARK: - Pricing-Specific Methods
    
    /// Save complete pricing structure
    func savePricingStructure(_ structure: PricingStructure, orgId: String) async throws {
        let dictionary = try encodePricing(structure)
        
        let docRef = db.collection("organizations").document(orgId)
        try await docRef.setData([
            "pricingStructure": dictionary
        ], merge: true)
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodePricing(_ data: [String: Any]) throws -> PricingStructure {
        // Recursively convert FIRTimestamp → ISO 8601 string so JSONSerialization can handle them.
        // Dates saved by the admin portal use iso8601; this also handles raw Firestore Timestamps.
        let sanitized = sanitizeForJSON(data)
        let jsonData = try JSONSerialization.data(withJSONObject: sanitized)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode(PricingStructure.self, from: jsonData)
    }
    
    /// Recursively converts Firestore-native types to JSON-safe equivalents.
    private func sanitizeForJSON(_ value: Any) -> Any {
        if let timestamp = value as? Timestamp {
            return ISO8601DateFormatter().string(from: timestamp.dateValue())
        } else if let dict = value as? [String: Any] {
            return dict.mapValues { sanitizeForJSON($0) }
        } else if let array = value as? [Any] {
            return array.map { sanitizeForJSON($0) }
        }
        return value
    }
    
    private func encodePricing(_ structure: PricingStructure) throws -> [String: Any] {
        // Encode to dictionary using iso8601 to match the admin portal's encoding strategy
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(structure)
        
        guard let dictionary = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw RepositoryError.encodingError("Failed to encode pricing structure")
        }
        
        return dictionary
    }
}
