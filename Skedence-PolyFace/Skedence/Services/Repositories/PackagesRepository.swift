//
//  PackagesRepository.swift
//  Skedence
//
//  Firebase repository for lesson packages data access
//

import Foundation
import FirebaseFirestore
import FirebaseAuth

@MainActor
final class PackagesRepository: QueryableRepositoryProtocol {
    typealias DataType = LessonPackage
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [LessonPackage] {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            print("❌ PackagesRepository: User document not found for authUserId: \(authUserId)")
            return []
        }
        
        let userId = userDoc.documentID  // This is the name-based document ID
        
        // Query STANDARD path: organizations/{orgId}/users/{userId}/packages
        let snapshot = try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .order(by: "purchaseDate", descending: true)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc in
            decodePackage(id: doc.documentID, data: doc.data())
        }
    }
    
    func fetchById(id: String, orgId: String) async throws -> LessonPackage? {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw RepositoryError.notFound
        }
        
        let userId = userDoc.documentID
        
        let doc = try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .document(id)
            .getDocument()
        
        guard doc.exists, let data = doc.data() else {
            throw RepositoryError.notFound
        }
        
        return decodePackage(id: doc.documentID, data: data)
    }
    
    func create(_ item: LessonPackage, orgId: String) async throws -> String {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw RepositoryError.unauthorized
        }
        
        let userId = userDoc.documentID
        
        let packageData = encodePackage(item, orgId: orgId)
        
        // Generate human-readable ID
        let packageId = IDGenerator.generatePackageId(
            userId: userId,
            packageType: item.packageType,
            purchaseDate: item.purchaseDate
        )
        
        try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .document(packageId)
            .setData(packageData)
        
        return packageId
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw RepositoryError.unauthorized
        }
        
        let userId = userDoc.documentID
        
        try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .document(id)
            .updateData(data)
    }
    
    func delete(id: String, orgId: String) async throws {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw RepositoryError.unauthorized
        }
        
        let userId = userDoc.documentID
        
        try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .document(id)
            .delete()
    }
    
    // MARK: - QueryableRepositoryProtocol Methods
    
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [LessonPackage] {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            return []
        }
        
        let userId = userDoc.documentID
        
        var query: Query = db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
        
        for (field, value) in conditions {
            query = query.whereField(field, isEqualTo: value)
        }
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodePackage(id: $0.documentID, data: $0.data()) }
    }
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [LessonPackage] {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            return []
        }
        
        let userId = userDoc.documentID
        
        var query: Query = db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .order(by: field, descending: descending)
        
        if let limit = limit {
            query = query.limit(to: limit)
        }
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodePackage(id: $0.documentID, data: $0.data()) }
    }
    
    // MARK: - Package-Specific Methods
    
    /// Fetch active packages with remaining lessons
    func fetchActivePackages(orgId: String) async throws -> [LessonPackage] {
        guard let authUserId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Query users collection by authUserId to find document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            return []
        }
        
        let userId = userDoc.documentID
        
        let now = Timestamp(date: Date())
        
        // Query STANDARD path: organizations/{orgId}/users/{userId}/packages
        let snapshot = try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .whereField("expirationDate", isGreaterThan: now)
            .order(by: "expirationDate", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc in
            let pkg = decodePackage(id: doc.documentID, data: doc.data())
            // Filter to only packages with remaining lessons
            return (pkg?.lessonsRemaining ?? 0) > 0 ? pkg : nil
        }
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodePackage(id: String, data: [String: Any]) -> LessonPackage? {
        guard
            let packageType = data["packageType"] as? String,
            let totalLessons = data["totalLessons"] as? Int
        else {
            return nil
        }
        
        let lessonsUsed = data["lessonsUsed"] as? Int ?? 0
        let purchaseDate = (data["purchaseDate"] as? Timestamp)?.dateValue() ?? Date()
        let expirationDate = (data["expirationDate"] as? Timestamp)?.dateValue() ?? Date.distantFuture
        
        return LessonPackage(
            id: id,
            packageType: packageType,
            packageName: data["packageName"] as? String,
            packageCategory: data["packageCategory"] as? String,
            totalLessons: totalLessons,
            lessonsUsed: lessonsUsed,
            purchaseDate: purchaseDate,
            expirationDate: expirationDate,
            transactionId: data["transactionId"] as? String
        )
    }
    
    private func encodePackage(_ package: LessonPackage, orgId: String) -> [String: Any] {
        var data: [String: Any] = [
            "packageType": package.packageType,
            "totalLessons": package.totalLessons,
            "lessonsUsed": package.lessonsUsed,
            "purchaseDate": Timestamp(date: package.purchaseDate),
            "expirationDate": Timestamp(date: package.expirationDate),
            "orgId": orgId
        ]
        
        if let packageName = package.packageName {
            data["packageName"] = packageName
        }
        
        if let packageCategory = package.packageCategory {
            data["packageCategory"] = packageCategory
        }
        
        if let transactionId = package.transactionId {
            data["transactionId"] = transactionId
        }
        
        return data
    }
}
