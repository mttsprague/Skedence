//
//  ReferenceCodeGenerator.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import Foundation
import FirebaseFirestore

/// Generates human-readable reference codes for users, trainers, and organizations
struct ReferenceCodeGenerator {
    
    /// Generate a reference code for a user based on their name
    /// Format: LASTNAME-F-### (e.g., SMITH-J-001, GARCIA-M-042)
    static func generateUserCode(firstName: String, lastName: String) async throws -> String {
        let db = Firestore.firestore()
        
        // Clean and format name parts
        let lastInitial = lastName.prefix(5).uppercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "-", with: "")
        let firstInitial = firstName.prefix(1).uppercased()
        
        let baseCode = "\(lastInitial)-\(firstInitial)"
        
        // Find highest existing number for this base
        let snapshot = try await db.collection("users")
            .whereField("referenceCode", isGreaterThanOrEqualTo: baseCode)
            .whereField("referenceCode", isLessThan: baseCode + "~")
            .getDocuments()
        
        var highestNumber = 0
        for doc in snapshot.documents {
            if let code = doc.data()["referenceCode"] as? String {
                // Extract number from code like "SMITH-J-042"
                let parts = code.split(separator: "-")
                if parts.count >= 3, let num = Int(parts[2]) {
                    highestNumber = max(highestNumber, num)
                }
            }
        }
        
        let nextNumber = highestNumber + 1
        return String(format: "%@-%03d", baseCode, nextNumber)
    }
    
    /// Generate a reference code for a trainer
    /// Format: TR-FIRSTNAME-### (e.g., TR-MIKE-001, TR-SARAH-012)
    static func generateTrainerCode(firstName: String, lastName: String) async throws -> String {
        let db = Firestore.firestore()
        
        // Clean and format name
        let nameCode = firstName.prefix(8).uppercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "-", with: "")
        
        let baseCode = "TR-\(nameCode)"
        
        // Find highest existing number for this base
        let snapshot = try await db.collection("trainers")
            .whereField("referenceCode", isGreaterThanOrEqualTo: baseCode)
            .whereField("referenceCode", isLessThan: baseCode + "~")
            .getDocuments()
        
        var highestNumber = 0
        for doc in snapshot.documents {
            if let code = doc.data()["referenceCode"] as? String {
                let parts = code.split(separator: "-")
                if parts.count >= 3, let num = Int(parts[2]) {
                    highestNumber = max(highestNumber, num)
                }
            }
        }
        
        let nextNumber = highestNumber + 1
        return String(format: "%@-%03d", baseCode, nextNumber)
    }
    
    /// Generate a reference code for an organization
    /// Format: ORG-NAME-### (e.g., ORG-POLYFACE-001, ORG-FITNESS-001)
    static func generateOrganizationCode(name: String) async throws -> String {
        let db = Firestore.firestore()
        
        // Clean and format organization name
        let nameCode = name.prefix(10).uppercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "-", with: "")
        
        let baseCode = "ORG-\(nameCode)"
        
        // Find highest existing number for this base
        let snapshot = try await db.collection("organizations")
            .whereField("referenceCode", isGreaterThanOrEqualTo: baseCode)
            .whereField("referenceCode", isLessThan: baseCode + "~")
            .getDocuments()
        
        var highestNumber = 0
        for doc in snapshot.documents {
            if let code = doc.data()["referenceCode"] as? String {
                let parts = code.split(separator: "-")
                if parts.count >= 3, let num = Int(parts[2]) {
                    highestNumber = max(highestNumber, num)
                }
            }
        }
        
        let nextNumber = highestNumber + 1
        return String(format: "%@-%03d", baseCode, nextNumber)
    }
    
    /// Generate a simple sequential code with a prefix
    /// Format: PREFIX-### (e.g., LOC-001, DOC-042)
    static func generateSequentialCode(prefix: String, collection: String) async throws -> String {
        let db = Firestore.firestore()
        
        let baseCode = prefix.uppercased()
        
        // Find highest existing number
        let snapshot = try await db.collection(collection)
            .whereField("referenceCode", isGreaterThanOrEqualTo: baseCode)
            .whereField("referenceCode", isLessThan: baseCode + "~")
            .getDocuments()
        
        var highestNumber = 0
        for doc in snapshot.documents {
            if let code = doc.data()["referenceCode"] as? String {
                let parts = code.split(separator: "-")
                if parts.count >= 2, let num = Int(parts[1]) {
                    highestNumber = max(highestNumber, num)
                }
            }
        }
        
        let nextNumber = highestNumber + 1
        return String(format: "%@-%03d", baseCode, nextNumber)
    }
}
