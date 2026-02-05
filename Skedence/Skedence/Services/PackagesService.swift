//
//  PackagesService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class PackagesService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [LessonPackage] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var packages: [LessonPackage] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies

    private let repository: PackagesRepository
    private let db = Firestore.firestore()  // Keep for legacy create method
    
    init(repository: PackagesRepository = PackagesRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch packages for the current user
    func fetch() async throws {
        try await loadMyPackagesInternal()
    }
    
    /// Refresh packages without throwing
    func refresh() async {
        try? await fetch()
    }

    /// Load packages for the current user (maintains backward compatibility)
    func loadMyPackages() async {
        do {
            try await loadMyPackagesInternal()
        } catch {
            // Error already set in internal method
        }
    }
    
    // MARK: - Internal Implementation
    
    private func loadMyPackagesInternal() async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw ServiceError.notAuthenticated
        }
        
        isLoading = true
        error = nil
        
        do {
            // Look up the user's organization from orgMembers (same as AuthManager)
            let orgMembersQuery = db.collection("orgMembers")
                .whereField("userId", isEqualTo: uid)
                .limit(to: 1)
            
            let orgMembersSnapshot = try await orgMembersQuery.getDocuments()
            
            if let memberDoc = orgMembersSnapshot.documents.first,
               let orgId = memberDoc.data()["orgId"] as? String {
                items = try await repository.fetchAll(orgId: orgId)
            } else {
                items = []
            }
        } catch {
            self.error = mapRepositoryError(error)
            items = []
            // Don't rethrow - let the view handle gracefully
        }
        isLoading = false
    }
    
    // MARK: - Domain-Specific Methods

    
    var hasAvailableLessons: Bool {
        items.contains { 
            $0.packageType != "class_pass" && 
            $0.lessonsRemaining > 0 && 
            $0.expirationDate >= Date() 
        }
    }

    /// Create a new lesson package document under the signed-in user.
    /// This conforms to the rule requirements:
    /// - lessonsUsed = 0 on creation
    /// - allowed packageType: private | 2_athlete | 3_athlete | class_pass
    /// - totalLessons: any positive integer
    /// - purchaseDate/expirationDate are Dates (serialized as Firestore Timestamps)
    func createLessonPackage(packageType: String,
                             totalLessons: Int,
                             purchaseDate: Date,
                             expirationDate: Date,
                             transactionId: String?) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw ServiceError.notAuthenticated
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

    // MARK: - Helpers
    
    /// Map RepositoryError to ServiceError
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

