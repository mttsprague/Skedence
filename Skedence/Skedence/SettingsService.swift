//
//  SettingsService.swift
//  Skedence
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
            // Settings are stored directly in organizations/{orgId} document
            let doc = try await db.collection("organizations")
                .document(orgId)
                .getDocument()
            
            if let data = doc.data() {
                // Manual decode without FirebaseFirestoreSwift
                let minBookingHours = data["minBookingHours"] as? Int ?? 4
                let minCancellationHours = data["minCancellationHours"] as? Int ?? 24
                let maxBookingsPerLocation = data["maxBookingsPerLocation"] as? Int ?? 5
                let requireWaiver = data["requireWaiver"] as? Bool ?? true
                let waiverText = data["waiverText"] as? String ?? ""
                let updatedAt = data["updatedAt"] as? Timestamp
                
                self.settings = OrgSettings(
                    id: doc.documentID,
                    orgId: orgId,
                    minBookingHours: minBookingHours,
                    minCancellationHours: minCancellationHours,
                    maxBookingsPerLocation: maxBookingsPerLocation,
                    requireWaiver: requireWaiver,
                    waiverText: waiverText,
                    updatedAt: updatedAt
                )
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
        return hoursUntilLesson >= Double(settings.minBookingHours)
    }
    
    // Helper to check if a booking is within cancellation window
    func isWithinCancellationWindow(_ lessonStartTime: Date, settings: OrgSettings?) -> Bool {
        guard let settings = settings else { return false } // Allow cancellation if no settings
        let hoursUntilLesson = lessonStartTime.timeIntervalSinceNow / 3600
        return hoursUntilLesson <= Double(settings.minCancellationHours)
    }
    
    // Helper to check if waiver is required and whether user has signed it
    func checkWaiverRequirement(userId: String, settings: OrgSettings?) async throws -> (required: Bool, signed: Bool) {
        guard let settings = settings, settings.requireWaiver else {
            // Waiver not required for this organization
            return (required: false, signed: true)
        }
        
        // Check if user has signed waiver
        let hasSigned = try await DocumentsService.shared.hasSignedWaiver(userId: userId)
        return (required: true, signed: hasSigned)
    }
}

