//
//  TrainerScheduleSlot.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation
import SwiftUI

struct TrainerScheduleSlot: Identifiable, Codable, Hashable {
    enum Status: String, Codable {
        case open
        case unavailable
        case booked
    }

    var id: String
    var trainerId: String
    var status: Status
    var startTime: Date
    var endTime: Date
    var clientId: String?
    var clientName: String?
    var bookedAt: Date?
    var updatedAt: Date? // Added to match schema
    var isClassBooking: Bool? // NEW: Indicates this is a class booking
    var classId: String? // NEW: Reference to the class document
    var location: String? // Location name for this availability slot
    var createdByRole: String? // "admin" or "trainer" — who created this slot
    var createdById: String?   // Firebase Auth UID of the creator
    var isOrgWide: Bool?       // True when applied to all trainers (locks editing for others)

    // Consider a slot booked if the backend sets status to "booked" OR if clientId is present.
    var isBooked: Bool { status == .booked || clientId != nil }
    
    // Check if this is a class
    var isClass: Bool { isClassBooking == true }

    /// Returns the cached class title from the ScheduleViewModel if available.
    func classTitle(from viewModel: ScheduleViewModel?) -> String? {
        guard let classId = classId, !classId.isEmpty, let vm = viewModel else { return nil }
        return vm.classTitlesByClassId[classId]
    }

    var displayTitle: String {
        if isClass {
            return clientName ?? "Group Class"
        }
        if isBooked {
            return clientName ?? "Booked"
        }
        switch status {
        case .open: return "Open"
        case .unavailable: return "Unavailable"
        case .booked: return clientName ?? "Booked"
        }
    }

    var visualColor: Color {
        if isClass { return .orange }
        // Check if lesson is completed (past end time and booked)
        if isBooked && endTime < Date() { return .purple }
        if isBooked { return .blue }
        switch status {
        case .open: return .green
        case .unavailable:
            // Dark gray for admin-created or org-wide (apply to all trainers)
            if isOrgWide == true || createdByRole == "admin" {
                return Color(UIColor.systemGray)
            }
            return Color(UIColor.systemGray4)
        case .booked: return .blue
        }
    }
    
    // Get visual color with context about which trainer is viewing
    // For classes, dim the color if the viewing trainer is not running the class
    func visualColor(viewingTrainerId: String?) -> Color {
        if isClass {
            // If viewing trainer is the one running the class, show bright orange
            // Otherwise, show dimmer orange
            if let viewingId = viewingTrainerId, viewingId == trainerId {
                return .orange
            } else {
                return .orange.opacity(0.5)
            }
        }
        // Check if lesson is completed (past end time and booked)
        if isBooked && endTime < Date() { return .purple }
        if isBooked { return .blue }
        switch status {
        case .open: return .green
        case .unavailable:
            if isOrgWide == true || createdByRole == "admin" {
                return Color(UIColor.systemGray)
            }
            return Color(UIColor.systemGray4)
        case .booked: return .blue
        }
    }
}

