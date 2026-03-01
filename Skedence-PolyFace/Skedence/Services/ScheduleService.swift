//
//  ScheduleService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine
import FirebaseFirestore

@MainActor
final class ScheduleService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [AvailabilitySlot] = [] // Default to upcoming
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Additional Published State (domain-specific)
    
    @Published private(set) var daySlots: [AvailabilitySlot] = []
    @Published private(set) var isLoadingDay = false
    
    @Published private(set) var monthAvailability: [Date: Int] = [:]
    @Published private(set) var isLoadingMonth = false
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var upcoming: [AvailabilitySlot] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: ScheduleRepository
    private var currentOrgId: String?
    
    init(repository: ScheduleRepository = ScheduleRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch upcoming slots for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        try await loadUpcomingInternal(orgId: orgId, limit: 20)
    }
    
    /// Refresh upcoming slots without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load upcoming open slots (maintains backward compatibility)
    func loadUpcoming(orgId: String, limit: Int = 20) async {
        do {
            try await loadUpcomingInternal(orgId: orgId, limit: limit)
        } catch {
            // Error already set in internal method
        }
    }
    
    /// Load open slots for a specific trainer on a specific day
    func loadOpenSlots(for trainerId: String, on date: Date, orgId: String) async {
        isLoadingDay = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoadingDay = false }
        
        let cal = Calendar.current
        let startOfDay = cal.startOfDay(for: date)
        let endOfDay = cal.date(byAdding: .day, value: 1, to: startOfDay)!
        
        do {
            let allSlots = try await repository.fetchInRange(
                from: startOfDay,
                to: endOfDay,
                trainerId: trainerId,
                orgId: orgId
            )
            daySlots = allSlots.filter { $0.status == "open" }
        } catch {
            self.error = mapRepositoryError(error)
            print("ScheduleService: failed to load day slots: \(error)")
            daySlots = []
        }
    }
    
    /// Load availability counts (dots) for a month for a specific trainer
    func loadMonthAvailability(for trainerId: String, monthStart: Date, orgId: String) async {
        isLoadingMonth = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoadingMonth = false }
        
        let cal = Calendar.current
        let start = cal.date(from: cal.dateComponents([.year, .month], from: monthStart)) ?? cal.startOfDay(for: monthStart)
        let monthEnd = cal.date(byAdding: DateComponents(month: 1), to: start)!
        
        do {
            let allSlots = try await repository.fetchInRange(
                from: start,
                to: monthEnd,
                trainerId: trainerId,
                orgId: orgId
            )
            
            let openSlots = allSlots.filter { $0.status == "open" }
            
            var counts: [Date: Int] = [:]
            for slot in openSlots {
                let dayKey = cal.startOfDay(for: slot.startTime)
                counts[dayKey, default: 0] += 1
            }
            monthAvailability = counts
        } catch {
            self.error = mapRepositoryError(error)
            print("ScheduleService: failed to load month availability: \(error)")
            monthAvailability = [:]
        }
    }
    
    /// Clear state when user is logged out
    func clearForLogout() {
        items = []
        daySlots = []
        monthAvailability = [:]
        error = nil
        isLoading = false
        isLoadingDay = false
        isLoadingMonth = false
    }
    
    // MARK: - Internal Implementation
    
    private func loadUpcomingInternal(orgId: String, limit: Int) async throws {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            items = try await repository.fetchUpcomingSlots(orgId: orgId, limit: limit)
        } catch {
            self.error = mapRepositoryError(error)
            print("ScheduleService: failed to load upcoming slots: \(error)")
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

