//
//  IDGenerator.swift
//  Skedence
//
//  Created by GitHub Copilot on 2/19/26.
//  Utility for generating human-readable document IDs
//

import Foundation
import FirebaseFirestore

class IDGenerator {
    private static let db = Firestore.firestore()
    
    /// Sanitize a name for use in a document ID
    static func sanitizeName(_ name: String) -> String {
        return name
            .replacingOccurrences(of: "[^a-zA-Z0-9\\s-]", with: "", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: "_", options: .regularExpression)
            .lowercased()
    }
    
    /// Generate a unique user ID based on first and last name
    /// Format: firstName_lastName or firstName_lastName_2 if collision
    static func generateUserId(firstName: String, lastName: String) async throws -> String {
        let baseName = "\(firstName)_\(lastName)"
        return try await generateUniqueId(baseName: baseName, collection: "users")
    }
    
    /// Generate a unique trainer ID based on first and last name
    /// Format: firstName_lastName or firstName_lastName_2 if collision
    static func generateTrainerId(firstName: String, lastName: String) async throws -> String {
        let baseName = "\(firstName)_\(lastName)"
        return try await generateUniqueId(baseName: baseName, collection: "trainers")
    }
    
    /// Generate a unique organization ID based on organization name
    /// Format: organizationName or organizationName_2 if collision
    static func generateOrganizationId(name: String) async throws -> String {
        return try await generateUniqueId(baseName: name, collection: "organizations")
    }
    
    /// Generate a unique ID for a given collection
    private static func generateUniqueId(baseName: String, collection: String) async throws -> String {
        let sanitized = sanitizeName(baseName)
        var id = sanitized
        var counter = 2
        
        // Check if ID exists, append number if needed
        while try await documentExists(collection: collection, documentId: id) {
            id = "\(sanitized)_\(counter)"
            counter += 1
        }
        
        return id
    }
    
    /// Check if a document exists in a collection
    private static func documentExists(collection: String, documentId: String) async throws -> Bool {
        let doc = try await db.collection(collection).document(documentId).getDocument()
        return doc.exists
    }
}