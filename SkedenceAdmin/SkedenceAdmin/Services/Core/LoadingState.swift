//
//  LoadingState.swift
//  SkedenceAdmin
//
//  Phase 3.3: Unified loading state infrastructure
//

import Foundation

/// Generic loading state for async operations
/// Replaces the pattern of separate @Published var isLoading, errorMessage, data properties
enum LoadingState<T> {
    case idle
    case loading
    case loaded(T)
    case error(Error)
    
    var isLoading: Bool {
        if case .loading = self {
            return true
        }
        return false
    }
    
    var data: T? {
        if case .loaded(let value) = self {
            return value
        }
        return nil
    }
    
    var error: Error? {
        if case .error(let err) = self {
            return err
        }
        return nil
    }
    
    var errorMessage: String? {
        error?.localizedDescription
    }
}

// MARK: - Equatable conformance (when T is Equatable)
extension LoadingState: Equatable where T: Equatable {
    static func == (lhs: LoadingState<T>, rhs: LoadingState<T>) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle):
            return true
        case (.loading, .loading):
            return true
        case (.loaded(let a), .loaded(let b)):
            return a == b
        case (.error(let a), .error(let b)):
            return a.localizedDescription == b.localizedDescription
        default:
            return false
        }
    }
}
