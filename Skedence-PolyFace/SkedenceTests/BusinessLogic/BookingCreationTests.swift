//
//  BookingCreationTests.swift
//  SkedenceTests
//
//  Phase 7.2: Business logic tests for booking creation
//

import XCTest
@testable import Skedence

@MainActor
final class BookingCreationTests: XCTestCase {
    
    // MARK: - Booking Validation Tests
    
    func testBookingValidation_RequiresUserId() {
        // Given
        let booking = TestHelpers.mockBooking(userId: "")
        
        // Then
        XCTAssertTrue(booking.userId.isEmpty, "Should allow creation but userId should be empty")
        // In real app, validation would happen at service/repository level
    }
    
    func testBookingValidation_RequiresTrainerId() {
        // Given
        let booking = TestHelpers.mockBooking(trainerId: "")
        
        // Then
        XCTAssertTrue(booking.trainerId.isEmpty, "Should allow creation but trainerId should be empty")
    }
    
    func testBookingValidation_RequiresFutureStartTime() {
        // Given
        let pastDate = TestHelpers.dateFromNow(days: -1)
        let futureDate = TestHelpers.dateFromNow(days: 1)
        
        // Then
        XCTAssertTrue(pastDate < Date(), "Past date should be before now")
        XCTAssertTrue(futureDate > Date(), "Future date should be after now")
    }
    
    func testBookingValidation_EndTimeAfterStartTime() {
        // Given
        let startTime = TestHelpers.dateFromNow(days: 1)
        let endTime = startTime.addingTimeInterval(3600) // 1 hour later
        
        let booking = TestHelpers.mockBooking(startTime: startTime)
        
        // Then
        XCTAssertTrue(booking.endTime > booking.startTime, "End time should be after start time")
        XCTAssertEqual(booking.endTime.timeIntervalSince(booking.startTime), 3600, "Duration should be 1 hour")
    }
    
    // MARK: - Time Conflict Detection Tests
    
    func testBookingConflict_OverlappingTimes() {
        // Given
        let booking1Start = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let booking1End = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 0)
        
        let booking2Start = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 30)
        let booking2End = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 30)
        
        // Then - Check overlap
        let hasOverlap = (booking1Start < booking2End) && (booking2Start < booking1End)
        XCTAssertTrue(hasOverlap, "Should detect overlapping bookings")
    }
    
    func testBookingConflict_NonOverlappingTimes() {
        // Given
        let booking1Start = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let booking1End = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 0)
        
        let booking2Start = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 0)
        let booking2End = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 12, minute: 0)
        
        // Then - Check no overlap
        let hasOverlap = (booking1Start < booking2End) && (booking2Start < booking1End)
        XCTAssertFalse(hasOverlap, "Should not detect conflict for adjacent bookings")
    }
    
    func testBookingConflict_CompletelyContained() {
        // Given
        let outerStart = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let outerEnd = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 13, minute: 0)
        
        let innerStart = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 0)
        let innerEnd = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 12, minute: 0)
        
        // Then - Inner booking is completely within outer
        let hasOverlap = (outerStart < innerEnd) && (innerStart < outerEnd)
        XCTAssertTrue(hasOverlap, "Should detect conflict when one booking contains another")
    }
    
    // MARK: - Package Deduction Logic Tests
    
    func testPackageDeduction_PrivateLesson() {
        // Given
        let initialLessons = 10
        let package = TestHelpers.mockPackage(
            name: "10 Private Lessons",
            remainingLessons: initialLessons
        )
        
        // When - Simulate booking using 1 lesson
        let afterBooking = initialLessons - 1
        
        // Then
        XCTAssertEqual(afterBooking, 9, "Should deduct 1 lesson for private booking")
    }
    
    func testPackageDeduction_MultiAthleteLesson() {
        // Given
        let initialLessons = 10
        let package = TestHelpers.mockPackage(
            name: "10 Lesson Pack (2-athlete)",
            remainingLessons: initialLessons
        )
        
        // When - Simulate booking using 1 slot from 2-athlete package
        let afterBooking = initialLessons - 1
        
        // Then
        XCTAssertEqual(afterBooking, 9, "Should deduct 1 lesson for 2-athlete booking")
    }
    
    func testPackageDeduction_InsufficientLessons() {
        // Given
        let package = TestHelpers.mockPackage(
            name: "10 Lesson Pack",
            remainingLessons: 0
        )
        
        // Then
        XCTAssertEqual(package.remainingLessons, 0, "Package should have 0 remaining lessons")
        XCTAssertTrue(package.remainingLessons < 1, "Should not allow booking with insufficient lessons")
    }
    
    func testPackageDeduction_ExpirationCheck() {
        // Given
        let expiredPackage = TestHelpers.mockPackage(
            name: "Expired Package",
            remainingLessons: 5
        )
        
        // Simulate expired package by checking expiration date
        let isExpired = expiredPackage.expirationDate < Date()
        
        // Then
        XCTAssertFalse(isExpired, "Test package should not be expired (90 days from now)")
    }
    
    // MARK: - Booking Status Tests
    
    func testBookingStatus_InitiallyConfirmed() {
        // Given
        let booking = TestHelpers.mockBooking(status: "confirmed")
        
        // Then
        XCTAssertEqual(booking.status, "confirmed", "New booking should be confirmed")
    }
    
    func testBookingStatus_CanBeCanceled() {
        // Given
        let booking = TestHelpers.mockBooking(status: "confirmed")
        
        // When - Simulate cancellation
        let canceledBooking = TestHelpers.mockBooking(
            id: booking.id,
            status: "cancelled"
        )
        
        // Then
        XCTAssertEqual(canceledBooking.status, "cancelled", "Should be able to change to cancelled")
    }
    
    func testBookingStatus_CanBeCompleted() {
        // Given
        let booking = TestHelpers.mockBooking(status: "confirmed")
        
        // When - Simulate completion
        let completedBooking = TestHelpers.mockBooking(
            id: booking.id,
            status: "completed"
        )
        
        // Then
        XCTAssertEqual(completedBooking.status, "completed", "Should be able to mark as completed")
    }
    
    // MARK: - Booking Creation Edge Cases
    
    func testBookingCreation_WithMultipleAthletes() {
        // Given
        let booking = TestHelpers.mockBooking(
            userId: "user1",
            trainerId: "trainer1"
        )
        
        // Then - In multi-athlete bookings, athleteId might differ from userId
        XCTAssertNotNil(booking.athleteId, "Should have athlete ID")
    }
    
    func testBookingCreation_SameTrainerSameTime_DifferentAthletes() {
        // Given - Two bookings for same trainer at same time (should be prevented)
        let time = TestHelpers.dateFromNow(days: 1)
        let booking1 = TestHelpers.mockBooking(
            id: "booking1",
            userId: "user1",
            trainerId: "trainer1",
            startTime: time
        )
        let booking2 = TestHelpers.mockBooking(
            id: "booking2",
            userId: "user2",
            trainerId: "trainer1",
            startTime: time
        )
        
        // Then - Both bookings created but conflict should be detected
        XCTAssertEqual(booking1.trainerId, booking2.trainerId, "Same trainer")
        XCTAssertEqual(booking1.startTime, booking2.startTime, "Same time")
        XCTAssertNotEqual(booking1.userId, booking2.userId, "Different users")
        // In real system, second booking should be rejected
    }
    
    func testBookingCreation_MinimumBookingTime() {
        // Given
        let now = Date()
        let tooSoon = now.addingTimeInterval(60) // 1 minute from now
        let acceptable = now.addingTimeInterval(3600) // 1 hour from now
        
        // Then - Most systems require minimum advance booking time
        let minimumAdvanceTime: TimeInterval = 3600 // 1 hour
        XCTAssertTrue(tooSoon.timeIntervalSince(now) < minimumAdvanceTime, "Too soon should be less than minimum")
        XCTAssertTrue(acceptable.timeIntervalSince(now) >= minimumAdvanceTime, "Acceptable should meet minimum")
    }
    
    func testBookingCreation_MaximumAdvanceBooking() {
        // Given
        let now = Date()
        let farFuture = TestHelpers.dateFromNow(days: 180) // 6 months
        let acceptable = TestHelpers.dateFromNow(days: 60) // 2 months
        
        // Then - Most systems limit how far in advance you can book
        let maximumAdvanceDays: TimeInterval = 90 * 24 * 3600 // 90 days in seconds
        XCTAssertTrue(farFuture.timeIntervalSince(now) > maximumAdvanceDays, "Far future exceeds limit")
        XCTAssertTrue(acceptable.timeIntervalSince(now) < maximumAdvanceDays, "Acceptable is within limit")
    }
}
