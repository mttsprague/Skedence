//
//  IDGenerator.swift
//  SkedenceAdmin
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
        // Sanitize names separately to preserve underscore separator
        let sanitizedFirst = sanitizeName(firstName)
        let sanitizedLast = sanitizeName(lastName)
        let baseName = "\(sanitizedFirst)_\(sanitizedLast)"
        return try await generateUniqueId(baseName: baseName, collection: "users", skipSanitization: true)
    }
    
    /// Generate a unique trainer ID based on first and last name
    /// Format: firstName_lastName or firstName_lastName_2 if collision
    static func generateTrainerId(firstName: String, lastName: String) async throws -> String {
        // Sanitize names separately to preserve underscore separator
        let sanitizedFirst = sanitizeName(firstName)
        let sanitizedLast = sanitizeName(lastName)
        let baseName = "\(sanitizedFirst)_\(sanitizedLast)"
        return try await generateUniqueId(baseName: baseName, collection: "trainers", skipSanitization: true)
    }
    
    /// Generate a unique organization ID based on organization name
    /// Format: organizationName or organizationName_2 if collision
    static func generateOrganizationId(name: String) async throws -> String {
        return try await generateUniqueId(baseName: name, collection: "organizations")
    }
    
    /// Generate a booking ID based on client, trainer, and timestamp
    /// Format: clientId_trainerId_timestamp (e.g., john_smith_jeff_wilson_1740045600)
    static func generateBookingId(clientId: String, trainerId: String, startTime: Date) -> String {
        let timestamp = Int(startTime.timeIntervalSince1970)
        return "\(clientId)_\(trainerId)_\(timestamp)"
    }
    
    /// Generate a class ID based on class name and start time
    /// Format: sanitizedClassName_timestamp (e.g., yoga_fundamentals_1740045600)
    static func generateClassId(className: String, startTime: Date) async throws -> String {
        let timestamp = Int(startTime.timeIntervalSince1970)
        let baseName = "\(className)_\(timestamp)"
        return try await generateUniqueId(baseName: baseName, collection: "classes")
    }
    
    /// Generate a package ID based on user, package type, and purchase date
    /// Format: userId_packageType_timestamp (e.g., john_smith_private_1740045600)
    static func generatePackageId(userId: String, packageType: String, purchaseDate: Date) -> String {
        let timestamp = Int(purchaseDate.timeIntervalSince1970)
        let sanitizedType = sanitizeName(packageType)
        return "\(userId)_\(sanitizedType)_\(timestamp)"
    }
    
    /// Generate a schedule ID based on trainer and start time
    /// Format: trainerId_timestamp (e.g., jeff_wilson_1740045600)
    static func generateScheduleId(trainerId: String, startTime: Date) -> String {
        // Use deterministic format to match Cloud Function: YYYY-MM-DDTHH
        let calendar = Calendar(identifier: .gregorian)
        var utcCalendar = calendar
        utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!
        
        let comps = utcCalendar.dateComponents([.year, .month, .day, .hour], from: startTime)
        let y = comps.year ?? 1970
        let m = comps.month ?? 1
        let d = comps.day ?? 1
        let h = comps.hour ?? 0
        return String(format: "%04d-%02d-%02dT%02d", y, m, d, h)
    }
    
    /// Generate a waiver/document ID based on user, type, and date
    /// Format: userId_documentType_timestamp (e.g., john_smith_waiver_1740045600)
    static func generateDocumentId(userId: String, documentType: String, createdDate: Date) -> String {
        let timestamp = Int(createdDate.timeIntervalSince1970)
        let sanitizedType = sanitizeName(documentType)
        return "\(userId)_\(sanitizedType)_\(timestamp)"
    }
    
    /// Generate a unique ID for a given collection
    private static func generateUniqueId(baseName: String, collection: String, skipSanitization: Bool = false) async throws -> String {
        let sanitized = skipSanitization ? baseName : sanitizeName(baseName)
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
        do {
            let doc = try await db.collection(collection).document(documentId).getDocument()
            return doc.exists
        } catch let error as NSError {
            // If permission denied, assume document doesn't exist (can't check during registration)
            if error.domain == "FIRFirestoreErrorDomain" && error.code == 7 { // PERMISSION_DENIED
                print("⚠️ IDGenerator: Permission denied checking \(documentId) - assuming it doesn't exist")
                return false
            }
            // Re-throw other errors
            throw error
        }
    }
}
