//
//  PackagesService.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class PackagesService: ObservableObject {
    @Published private(set) var packages: [LessonPackage] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let db = Firestore.firestore()

    func loadMyPackages() async {
        guard let uid = Auth.auth().currentUser?.uid else { packages = []; return }
        isLoading = true
        errorMessage = nil
        
        do {
            // First try to find the user's organization
            let orgSnapshot = try await db.collection("organizations")
                .whereField("members", arrayContains: uid)
                .limit(to: 1)
                .getDocuments()
            
            if let orgDoc = orgSnapshot.documents.first {
                // New path: organizations/{orgId}/users/{userId}/packages
                let orgId = orgDoc.documentID
                let snap = try await db.collection("organizations").document(orgId)
                    .collection("users").document(uid)
                    .collection("packages")
                    .order(by: "purchaseDate", descending: true)
                    .getDocuments()
                
                packages = snap.documents.compactMap { doc in
                    decodePackage(id: doc.documentID, data: doc.data())
                }
            } else {
                // Fallback to old path: users/{uid}/lessonPackages
                let snap = try await db.collection("users").document(uid)
                    .collection("lessonPackages")
                    .order(by: "purchaseDate", descending: true)
                    .getDocuments()
                
                packages = snap.documents.compactMap { doc in
                    decodePackage(id: doc.documentID, data: doc.data())
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            packages = []
        }
        isLoading = false
    }

    var hasAvailableLessons: Bool {
        packages.contains { 
            $0.packageType != "class_pass" && 
            $0.lessonsRemaining > 0 && 
            $0.expirationDate >= Date() 
        }
    }

    // Create a new lesson package document under the signed-in user.
    // This conforms to the rule requirements:
    // - lessonsUsed = 0 on creation
    // - allowed packageType: private | 2_athlete | 3_athlete | class_pass
    // - totalLessons: any positive integer
    // - purchaseDate/expirationDate are Dates (serialized as Firestore Timestamps)
    func createLessonPackage(packageType: String,
                             totalLessons: Int,
                             purchaseDate: Date,
                             expirationDate: Date,
                             transactionId: String?) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw NSError(domain: "PackagesService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not signed in"])
        }

        // Derive category for backward compatibility (write it so consumers can rely on it)
        let derivedCategory = (packageType == "class_pass") ? "class" : "pass"

        let payload: [String: Any?] = [
            "packageType": packageType,        // "private" | "2_athlete" | "3_athlete" | "class_pass"
            "packageCategory": derivedCategory, // "pass" or "class"
            "totalLessons": totalLessons,
            "lessonsUsed": 0,                  // must be 0 on create per rules
            "purchaseDate": purchaseDate,      // Firestore will store as Timestamp
            "expirationDate": expirationDate,  // Firestore will store as Timestamp
            "transactionId": transactionId
        ]

        // Compact out nils for Firestore
        let data = payload.compactMapValues { $0 }

        try await db.collection("users")
            .document(uid)
            .collection("lessonPackages")
            .addDocument(data: data)
    }

    private func decodePackage(id: String, data: [String: Any]) -> LessonPackage? {
        guard
            let packageType = data["packageType"] as? String,
            let purchaseDate = Self.date(from: data["purchaseDate"]),
            let expirationDate = Self.date(from: data["expirationDate"])
        else {
            return nil
        }
        
        // Handle both old and new package formats
        let totalLessons: Int
        let lessonsUsed: Int
        
        if let remaining = data["remainingLessons"] as? Int {
            // New format: has remainingLessons and totalLessons
            totalLessons = data["totalLessons"] as? Int ?? remaining
            lessonsUsed = max(0, totalLessons - remaining)
        } else if let total = data["totalLessons"] as? Int,
                  let used = data["lessonsUsed"] as? Int {
            // Old format: has totalLessons and lessonsUsed
            totalLessons = total
            lessonsUsed = used
        } else {
            return nil
        }

        // Read packageCategory if present; otherwise derive from packageType for compatibility
        let packageCategory: String? = (data["packageCategory"] as? String) ?? ((packageType == "class_pass") ? "class" : "pass")
        
        // Read packageName if present
        let packageName: String? = data["packageName"] as? String
        
        return LessonPackage(
            id: id,
            packageType: packageType,
            packageName: packageName,
            packageCategory: packageCategory,
            totalLessons: totalLessons,
            lessonsUsed: lessonsUsed,
            purchaseDate: purchaseDate,
            expirationDate: expirationDate,
            transactionId: data["transactionId"] as? String ?? data["paymentIntentId"] as? String
        )
    }

    private static func date(from any: Any?) -> Date? {
        if let ts = any as? Timestamp { return ts.dateValue() }
        if let d = any as? Date { return d }
        if let dict = any as? [String: Any], let seconds = dict["_seconds"] as? TimeInterval {
            return Date(timeIntervalSince1970: seconds)
        }
        return nil
    }
}

