//
//  ServiceProtocol.swift
//  Skedence
//
//  Phase 2.1: Service Layer Standardization
//  Defines common patterns for all services
//

import Foundation
import Combine

/// Base protocol for all data services
/// Provides consistent loading states, error handling, and data management
@MainActor
protocol ServiceProtocol: ObservableObject {
    associatedtype DataType
    
    /// The primary data managed by this service
    var items: [DataType] { get }
    
    /// Indicates whether an async operation is in progress
    var isLoading: Bool { get }
    
    /// The most recent error, if any
    var error: Error? { get }
    
    /// Fetch/reload data from the backend
    func fetch() async throws
    
    /// Refresh data (convenience method that handles errors internally)
    func refresh() async
}

/// Default implementations for common patterns
extension ServiceProtocol {
    /// Refresh without throwing - sets error property instead
    func refresh() async {
        do {
            try await fetch()
        } catch {
            // Error is already set in fetch() implementation
        }
    }
}

/// Standard error types for services
enum ServiceError: LocalizedError {
    case notAuthenticated
    case networkError(Error)
    case decodingError(String)
    case invalidData(String)
    case notFound
    case unauthorized
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to perform this action"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let message):
            return "Data format error: \(message)"
        case .invalidData(let message):
            return "Invalid data: \(message)"
        case .notFound:
            return "Requested resource was not found"
        case .unauthorized:
            return "You don't have permission to access this resource"
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}
