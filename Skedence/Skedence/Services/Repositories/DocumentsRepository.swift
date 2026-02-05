//
//  DocumentsRepository.swift
//  Skedence
//
//  Phase 4.1: User documents data access layer
//

import Foundation
import FirebaseFirestore
import FirebaseStorage

@MainActor
final class DocumentsRepository {
    private let db = Firestore.firestore()
    private let storage = Storage.storage()
    
    /// Fetch all documents for a user
    func fetchUserDocuments(userId: String) async throws -> [UserDocument] {
        let snapshot = try await db.collection("users")
            .document(userId)
            .collection("documents")
            .order(by: "uploadedAt", descending: true)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc -> UserDocument? in
            let data = doc.data()
            return decodeUserDocument(id: doc.documentID, data: data)
        }
    }
    
    /// Fetch a specific document
    func fetchDocument(userId: String, documentId: String) async throws -> UserDocument {
        let snapshot = try await db.collection("users")
            .document(userId)
            .collection("documents")
            .document(documentId)
            .getDocument()
        
        guard snapshot.exists, let data = snapshot.data() else {
            throw RepositoryError.notFound
        }
        
        return decodeUserDocument(id: snapshot.documentID, data: data)
    }
    
    /// Upload document to Storage and save metadata to Firestore
    func uploadDocument(
        userId: String,
        filename: String,
        data: Data,
        type: String,
        metadata: [String: Any] = [:]
    ) async throws -> UserDocument {
        // Upload to Storage
        let storagePath = "users/\(userId)/documents/\(filename)"
        let storageRef = storage.reference().child(storagePath)
        
        // Set metadata with content type for storage rules validation
        let storageMetadata = StorageMetadata()
        storageMetadata.contentType = "application/pdf"
        
        // Add athlete name to storage metadata if provided
        if let athleteName = metadata["athleteName"] as? String {
            storageMetadata.customMetadata = ["athleteName": athleteName]
        }
        
        _ = try await storageRef.putDataAsync(data, metadata: storageMetadata)
        let downloadURL = try await storageRef.downloadURL()
        
        // Save metadata to Firestore
        var documentData: [String: Any] = [
            "name": filename,
            "type": type,
            "uploadedAt": Timestamp(date: Date()),
            "url": downloadURL.absoluteString
        ]
        
        // Merge additional metadata
        documentData.merge(metadata) { _, new in new }
        
        let docRef = try await db.collection("users")
            .document(userId)
            .collection("documents")
            .addDocument(data: documentData)
        
        return decodeUserDocument(id: docRef.documentID, data: documentData)
    }
    
    /// Delete a document (removes from Storage and Firestore)
    func deleteDocument(userId: String, documentId: String) async throws {
        // Get document metadata to find storage path
        let doc = try await fetchDocument(userId: userId, documentId: documentId)
        
        // Delete from Firestore
        try await db.collection("users")
            .document(userId)
            .collection("documents")
            .document(documentId)
            .delete()
        
        // Delete from Storage (best effort - continue even if it fails)
        if URL(string: doc.url) != nil {
            let storagePath = "users/\(userId)/documents/\(doc.name)"
            let storageRef = storage.reference().child(storagePath)
            try? await storageRef.delete()
        }
    }
    
    /// Download document data from Storage
    func downloadDocument(url: String) async throws -> Data {
        guard let storageUrl = URL(string: url) else {
            throw RepositoryError.invalidData("Invalid document URL")
        }
        
        let storageRef = storage.reference(forURL: storageUrl.absoluteString)
        return try await storageRef.data(maxSize: 10 * 1024 * 1024) // 10MB max
    }
    
    // MARK: - Decoding Helpers
    
    private func decodeUserDocument(id: String, data: [String: Any]) -> UserDocument {
        let name = data["name"] as? String ?? "Unknown"
        let type = data["type"] as? String ?? "document"
        let uploadedAt = (data["uploadedAt"] as? Timestamp)?.dateValue() ?? Date()
        let url = data["url"] as? String ?? ""
        let signedBy = data["signedBy"] as? String
        let signatoryEmail = data["signatoryEmail"] as? String
        let isMinor = data["isMinor"] as? Bool
        let athleteName = data["athleteName"] as? String
        
        return UserDocument(
            id: id,
            name: name,
            type: type,
            uploadedAt: uploadedAt,
            url: url,
            signedBy: signedBy,
            signatoryEmail: signatoryEmail,
            isMinor: isMinor,
            athleteName: athleteName
        )
    }
}
