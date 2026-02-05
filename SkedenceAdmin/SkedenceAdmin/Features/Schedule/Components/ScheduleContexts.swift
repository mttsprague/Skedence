//
//  ScheduleContexts.swift
//  SkedenceAdmin
//
//  Shared context structs for schedule sheet presentations
//

import Foundation

// MARK: - Editor Context

/// Context for presenting the availability editor sheet
struct ScheduleEditorContext: Identifiable, Equatable {
    let id = UUID()
    let day: Date
    let hour: Int
    let trainerId: String?  // Optional for multi-trainer views
    
    init(day: Date, hour: Int, trainerId: String? = nil) {
        self.day = day
        self.hour = hour
        self.trainerId = trainerId
    }
}

// MARK: - Session Detail Context

/// Context for presenting session/booking detail sheet
struct SessionDetailContext: Identifiable {
    let id = UUID()
    let client: Client
    let booking: ClientBooking
}

// MARK: - Client Card Context

/// Context for presenting client card sheet (with optional booking)
struct ClientCardContext: Identifiable {
    let id = UUID()
    let client: Client
    let booking: ClientBooking?
}

// MARK: - Class Sheet Context

/// Context for presenting class participants sheet
struct ClassSheetContext: Identifiable {
    let id = UUID()
    let classId: String
    let className: String
    let participants: [ClassParticipant]?
}
