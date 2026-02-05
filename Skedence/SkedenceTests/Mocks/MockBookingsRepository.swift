//
//  MockBookingsRepository.swift
//  SkedenceTests
//
//  Phase 7: Mock repository for testing BookingsService
//

import Foundation
@testable import Skedence

@MainActor
final class MockBookingsRepository: BookingsRepository {
    
    // MARK: - Mock Data Storage
    
    private var mockBookings: [Booking] = []
    private var shouldFail = false
    private var failureError: RepositoryError = .networkError(NSError(domain: "TestError", code: 1))
    
    // MARK: - Configuration Methods
    
    func setMockBookings(_ bookings: [Booking]) {
        self.mockBookings = bookings
    }
    
    func setShouldFail(_ shouldFail: Bool, withError error: RepositoryError? = nil) {
        self.shouldFail = shouldFail
        if let error = error {
            self.failureError = error
        }
    }
    
    func reset() {
        mockBookings = []
        shouldFail = false
    }
    
    // MARK: - RepositoryProtocol Methods
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int, orgId: String) async throws -> [Booking] {
        if shouldFail {
            throw failureError
        }
        
        // Simulate ordering
        var sorted = mockBookings
        if field == "startTime" {
            sorted.sort { descending ? $0.startTime > $1.startTime : $0.startTime < $1.startTime }
        }
        
        return Array(sorted.prefix(limit))
    }
    
    func fetchById(_ id: String, orgId: String) async throws -> Booking? {
        if shouldFail {
            throw failureError
        }
        return mockBookings.first { $0.id == id }
    }
    
    func create(_ item: Booking, orgId: String) async throws -> String {
        if shouldFail {
            throw failureError
        }
        mockBookings.append(item)
        return item.id ?? UUID().uuidString
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        if shouldFail {
            throw failureError
        }
        
        guard let index = mockBookings.firstIndex(where: { $0.id == id }) else {
            throw RepositoryError.notFound
        }
        
        // Update mock booking with new data
        var booking = mockBookings[index]
        if let status = data["status"] as? String {
            booking = Booking(
                id: booking.id,
                userId: booking.userId,
                trainerId: booking.trainerId,
                trainerName: booking.trainerName,
                packageId: booking.packageId,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: status,
                createdAt: booking.createdAt,
                orgId: booking.orgId,
                athleteId: booking.athleteId
            )
        }
        mockBookings[index] = booking
    }
    
    func delete(_ id: String, orgId: String) async throws {
        if shouldFail {
            throw failureError
        }
        mockBookings.removeAll { $0.id == id }
    }
    
    func startListening(orgId: String, onUpdate: @escaping ([Booking]) -> Void) throws {
        // Not implemented for mock - real-time updates not needed in tests
        onUpdate(mockBookings)
    }
    
    func stopListening() {
        // Not implemented for mock
    }
}
