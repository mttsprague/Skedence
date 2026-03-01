//
//  ScheduleServiceTests.swift
//  SkedenceTests
//
//  Phase 7: Unit tests for ScheduleService
//

import XCTest
@testable import Skedence

@MainActor
final class ScheduleServiceTests: XCTestCase {
    
    var service: ScheduleService!
    var mockRepository: MockScheduleRepository!
    
    override func setUp() async throws {
        try await super.setUp()
        mockRepository = MockScheduleRepository()
        service = ScheduleService(repository: mockRepository)
    }
    
    override func tearDown() async throws {
        service = nil
        mockRepository = nil
        try await super.tearDown()
    }
    
    // MARK: - Upcoming Slots Tests
    
    func testLoadUpcoming_Success() async throws {
        // Given
        let futureSlot1 = TestHelpers.mockSlot(
            id: "slot1",
            startTime: TestHelpers.dateFromNow(days: 1),
            status: "open"
        )
        let futureSlot2 = TestHelpers.mockSlot(
            id: "slot2",
            startTime: TestHelpers.dateFromNow(days: 2),
            status: "open"
        )
        mockRepository.setMockSlots([futureSlot1, futureSlot2])
        
        // When
        await service.loadUpcoming(orgId: "org123", limit: 20)
        
        // Then
        XCTAssertEqual(service.items.count, 2, "Should fetch 2 upcoming slots")
        XCTAssertFalse(service.isLoading, "Should not be loading after fetch")
        XCTAssertNil(service.error, "Should have no error")
    }
    
    func testLoadUpcoming_FiltersOutPastSlots() async throws {
        // Given
        let pastSlot = TestHelpers.mockSlot(
            id: "past",
            startTime: TestHelpers.dateFromNow(days: -1)
        )
        let futureSlot = TestHelpers.mockSlot(
            id: "future",
            startTime: TestHelpers.dateFromNow(days: 1)
        )
        mockRepository.setMockSlots([pastSlot, futureSlot])
        
        // When
        await service.loadUpcoming(orgId: "org123", limit: 20)
        
        // Then
        XCTAssertEqual(service.items.count, 1, "Should only return future slots")
        XCTAssertEqual(service.items.first?.id, "future", "Should return the future slot")
    }
    
    func testLoadUpcoming_SortsByDate() async throws {
        // Given
        let slot1 = TestHelpers.mockSlot(
            id: "slot1",
            startTime: TestHelpers.dateFromNow(days: 3)
        )
        let slot2 = TestHelpers.mockSlot(
            id: "slot2",
            startTime: TestHelpers.dateFromNow(days: 1)
        )
        let slot3 = TestHelpers.mockSlot(
            id: "slot3",
            startTime: TestHelpers.dateFromNow(days: 2)
        )
        mockRepository.setMockSlots([slot1, slot2, slot3])
        
        // When
        await service.loadUpcoming(orgId: "org123", limit: 20)
        
        // Then
        XCTAssertEqual(service.items.count, 3)
        XCTAssertEqual(service.items[0].id, "slot2", "First slot should be earliest")
        XCTAssertEqual(service.items[1].id, "slot3", "Second slot should be middle")
        XCTAssertEqual(service.items[2].id, "slot1", "Third slot should be latest")
    }
    
    func testLoadUpcoming_RespectsLimit() async throws {
        // Given
        let slots = (1...5).map { i in
            TestHelpers.mockSlot(
                id: "slot\(i)",
                startTime: TestHelpers.dateFromNow(days: i)
            )
        }
        mockRepository.setMockSlots(slots)
        
        // When
        await service.loadUpcoming(orgId: "org123", limit: 3)
        
        // Then
        XCTAssertEqual(service.items.count, 3, "Should respect limit parameter")
    }
    
    // MARK: - Day Slots Tests
    
    func testLoadOpenSlots_ForSpecificDay() async throws {
        // Given
        let targetDate = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10)
        let sameDaySlot = TestHelpers.mockSlot(
            id: "sameDay",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 15, hour: 14),
            status: "open"
        )
        let differentDaySlot = TestHelpers.mockSlot(
            id: "differentDay",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 16, hour: 10),
            status: "open"
        )
        mockRepository.setMockSlots([sameDaySlot, differentDaySlot])
        
        // When
        await service.loadOpenSlots(for: "trainer123", on: targetDate, orgId: "org123")
        
        // Then
        XCTAssertEqual(service.daySlots.count, 1, "Should only return slots for the specific day")
        XCTAssertEqual(service.daySlots.first?.id, "sameDay")
        XCTAssertFalse(service.isLoadingDay, "Should not be loading after fetch")
    }
    
    func testLoadOpenSlots_FiltersOpenStatus() async throws {
        // Given
        let targetDate = TestHelpers.date(year: 2026, month: 3, day: 15)
        let openSlot = TestHelpers.mockSlot(
            id: "open",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10),
            status: "open"
        )
        let bookedSlot = TestHelpers.mockSlot(
            id: "booked",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 15, hour: 14),
            status: "booked"
        )
        mockRepository.setMockSlots([openSlot, bookedSlot])
        
        // When
        await service.loadOpenSlots(for: "trainer123", on: targetDate, orgId: "org123")
        
        // Then
        XCTAssertEqual(service.daySlots.count, 1, "Should only return open slots")
        XCTAssertEqual(service.daySlots.first?.status, "open")
    }
    
    // MARK: - Month Availability Tests
    
    func testLoadMonthAvailability_CountsSlotsByDay() async throws {
        // Given
        let monthStart = TestHelpers.date(year: 2026, month: 3, day: 1)
        let day1Slot1 = TestHelpers.mockSlot(
            id: "d1s1",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 1, hour: 10),
            status: "open"
        )
        let day1Slot2 = TestHelpers.mockSlot(
            id: "d1s2",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 1, hour: 14),
            status: "open"
        )
        let day2Slot = TestHelpers.mockSlot(
            id: "d2s1",
            trainerId: "trainer123",
            startTime: TestHelpers.date(year: 2026, month: 3, day: 2, hour: 10),
            status: "open"
        )
        mockRepository.setMockSlots([day1Slot1, day1Slot2, day2Slot])
        
        // When
        await service.loadMonthAvailability(for: "trainer123", monthStart: monthStart, orgId: "org123")
        
        // Then
        XCTAssertEqual(service.monthAvailability.count, 2, "Should have counts for 2 days")
        
        let day1Key = Calendar.current.startOfDay(for: TestHelpers.date(year: 2026, month: 3, day: 1))
        let day2Key = Calendar.current.startOfDay(for: TestHelpers.date(year: 2026, month: 3, day: 2))
        
        XCTAssertEqual(service.monthAvailability[day1Key], 2, "Should have 2 slots on day 1")
        XCTAssertEqual(service.monthAvailability[day2Key], 1, "Should have 1 slot on day 2")
        XCTAssertFalse(service.isLoadingMonth, "Should not be loading after fetch")
    }
    
    // MARK: - Error Handling Tests
    
    func testLoadUpcoming_HandlesError() async throws {
        // Given
        mockRepository.setShouldFail(true, withError: .networkError(NSError(domain: "Network", code: -1009)))
        
        // When
        await service.loadUpcoming(orgId: "org123", limit: 20)
        
        // Then
        XCTAssertTrue(service.items.isEmpty, "Should have empty items on error")
        XCTAssertNotNil(service.error, "Should have error")
        XCTAssertFalse(service.isLoading, "Should not be loading after error")
    }
    
    // MARK: - Clear State Tests
    
    func testClearForLogout() async throws {
        // Given
        let slot = TestHelpers.mockSlot()
        mockRepository.setMockSlots([slot])
        await service.loadUpcoming(orgId: "org123", limit: 20)
        
        // When
        service.clearForLogout()
        
        // Then
        XCTAssertTrue(service.items.isEmpty, "Should clear items")
        XCTAssertTrue(service.daySlots.isEmpty, "Should clear day slots")
        XCTAssertTrue(service.monthAvailability.isEmpty, "Should clear month availability")
        XCTAssertNil(service.error, "Should clear error")
        XCTAssertFalse(service.isLoading, "Should not be loading")
    }
}
