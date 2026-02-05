//
//  TestHelpers.swift
//  SkedenceTests
//
//  Phase 7: Common test utilities and mock data generators
//

import Foundation
@testable import Skedence

/// Helper utilities for creating test data
enum TestHelpers {
    
    // MARK: - Date Helpers
    
    /// Create a date from components for predictable testing
    static func date(year: Int, month: Int, day: Int, hour: Int = 12, minute: Int = 0) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        components.timeZone = TimeZone(identifier: "UTC")
        return Calendar.current.date(from: components) ?? Date()
    }
    
    /// Create a date relative to now
    static func dateFromNow(days: Int = 0, hours: Int = 0, minutes: Int = 0) -> Date {
        var components = DateComponents()
        components.day = days
        components.hour = hours
        components.minute = minutes
        return Calendar.current.date(byAdding: components, to: Date()) ?? Date()
    }
    
    // MARK: - Mock Data Generators
    
    /// Generate a mock booking
    static func mockBooking(
        id: String = "booking-\(UUID().uuidString.prefix(8))",
        userId: String = "user123",
        trainerId: String = "trainer123",
        startTime: Date = Date(),
        status: String = "confirmed",
        orgId: String = "org123"
    ) -> Booking {
        return Booking(
            id: id,
            userId: userId,
            trainerId: trainerId,
            trainerName: "Test Trainer",
            packageId: "package123",
            startTime: startTime,
            endTime: startTime.addingTimeInterval(3600),
            status: status,
            createdAt: Date(),
            orgId: orgId,
            athleteId: userId
        )
    }
    
    /// Generate a mock availability slot
    static func mockSlot(
        id: String = "slot-\(UUID().uuidString.prefix(8))",
        trainerId: String = "trainer123",
        startTime: Date = Date(),
        duration: Int = 60,
        status: String = "open",
        orgId: String = "org123"
    ) -> AvailabilitySlot {
        return AvailabilitySlot(
            id: id,
            startTime: startTime,
            endTime: startTime.addingTimeInterval(Double(duration * 60)),
            trainerId: trainerId,
            trainerName: "Test Trainer",
            duration: duration,
            status: status,
            orgId: orgId
        )
    }
    
    /// Generate a mock group class
    static func mockClass(
        id: String = "class-\(UUID().uuidString.prefix(8))",
        name: String = "Test Class",
        trainerId: String = "trainer123",
        startTime: Date = Date(),
        maxCapacity: Int = 10,
        currentEnrollment: Int = 5,
        orgId: String = "org123"
    ) -> GroupClass {
        return GroupClass(
            id: id,
            name: name,
            description: "Test class description",
            trainerId: trainerId,
            trainerName: "Test Trainer",
            startTime: startTime,
            endTime: startTime.addingTimeInterval(3600),
            maxCapacity: maxCapacity,
            currentEnrollment: currentEnrollment,
            locationId: "location123",
            locationName: "Test Location",
            orgId: orgId,
            createdAt: Date(),
            updatedAt: Date(),
            isRecurring: false
        )
    }
    
    /// Generate a mock trainer
    static func mockTrainer(
        id: String = "trainer-\(UUID().uuidString.prefix(8))",
        name: String = "Test Trainer",
        email: String = "trainer@test.com",
        orgId: String = "org123"
    ) -> Trainer {
        return Trainer(
            id: id,
            name: name,
            email: email,
            role: "trainer",
            orgId: orgId,
            createdAt: Date(),
            updatedAt: Date(),
            active: true
        )
    }
    
    /// Generate a mock user profile
    static func mockUserProfile(
        id: String = "user-\(UUID().uuidString.prefix(8))",
        firstName: String = "Test",
        lastName: String = "User",
        email: String = "user@test.com",
        orgId: String = "org123"
    ) -> UserProfile {
        return UserProfile(
            id: id,
            referenceCode: "REF123",
            emailAddress: email,
            firstName: firstName,
            lastName: lastName,
            phoneNumber: "555-1234",
            photoURL: nil,
            active: true,
            createdAt: Date(),
            updatedAt: Date(),
            emergencyContactName: nil,
            emergencyContactNumber: nil,
            referredBy: nil,
            notesForCoach: nil
        )
    }
    
    /// Generate a mock lesson package
    static func mockPackage(
        id: String = "package-\(UUID().uuidString.prefix(8))",
        name: String = "10 Lesson Pack",
        remainingLessons: Int = 5,
        orgId: String = "org123"
    ) -> LessonPackage {
        return LessonPackage(
            id: id,
            userId: "user123",
            packageName: name,
            totalLessons: 10,
            remainingLessons: remainingLessons,
            packageType: "private",
            purchaseDate: Date(),
            expirationDate: dateFromNow(days: 90),
            orgId: orgId,
            status: "active"
        )
    }
}

// MARK: - XCTestCase Extensions

extension XCTestCase {
    /// Wait for async operation with timeout
    func waitForAsync(timeout: TimeInterval = 2.0, operation: @escaping () async throws -> Void) {
        let expectation = expectation(description: "Async operation")
        
        Task {
            do {
                try await operation()
                expectation.fulfill()
            } catch {
                XCTFail("Async operation failed: \(error)")
                expectation.fulfill()
            }
        }
        
        wait(for: [expectation], timeout: timeout)
    }
}
