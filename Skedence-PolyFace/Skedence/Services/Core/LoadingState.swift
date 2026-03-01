//
//  LoadingState.swift
//  Skedence
//
//  Phase 6: Unified loading state management
//

import Foundation

/// Generic loading state for async operations
/// Provides consistent state handling across all services and views
enum LoadingState<T> {
    case idle
    case loading
    case success(T)
    case failure(Error)
    
    /// Whether data is currently being loaded
    var isLoading: Bool {
        if case .loading = self {
            return true
        }
        return false
    }
    
    /// Extract success data if available
    var data: T? {
        if case .success(let data) = self {
            return data
        }
        return nil
    }
    
    /// Extract error if available
    var error: Error? {
        if case .failure(let error) = self {
            return error
        }
        return nil
    }
}

// MARK: - Equatable Support
extension LoadingState: Equatable where T: Equatable {
    static func == (lhs: LoadingState<T>, rhs: LoadingState<T>) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle):
            return true
        case (.loading, .loading):
            return true
        case (.success(let lhsData), .success(let rhsData)):
            return lhsData == rhsData
        case (.failure(let lhsError), .failure(let rhsError)):
            return lhsError.localizedDescription == rhsError.localizedDescription
        default:
            return false
        }
    }
}
