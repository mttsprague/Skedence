//
//  DocumentsService.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import Foundation
import Combine

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

final class DocumentsService: ObservableObject {
    static let shared = DocumentsService()
    
    // MARK: - ServiceProtocol Standard Properties
    
    @Published private(set) var items: [UserDocument] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: Error?
    
    private let repository = DocumentsRepository()
    
    private init() {}
    
    // MARK: - ServiceProtocol Methods
    
    /// Fetch user documents
    func fetch(userId: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            items = try await repository.fetchUserDocuments(userId: userId)
        } catch let catchError {
            error = mapRepositoryError(catchError)
            throw catchError
        }
    }
    
    /// Refresh user documents
    func refresh(userId: String) async throws {
        try await fetch(userId: userId)
    }
    
    /// Upload waiver PDF to Firebase Storage and save metadata to Firestore
    func saveWaiverDocument(
        userId: String,
        pdfData: Data,
        signature: WaiverSignature,
        athleteName: String? = nil
    ) async throws -> UserDocument {
        // Generate unique filename with timestamp and athlete name
        let timestamp = Int(Date().timeIntervalSince1970)
        let filename: String
        if let athleteName = athleteName {
            // Sanitize athlete name for filename (replace spaces with underscores, remove special chars)
            let sanitized = athleteName.components(separatedBy: .whitespaces).joined(separator: "_")
                .components(separatedBy: CharacterSet.alphanumerics.inverted).joined()
            filename = "\(sanitized)_waiver_\(timestamp).pdf"
        } else {
            filename = "waiver_\(timestamp).pdf"
        }
        
        // Create descriptive name with athlete name if provided
        let documentName = if let athleteName = athleteName {
            "\(athleteName) Waiver"
        } else {
            "Release of Liability Waiver"
        }
        
        var metadata: [String: Any] = [
            "displayName": documentName,
            "originalFilename": filename,
            "signedBy": signature.fullName,
            "signatoryEmail": signature.email,
            "isMinor": signature.isMinor
        ]
        
        if let athleteName = athleteName {
            metadata["athleteName"] = athleteName
        }
        
        print("📄 Uploading waiver PDF: \(filename)")
        let document = try await repository.uploadDocument(
            userId: userId,
            filename: filename,
            data: pdfData,
            type: "waiver",
            metadata: metadata
        )
        print("✅ Waiver document saved successfully")
        
        return document
    }
    
    /// Fetch all documents for a user
    func fetchDocuments(userId: String) async throws -> [UserDocument] {
        return try await repository.fetchUserDocuments(userId: userId)
    }
    
    /// Check if user has signed waiver
    func hasSignedWaiver(userId: String) async throws -> Bool {
        let documents = try await repository.fetchUserDocuments(userId: userId)
        return documents.contains { $0.type == "waiver" || $0.type == "waiver_agreement" }
    }
    
    // MARK: - Helper Methods
    
    private func mapRepositoryError(_ error: Error) -> ServiceError {
        if let repoError = error as? RepositoryError {
            switch repoError {
            case .notFound:
                return ServiceError.notFound
            case .unauthorized:
                return ServiceError.notAuthenticated
            case .invalidData(let message):
                return ServiceError.invalidData(message)
            default:
                return ServiceError.networkError(error)
            }
        }
        return ServiceError.networkError(error)
    }
}
