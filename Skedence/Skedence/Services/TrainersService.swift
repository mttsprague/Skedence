//
//  TrainersService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine

@MainActor
final class TrainersService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [Trainer] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var trainers: [Trainer] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: TrainersRepository
    private var currentOrgId: String?
    
    init(repository: TrainersRepository = TrainersRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch active trainers for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        try await loadAllInternal(orgId: orgId)
    }
    
    /// Refresh trainers without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load all active trainers for a specific organization (maintains backward compatibility)
    func loadAll(orgId: String) async {
        do {
            try await loadAllInternal(orgId: orgId)
        } catch {
            // Error already set in internal method
        }
    }
    
    // MARK: - Internal Implementation
    
    private func loadAllInternal(orgId: String) async throws {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            items = try await repository.fetchAll(orgId: orgId)
        } catch {
            self.error = mapRepositoryError(error)
            items = []
            throw self.error!
        }
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
