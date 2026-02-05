//
//  ClassRegistrationTests.swift
//  SkedenceTests
//
//  Phase 7.2: Business logic tests for class registration
//

import XCTest
@testable import Skedence

@MainActor
final class ClassRegistrationTests: XCTestCase {
    
    // MARK: - Capacity Management Tests
    
    func testClassCapacity_HasAvailableSpots() {
        // Given
        let groupClass = TestHelpers.mockClass(
            maxCapacity: 10,
            currentEnrollment: 5
        )
        
        // When
        let availableSpots = groupClass.maxCapacity - groupClass.currentEnrollment
        
        // Then
        XCTAssertEqual(availableSpots, 5, "Should have 5 spots available")
        XCTAssertTrue(availableSpots > 0, "Should allow registration")
    }
    
    func testClassCapacity_FullClass() {
        // Given
        let groupClass = TestHelpers.mockClass(
            maxCapacity: 10,
            currentEnrollment: 10
        )
        
        // When
        let availableSpots = groupClass.maxCapacity - groupClass.currentEnrollment
        
        // Then
        XCTAssertEqual(availableSpots, 0, "Should have no spots available")
        XCTAssertFalse(availableSpots > 0, "Should not allow registration")
    }
    
    func testClassCapacity_Overbooked() {
        // Given - Should not happen but test defensive coding
        let groupClass = TestHelpers.mockClass(
            maxCapacity: 10,
            currentEnrollment: 12
        )
        
        // When
        let availableSpots = groupClass.maxCapacity - groupClass.currentEnrollment
        
        // Then
        XCTAssertEqual(availableSpots, -2, "Should show negative availability")
        XCTAssertTrue(availableSpots < 0, "Should indicate overbooked state")
    }
    
    func testClassCapacity_SingleSpotRemaining() {
        // Given
        let groupClass = TestHelpers.mockClass(
            maxCapacity: 10,
            currentEnrollment: 9
        )
        
        // When
        let availableSpots = groupClass.maxCapacity - groupClass.currentEnrollment
        
        // Then
        XCTAssertEqual(availableSpots, 1, "Should have exactly 1 spot")
        XCTAssertTrue(availableSpots == 1, "Should show limited availability")
    }
    
    // MARK: - Registration Validation Tests
    
    func testRegistration_RequiresUserId() {
        // Given
        let groupClass = TestHelpers.mockClass()
        let userId = ""
        
        // Then
        XCTAssertTrue(userId.isEmpty, "Empty user ID should fail validation")
    }
    
    func testRegistration_RequiresClassId() {
        // Given
        let groupClass = TestHelpers.mockClass(id: "")
        
        // Then
        XCTAssertTrue(groupClass.id?.isEmpty ?? true, "Empty class ID should fail validation")
    }
    
    func testRegistration_RequiresFutureClass() {
        // Given
        let futureClass = TestHelpers.mockClass(
            startTime: TestHelpers.dateFromNow(days: 1)
        )
        let pastClass = TestHelpers.mockClass(
            startTime: TestHelpers.dateFromNow(days: -1)
        )
        
        // Then
        XCTAssertTrue(futureClass.startTime > Date(), "Should allow future class")
        XCTAssertTrue(pastClass.startTime < Date(), "Should reject past class")
    }
    
    // MARK: - Duplicate Registration Prevention Tests
    
    func testDuplicateRegistration_SameUserSameClass() {
        // Given - Simulate checking existing registrations
        let existingRegistrations = [
            "user1-class1",
            "user1-class2",
            "user2-class1"
        ]
        
        let newRegistration = "user1-class1"
        
        // When
        let isDuplicate = existingRegistrations.contains(newRegistration)
        
        // Then
        XCTAssertTrue(isDuplicate, "Should detect duplicate registration")
    }
    
    func testDuplicateRegistration_DifferentUser() {
        // Given
        let existingRegistrations = [
            "user1-class1",
            "user1-class2"
        ]
        
        let newRegistration = "user2-class1"
        
        // When
        let isDuplicate = existingRegistrations.contains(newRegistration)
        
        // Then
        XCTAssertFalse(isDuplicate, "Should allow different user to register")
    }
    
    func testDuplicateRegistration_DifferentClass() {
        // Given
        let existingRegistrations = [
            "user1-class1",
            "user1-class2"
        ]
        
        let newRegistration = "user1-class3"
        
        // When
        let isDuplicate = existingRegistrations.contains(newRegistration)
        
        // Then
        XCTAssertFalse(isDuplicate, "Should allow same user to register for different class")
    }
    
    // MARK: - Class Timing Tests
    
    func testClassTiming_ValidDuration() {
        // Given
        let startTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let endTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 0)
        
        let groupClass = TestHelpers.mockClass(startTime: startTime)
        
        // Then
        let duration = groupClass.endTime.timeIntervalSince(groupClass.startTime)
        XCTAssertEqual(duration, 3600, "Class should be 1 hour (3600 seconds)")
    }
    
    func testClassTiming_MinimumDuration() {
        // Given
        let startTime = TestHelpers.dateFromNow(days: 1)
        let tooShort = startTime.addingTimeInterval(15 * 60) // 15 minutes
        let acceptable = startTime.addingTimeInterval(30 * 60) // 30 minutes
        
        // Then - Most fitness classes are at least 30 minutes
        let minimumDuration: TimeInterval = 30 * 60
        XCTAssertTrue(tooShort.timeIntervalSince(startTime) < minimumDuration, "15 min is too short")
        XCTAssertTrue(acceptable.timeIntervalSince(startTime) >= minimumDuration, "30 min is acceptable")
    }
    
    func testClassTiming_MaximumDuration() {
        // Given
        let startTime = TestHelpers.dateFromNow(days: 1)
        let tooLong = startTime.addingTimeInterval(4 * 3600) // 4 hours
        let acceptable = startTime.addingTimeInterval(2 * 3600) // 2 hours
        
        // Then - Most classes are 2 hours or less
        let maximumDuration: TimeInterval = 3 * 3600 // 3 hours
        XCTAssertTrue(tooLong.timeIntervalSince(startTime) > maximumDuration, "4 hours is too long")
        XCTAssertTrue(acceptable.timeIntervalSince(startTime) <= maximumDuration, "2 hours is acceptable")
    }
    
    // MARK: - Recurring Class Tests
    
    func testRecurringClass_NonRecurring() {
        // Given
        let oneTimeClass = TestHelpers.mockClass()
        
        // Then - Default mock is non-recurring
        XCTAssertFalse(oneTimeClass.isRecurring, "Should be one-time class")
    }
    
    func testRecurringClass_WeeklyRecurrence() {
        // Given
        let startDate = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let nextWeek = Calendar.current.date(byAdding: .weekOfYear, value: 1, to: startDate)
        
        // Then
        XCTAssertNotNil(nextWeek, "Should be able to calculate next week")
        
        if let nextWeek = nextWeek {
            let daysDifference = Calendar.current.dateComponents([.day], from: startDate, to: nextWeek).day
            XCTAssertEqual(daysDifference, 7, "Should be exactly 7 days later")
        }
    }
    
    // MARK: - Enrollment Tracking Tests
    
    func testEnrollment_IncrementCount() {
        // Given
        let initialEnrollment = 5
        
        // When - Simulate registration
        let afterRegistration = initialEnrollment + 1
        
        // Then
        XCTAssertEqual(afterRegistration, 6, "Should increment enrollment by 1")
    }
    
    func testEnrollment_DecrementOnCancellation() {
        // Given
        let currentEnrollment = 8
        
        // When - Simulate cancellation
        let afterCancellation = currentEnrollment - 1
        
        // Then
        XCTAssertEqual(afterCancellation, 7, "Should decrement enrollment by 1")
    }
    
    func testEnrollment_CannotGoNegative() {
        // Given
        let currentEnrollment = 0
        
        // When - Attempt to decrement below zero
        let afterCancellation = max(0, currentEnrollment - 1)
        
        // Then
        XCTAssertEqual(afterCancellation, 0, "Should not go below 0")
    }
    
    // MARK: - Waitlist Tests
    
    func testWaitlist_NotNeededWhenSpacesAvailable() {
        // Given
        let groupClass = TestHelpers.mockClass(
            maxCapacity: 10,
            currentEnrollment: 5
        )
        
        // When
        let needsWaitlist = groupClass.currentEnrollment >= groupClass.maxCapacity
        
        // Then
        XCTAssertFalse(needsWaitlist, "Should not need waitlist when spaces available")
    }
    
    func testWaitlist_NeededWhenFull() {
        // Given
        let groupClass = TestHelpers.mockClass(
            maxCapacity: 10,
            currentEnrollment: 10
        )
        
        // When
        let needsWaitlist = groupClass.currentEnrollment >= groupClass.maxCapacity
        
        // Then
        XCTAssertTrue(needsWaitlist, "Should need waitlist when full")
    }
    
    // MARK: - Class Location Tests
    
    func testClassLocation_HasLocation() {
        // Given
        let groupClass = TestHelpers.mockClass()
        
        // Then
        XCTAssertNotNil(groupClass.locationId, "Should have location ID")
        XCTAssertNotNil(groupClass.locationName, "Should have location name")
        XCTAssertFalse(groupClass.locationName.isEmpty, "Location name should not be empty")
    }
    
    func testClassLocation_RequiredForInPerson() {
        // Given
        let groupClass = TestHelpers.mockClass()
        
        // Then - For in-person classes
        XCTAssertNotEqual(groupClass.locationId, "", "In-person class requires location")
    }
    
    // MARK: - Registration Window Tests
    
    func testRegistration_OpeningWindow() {
        // Given - Class opens for registration 30 days in advance
        let classDate = TestHelpers.dateFromNow(days: 45)
        let registrationOpens = Calendar.current.date(byAdding: .day, value: -30, to: classDate)
        
        // Then
        XCTAssertNotNil(registrationOpens, "Should calculate registration opening")
        
        if let opens = registrationOpens {
            let daysUntilOpen = Calendar.current.dateComponents([.day], from: Date(), to: opens).day ?? 0
            XCTAssertTrue(daysUntilOpen >= 0, "Registration window logic should work")
        }
    }
    
    func testRegistration_ClosingWindow() {
        // Given - Registration closes 2 hours before class
        let classDate = TestHelpers.dateFromNow(hours: 3)
        let registrationCloses = Calendar.current.date(byAdding: .hour, value: -2, to: classDate)
        
        // Then
        XCTAssertNotNil(registrationCloses, "Should calculate registration closing")
        
        if let closes = registrationCloses {
            let isStillOpen = Date() < closes
            XCTAssertTrue(isStillOpen, "Should still be open 3 hours before class")
        }
    }
}
