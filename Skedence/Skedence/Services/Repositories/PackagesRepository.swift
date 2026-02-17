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
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        // Try NEW path first: organizations/{orgId}/users/{userId}/packages
        let newSnapshot = try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .order(by: "purchaseDate", descending: true)
            .getDocuments()
        
        if !newSnapshot.documents.isEmpty {
            print("✅ PackagesRepository: Loaded \(newSnapshot.documents.count) packages from NEW path")
            return newSnapshot.documents.compactMap { doc in
                decodePackage(id: doc.documentID, data: doc.data())
            }
        }
        
        // Fallback to OLD path: users/{userId}/lessonPackages
        print("⚠️ PackagesRepository: Falling back to OLD path")
        let oldSnapshot = try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .whereField("orgId", isEqualTo: orgId)
            .order(by: "purchaseDate", descending: true)
            .getDocuments()
        
        print("✅ PackagesRepository: Loaded \(oldSnapshot.documents.count) packages from OLD path")
        let packages = oldSnapshot.documents.compactMap { doc in
            decodePackage(id: doc.documentID, data: doc.data())
        }
        
        return packages
    }
    
    func fetchById(id: String, orgId: String) async throws -> LessonPackage? {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        let doc = try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .document(id)
            .getDocument()
        
        guard doc.exists, let data = doc.data() else {
            throw RepositoryError.notFound
        }
        
        return decodePackage(id: doc.documentID, data: data)
    }
    
    func create(_ item: LessonPackage, orgId: String) async throws -> String {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        let packageData = encodePackage(item, orgId: orgId)
        let ref = try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .addDocument(data: packageData)
        
        return ref.documentID
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .document(id)
            .updateData(data)
    }
    
    func delete(id: String, orgId: String) async throws {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .document(id)
            .delete()
    }
    
    // MARK: - QueryableRepositoryProtocol Methods
    
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [LessonPackage] {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        var query: Query = db.collection("users")
            .document(userId)
            .collection("lessonPackages")
        
        for (field, value) in conditions {
            query = query.whereField(field, isEqualTo: value)
        }
        
        query = query.whereField("orgId", isEqualTo: orgId)
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { decodePackage(id: $0.documentID, data: $0.data()) }
    }
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [LessonPackage] {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        var query: Query = db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .whereField("orgId", isEqualTo: orgId)
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
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        let now = Timestamp(date: Date())
        
        // Try NEW path first: organizations/{orgId}/users/{userId}/packages
        let newSnapshot = try await db.collection("organizations")
            .document(orgId)
            .collection("users")
            .document(userId)
            .collection("packages")
            .whereField("expirationDate", isGreaterThan: now)
            .order(by: "expirationDate", descending: false)
            .getDocuments()
        
        if !newSnapshot.documents.isEmpty {
            return newSnapshot.documents.compactMap { doc in
                let pkg = decodePackage(id: doc.documentID, data: doc.data())
                // Filter to only packages with remaining lessons
                return (pkg?.lessonsRemaining ?? 0) > 0 ? pkg : nil
            }
        }
        
        // Fallback to OLD path: users/{userId}/lessonPackages
        let oldSnapshot = try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("expirationDate", isGreaterThan: now)
            .order(by: "expirationDate", descending: false)
            .getDocuments()
        
        return oldSnapshot.documents.compactMap { doc in
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
