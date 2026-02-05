//
//  PricingStructureService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import SwiftUI
import Combine

@MainActor
class PricingStructureService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published var pricingStructure: PricingStructure? // Single item, not array
    @Published var isLoading = false
    @Published var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Legacy error message accessor
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: PricingRepository
    private var currentOrgId: String?
    
    init(repository: PricingRepository = PricingRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch pricing structure for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        try await loadPricingStructureInternal(for: orgId)
    }
    
    /// Refresh pricing structure without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load pricing structure for an organization (maintains backward compatibility)
    func loadPricingStructure(for orgId: String) async {
        do {
            try await loadPricingStructureInternal(for: orgId)
        } catch {
            // Error already set in internal method
        }
    }
    
    // MARK: - Internal Implementation
    
    private func loadPricingStructureInternal(for orgId: String) async throws {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            pricingStructure = try await repository.fetchById(id: orgId, orgId: orgId)
        } catch {
            self.error = mapRepositoryError(error)
            // Return empty structure on error
            pricingStructure = PricingStructure(tiers: [], lastUpdated: Date())
            throw self.error!
        }
    }
    
    // MARK: - Domain-Specific Methods
    
    /// Save pricing structure for an organization
    func savePricingStructure(_ structure: PricingStructure, for orgId: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await repository.savePricingStructure(structure, orgId: orgId)
            
            // Update local state
            pricingStructure = structure
            
        } catch {
            self.error = mapRepositoryError(error)
            throw self.error!
        }
        
        isLoading = false
    }
    
    // MARK: - Helper Methods
    
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
    
    // MARK: - Computed Properties
    
    /// Get all package options across all tiers (for dropdowns)
    var allPackageOptions: [PackageOption] {
        pricingStructure?.allPackages ?? []
    }
    
    /// Get package titles for picker
    var packageTitles: [String] {
        allPackageOptions.map { $0.title }
    }
    
    /// Find package by title
    func package(withTitle title: String) -> PackageOption? {
        pricingStructure?.package(withTitle: title)
    }
}
