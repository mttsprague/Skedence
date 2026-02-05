//
//  Location.swift
//  Skedence
//
//  Created by Assistant on 1/9/26.
//

import Foundation
import FirebaseFirestore

struct Location: Identifiable, Codable, Hashable {
    @DocumentID var id: String?
    var name: String
    var addressLine1: String
    var addressLine2: String?
    var city: String
    var state: String
    var zipCode: String
    var orgId: String
    var createdAt: Timestamp?
    var updatedAt: Timestamp?
    var isActive: Bool
    
    var fullAddress: String {
        var components = [addressLine1]
        if let line2 = addressLine2, !line2.isEmpty {
            components.append(line2)
        }
        components.append("\(city), \(state) \(zipCode)")
        return components.joined(separator: ", ")
    }
    
    var cityStateZip: String {
        "\(city), \(state) \(zipCode)"
    }
}
