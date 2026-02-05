//
//  SettingsService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine

@MainActor
final class SettingsService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published var settings: OrgSettings? // Single item, not array
    @Published var isLoading = false
    @Published var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: SettingsRepository
    private var currentOrgId: String?
    
    init(repository: SettingsRepository = SettingsRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch settings for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        try await loadSettingsInternal(orgId: orgId)
    }
    
    /// Refresh settings without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load settings for an organization (maintains backward compatibility)
    func loadSettings(orgId: String) async {
        do {
            try await loadSettingsInternal(orgId: orgId)
        } catch {
            // Error already set in internal method
        }
    }
    
    // MARK: - Internal Implementation
    
    private func loadSettingsInternal(orgId: String) async throws {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            settings = try await repository.fetchById(id: orgId, orgId: orgId)
        } catch {
            self.error = mapRepositoryError(error)
            // Use default settings on error
            settings = OrgSettings(orgId: orgId)
            throw self.error!
        }
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
    
    /// Helper to check if a slot is within booking window
    func isWithinBookingWindow(_ slotStartTime: Date, settings: OrgSettings?) -> Bool {
        guard let settings = settings else { return true } // Allow booking if no settings
        let hoursUntilLesson = slotStartTime.timeIntervalSinceNow / 3600
        return hoursUntilLesson >= Double(settings.minBookingHours)
    }
    
    // Helper to check if a booking is within cancellation window
    func isWithinCancellationWindow(_ lessonStartTime: Date, settings: OrgSettings?) -> Bool {
        guard let settings = settings else { return false } // Allow cancellation if no settings
        let hoursUntilLesson = lessonStartTime.timeIntervalSinceNow / 3600
        return hoursUntilLesson <= Double(settings.minCancellationHours)
    }
    
    // Helper to check if waiver is required and whether user has signed it
    func checkWaiverRequirement(userId: String, settings: OrgSettings?) async throws -> (required: Bool, signed: Bool) {
        guard let settings = settings, settings.requireWaiver else {
            // Waiver not required for this organization
            return (required: false, signed: true)
        }
        
        // Check if user has signed waiver
        let hasSigned = try await DocumentsService.shared.hasSignedWaiver(userId: userId)
        return (required: true, signed: hasSigned)
    }
}

