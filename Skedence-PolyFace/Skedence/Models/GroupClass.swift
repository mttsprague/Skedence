//
//  GroupClass.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import Foundation

struct GroupClass: Identifiable, Codable, Hashable {
    var id: String?
    let title: String
    let description: String
    let startTime: Date
    let endTime: Date
    let maxParticipants: Int
    var currentParticipants: Int
    let location: String
    let isOpenForRegistration: Bool
    let trainerId: String
    let trainerName: String
    let createdBy: String // Admin user ID
    let createdAt: Date
    let priceInCents: Int // Registration price in cents (e.g., 2000 = $20.00)
    var eligiblePackageIds: [String] // Package IDs that can be used to register for this class
    var seriesId: String? // Links classes in a multi-day series
    var isPartOfSeries: Bool? // Indicates if part of a multi-day series
    var totalSeriesClasses: Int? // Total number of classes in the series
    
    var isFull: Bool {
        currentParticipants >= maxParticipants
    }
    
    var spotsRemaining: Int {
        max(0, maxParticipants - currentParticipants)
    }
    
    var isUpcoming: Bool {
        startTime > Date()
    }
    
    var formattedPrice: String {
        let dollars = Double(priceInCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
}
