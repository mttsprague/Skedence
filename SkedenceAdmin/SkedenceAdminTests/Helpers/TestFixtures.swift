//
//  TestFixtures.swift
//  SkedenceAdminTests
//
//  Sample data generators for testing
//

import Foundation
@testable import SkedenceAdmin

struct TestFixtures {
    
    // MARK: - Organization Billing Fixtures
    
    static func billingTrialing(daysRemaining: Int = 7) -> OrganizationBilling {
        let trialEnd = Date().adding(days: daysRemaining)
        return OrganizationBilling(
            status: "trialing",
            plan: "starter",
            trialEndsAt: trialEnd,
            currentPeriodEnd: nil,
            graceEndsAt: nil,
            stripeCustomerId: "cus_test_trialing",
            stripeSubscriptionId: "sub_test_trialing",
            isActive: true,
            isInGrace: false
        )
    }
    
    static func billingActive() -> OrganizationBilling {
        let periodEnd = Date().adding(days: 30)
        return OrganizationBilling(
            status: "active",
            plan: "studio",
            trialEndsAt: nil,
            currentPeriodEnd: periodEnd,
            graceEndsAt: nil,
            stripeCustomerId: "cus_test_active",
            stripeSubscriptionId: "sub_test_active",
            isActive: true,
            isInGrace: false
        )
    }
    
    static func billingExpired(daysAgo: Int = 1) -> OrganizationBilling {
        let periodEnd = Date().adding(days: -daysAgo)
        return OrganizationBilling(
            status: "canceled",
            plan: "starter",
            trialEndsAt: nil,
            currentPeriodEnd: periodEnd,
            graceEndsAt: nil,
            stripeCustomerId: "cus_test_expired",
            stripeSubscriptionId: nil,
            isActive: false,
            isInGrace: false
        )
    }
    
    static func billingPastDue(graceEnds: Date? = nil) -> OrganizationBilling {
        let periodEnd = Date().adding(days: -2)
        let graceEnd = graceEnds ?? Date().adding(days: 5)
        return OrganizationBilling(
            status: "past_due",
            plan: "studio",
            trialEndsAt: nil,
            currentPeriodEnd: periodEnd,
            graceEndsAt: graceEnd,
            stripeCustomerId: "cus_test_pastdue",
            stripeSubscriptionId: "sub_test_pastdue",
            isActive: false,
            isInGrace: true
        )
    }
    
    static func billingInGracePeriod(daysRemaining: Int = 5) -> OrganizationBilling {
        let periodEnd = Date().adding(days: -3)
        let graceEnd = Date().adding(days: daysRemaining)
        return OrganizationBilling(
            status: "past_due",
            plan: "academy",
            trialEndsAt: nil,
            currentPeriodEnd: periodEnd,
            graceEndsAt: graceEnd,
            stripeCustomerId: "cus_test_grace",
            stripeSubscriptionId: "sub_test_grace",
            isActive: false,
            isInGrace: true
        )
    }
    
    // MARK: - Onboarding Data Fixtures
    
    static func onboardingDataEmpty() -> OnboardingData {
        return OnboardingData()
    }
    
    static func onboardingDataAccount() -> OnboardingData {
        var data = OnboardingData()
        data.orgId = MockIDGenerator.orgId()
        data.userId = MockIDGenerator.userId()
        data.organizationName = "Test Gym"
        data.timezone = "America/New_York"
        data.currency = "USD"
        return data
    }
    
    static func onboardingDataWithTerms() -> OnboardingData {
        var data = onboardingDataAccount()
        data.termsAccepted = true
        data.privacyAccepted = true
        return data
    }
    
    static func onboardingDataComplete() -> OnboardingData {
        var data = onboardingDataWithTerms()
        data.contactPhone = "+1234567890"
        data.contactEmail = "test@example.com"
        data.website = "https://testgym.com"
        data.address = OnboardingData.Address(
            line1: "123 Test St",
            line2: "Suite 100",
            city: "Test City",
            state: "TS",
            zipCode: "12345"
        )
        data.inviteCode = "TEST123"
        data.firstLocationId = MockIDGenerator.orgId()
        data.stripeComplete = true
        data.stripeAccountId = "acct_test123"
        data.packagesComplete = true
        data.createdPackageIds = [MockIDGenerator.packageId(), MockIDGenerator.packageId()]
        return data
    }
    
    // MARK: - Schedule Slot Fixtures
    
    static func scheduleSlot(
        date: Date = Date(),
        trainerId: String = "trainer_test",
        isBooked: Bool = false,
        isClass: Bool = false
    ) -> TrainerScheduleSlot {
        let startTime = date
        let endTime = date.adding(hours: 1)
        
        return TrainerScheduleSlot(
            id: MockIDGenerator.bookingId(),
            trainerId: trainerId,
            trainerName: "Test Trainer",
            startTime: startTime,
            endTime: endTime,
            isAvailable: !isBooked,
            isBooked: isBooked,
            isClass: isClass,
            clientName: isBooked ? "Test Client" : nil,
            clientId: isBooked ? MockIDGenerator.userId() : nil,
            bookingId: isBooked ? MockIDGenerator.bookingId() : nil,
            classId: isClass ? MockIDGenerator.classId() : nil,
            className: isClass ? "Test Class" : nil,
            currentParticipants: isClass ? 5 : nil,
            maxParticipants: isClass ? 10 : nil,
            location: "Test Location"
        )
    }
    
    static func weekOfSlots(weekStart: Date = Date()) -> [String: [TrainerScheduleSlot]] {
        var slotsByDay: [String: [TrainerScheduleSlot]] = [:]
        
        for dayOffset in 0..<7 {
            let day = weekStart.adding(days: dayOffset)
            let dayKey = formatDateKey(day)
            
            var daySlots: [TrainerScheduleSlot] = []
            for hour in 9...17 {
                let slotDate = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: day)!
                daySlots.append(scheduleSlot(date: slotDate, isBooked: hour % 3 == 0))
            }
            
            slotsByDay[dayKey] = daySlots
        }
        
        return slotsByDay
    }
    
    private static func formatDateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    
    // MARK: - Client Fixtures
    
    static func client(
        id: String = MockIDGenerator.userId(),
        firstName: String = "John",
        lastName: String = "Doe",
        email: String = "john@example.com"
    ) -> ClientModel {
        return ClientModel(
            id: id,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: "+1234567890",
            createdAt: Date(),
            isActive: true
        )
    }
    
    // MARK: - Package Fixtures
    
    static func lessonPackage(
        id: String = MockIDGenerator.packageId(),
        totalLessons: Int = 10,
        lessonsUsed: Int = 0,
        isExpired: Bool = false
    ) -> LessonPackage {
        let expirationDate = isExpired ? Date().adding(days: -1) : Date().adding(days: 30)
        
        return LessonPackage(
            id: id,
            name: "Test Package",
            totalLessons: totalLessons,
            lessonsUsed: lessonsUsed,
            priceInCents: 10000,
            expirationDate: expirationDate,
            purchasedAt: Date().adding(days: -10),
            clientId: MockIDGenerator.userId(),
            clientName: "Test Client",
            orgId: MockIDGenerator.orgId(),
            packageType: "pass",
            packageCategory: "pass"
        )
    }
}

// MARK: - Helper Extensions

extension TrainerScheduleSlot {
    /// Check if slot is in the past
    var isPast: Bool {
        endTime < Date()
    }
    
    /// Check if slot is today
    var isToday: Bool {
        Calendar.current.isDateInToday(startTime)
    }
}
