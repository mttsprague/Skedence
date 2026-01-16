//
//  SettingsService.swift
//  Skedence
//
//  Created by Assistant on 1/16/26.
//

import Foundation
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
            
            if doc.exists {
                self.settings = try doc.data(as: OrgSettings.self)
            } else {
                // Use default settings if none exist
                self.settings = OrgSettings(orgId: orgId)
            }
        } catch {
            self.errorMessage = error.localizedDescription
            print("SettingsService: Failed to load settings: \(error)")
            // Use default settings on error
            self.settings = OrgSettings(orgId: orgId)
        }
    }
    
    // Helper to check if a slot is within booking window
    func isWithinBookingWindow(_ slotStartTime: Date, settings: OrgSettings?) -> Bool {
        guard let settings = settings else { return true } // Allow booking if no settings
        let hoursUntilLesson = slotStartTime.timeIntervalSinceNow / 3600
        return hoursUntilLesson > Double(settings.minBookingHours)
    }
    
    // Helper to check if a booking is within cancellation window
    func isWithinCancellationWindow(_ lessonStartTime: Date, settings: OrgSettings?) -> Bool {
        guard let settings = settings else { return false } // Allow cancellation if no settings
        let hoursUntilLesson = lessonStartTime.timeIntervalSinceNow / 3600
        return hoursUntilLesson <= Double(settings.minCancellationHours)
    }
}
