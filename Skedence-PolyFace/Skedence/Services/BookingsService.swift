//
//  BookingsService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//  Phase 3.1: Refactored to use Repository Pattern
//

import Foundation
import Combine

@MainActor
final class BookingsService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [Booking] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var myBookings: [Booking] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: BookingsRepository
    private var currentOrgId: String?
    
    // MARK: - Initialization
    
    init(repository: BookingsRepository = BookingsRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch bookings for the current user
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        try await loadMyBookingsInternal(orgId: orgId, limit: 50)
    }
    
    /// Refresh bookings without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load bookings for a specific organization (maintains backward compatibility)
    func loadMyBookings(orgId: String, limit: Int = 50) async {
        do {
            try await loadMyBookingsInternal(orgId: orgId, limit: limit)
        } catch {
            // Error already set in internal method
        }
    }
    
    // MARK: - Internal Implementation
    
    private func loadMyBookingsInternal(orgId: String, limit: Int) async throws {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            items = try await repository.fetch(
                orderedBy: "startTime",
                descending: false,
                limit: limit,
                orgId: orgId
            )
        } catch let repositoryError {
            let serviceError = mapRepositoryError(repositoryError)
            self.error = serviceError
            items = []
            throw serviceError
        }
    }

    // MARK: - Error Mapping
    
    private func mapRepositoryError(_ error: Error) -> ServiceError {
        if let repoError = error as? RepositoryError {
            switch repoError {
            case .notFound:
                return ServiceError.notFound
            case .unauthorized:
                return ServiceError.unauthorized
            case .invalidData(let message):
                return ServiceError.invalidData(message)
            case .decodingError(let message):
                return ServiceError.decodingError(message)
            case .firestoreError(let innerError):
                return ServiceError.networkError(innerError)
            case .encodingError(let message):
                return ServiceError.invalidData(message)
            case .unsupportedOperation:
                return ServiceError.invalidData("This operation is not supported")
            case .networkError(let innerError):
                return ServiceError.networkError(innerError)
            }
        }
        return ServiceError.networkError(error)
    }
}
