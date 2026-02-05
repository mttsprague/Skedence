//
//  SettingsService.swift
//  SkedenceAdmin
//
//  Created by Assistant on 1/16/26.
//

import Foundation
import Combine
import FirebaseFirestore

enum SettingsServiceError: Error, LocalizedError {
    case missingOrgId
    case invalidHoursValue(String)
    case invalidMaxBookings
    case settingsNotLoaded
    case saveFailed(String)
    case loadFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .missingOrgId:
            return "Organization ID is required"
        case .invalidHoursValue(let field):
            return "Invalid hours value for \(field). Must be greater than 0"
        case .invalidMaxBookings:
            return "Maximum bookings per location must be greater than 0"
        case .settingsNotLoaded:
            return "Settings must be loaded before updating"
        case .saveFailed(let message):
            return "Failed to save settings: \(message)"
        case .loadFailed(let message):
            return "Failed to load settings: \(message)"
        }
    }
}

@MainActor
final class SettingsService: ObservableObject {
    @Published private(set) var settingsState: LoadingState<OrgSettings> = .idle
    
    private let db = Firestore.firestore()
    
    // Convenience accessors for backward compatibility
    var settings: OrgSettings? { settingsState.data }
    var isLoading: Bool { settingsState.isLoading }
    var errorMessage: String? { settingsState.errorMessage }
    
    func loadSettings(orgId: String) async {
        guard !orgId.isEmpty else {
            settingsState = .error(SettingsServiceError.missingOrgId)
            return
        }
        
        settingsState = .loading
        
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
                settingsState = .loaded(mapped)
            } else {
                // Create default settings if none exist
                let defaultSettings = OrgSettings(orgId: orgId)
                try await saveSettings(defaultSettings)
                settingsState = .loaded(defaultSettings)
            }
        } catch {
            let message = error.localizedDescription
            settingsState = .error(SettingsServiceError.loadFailed(message))
        }
    }
    
    func saveSettings(_ settings: OrgSettings) async throws {
        // Validate settings
        guard !settings.orgId.isEmpty else {
            throw SettingsServiceError.missingOrgId
        }
        guard settings.minBookingHours > 0 else {
            throw SettingsServiceError.invalidHoursValue("minimum booking hours")
        }
        guard settings.minCancellationHours > 0 else {
            throw SettingsServiceError.invalidHoursValue("minimum cancellation hours")
        }
        guard settings.maxBookingsPerLocation > 0 else {
            throw SettingsServiceError.invalidMaxBookings
        }
        
        do {
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
            settingsState = .loaded(updatedSettings)
        } catch {
            throw SettingsServiceError.saveFailed(error.localizedDescription)
        }
    }
    
    func updateMinBookingHours(orgId: String, hours: Int) async {
        guard var currentSettings = settings else {
            settingsState = .error(SettingsServiceError.settingsNotLoaded)
            return
        }
        
        guard hours > 0 else {
            settingsState = .error(SettingsServiceError.invalidHoursValue("minimum booking hours"))
            return
        }
        
        currentSettings.minBookingHours = hours
        
        do {
            try await saveSettings(currentSettings)
        } catch {
            settingsState = .error(error)
        }
    }
    
    func updateMinCancellationHours(orgId: String, hours: Int) async {
        guard var currentSettings = settings else {
            settingsState = .error(SettingsServiceError.settingsNotLoaded)
            return
        }
        
        guard hours > 0 else {
            settingsState = .error(SettingsServiceError.invalidHoursValue("minimum cancellation hours"))
            return
        }
        
        currentSettings.minCancellationHours = hours
        
        do {
            try await saveSettings(currentSettings)
        } catch {
            settingsState = .error(error)
        }
    }
}
