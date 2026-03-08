//
//  SettingsRepository.swift
//  Skedence
//
//  Firebase repository for organization settings data access
//

import Foundation
import FirebaseFirestore

@MainActor
final class SettingsRepository: RepositoryProtocol {
    typealias DataType = OrgSettings
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [OrgSettings] {
        // Settings is a single document, return array with one item
        if let settings = try await fetchById(id: orgId, orgId: orgId) {
            return [settings]
        }
        return []
    }
    
    func fetchById(id: String, orgId: String) async throws -> OrgSettings? {
        // Settings stored directly in organizations/{orgId} document
        let doc = try await db.collection("organizations")
            .document(orgId)
            .getDocument()
        
        guard doc.exists, let data = doc.data() else {
            // Return default settings if none exist
            return OrgSettings(orgId: orgId)
        }
        
        return decodeSettings(orgId: orgId, data: data)
    }
    
    func create(_ item: OrgSettings, orgId: String) async throws -> String {
        // Settings are merged into org document, not created separately
        try await update(id: orgId, data: encodeSettings(item), orgId: orgId)
        return orgId
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        try await db.collection("organizations")
            .document(orgId)
            .setData(data, merge: true)
    }
    
    func delete(id: String, orgId: String) async throws {
        // Settings can't be deleted, only reset to defaults
        let defaults = OrgSettings(orgId: orgId)
        try await update(id: orgId, data: encodeSettings(defaults), orgId: orgId)
    }
    
    // MARK: - Settings-Specific Methods
    
    /// Update specific setting values
    func updateSettings(orgId: String, updates: [String: Any]) async throws {
        var data = updates
        data["updatedAt"] = Timestamp(date: Date())
        
        try await db.collection("organizations")
            .document(orgId)
            .updateData(data)
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodeSettings(orgId: String, data: [String: Any]) -> OrgSettings? {
        let minBookingHours = data["minBookingHours"] as? Int ?? 4
        let minCancellationHours = data["minCancellationHours"] as? Int ?? 24
        let maxBookingsPerLocation = data["maxBookingsPerLocation"] as? Int
        let locationLimits = data["locationLimits"] as? [String: Int]
        let requireWaiver = data["requireWaiver"] as? Bool ?? true
        let waiverText = data["waiverText"] as? String ?? ""
        let updatedAt = data["updatedAt"] as? Timestamp
        
        return OrgSettings(
            id: orgId,
            orgId: orgId,
            minBookingHours: minBookingHours,
            minCancellationHours: minCancellationHours,
            maxBookingsPerLocation: maxBookingsPerLocation,
            locationLimits: locationLimits,
            requireWaiver: requireWaiver,
            waiverText: waiverText,
            updatedAt: updatedAt
        )
    }
    
    private func encodeSettings(_ settings: OrgSettings) -> [String: Any] {
        var data: [String: Any] = [
            "minBookingHours": settings.minBookingHours,
            "minCancellationHours": settings.minCancellationHours,
            "requireWaiver": settings.requireWaiver,
            "waiverText": settings.waiverText,
            "updatedAt": Timestamp(date: Date())
        ]
        
        // Only include if set (for backwards compatibility)
        if let limits = settings.locationLimits {
            data["locationLimits"] = limits
        }
        if let maxBookings = settings.maxBookingsPerLocation {
            data["maxBookingsPerLocation"] = maxBookings
        }
        
        return data
    }
}
