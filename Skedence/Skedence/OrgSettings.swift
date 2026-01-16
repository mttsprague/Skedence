//
//  OrgSettings.swift
//  Skedence
//
//  Created by Assistant on 1/16/26.
//

import Foundation
import FirebaseFirestore

struct OrgSettings: Codable, Identifiable {
    @DocumentID var id: String?
    var orgId: String
    var minBookingHours: Int  // Minimum hours before lesson that client can book
    var minCancellationHours: Int  // Minimum hours before lesson that client can cancel
    var updatedAt: Timestamp?
    
    init(
        id: String? = nil,
        orgId: String,
        minBookingHours: Int = 4,
        minCancellationHours: Int = 24
    ) {
        self.id = id
        self.orgId = orgId
        self.minBookingHours = minBookingHours
        self.minCancellationHours = minCancellationHours
        self.updatedAt = Timestamp()
    }
}
