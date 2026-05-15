//
//  Booking.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation

// booking documents (top-level /bookings)
struct Booking: Identifiable {
    var id: String?
    let clientUID: String
    let trainerUID: String
    let scheduleSlotId: String?
    let lessonPackageId: String?
    let startTime: Date?
    let endTime: Date?
    let status: String
    let location: String? // Dynamic location from schedule slot
    let createdAt: Date?
    let updatedAt: Date?
    
    // Participant information
    let athleteName: String?
    let secondAthleteName: String?
    let athleteNames: [String]? // Full ordered list of all athlete names
    
    // Lesson notes
    let lessonNotes: String?
    
    // Class bookings created by registerForClass — should not appear as lesson rows
    let isClassBooking: Bool
}
