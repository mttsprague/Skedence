//
//  OrgSettings.swift
//  Skedence
//
//  Created by Assistant on 1/16/26.
//

import Foundation
import FirebaseFirestore

struct OrgSettings: Identifiable {
    var id: String?
    var orgId: String
    var minBookingHours: Int  // Minimum hours before lesson that client can book
    var minCancellationHours: Int  // Minimum hours before lesson that client can cancel
    var maxBookingsPerLocation: Int?  // DEPRECATED: Legacy global limit for backwards compatibility
    var locationLimits: [String: Int]?  // NEW: Per-location limits { locationId: maxBookings }
    var requireWaiver: Bool  // Whether clients must sign a waiver before booking
    var waiverText: String  // Custom waiver text content
    var updatedAt: Timestamp?
    
    init(
        id: String? = nil,
        orgId: String,
        minBookingHours: Int = 4,
        minCancellationHours: Int = 24,
        maxBookingsPerLocation: Int? = nil,
        locationLimits: [String: Int]? = nil,
        requireWaiver: Bool = true,
        waiverText: String = "",
        updatedAt: Timestamp? = Timestamp()
    ) {
        self.id = id
        self.orgId = orgId
        self.minBookingHours = minBookingHours
        self.minCancellationHours = minCancellationHours
        self.maxBookingsPerLocation = maxBookingsPerLocation
        self.locationLimits = locationLimits
        self.requireWaiver = requireWaiver
        self.waiverText = waiverText
        self.updatedAt = updatedAt
    }
    
    // Helper to get limit for a specific location
    func getLimit(for locationId: String) -> Int {
        // Try new per-location limits first
        if let limits = locationLimits, let limit = limits[locationId] {
            return limit
        }
        // Fall back to legacy global limit
        if let globalLimit = maxBookingsPerLocation {
            return globalLimit
        }
        // Default fallback
        return 10
    }
}

