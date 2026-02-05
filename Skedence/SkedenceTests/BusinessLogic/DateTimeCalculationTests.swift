//
//  DateTimeCalculationTests.swift
//  SkedenceTests
//
//  Phase 7.2: Date and time calculation tests for scheduling
//

import XCTest
@testable import Skedence

final class DateTimeCalculationTests: XCTestCase {
    
    // MARK: - Duration Calculation Tests
    
    func testDurationCalculation_InMinutes() {
        // Given
        let startTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let endTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 11, minute: 30)
        
        // When
        let duration = endTime.timeIntervalSince(startTime)
        let minutes = Int(duration / 60)
        
        // Then
        XCTAssertEqual(minutes, 90, "Should calculate 90 minutes")
    }
    
    func testDurationCalculation_InHours() {
        // Given
        let startTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 9, minute: 0)
        let endTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 12, minute: 0)
        
        // When
        let duration = endTime.timeIntervalSince(startTime)
        let hours = duration / 3600
        
        // Then
        XCTAssertEqual(hours, 3.0, accuracy: 0.01, "Should calculate 3 hours")
    }
    
    func testDurationCalculation_AcrossDays() {
        // Given
        let startTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 23, minute: 0)
        let endTime = TestHelpers.date(year: 2026, month: 3, day: 16, hour: 1, minute: 0)
        
        // When
        let duration = endTime.timeIntervalSince(startTime)
        let hours = duration / 3600
        
        // Then
        XCTAssertEqual(hours, 2.0, accuracy: 0.01, "Should calculate 2 hours across midnight")
    }
    
    // MARK: - Business Hours Tests
    
    func testBusinessHours_WithinHours() {
        // Given - Business hours: 6 AM to 10 PM
        let businessStart = 6
        let businessEnd = 22
        
        let morningTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 9, minute: 0)
        let afternoonTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 15, minute: 0)
        let eveningTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 20, minute: 0)
        
        // When
        let morningHour = Calendar.current.component(.hour, from: morningTime)
        let afternoonHour = Calendar.current.component(.hour, from: afternoonTime)
        let eveningHour = Calendar.current.component(.hour, from: eveningTime)
        
        // Then
        XCTAssertTrue(morningHour >= businessStart && morningHour < businessEnd, "9 AM should be within business hours")
        XCTAssertTrue(afternoonHour >= businessStart && afternoonHour < businessEnd, "3 PM should be within business hours")
        XCTAssertTrue(eveningHour >= businessStart && eveningHour < businessEnd, "8 PM should be within business hours")
    }
    
    func testBusinessHours_OutsideHours() {
        // Given - Business hours: 6 AM to 10 PM
        let businessStart = 6
        let businessEnd = 22
        
        let earlyMorning = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 5, minute: 0)
        let lateNight = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 23, minute: 0)
        
        // When
        let earlyHour = Calendar.current.component(.hour, from: earlyMorning)
        let lateHour = Calendar.current.component(.hour, from: lateNight)
        
        // Then
        XCTAssertFalse(earlyHour >= businessStart && earlyHour < businessEnd, "5 AM should be outside business hours")
        XCTAssertFalse(lateHour >= businessStart && lateHour < businessEnd, "11 PM should be outside business hours")
    }
    
    // MARK: - Day of Week Tests
    
    func testDayOfWeek_Identification() {
        // Given
        let monday = TestHelpers.date(year: 2026, month: 3, day: 16) // March 16, 2026 is Monday
        let saturday = TestHelpers.date(year: 2026, month: 3, day: 21) // March 21, 2026 is Saturday
        let sunday = TestHelpers.date(year: 2026, month: 3, day: 22) // March 22, 2026 is Sunday
        
        // When
        let mondayWeekday = Calendar.current.component(.weekday, from: monday)
        let saturdayWeekday = Calendar.current.component(.weekday, from: saturday)
        let sundayWeekday = Calendar.current.component(.weekday, from: sunday)
        
        // Then
        XCTAssertEqual(mondayWeekday, 2, "Monday should be weekday 2")
        XCTAssertEqual(saturdayWeekday, 7, "Saturday should be weekday 7")
        XCTAssertEqual(sundayWeekday, 1, "Sunday should be weekday 1")
    }
    
    func testDayOfWeek_IsWeekend() {
        // Given
        let saturday = TestHelpers.date(year: 2026, month: 3, day: 21)
        let sunday = TestHelpers.date(year: 2026, month: 3, day: 22)
        let monday = TestHelpers.date(year: 2026, month: 3, day: 16)
        
        // When
        let isWeekend = { (date: Date) -> Bool in
            let weekday = Calendar.current.component(.weekday, from: date)
            return weekday == 1 || weekday == 7 // Sunday or Saturday
        }
        
        // Then
        XCTAssertTrue(isWeekend(saturday), "Saturday should be weekend")
        XCTAssertTrue(isWeekend(sunday), "Sunday should be weekend")
        XCTAssertFalse(isWeekend(monday), "Monday should not be weekend")
    }
    
    // MARK: - Date Comparison Tests
    
    func testDateComparison_SameDay() {
        // Given
        let morning = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 9, minute: 0)
        let evening = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 20, minute: 0)
        
        // When
        let isSameDay = Calendar.current.isDate(morning, inSameDayAs: evening)
        
        // Then
        XCTAssertTrue(isSameDay, "Should be same day")
    }
    
    func testDateComparison_DifferentDays() {
        // Given
        let today = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 9, minute: 0)
        let tomorrow = TestHelpers.date(year: 2026, month: 3, day: 16, hour: 9, minute: 0)
        
        // When
        let isSameDay = Calendar.current.isDate(today, inSameDayAs: tomorrow)
        
        // Then
        XCTAssertFalse(isSameDay, "Should be different days")
    }
    
    func testDateComparison_StartOfDay() {
        // Given
        let dateWithTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 14, minute: 30)
        
        // When
        let startOfDay = Calendar.current.startOfDay(for: dateWithTime)
        let startHour = Calendar.current.component(.hour, from: startOfDay)
        let startMinute = Calendar.current.component(.minute, from: startOfDay)
        
        // Then
        XCTAssertEqual(startHour, 0, "Start of day should be hour 0")
        XCTAssertEqual(startMinute, 0, "Start of day should be minute 0")
    }
    
    // MARK: - Timezone Handling Tests
    
    func testTimezone_UTCConversion() {
        // Given
        let date = Date()
        
        // When
        let utcFormatter = DateFormatter()
        utcFormatter.timeZone = TimeZone(identifier: "UTC")
        utcFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        let localFormatter = DateFormatter()
        localFormatter.timeZone = TimeZone.current
        localFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        // Then - Both formatters should work even if strings differ
        let utcString = utcFormatter.string(from: date)
        let localString = localFormatter.string(from: date)
        
        XCTAssertNotNil(utcString, "Should format in UTC")
        XCTAssertNotNil(localString, "Should format in local timezone")
    }
    
    func testTimezone_AcrossTimezones() {
        // Given
        let utcTimezone = TimeZone(identifier: "UTC")!
        let estTimezone = TimeZone(identifier: "America/New_York")!
        
        // Then
        XCTAssertNotEqual(utcTimezone.secondsFromGMT(), estTimezone.secondsFromGMT(), "Timezones should have different offsets")
    }
    
    // MARK: - Scheduling Window Tests
    
    func testSchedulingWindow_NextAvailableSlot() {
        // Given - Find next available hour slot
        let now = Date()
        let calendar = Calendar.current
        
        // When - Round up to next hour
        var components = calendar.dateComponents([.year, .month, .day, .hour], from: now)
        components.hour! += 1
        components.minute = 0
        components.second = 0
        
        let nextHour = calendar.date(from: components)
        
        // Then
        XCTAssertNotNil(nextHour, "Should calculate next hour")
        if let nextHour = nextHour {
            XCTAssertTrue(nextHour > now, "Next hour should be after now")
        }
    }
    
    func testSchedulingWindow_AddWeeks() {
        // Given
        let startDate = TestHelpers.date(year: 2026, month: 3, day: 15)
        
        // When
        let oneWeekLater = Calendar.current.date(byAdding: .weekOfYear, value: 1, to: startDate)
        let fourWeeksLater = Calendar.current.date(byAdding: .weekOfYear, value: 4, to: startDate)
        
        // Then
        XCTAssertNotNil(oneWeekLater, "Should add 1 week")
        XCTAssertNotNil(fourWeeksLater, "Should add 4 weeks")
        
        if let oneWeek = oneWeekLater {
            let days = Calendar.current.dateComponents([.day], from: startDate, to: oneWeek).day
            XCTAssertEqual(days, 7, "One week should be 7 days")
        }
    }
    
    // MARK: - Expiration Date Tests
    
    func testExpirationDate_IsExpired() {
        // Given
        let expiredDate = TestHelpers.dateFromNow(days: -1)
        let validDate = TestHelpers.dateFromNow(days: 30)
        
        // Then
        XCTAssertTrue(expiredDate < Date(), "Past date should be expired")
        XCTAssertFalse(validDate < Date(), "Future date should not be expired")
    }
    
    func testExpirationDate_DaysUntilExpiration() {
        // Given
        let expirationDate = TestHelpers.dateFromNow(days: 15)
        
        // When
        let components = Calendar.current.dateComponents([.day], from: Date(), to: expirationDate)
        let daysRemaining = components.day ?? 0
        
        // Then
        XCTAssertEqual(daysRemaining, 15, "Should have 15 days remaining")
    }
    
    func testExpirationDate_WarningPeriod() {
        // Given - Warn when less than 7 days remaining
        let warningThreshold = 7
        let withinWarning = TestHelpers.dateFromNow(days: 5)
        let outsideWarning = TestHelpers.dateFromNow(days: 10)
        
        // When
        let daysUntilWarning = Calendar.current.dateComponents([.day], from: Date(), to: withinWarning).day ?? 0
        let daysUntilSafe = Calendar.current.dateComponents([.day], from: Date(), to: outsideWarning).day ?? 0
        
        // Then
        XCTAssertTrue(daysUntilWarning < warningThreshold, "Should be within warning period")
        XCTAssertFalse(daysUntilSafe < warningThreshold, "Should be outside warning period")
    }
    
    // MARK: - Time Slot Generation Tests
    
    func testTimeSlotGeneration_HourlySlots() {
        // Given - Generate slots from 9 AM to 5 PM
        let startHour = 9
        let endHour = 17
        
        // When
        var slots: [Date] = []
        let baseDate = TestHelpers.date(year: 2026, month: 3, day: 15)
        
        for hour in startHour..<endHour {
            if let slotTime = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: baseDate) {
                slots.append(slotTime)
            }
        }
        
        // Then
        XCTAssertEqual(slots.count, 8, "Should generate 8 hourly slots (9 AM to 4 PM)")
        
        if let firstSlot = slots.first {
            let firstHour = Calendar.current.component(.hour, from: firstSlot)
            XCTAssertEqual(firstHour, 9, "First slot should be 9 AM")
        }
    }
    
    func testTimeSlotGeneration_ThirtyMinuteIntervals() {
        // Given - Generate 30-minute intervals for 2 hours
        let startTime = TestHelpers.date(year: 2026, month: 3, day: 15, hour: 10, minute: 0)
        let intervalMinutes = 30
        let numberOfSlots = 4
        
        // When
        var slots: [Date] = []
        for i in 0..<numberOfSlots {
            if let slot = Calendar.current.date(byAdding: .minute, value: i * intervalMinutes, to: startTime) {
                slots.append(slot)
            }
        }
        
        // Then
        XCTAssertEqual(slots.count, 4, "Should generate 4 thirty-minute slots")
        
        if slots.count >= 2 {
            let duration = slots[1].timeIntervalSince(slots[0])
            XCTAssertEqual(duration, Double(intervalMinutes * 60), "Slots should be 30 minutes apart")
        }
    }
    
    // MARK: - Date Range Tests
    
    func testDateRange_MonthRange() {
        // Given
        let startOfMonth = TestHelpers.date(year: 2026, month: 3, day: 1)
        
        // When
        let endOfMonth = Calendar.current.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth)
        
        // Then
        XCTAssertNotNil(endOfMonth, "Should calculate end of month")
        
        if let end = endOfMonth {
            let day = Calendar.current.component(.day, from: end)
            XCTAssertEqual(day, 31, "March should have 31 days")
        }
    }
    
    func testDateRange_WeekRange() {
        // Given - Get Monday to Sunday of current week
        let today = Date()
        let calendar = Calendar.current
        
        // When
        let weekday = calendar.component(.weekday, from: today)
        let daysFromMonday = (weekday + 5) % 7 // Adjust to Monday = 0
        
        // Then
        XCTAssertTrue(daysFromMonday >= 0 && daysFromMonday < 7, "Days from Monday should be 0-6")
    }
}
