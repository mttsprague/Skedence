//
//  TestHelpers.swift
//  SkedenceAdminTests
//
//  Common test utilities and helpers
//

import XCTest
import Foundation
@testable import SkedenceAdmin

// MARK: - Date Helpers

extension Date {
    /// Create a date from components for testing
    static func testDate(year: Int, month: Int, day: Int, hour: Int = 0, minute: Int = 0) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        components.timeZone = TimeZone(identifier: "UTC")
        return Calendar.current.date(from: components)!
    }
    
    /// Add days to current date
    func adding(days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self)!
    }
    
    /// Add hours to current date
    func adding(hours: Int) -> Date {
        Calendar.current.date(byAdding: .hour, value: hours, to: self)!
    }
}

// MARK: - XCTest Helpers

extension XCTestCase {
    /// Wait for async operation with timeout
    func waitForAsync(timeout: TimeInterval = 2.0, action: @escaping () async throws -> Void) throws {
        let expectation = expectation(description: "Async operation")
        
        Task {
            do {
                try await action()
                expectation.fulfill()
            } catch {
                XCTFail("Async operation failed: \(error)")
                expectation.fulfill()
            }
        }
        
        wait(for: [expectation], timeout: timeout)
    }
    
    /// Assert throws specific error
    func assertThrowsError<T, E: Error & Equatable>(
        _ expression: @autoclosure () async throws -> T,
        expectedError: E,
        file: StaticString = #file,
        line: UInt = #line
    ) async {
        do {
            _ = try await expression()
            XCTFail("Expected error \(expectedError) but no error was thrown", file: file, line: line)
        } catch let error as E {
            XCTAssertEqual(error, expectedError, file: file, line: line)
        } catch {
            XCTFail("Expected error \(expectedError) but got \(error)", file: file, line: line)
        }
    }
}

// MARK: - Mock ID Generators

struct MockIDGenerator {
    static func orgId() -> String {
        "org_test_\(UUID().uuidString.prefix(8))"
    }
    
    static func userId() -> String {
        "user_test_\(UUID().uuidString.prefix(8))"
    }
    
    static func bookingId() -> String {
        "booking_test_\(UUID().uuidString.prefix(8))"
    }
    
    static func packageId() -> String {
        "package_test_\(UUID().uuidString.prefix(8))"
    }
    
    static func classId() -> String {
        "class_test_\(UUID().uuidString.prefix(8))"
    }
}

// MARK: - Assertion Helpers

/// Assert two dates are approximately equal (within tolerance)
func XCTAssertDateEqual(
    _ date1: Date?,
    _ date2: Date?,
    tolerance: TimeInterval = 1.0,
    _ message: String = "",
    file: StaticString = #file,
    line: UInt = #line
) {
    guard let date1 = date1, let date2 = date2 else {
        XCTFail("One or both dates are nil", file: file, line: line)
        return
    }
    
    let difference = abs(date1.timeIntervalSince(date2))
    XCTAssertLessThanOrEqual(difference, tolerance, message, file: file, line: line)
}

/// Assert collection contains element matching predicate
func XCTAssertContains<T>(
    _ collection: [T],
    where predicate: (T) -> Bool,
    _ message: String = "",
    file: StaticString = #file,
    line: UInt = #line
) {
    XCTAssertTrue(collection.contains(where: predicate), message, file: file, line: line)
}
