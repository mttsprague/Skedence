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

enum PackagesServiceError: Error, LocalizedError {
    case notAuthenticated
    case invalidPackageType
    case invalidLessonCount
    case invalidDateRange
    case createFailed(String)
    case fetchFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "User not authenticated"
        case .invalidPackageType:
            return "Invalid package type"
        case .invalidLessonCount:
            return "Total lessons must be greater than 0"
        case .invalidDateRange:
            return "Expiration date must be after purchase date"
        case .createFailed(let message):
            return "Failed to create package: \(message)"
        case .fetchFailed(let message):
            return "Failed to fetch packages: \(message)"
        }
    }
}

@MainActor
final class PackagesService: ObservableObject {
    @Published private(set) var packages: [LessonPackage] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let db = Firestore.firestore()
    
    // Valid package types per Firestore rules
    private let validPackageTypes = ["private", "2_athlete", "3_athlete", "class_pass"]

    func loadMyPackages() async {
        guard let uid = Auth.auth().currentUser?.uid else {
            errorMessage = PackagesServiceError.notAuthenticated.localizedDescription
            packages = []
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            // Get user's document to find their orgId
            let userDoc = try await db.collection("users").document(uid).getDocument()
            guard let userData = userDoc.data(),
                  let orgId = userData["orgId"] as? String ?? userData["organizationId"] as? String else {
                errorMessage = "User organization not found"
                packages = []
                isLoading = false
                return
            }
            
            // Query STANDARD path only
            let snap = try await db.collection("organizations")
                .document(orgId)
                .collection("users")
                .document(uid)
                .collection("packages")
                .order(by: "purchaseDate", descending: true)
                .getDocuments()
            
            packages = snap.documents.compactMap { doc in
                decodePackage(id: doc.documentID, data: doc.data())
            }
        } catch {
            errorMessage = PackagesServiceError.fetchFailed(error.localizedDescription).localizedDescription
            packages = []
        }
        
        isLoading = false
    }

    var hasAvailableLessons: Bool {
        packages.contains { pkg in
            pkg.packageType != "class_pass" && 
            pkg.lessonsRemaining > 0 && 
            (pkg.expirationDate ?? Date.distantPast) >= Date()
        }
    }

    // MARK: - CRUD Operations
    
    /// Create a new lesson package document under the signed-in user
    /// - Parameters:
    ///   - packageType: Must be one of: private, 2_athlete, 3_athlete, class_pass
    ///   - totalLessons: Must be greater than 0
    ///   - purchaseDate: Date of purchase
    ///   - expirationDate: Must be after purchaseDate
    ///   - transactionId: Optional transaction reference
    func createLessonPackage(
        packageType: String,
        totalLessons: Int,
        purchaseDate: Date,
        expirationDate: Date,
        transactionId: String?
    ) async throws {
        // Validation
        guard let uid = Auth.auth().currentUser?.uid else {
            throw PackagesServiceError.notAuthenticated
        }
        
        guard validPackageTypes.contains(packageType) else {
            throw PackagesServiceError.invalidPackageType
        }
        
        guard totalLessons > 0 else {
            throw PackagesServiceError.invalidLessonCount
        }
        
        guard expirationDate > purchaseDate else {
            throw PackagesServiceError.invalidDateRange
        }

        let payload: [String: Any?] = [
            "packageType": packageType,
            "totalLessons": totalLessons,
            "lessonsUsed": 0,
            "purchaseDate": purchaseDate,
            "expirationDate": expirationDate,
            "transactionId": transactionId
        ]

        let data = payload.compactMapValues { $0 }

        do {
            // Get user's orgId first
            let userDoc = try await db.collection("users").document(uid).getDocument()
            guard let userData = userDoc.data(),
                  let orgId = userData["orgId"] as? String ?? userData["organizationId"] as? String else {
                throw PackagesServiceError.createFailed("User organization not found")
            }
            
            // Write to STANDARD path only
            try await db.collection("organizations")
                .document(orgId)
                .collection("users")
                .document(uid)
                .collection("packages")
                .addDocument(data: data)
        } catch {
            throw PackagesServiceError.createFailed(error.localizedDescription)
        }
    }

    // MARK: - Private Helpers
    
    private func decodePackage(id: String, data: [String: Any]) -> LessonPackage? {
        guard
            let packageType = data["packageType"] as? String,
            let totalLessons = data["totalLessons"] as? Int,
            let lessonsUsed = data["lessonsUsed"] as? Int,
            let purchaseDate = Self.date(from: data["purchaseDate"]),
            let expirationDate = Self.date(from: data["expirationDate"])
        else {
            return nil
        }
        
        return LessonPackage(
            id: id,
            packageType: packageType,
            totalLessons: totalLessons,
            lessonsUsed: lessonsUsed,
            purchaseDate: purchaseDate,
            expirationDate: expirationDate,
            transactionId: data["transactionId"] as? String
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

