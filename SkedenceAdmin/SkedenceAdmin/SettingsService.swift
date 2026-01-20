//
//  SettingsService.swift
//  SkedenceAdmin
//
//  Created by Assistant on 1/16/26.
//

import Foundation
import Combine
import FirebaseFirestore

@MainActor
final class SettingsService: ObservableObject {
    @Published var settings: OrgSettings?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    
    func loadSettings(orgId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            // Settings are stored in organizations/{orgId}/settings/{orgId}
            let doc = try await db.collection("organizations")
                .document(orgId)
                .collection("settings")
                .document(orgId)
                .getDocument()
            
            if doc.exists, let data = doc.data() {
                // Manual mapping without FirebaseFirestoreSwift Codable helpers
                let minBooking = data["minBookingHours"] as? Int ?? 4
                let minCancel = data["minCancellationHours"] as? Int ?? 24
                let maxBookings = data["maxBookingsPerLocation"] as? Int ?? 5
                let updatedAt = data["updatedAt"] as? Timestamp
                var mapped = OrgSettings(
                    id: doc.documentID,
                    orgId: data["orgId"] as? String ?? orgId,
                    minBookingHours: minBooking,
                    minCancellationHours: minCancel,
                    maxBookingsPerLocation: maxBookings
                )
                mapped.updatedAt = updatedAt
                self.settings = mapped
            } else {
                // Create default settings if none exist
                let defaultSettings = OrgSettings(orgId: orgId)
                try await saveSettings(defaultSettings)
                self.settings = defaultSettings
            }
        } catch {
            self.errorMessage = error.localizedDescription
            print("SettingsService: Failed to load settings: \(error)")
        }
    }
    
    func saveSettings(_ settings: OrgSettings) async throws {
        // Manual write without FirebaseFirestoreSwift Codable helpers
        var updatedSettings = settings
        updatedSettings.updatedAt = Timestamp()
        
        let docRef = db.collection("organizations")
            .document(settings.orgId)
            .collection("settings")
            .document(settings.orgId)
        
        let data: [String: Any] = [
            "orgId": settings.orgId,
            "minBookingHours": settings.minBookingHours,
            "minCancellationHours": settings.minCancellationHours,
            "maxBookingsPerLocation": settings.maxBookingsPerLocation,
            "updatedAt": updatedSettings.updatedAt as Any
        ]
        
        try await docRef.setData(data, merge: true)
        self.settings = updatedSettings
    }
    
    func updateMinBookingHours(orgId: String, hours: Int) async {
        guard var currentSettings = settings else { return }
        currentSettings.minBookingHours = hours
        
        do {
            try await saveSettings(currentSettings)
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to update minBookingHours: \(error)")
        }
    }
    
    func updateMinCancellationHours(orgId: String, hours: Int) async {
        guard var currentSettings = settings else { return }
        currentSettings.minCancellationHours = hours
        
        do {
            try await saveSettings(currentSettings)
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to update minCancellationHours: \(error)")
        }
    }
}
