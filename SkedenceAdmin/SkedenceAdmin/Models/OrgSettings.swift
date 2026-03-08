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
    var maxBookingsPerLocation: Int?  // DEPRECATED: Legacy global limit for backwards compatibility
    var locationLimits: [String: Int]?  // NEW: Per-location limits { locationId: maxBookings }
    var updatedAt: Timestamp?
    
    init(
        id: String? = nil,
        orgId: String,
        minBookingHours: Int = 4,
        minCancellationHours: Int = 24,
        maxBookingsPerLocation: Int? = nil,
        locationLimits: [String: Int]? = nil
    ) {
        self.id = id
        self.orgId = orgId
        self.minBookingHours = minBookingHours
        self.minCancellationHours = minCancellationHours
        self.maxBookingsPerLocation = maxBookingsPerLocation
        self.locationLimits = locationLimits
        self.updatedAt = Timestamp()
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
