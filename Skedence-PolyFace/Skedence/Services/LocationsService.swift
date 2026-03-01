//
//  LocationsService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine
import FirebaseFirestore

@MainActor
final class LocationsService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [Location] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var locations: [Location] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: LocationsRepository
    private var currentOrgId: String?
    
    init(repository: LocationsRepository = LocationsRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch locations for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        loadLocations(orgId: orgId)
    }
    
    /// Refresh locations without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load locations with real-time listener (maintains backward compatibility)
    func loadLocations(orgId: String) {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        repository.stopListening()
        let _ = repository.startListening(orgId: orgId) { [weak self] locations in
            guard let self = self else { return }
            
            self.isLoading = false
            self.items = locations
        }
    }
    
    // MARK: - Mutation Methods
    
    /// Add a new location
    func addLocation(_ location: Location) async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        
        do {
            let _ = try await repository.create(location, orgId: orgId)
            print("✅ Location added successfully")
        } catch {
            throw mapRepositoryError(error)
        }
    }
    
    /// Update an existing location
    func updateLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw ServiceError.invalidData("Location ID is required")
        }
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        
        do {
            var updateData: [String: Any] = [
                "name": location.name,
                "addressLine1": location.addressLine1,
                "city": location.city,
                "state": location.state,
                "zipCode": location.zipCode,
                "isActive": location.isActive
            ]
            
            // Handle optional addressLine2: delete field when nil/empty, set value when present
            if let line2 = location.addressLine2, !line2.isEmpty {
                updateData["addressLine2"] = line2
            } else {
                updateData["addressLine2"] = FieldValue.delete()
            }
            
            try await repository.update(id: id, data: updateData, orgId: orgId)
            print("✅ Location updated successfully")
        } catch {
            throw mapRepositoryError(error)
        }
    }
    
    /// Soft delete a location (marks as inactive)
    func deleteLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw ServiceError.invalidData("Location ID is required")
        }
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        
        do {
            try await repository.delete(id: id, orgId: orgId)
            print("✅ Location deleted successfully")
        } catch {
            throw mapRepositoryError(error)
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
