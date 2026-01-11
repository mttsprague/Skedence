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
    
    // Custom init to exclude id from decoding
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        avatarUrl = try container.decodeIfPresent(String.self, forKey: .avatarUrl)
        photoURL = try container.decodeIfPresent(String.self, forKey: .photoURL)
        imageUrl = try container.decodeIfPresent(String.self, forKey: .imageUrl)
        orgId = try container.decodeIfPresent(String.self, forKey: .orgId)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        // id is not decoded - will be set manually from document ID
    }
    
    // Custom encode to exclude id from encoding
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(firstName, forKey: .firstName)
        try container.encodeIfPresent(lastName, forKey: .lastName)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(avatarUrl, forKey: .avatarUrl)
        try container.encodeIfPresent(photoURL, forKey: .photoURL)
        try container.encodeIfPresent(imageUrl, forKey: .imageUrl)
        try container.encodeIfPresent(orgId, forKey: .orgId)
        try container.encodeIfPresent(name, forKey: .name)
        // id is not encoded
    }
}
