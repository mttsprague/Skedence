//
//  ReferenceCodeGenerator.swift
//  SkedenceAdmin
//
//  Generates unique, human-friendly reference codes for users.
//  Format: <Initials><Digits> (e.g., MS4821)
//

import Foundation
#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

enum ReferenceCodeError: Error, LocalizedError {
    case firestoreUnavailable
    case failedToGenerateUniqueCode

    var errorDescription: String? {
        switch self {
        case .firestoreUnavailable:
            return "Database is not available."
        case .failedToGenerateUniqueCode:
            return "Unable to generate a unique reference code. Please try again."
        }
    }
}

struct ReferenceCodeGenerator {
    // Characters that avoid confusion (no O/0, I/1)
    private static let digitChars = Array("23456789")
    
    // Try multiple attempts and increase digits if needed
    private static let maxAttemptsPerLength = 15
    private static let initialDigits = 4
    private static let maxDigits = 8
    
    static func generateUserCode(firstName: String, lastName: String) async throws -> String {
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        #else
        throw ReferenceCodeError.firestoreUnavailable
        #endif
        
        let initials = makeInitials(firstName: firstName, lastName: lastName)
        
        var digitsCount = initialDigits
        while digitsCount <= maxDigits {
            for _ in 0..<maxAttemptsPerLength {
                let candidate = initials + randomDigits(count: digitsCount)
                
                #if canImport(FirebaseFirestore)
                let snapshot = try await db.collection("users")
                    .whereField("referenceCode", isEqualTo: candidate)
                    .limit(to: 1)
                    .getDocuments()
                
                if snapshot.documents.isEmpty {
                    return candidate
                }
                #endif
            }
            digitsCount += 1
        }
        
        throw ReferenceCodeError.failedToGenerateUniqueCode
    }
    
    private static func makeInitials(firstName: String, lastName: String) -> String {
        let f = firstName.trimmingCharacters(in: .whitespacesAndNewlines)
        let l = lastName.trimmingCharacters(in: .whitespacesAndNewlines)
        
        var initials = ""
        if let c = f.first { initials.append(c) }
        if let c = l.first { initials.append(c) }
        
        if initials.isEmpty {
            initials = "US" // fallback if both names are empty
        }
        return initials.uppercased()
    }
    
    private static func randomDigits(count: Int) -> String {
        String((0..<count).compactMap { _ in digitChars.randomElement() })
    }
}
