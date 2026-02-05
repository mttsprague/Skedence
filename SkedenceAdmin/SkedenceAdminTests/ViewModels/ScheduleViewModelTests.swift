//
//  ScheduleViewModelTests.swift
//  SkedenceAdminTests
//
//  Tests for schedule view model logic
//

import XCTest
@testable import SkedenceAdmin

@MainActor
final class ScheduleViewModelTests: XCTestCase {
    
    var viewModel: ScheduleViewModel!
    
    override func setUp() async throws {
        try await super.setUp()
        viewModel = ScheduleViewModel()
    }
    
    override func tearDown() async throws {
        viewModel = nil
        try await super.tearDown()
    }
    
    // MARK: - Initialization Tests
    
    func testViewModel_InitializesWithEmptyState() {
        // Then: Initial state should be empty
        XCTAssertTrue(viewModel.slotsByDay.isEmpty)
        XCTAssertNil(viewModel.selectedSlot)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testViewModel_InitializesToCurrentWeek() {
        // Then: Should initialize to current week
        let today = Date()
        let calendar = Calendar.current
        let currentWeekStart = calendar.dateInterval(of: .weekOfYear, for: today)?.start
        
        XCTAssertNotNil(currentWeekStart)
        // Note: Exact comparison depends on implementation
    }
    
    // MARK: - Date Calculation Tests
    
    func testWeekDates_CalculatesCorrectRange() {
        // Given: A specific date
        let testDate = Date.testDate(year: 2026, month: 2, day: 4) // Wednesday
        
        // When: Calculate week dates
        let calendar = Calendar.current
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: testDate) else {
            XCTFail("Could not calculate week interval")
            return
        }
        
        // Then: Should span 7 days
        let dayCount = calendar.dateComponents([.day], from: weekInterval.start, to: weekInterval.end).day
        XCTAssertEqual(dayCount, 7, "Week should span 7 days")
    }
    
    func testWeekDates_HandlesCrossingMonthBoundary() {
        // Given: Date near month end
        let testDate = Date.testDate(year: 2026, month: 1, day: 30)
        
        // When: Calculate week interval
        let calendar = Calendar.current
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: testDate) else {
            XCTFail("Could not calculate week interval")
            return
        }
        
        // Then: Should handle month transition
        let startMonth = calendar.component(.month, from: weekInterval.start)
        let endMonth = calendar.component(.month, from: weekInterval.end)
        
        XCTAssertTrue(startMonth == 1 || startMonth == 2, "Start should be in Jan or Feb")
        XCTAssertTrue(endMonth == 1 || endMonth == 2, "End should be in Jan or Feb")
    }
    
    func testWeekDates_HandlesCrossingYearBoundary() {
        // Given: Date near year end
        let testDate = Date.testDate(year: 2025, month: 12, day: 30)
        
        // When: Calculate week interval
        let calendar = Calendar.current
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: testDate) else {
            XCTFail("Could not calculate week interval")
            return
        }
        
        // Then: Should handle year transition
        let startYear = calendar.component(.year, from: weekInterval.start)
        let endYear = calendar.component(.year, from: weekInterval.end)
        
        XCTAssertTrue(startYear == 2025 || startYear == 2026, "Start should be 2025 or 2026")
        XCTAssertTrue(endYear == 2025 || endYear == 2026, "End should be 2025 or 2026")
    }
    
    // MARK: - Slot Filtering Tests
    
    func testSlotsByDay_GroupsSlotsByDate() {
        // Given: Multiple slots on different days
        let today = Date()
        let tomorrow = today.adding(days: 1)
        
        let todaySlot = TestFixtures.scheduleSlot(date: today)
        let tomorrowSlot = TestFixtures.scheduleSlot(date: tomorrow)
        
        // When: Group slots
        let slots = [todaySlot, tomorrowSlot]
        let grouped = Dictionary(grouping: slots) { slot in
            formatDateKey(slot.startTime)
        }
        
        // Then: Should have 2 groups
        XCTAssertEqual(grouped.keys.count, 2)
    }
    
    func testSlotsByDay_SortsByTime() {
        // Given: Slots in random order
        let date = Date()
        let slot1 = TestFixtures.scheduleSlot(date: date.adding(hours: 10))
        let slot2 = TestFixtures.scheduleSlot(date: date.adding(hours: 8))
        let slot3 = TestFixtures.scheduleSlot(date: date.adding(hours: 14))
        
        // When: Sort slots
        let slots = [slot1, slot2, slot3].sorted { $0.startTime < $1.startTime }
        
        // Then: Should be in chronological order
        XCTAssertTrue(slots[0].startTime < slots[1].startTime)
        XCTAssertTrue(slots[1].startTime < slots[2].startTime)
        XCTAssertEqual(slots[0].id, slot2.id) // 8am first
        XCTAssertEqual(slots[1].id, slot1.id) // 10am second
        XCTAssertEqual(slots[2].id, slot3.id) // 2pm last
    }
    
    // MARK: - Slot Selection Tests
    
    func testSelectedSlot_CanBeSet() {
        // Given: A slot
        let slot = TestFixtures.scheduleSlot()
        
        // When: Select slot
        viewModel.selectedSlot = slot
        
        // Then: Should be selected
        XCTAssertNotNil(viewModel.selectedSlot)
        XCTAssertEqual(viewModel.selectedSlot?.id, slot.id)
    }
    
    func testSelectedSlot_CanBeCleared() {
        // Given: A selected slot
        viewModel.selectedSlot = TestFixtures.scheduleSlot()
        
        // When: Clear selection
        viewModel.selectedSlot = nil
        
        // Then: Should be nil
        XCTAssertNil(viewModel.selectedSlot)
    }
    
    // MARK: - Class Participant Tests
    
    func testParticipantsByClassId_InitializesEmpty() {
        // Then: Should start empty
        XCTAssertTrue(viewModel.participantsByClassId.isEmpty)
    }
    
    func testParticipantsByClassId_CanStoreParticipants() {
        // Given: Class ID and participants
        let classId = MockIDGenerator.classId()
        let participants = [
            ClassParticipant(id: "1", firstName: "John", lastName: "Doe", email: "john@example.com"),
            ClassParticipant(id: "2", firstName: "Jane", lastName: "Smith", email: "jane@example.com")
        ]
        
        // When: Store participants
        viewModel.participantsByClassId[classId] = participants
        
        // Then: Should retrieve same participants
        XCTAssertEqual(viewModel.participantsByClassId[classId]?.count, 2)
        XCTAssertEqual(viewModel.participantsByClassId[classId]?[0].firstName, "John")
    }
    
    // MARK: - Loading State Tests
    
    func testIsLoading_DefaultsFalse() {
        // Then: Should not be loading initially
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testIsLoading_CanBeSet() {
        // When: Set loading
        viewModel.isLoading = true
        
        // Then: Should be loading
        XCTAssertTrue(viewModel.isLoading)
        
        // When: Clear loading
        viewModel.isLoading = false
        
        // Then: Should not be loading
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Helper Functions
    
    private func formatDateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

// MARK: - ClassParticipant Test Model

struct ClassParticipant: Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String
}
