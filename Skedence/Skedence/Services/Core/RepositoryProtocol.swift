//
//  RepositoryProtocol.swift
//  Skedence
//
//  Phase 3.1: Repository Pattern Implementation
//  Decouples data access from business logic
//

import Foundation
import FirebaseFirestore

/// Base protocol for all data repositories
/// Repositories handle raw data access and Firebase interactions
@MainActor
protocol RepositoryProtocol {
    associatedtype DataType
    
    /// Fetch all items for the given organization
    func fetchAll(orgId: String) async throws -> [DataType]
    
    /// Fetch a single item by ID
    func fetchById(id: String, orgId: String) async throws -> DataType?
    
    /// Create a new item
    func create(_ item: DataType, orgId: String) async throws -> String
    
    /// Update an existing item
    func update(id: String, data: [String: Any], orgId: String) async throws
    
    /// Delete an item
    func delete(id: String, orgId: String) async throws
}

/// Repository error types
enum RepositoryError: LocalizedError {
    case notFound
    case invalidData(String)
    case decodingError(String)
    case encodingError(String)
    case firestoreError(Error)
    case unauthorized
    case unsupportedOperation
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .notFound:
            return "Requested item was not found"
        case .invalidData(let message):
            return "Invalid data: \(message)"
        case .decodingError(let message):
            return "Failed to decode data: \(message)"
        case .encodingError(let message):
            return "Failed to encode data: \(message)"
        case .firestoreError(let error):
            return "Firestore error: \(error.localizedDescription)"
        case .unauthorized:
            return "Unauthorized access"
        case .unsupportedOperation:
            return "This operation is not supported"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

/// Protocol for repositories that support real-time listeners
@MainActor
protocol ListenerRepositoryProtocol: RepositoryProtocol {
    /// Start listening to changes
    func startListening(orgId: String, onChange: @escaping ([DataType]) -> Void) -> ListenerRegistration
    
    /// Stop listening to changes
    func stopListening()
}

/// Protocol for repositories with custom queries
@MainActor
protocol QueryableRepositoryProtocol: RepositoryProtocol {
    /// Fetch items with custom filters
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [DataType]
    
    /// Fetch items with ordering
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [DataType]
}
