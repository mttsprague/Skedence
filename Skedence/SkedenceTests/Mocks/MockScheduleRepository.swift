//
//  MockScheduleRepository.swift
//  SkedenceTests
//
//  Phase 7: Mock repository for testing ScheduleService
//

import Foundation
@testable import Skedence

@MainActor
final class MockScheduleRepository: ScheduleRepository {
    
    // MARK: - Mock Data Storage
    
    private var mockSlots: [AvailabilitySlot] = []
    private var shouldFail = false
    private var failureError: RepositoryError = .networkError(NSError(domain: "TestError", code: 1))
    
    // MARK: - Configuration Methods
    
    func setMockSlots(_ slots: [AvailabilitySlot]) {
        self.mockSlots = slots
    }
    
    func setShouldFail(_ shouldFail: Bool, withError error: RepositoryError? = nil) {
        self.shouldFail = shouldFail
        if let error = error {
            self.failureError = error
        }
    }
    
    func reset() {
        mockSlots = []
        shouldFail = false
    }
    
    // MARK: - ScheduleRepository Methods
    
    func fetchUpcomingSlots(orgId: String, limit: Int) async throws -> [AvailabilitySlot] {
        if shouldFail {
            throw failureError
        }
        
        let now = Date()
        let upcoming = mockSlots
            .filter { ($0.startTime ?? Date()) > now }
            .sorted { ($0.startTime ?? Date()) < ($1.startTime ?? Date()) }
        
        return Array(upcoming.prefix(limit))
    }
    
    func fetchInRange(from startDate: Date, to endDate: Date, trainerId: String?, orgId: String) async throws -> [AvailabilitySlot] {
        if shouldFail {
            throw failureError
        }
        
        return mockSlots.filter { slot in
            guard let slotStart = slot.startTime else { return false }
            let inRange = slotStart >= startDate && slotStart < endDate
            
            if let trainerId = trainerId {
                return inRange && slot.trainerId == trainerId
            }
            return inRange
        }
    }
    
    func createSlot(_ slot: AvailabilitySlot, orgId: String) async throws -> String {
        if shouldFail {
            throw failureError
        }
        mockSlots.append(slot)
        return slot.id ?? UUID().uuidString
    }
    
    func deleteSlot(id: String, orgId: String) async throws {
        if shouldFail {
            throw failureError
        }
        mockSlots.removeAll { $0.id == id }
    }
}
