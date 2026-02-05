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
    var maxBookingsPerLocation: Int  // Maximum concurrent booked sessions per location
    var requireWaiver: Bool  // Whether clients must sign a waiver before booking
    var waiverText: String  // Custom waiver text content
    var updatedAt: Timestamp?
    
    init(
        id: String? = nil,
        orgId: String,
        minBookingHours: Int = 4,
        minCancellationHours: Int = 24,
        maxBookingsPerLocation: Int = 5,
        requireWaiver: Bool = true,
        waiverText: String = "",
        updatedAt: Timestamp? = Timestamp()
    ) {
        self.id = id
        self.orgId = orgId
        self.minBookingHours = minBookingHours
        self.minCancellationHours = minCancellationHours
        self.maxBookingsPerLocation = maxBookingsPerLocation
        self.requireWaiver = requireWaiver
        self.waiverText = waiverText
        self.updatedAt = updatedAt
    }
}

