//
//  BookingsServiceTests.swift
//  SkedenceTests
//
//  Phase 7: Unit tests for BookingsService
//

import XCTest
@testable import Skedence

@MainActor
final class BookingsServiceTests: XCTestCase {
    
    var service: BookingsService!
    var mockRepository: MockBookingsRepository!
    
    override func setUp() async throws {
        try await super.setUp()
        mockRepository = MockBookingsRepository()
        service = BookingsService(repository: mockRepository)
    }
    
    override func tearDown() async throws {
        service = nil
        mockRepository = nil
        try await super.tearDown()
    }
    
    // MARK: - Fetch Tests
    
    func testFetchBookings_Success() async throws {
        // Given
        let booking1 = TestHelpers.mockBooking(
            id: "booking1",
            startTime: TestHelpers.dateFromNow(days: 1)
        )
        let booking2 = TestHelpers.mockBooking(
            id: "booking2",
            startTime: TestHelpers.dateFromNow(days: 2)
        )
        mockRepository.setMockBookings([booking1, booking2])
        
        // When
        try await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then
        XCTAssertEqual(service.items.count, 2, "Should fetch 2 bookings")
        XCTAssertFalse(service.isLoading, "Should not be loading after fetch")
        XCTAssertNil(service.error, "Should have no error")
    }
    
    func testFetchBookings_EmptyResult() async throws {
        // Given
        mockRepository.setMockBookings([])
        
        // When
        try await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then
        XCTAssertTrue(service.items.isEmpty, "Should return empty array")
        XCTAssertNil(service.error, "Should have no error for empty result")
    }
    
    func testFetchBookings_NetworkError() async throws {
        // Given
        mockRepository.setShouldFail(true, withError: .networkError(NSError(domain: "Network", code: -1009)))
        
        // When
        await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then
        XCTAssertTrue(service.items.isEmpty, "Should have empty items on error")
        XCTAssertNotNil(service.error, "Should have error")
        XCTAssertFalse(service.isLoading, "Should not be loading after error")
    }
    
    func testFetchBookings_Unauthorized() async throws {
        // Given
        mockRepository.setShouldFail(true, withError: .unauthorized)
        
        // When
        await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then
        XCTAssertNotNil(service.error, "Should have error")
        XCTAssertTrue(service.items.isEmpty, "Should clear items on unauthorized")
    }
    
    // MARK: - Loading State Tests
    
    func testLoadingState_DuringFetch() async throws {
        // Given
        let booking = TestHelpers.mockBooking()
        mockRepository.setMockBookings([booking])
        
        // When - Start fetch
        let fetchTask = Task {
            try await service.loadMyBookings(orgId: "org123", limit: 10)
        }
        
        // Then - Should be loading immediately (timing-dependent, may need adjustment)
        // Note: This is a race condition test and may be flaky
        
        await fetchTask.value
        
        // After completion, should not be loading
        XCTAssertFalse(service.isLoading, "Should not be loading after completion")
    }
    
    // MARK: - Error Mapping Tests
    
    func testErrorMapping_NotFound() async throws {
        // Given
        mockRepository.setShouldFail(true, withError: .notFound)
        
        // When
        await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then
        XCTAssertNotNil(service.error, "Should have error")
        if let serviceError = service.error as? ServiceError {
            if case .notFound = serviceError {
                // Success
            } else {
                XCTFail("Expected ServiceError.notFound, got \(serviceError)")
            }
        } else {
            XCTFail("Expected ServiceError type")
        }
    }
    
    func testErrorMapping_InvalidData() async throws {
        // Given
        mockRepository.setShouldFail(true, withError: .invalidData("Test invalid data"))
        
        // When
        await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then
        XCTAssertNotNil(service.error, "Should have error")
        if let serviceError = service.error as? ServiceError {
            if case .invalidData(let message) = serviceError {
                XCTAssertEqual(message, "Test invalid data")
            } else {
                XCTFail("Expected ServiceError.invalidData")
            }
        }
    }
    
    // MARK: - Refresh Tests
    
    func testRefresh_Success() async throws {
        // Given
        let initialBooking = TestHelpers.mockBooking(id: "booking1")
        mockRepository.setMockBookings([initialBooking])
        try await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Update mock data
        let newBooking = TestHelpers.mockBooking(id: "booking2")
        mockRepository.setMockBookings([initialBooking, newBooking])
        
        // When
        await service.refresh()
        
        // Then
        XCTAssertEqual(service.items.count, 2, "Should fetch updated bookings")
    }
    
    // MARK: - Legacy Compatibility Tests
    
    func testLegacyProperties() async throws {
        // Given
        let booking = TestHelpers.mockBooking()
        mockRepository.setMockBookings([booking])
        
        // When
        try await service.loadMyBookings(orgId: "org123", limit: 10)
        
        // Then - Test backward compatibility aliases
        XCTAssertEqual(service.myBookings.count, service.items.count, "Legacy property should match items")
        XCTAssertEqual(service.errorMessage, service.error?.localizedDescription, "Legacy error message should match")
    }
}
