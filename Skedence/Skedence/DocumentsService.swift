//
//  DocumentsService.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import Foundation
import FirebaseStorage
import FirebaseFirestore

struct UserDocument: Codable, Identifiable {
    var id: String
    var name: String
    var type: String // "waiver", "medical", etc.
    var uploadedAt: Date
    var url: String
    var signedBy: String?
    var signatoryEmail: String?
    var isMinor: Bool?
    var athleteName: String? // Name of athlete this document is for
}

final class DocumentsService {
    static let shared = DocumentsService()
    private init() {}
    
    /// Upload waiver PDF to Firebase Storage and save metadata to Firestore
    func saveWaiverDocument(
        userId: String,
        pdfData: Data,
        signature: WaiverSignature,
        athleteName: String? = nil
    ) async throws -> UserDocument {
        let storage = Storage.storage()
        let db = Firestore.firestore()
        
        // Generate unique filename with timestamp
        let timestamp = Int(Date().timeIntervalSince1970)
        let filename = "waiver_\(timestamp).pdf"
        let storagePath = "users/\(userId)/documents/\(filename)"
        
        // Create storage reference
        let storageRef = storage.reference().child(storagePath)
        
        // Upload PDF
        let metadata = StorageMetadata()
        metadata.contentType = "application/pdf"
        
        print("📄 Uploading waiver PDF to: \(storagePath)")
        _ = try await storageRef.putDataAsync(pdfData, metadata: metadata)
        
        // Get download URL
        let downloadURL = try await storageRef.downloadURL()
        print("✅ Waiver PDF uploaded. URL: \(downloadURL.absoluteString)")
        
        // Create document metadata
        let documentId = UUID().uuidString
        let now = Date()
        
        // Create descriptive name with athlete name if provided
        let documentName = if let athleteName = athleteName {
            "\(athleteName) Waiver"
        } else {
            "Release of Liability Waiver"
        }
        
        var documentData: [String: Any] = [
            "name": documentName,
            "type": "waiver",
            "uploadedAt": Timestamp(date: now),
            "url": downloadURL.absoluteString,
            "signedBy": signature.fullName,
            "signatoryEmail": signature.email,
            "isMinor": signature.isMinor
        ]
        
        if let athleteName = athleteName {
            documentData["athleteName"] = athleteName
        }
        
        // Save to Firestore
        print("📄 Saving waiver metadata to Firestore")
        try await db.collection("users")
            .document(userId)
            .collection("documents")
            .document(documentId)
            .setData(documentData)
        
        print("✅ Waiver document saved successfully")
        
        return UserDocument(
            id: documentId,
            name: "Release of Liability Waiver",
            type: "waiver",
            uploadedAt: now,
            url: downloadURL.absoluteString,
            signedBy: signature.fullName,
            signatoryEmail: signature.email,
            isMinor: signature.isMinor,
            athleteName: athleteName
        )
    }
    
    /// Fetch all documents for a user
    func fetchDocuments(userId: String) async throws -> [UserDocument] {
        let db = Firestore.firestore()
        
        let snapshot = try await db.collection("users")
            .document(userId)
            .collection("documents")
            .order(by: "uploadedAt", descending: true)
            .getDocuments()
        
        return snapshot.documents.compactMap { doc in
            let data = doc.data()
            guard
                let name = data["name"] as? String,
                let type = data["type"] as? String,
                let uploadedAtTimestamp = data["uploadedAt"] as? Timestamp,
                let url = data["url"] as? String
            else {
                return nil
            }
            
            return UserDocument(
                id: doc.documentID,
                name: name,
                type: type,
                uploadedAt: uploadedAtTimestamp.dateValue(),
                url: url,
                signedBy: data["signedBy"] as? String,
                signatoryEmail: data["signatoryEmail"] as? String,
                isMinor: data["isMinor"] as? Bool,
                athleteName: data["athleteName"] as? String
            )
        }
    }
    
    /// Check if user has signed waiver
    func hasSignedWaiver(userId: String) async throws -> Bool {
        let db = Firestore.firestore()
        
        let snapshot = try await db.collection("users")
            .document(userId)
            .collection("documents")
            .whereField("type", in: ["waiver", "waiver_agreement"])
            .limit(to: 1)
            .getDocuments()
        
        return !snapshot.documents.isEmpty
    }
}
