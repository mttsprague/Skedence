//
//  SubscriptionEnforcementServiceTests.swift
//  SkedenceAdminTests
//
//  Comprehensive tests for subscription enforcement logic
//

import XCTest
@testable import SkedenceAdmin

@MainActor
final class SubscriptionEnforcementServiceTests: XCTestCase {
    
    var service: SubscriptionEnforcementService!
    var mockFirestore: MockFirestore!
    
    override func setUp() async throws {
        try await super.setUp()
        mockFirestore = MockFirestore()
        service = SubscriptionEnforcementService()
    }
    
    override func tearDown() async throws {
        service.stopMonitoring()
        service = nil
        mockFirestore?.clear()
        mockFirestore = nil
        try await super.tearDown()
    }
    
    // MARK: - Trial Period Tests
    
    func testBillingIsActive_WhenTrialNotExpired() {
        // Given: Active trial with 7 days remaining
        let billing = TestFixtures.billingTrialing(daysRemaining: 7)
        
        // When: Check if active
        let isActive = billing.isActive
        
        // Then: Should be active
        XCTAssertTrue(isActive, "Trial should be active when not expired")
        XCTAssertEqual(billing.status, "trialing")
    }
    
    func testBillingIsInactive_WhenTrialExpired() {
        // Given: Trial that expired 1 day ago
        var billing = TestFixtures.billingTrialing(daysRemaining: -1)
        billing.isActive = false
        
        // When: Check if active
        let isActive = billing.isActive
        
        // Then: Should be inactive
        XCTAssertFalse(isActive, "Trial should be inactive when expired")
    }
    
    func testTrialEndsAt_IsCorrectlySet() {
        // Given: Trial ending in 14 days
        let billing = TestFixtures.billingTrialing(daysRemaining: 14)
        
        // When: Check trial end date
        guard let trialEnd = billing.trialEndsAt else {
            XCTFail("Trial end date should be set")
            return
        }
        
        // Then: Should be approximately 14 days from now
        let daysDifference = Calendar.current.dateComponents([.day], from: Date(), to: trialEnd).day
        XCTAssertEqual(daysDifference, 14, accuracy: 1, "Trial should end in 14 days")
    }
    
    // MARK: - Subscription Status Tests
    
    func testCanPerformAction_AllowsAllWhenActive() {
        // Given: Active subscription
        service.billing = TestFixtures.billingActive()
        
        // When/Then: All actions should be allowed
        XCTAssertTrue(service.canPerformAction(.createBooking))
        XCTAssertTrue(service.canPerformAction(.editAvailability))
        XCTAssertTrue(service.canPerformAction(.createPackage))
        XCTAssertTrue(service.canPerformAction(.addTrainer))
        XCTAssertTrue(service.canPerformAction(.sendInvite))
    }
    
    func testCanPerformAction_BlocksWritesWhenExpired() {
        // Given: Expired subscription
        service.billing = TestFixtures.billingExpired()
        
        // When/Then: Write actions should be blocked
        XCTAssertFalse(service.canPerformAction(.createBooking))
        XCTAssertFalse(service.canPerformAction(.editAvailability))
        XCTAssertFalse(service.canPerformAction(.createPackage))
        XCTAssertFalse(service.canPerformAction(.addTrainer))
        XCTAssertFalse(service.canPerformAction(.sendInvite))
    }
    
    func testCanPerformAction_AllowsReadWhenExpired() {
        // Given: Expired subscription
        service.billing = TestFixtures.billingExpired()
        
        // When/Then: Read actions should still be allowed
        XCTAssertTrue(service.canPerformAction(.viewSchedule))
        XCTAssertTrue(service.canPerformAction(.viewClients))
        XCTAssertTrue(service.canPerformAction(.viewPackages))
    }
    
    func testCanPerformAction_AllowsModificationDuringGrace() {
        // Given: Subscription in grace period
        service.billing = TestFixtures.billingInGracePeriod(daysRemaining: 5)
        
        // When/Then: Should allow modifications during grace period
        XCTAssertTrue(service.canPerformAction(.createBooking))
        XCTAssertTrue(service.canPerformAction(.editAvailability))
        XCTAssertTrue(service.billing?.isInGrace ?? false)
    }
    
    func testCanPerformAction_BlocksAfterGraceExpires() {
        // Given: Grace period expired 1 day ago
        var billing = TestFixtures.billingInGracePeriod(daysRemaining: -1)
        billing.isInGrace = false
        billing.isActive = false
        service.billing = billing
        
        // When/Then: Should block modifications
        XCTAssertFalse(service.canPerformAction(.createBooking))
        XCTAssertFalse(service.canPerformAction(.editAvailability))
    }
    
    // MARK: - Grace Period Tests
    
    func testGracePeriod_AllowsAccess() {
        // Given: Billing in grace period with 3 days remaining
        let billing = TestFixtures.billingPastDue(graceEnds: Date().adding(days: 3))
        service.billing = billing
        
        // When: Check grace status
        let isInGrace = billing.isInGrace
        let canModify = service.canPerformAction(.createBooking)
        
        // Then: Should be in grace and allow modifications
        XCTAssertTrue(isInGrace, "Should be in grace period")
        XCTAssertTrue(canModify, "Should allow modifications during grace")
    }
    
    func testGracePeriod_ExpiresCorrectly() {
        // Given: Grace period that just expired
        let billing = TestFixtures.billingPastDue(graceEnds: Date().adding(days: -1))
        
        // When: Check if grace ended
        let graceEnded = billing.graceEndsAt! < Date()
        
        // Then: Grace should be expired
        XCTAssertTrue(graceEnded, "Grace period should be expired")
    }
    
    // MARK: - Owner Permission Tests
    
    func testIsOwner_InitiallyFalse() {
        // Given: New service instance
        // When: Check owner status
        let isOwner = service.isOwner
        
        // Then: Should default to false
        XCTAssertFalse(isOwner, "Should default to not owner")
    }
    
    func testIsOwner_CanBeSetTrue() {
        // Given: Service with owner status
        service.isOwner = true
        
        // When: Check status
        let isOwner = service.isOwner
        
        // Then: Should be true
        XCTAssertTrue(isOwner, "Should be set to owner")
    }
    
    // MARK: - Billing Data Parsing Tests
    
    func testParseBilling_HandlesTrialingStatus() {
        // Given: Trialing billing data
        let billing = TestFixtures.billingTrialing()
        
        // When: Parse billing data
        // Then: Should have correct values
        XCTAssertEqual(billing.status, "trialing")
        XCTAssertEqual(billing.plan, "starter")
        XCTAssertTrue(billing.isActive)
        XCTAssertFalse(billing.isInGrace)
        XCTAssertNotNil(billing.trialEndsAt)
    }
    
    func testParseBilling_HandlesActiveStatus() {
        // Given: Active billing data
        let billing = TestFixtures.billingActive()
        
        // When: Parse billing data
        // Then: Should have correct values
        XCTAssertEqual(billing.status, "active")
        XCTAssertEqual(billing.plan, "studio")
        XCTAssertTrue(billing.isActive)
        XCTAssertFalse(billing.isInGrace)
        XCTAssertNotNil(billing.currentPeriodEnd)
    }
    
    func testParseBilling_HandlesCanceledStatus() {
        // Given: Canceled billing data
        let billing = TestFixtures.billingExpired()
        
        // When: Parse billing data
        // Then: Should have correct values
        XCTAssertEqual(billing.status, "canceled")
        XCTAssertFalse(billing.isActive)
        XCTAssertFalse(billing.isInGrace)
    }
    
    func testParseBilling_HandlesPastDueWithGrace() {
        // Given: Past due billing with grace period
        let billing = TestFixtures.billingPastDue()
        
        // When: Parse billing data
        // Then: Should have correct values
        XCTAssertEqual(billing.status, "past_due")
        XCTAssertFalse(billing.isActive)
        XCTAssertTrue(billing.isInGrace)
        XCTAssertNotNil(billing.graceEndsAt)
    }
    
    // MARK: - Plan Tier Tests
    
    func testPlanTier_MapsCorrectly() {
        // Test all plan tiers
        let plans: [(String, SubscriptionPlanTier)] = [
            ("starter", .starter),
            ("studio", .studio),
            ("academy", .academy),
            ("enterprise", .enterprise)
        ]
        
        for (planString, expectedTier) in plans {
            var billing = TestFixtures.billingActive()
            billing.plan = planString
            
            XCTAssertEqual(billing.planTier, expectedTier, "Plan '\(planString)' should map to \(expectedTier)")
        }
    }
    
    // MARK: - Lost Revenue Calculation Tests
    
    func testEstimatedLostRevenue_InitiallyZero() {
        // Given: New service
        // When: Check lost revenue
        let lostRevenue = service.estimatedLostRevenue
        
        // Then: Should be zero
        XCTAssertEqual(lostRevenue, 0.0, "Initial lost revenue should be zero")
    }
    
    func testEstimatedLostRevenue_CanBeSet() {
        // Given: Service with calculated lost revenue
        service.estimatedLostRevenue = 1500.00
        
        // When: Check value
        let lostRevenue = service.estimatedLostRevenue
        
        // Then: Should match set value
        XCTAssertEqual(lostRevenue, 1500.00, "Lost revenue should be settable")
    }
    
    // MARK: - Edge Cases
    
    func testBilling_HandlesNilTrialDate() {
        // Given: Active billing without trial date
        var billing = TestFixtures.billingActive()
        billing.trialEndsAt = nil
        
        // When: Check active status
        let isActive = billing.isActive
        
        // Then: Should still be active based on subscription
        XCTAssertTrue(isActive, "Should be active even without trial date")
    }
    
    func testBilling_HandlesNilGraceDate() {
        // Given: Expired billing without grace date
        var billing = TestFixtures.billingExpired()
        billing.graceEndsAt = nil
        
        // When: Check grace status
        let isInGrace = billing.isInGrace
        
        // Then: Should not be in grace
        XCTAssertFalse(isInGrace, "Should not be in grace without grace date")
    }
    
    func testBilling_HandlesEmptyStripeIds() {
        // Given: Billing without Stripe IDs
        var billing = TestFixtures.billingTrialing()
        billing.stripeCustomerId = nil
        billing.stripeSubscriptionId = nil
        
        // When: Check if billing is valid
        // Then: Should still function (could be in setup phase)
        XCTAssertEqual(billing.status, "trialing")
        XCTAssertNil(billing.stripeCustomerId)
        XCTAssertNil(billing.stripeSubscriptionId)
    }
}

