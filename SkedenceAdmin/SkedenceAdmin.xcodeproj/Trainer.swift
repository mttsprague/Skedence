//
//  Trainer.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation

struct Trainer: Identifiable, Codable, Hashable {
    var id: String?
    var firstName: String?
    var lastName: String?
    var email: String?
    var avatarUrl: String?
    var photoURL: String?
    var imageUrl: String?
    var orgId: String?
    
    // Legacy field for backwards compatibility
    var name: String?

    var displayName: String {
        if let first = firstName, let last = lastName {
            return "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        }
        return name ?? "Unknown"
    }
    
    var anyPhotoURLString: String? { avatarUrl ?? photoURL ?? imageUrl }
    
    enum CodingKeys: String, CodingKey {
        case firstName, lastName, email, avatarUrl, photoURL, imageUrl, orgId, name
    }
}
