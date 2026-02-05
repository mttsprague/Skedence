//
//  OrgSettings.swift
//  SkedenceAdmin
//
//  Created by Assistant on 1/16/26.
//

import Foundation
import FirebaseFirestore
#if canImport(FirebaseFirestoreSwift)
import FirebaseFirestoreSwift
#endif

struct OrgSettings: Codable, Identifiable {
    #if canImport(FirebaseFirestoreSwift)
    @DocumentID var id: String?
    #else
    var id: String?
    #endif
    var orgId: String
    var minBookingHours: Int  // Minimum hours before lesson that client can book
    var minCancellationHours: Int  // Minimum hours before lesson that client can cancel
    var maxBookingsPerLocation: Int  // Maximum concurrent booked sessions per location
    var updatedAt: Timestamp?
    
    init(
        id: String? = nil,
        orgId: String,
        minBookingHours: Int = 4,
        minCancellationHours: Int = 24,
        maxBookingsPerLocation: Int = 5
    ) {
        self.id = id
        self.orgId = orgId
        self.minBookingHours = minBookingHours
        self.minCancellationHours = minCancellationHours
        self.maxBookingsPerLocation = maxBookingsPerLocation
        self.updatedAt = Timestamp()
    }
}
