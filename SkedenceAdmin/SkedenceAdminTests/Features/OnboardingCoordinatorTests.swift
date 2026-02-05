//
//  OnboardingCoordinatorTests.swift
//  SkedenceAdminTests
//
//  Tests for onboarding flow and Phase 6.2 type-safe data model
//

import XCTest
@testable import SkedenceAdmin

final class OnboardingCoordinatorTests: XCTestCase {
    
    var coordinator: OnboardingCoordinator!
    
    override func setUp() {
        super.setUp()
        coordinator = OnboardingCoordinator()
    }
    
    override func tearDown() {
        coordinator = nil
        super.tearDown()
    }
    
    // MARK: - Initialization Tests
    
    func testCoordinator_InitializesWithAccountStep() {
        // When: Create new coordinator
        // Then: Should start at account step
        XCTAssertEqual(coordinator.currentStep, .account)
    }
    
    func testCoordinator_InitializesWithEmptyData() {
        // When: Create new coordinator
        // Then: Data should be empty
        XCTAssertNil(coordinator.data.orgId)
        XCTAssertNil(coordinator.data.userId)
        XCTAssertFalse(coordinator.data.termsAccepted)
        XCTAssertFalse(coordinator.data.privacyAccepted)
        XCTAssertNil(coordinator.data.contactPhone)
        XCTAssertNil(coordinator.data.inviteCode)
    }
    
    // MARK: - Step Progression Tests
    
    func testMoveToNextStep_AdvancesFromAccountToTerms() {
        // Given: At account step
        coordinator.currentStep = .account
        
        // When: Move to next step
        coordinator.moveToNextStep()
        
        // Then: Should be at terms step
        XCTAssertEqual(coordinator.currentStep, .termsOfService)
    }
    
    func testMoveToNextStep_AdvancesThroughAllSteps() {
        // Given: Starting at account
        coordinator.currentStep = .account
        
        // When: Move through all steps
        let expectedSteps: [OnboardingStep] = [
            .termsOfService,
            .businessDetails,
            .inviteCode,
            .location,
            .stripeConnect,
            .packages,
            .complete
        ]
        
        for expectedStep in expectedSteps {
            coordinator.moveToNextStep()
            XCTAssertEqual(coordinator.currentStep, expectedStep)
        }
    }
    
    func testMoveToNextStep_StopsAtComplete() {
        // Given: At complete step
        coordinator.currentStep = .complete
        
        // When: Try to move next
        coordinator.moveToNextStep()
        
        // Then: Should stay at complete
        XCTAssertEqual(coordinator.currentStep, .complete)
    }
    
    func testMoveToPreviousStep_GoesBackFromTermsToAccount() {
        // Given: At terms step
        coordinator.currentStep = .termsOfService
        
        // When: Move to previous
        coordinator.moveToPreviousStep()
        
        // Then: Should be at account
        XCTAssertEqual(coordinator.currentStep, .account)
    }
    
    func testMoveToPreviousStep_StopsAtAccount() {
        // Given: At account step
        coordinator.currentStep = .account
        
        // When: Try to move previous
        coordinator.moveToPreviousStep()
        
        // Then: Should stay at account
        XCTAssertEqual(coordinator.currentStep, .account)
    }
    
    // MARK: - Step Completion Tests
    
    func testIsStepComplete_AccountRequiresOrgId() {
        // Given: No org ID set
        coordinator.data.orgId = nil
        
        // When: Check if account step complete
        let isComplete = coordinator.isStepComplete(.account)
        
        // Then: Should not be complete
        XCTAssertFalse(isComplete)
        
        // When: Set org ID
        coordinator.data.orgId = MockIDGenerator.orgId()
        
        // Then: Should be complete
        XCTAssertTrue(coordinator.isStepComplete(.account))
    }
    
    func testIsStepComplete_TermsRequiresAcceptance() {
        // Given: Terms not accepted
        coordinator.data.termsAccepted = false
        
        // When: Check if terms step complete
        let isComplete = coordinator.isStepComplete(.termsOfService)
        
        // Then: Should not be complete
        XCTAssertFalse(isComplete)
        
        // When: Accept terms
        coordinator.data.termsAccepted = true
        
        // Then: Should be complete
        XCTAssertTrue(coordinator.isStepComplete(.termsOfService))
    }
    
    func testIsStepComplete_BusinessDetailsRequiresPhoneOrEmail() {
        // Given: No contact info
        coordinator.data.contactPhone = nil
        coordinator.data.contactEmail = nil
        
        // When: Check if business details complete
        var isComplete = coordinator.isStepComplete(.businessDetails)
        
        // Then: Should not be complete
        XCTAssertFalse(isComplete)
        
        // When: Set phone only
        coordinator.data.contactPhone = "+1234567890"
        isComplete = coordinator.isStepComplete(.businessDetails)
        
        // Then: Should be complete
        XCTAssertTrue(isComplete)
        
        // When: Clear phone, set email
        coordinator.data.contactPhone = nil
        coordinator.data.contactEmail = "test@example.com"
        isComplete = coordinator.isStepComplete(.businessDetails)
        
        // Then: Should still be complete
        XCTAssertTrue(isComplete)
    }
    
    func testIsStepComplete_InviteCodeRequiresCode() {
        // Given: No invite code
        coordinator.data.inviteCode = nil
        
        // When: Check if invite code step complete
        let isComplete = coordinator.isStepComplete(.inviteCode)
        
        // Then: Should not be complete
        XCTAssertFalse(isComplete)
        
        // When: Set invite code
        coordinator.data.inviteCode = "TEST123"
        
        // Then: Should be complete
        XCTAssertTrue(coordinator.isStepComplete(.inviteCode))
    }
    
    func testIsStepComplete_LocationIsAlwaysComplete() {
        // Given: Empty location data
        coordinator.data.firstLocationId = nil
        
        // When: Check if location step complete
        let isComplete = coordinator.isStepComplete(.location)
        
        // Then: Should be complete (optional step)
        XCTAssertTrue(isComplete)
    }
    
    func testIsStepComplete_StripeRequiresCompletion() {
        // Given: Stripe not complete
        coordinator.data.stripeComplete = false
        
        // When: Check if Stripe step complete
        let isComplete = coordinator.isStepComplete(.stripeConnect)
        
        // Then: Should not be complete
        XCTAssertFalse(isComplete)
        
        // When: Mark Stripe complete
        coordinator.data.stripeComplete = true
        
        // Then: Should be complete
        XCTAssertTrue(coordinator.isStepComplete(.stripeConnect))
    }
    
    func testIsStepComplete_PackagesRequiresCompletion() {
        // Given: Packages not complete
        coordinator.data.packagesComplete = false
        
        // When: Check if packages step complete
        let isComplete = coordinator.isStepComplete(.packages)
        
        // Then: Should not be complete
        XCTAssertFalse(isComplete)
        
        // When: Mark packages complete
        coordinator.data.packagesComplete = true
        
        // Then: Should be complete
        XCTAssertTrue(coordinator.isStepComplete(.packages))
    }
    
    func testIsStepComplete_CompleteIsAlwaysComplete() {
        // When: Check if complete step is complete
        let isComplete = coordinator.isStepComplete(.complete)
        
        // Then: Should always be complete
        XCTAssertTrue(isComplete)
    }
    
    // MARK: - Skip Logic Tests
    
    func testCanSkipStep_LocationCanBeSkipped() {
        // When: Check if location can be skipped
        let canSkip = coordinator.canSkipStep(.location)
        
        // Then: Should be skippable
        XCTAssertTrue(canSkip)
    }
    
    func testCanSkipStep_AccountCannotBeSkipped() {
        // When: Check if account can be skipped
        let canSkip = coordinator.canSkipStep(.account)
        
        // Then: Should not be skippable
        XCTAssertFalse(canSkip)
    }
    
    func testCanSkipStep_TermsCannotBeSkipped() {
        // When: Check if terms can be skipped
        let canSkip = coordinator.canSkipStep(.termsOfService)
        
        // Then: Should not be skippable
        XCTAssertFalse(canSkip)
    }
    
    // MARK: - Phase 6.2: Type-Safe Data Model Tests
    
    func testOnboardingData_StoresTypedOrgId() {
        // When: Set org ID
        let testOrgId = MockIDGenerator.orgId()
        coordinator.data.orgId = testOrgId
        
        // Then: Should retrieve same value
        XCTAssertEqual(coordinator.data.orgId, testOrgId)
    }
    
    func testOnboardingData_StoresTypedUserId() {
        // When: Set user ID
        let testUserId = MockIDGenerator.userId()
        coordinator.data.userId = testUserId
        
        // Then: Should retrieve same value
        XCTAssertEqual(coordinator.data.userId, testUserId)
    }
    
    func testOnboardingData_StoresOrganizationName() {
        // When: Set organization name
        coordinator.data.organizationName = "Test Gym"
        
        // Then: Should retrieve same value
        XCTAssertEqual(coordinator.data.organizationName, "Test Gym")
    }
    
    func testOnboardingData_StoresContactInfo() {
        // When: Set contact information
        coordinator.data.contactPhone = "+1234567890"
        coordinator.data.contactEmail = "test@example.com"
        coordinator.data.website = "https://testgym.com"
        
        // Then: Should retrieve same values
        XCTAssertEqual(coordinator.data.contactPhone, "+1234567890")
        XCTAssertEqual(coordinator.data.contactEmail, "test@example.com")
        XCTAssertEqual(coordinator.data.website, "https://testgym.com")
    }
    
    func testOnboardingData_StoresTypedAddress() {
        // When: Set address
        let address = OnboardingData.Address(
            line1: "123 Test St",
            line2: "Suite 100",
            city: "Test City",
            state: "TS",
            zipCode: "12345"
        )
        coordinator.data.address = address
        
        // Then: Should retrieve same address
        XCTAssertNotNil(coordinator.data.address)
        XCTAssertEqual(coordinator.data.address?.line1, "123 Test St")
        XCTAssertEqual(coordinator.data.address?.line2, "Suite 100")
        XCTAssertEqual(coordinator.data.address?.city, "Test City")
        XCTAssertEqual(coordinator.data.address?.state, "TS")
        XCTAssertEqual(coordinator.data.address?.zipCode, "12345")
    }
    
    func testOnboardingData_StoresBooleanFlags() {
        // When: Set boolean flags
        coordinator.data.termsAccepted = true
        coordinator.data.privacyAccepted = true
        coordinator.data.stripeComplete = true
        coordinator.data.packagesComplete = true
        
        // Then: Should retrieve same values
        XCTAssertTrue(coordinator.data.termsAccepted)
        XCTAssertTrue(coordinator.data.privacyAccepted)
        XCTAssertTrue(coordinator.data.stripeComplete)
        XCTAssertTrue(coordinator.data.packagesComplete)
    }
    
    func testOnboardingData_HandlesOptionalFields() {
        // When: Leave optional fields nil
        coordinator.data.contactEmail = nil
        coordinator.data.website = nil
        coordinator.data.address = nil
        coordinator.data.inviteCode = nil
        
        // Then: Should handle nil gracefully
        XCTAssertNil(coordinator.data.contactEmail)
        XCTAssertNil(coordinator.data.website)
        XCTAssertNil(coordinator.data.address)
        XCTAssertNil(coordinator.data.inviteCode)
    }
    
    func testOnboardingData_BackwardCompatibilityWithConvenienceAccessors() {
        // When: Set values using data model
        let testOrgId = MockIDGenerator.orgId()
        let testUserId = MockIDGenerator.userId()
        coordinator.data.orgId = testOrgId
        coordinator.data.userId = testUserId
        
        // Then: Should be accessible via convenience accessors
        XCTAssertEqual(coordinator.orgId, testOrgId)
        XCTAssertEqual(coordinator.userId, testUserId)
        
        // When: Set via convenience accessors
        let newOrgId = MockIDGenerator.orgId()
        coordinator.orgId = newOrgId
        
        // Then: Should update data model
        XCTAssertEqual(coordinator.data.orgId, newOrgId)
    }
    
    func testOnboardingData_StoresPackageIds() {
        // When: Add package IDs
        let packageIds = [MockIDGenerator.packageId(), MockIDGenerator.packageId()]
        coordinator.data.createdPackageIds = packageIds
        
        // Then: Should store array
        XCTAssertEqual(coordinator.data.createdPackageIds.count, 2)
        XCTAssertEqual(coordinator.data.createdPackageIds, packageIds)
    }
    
    // MARK: - Progress Calculation Tests
    
    func testStepProgress_CalculatesCorrectly() {
        // Test progress for each step
        XCTAssertEqual(OnboardingStep.account.progress, 1.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.termsOfService.progress, 2.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.businessDetails.progress, 3.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.inviteCode.progress, 4.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.location.progress, 5.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.stripeConnect.progress, 6.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.packages.progress, 7.0 / 8.0, accuracy: 0.01)
        XCTAssertEqual(OnboardingStep.complete.progress, 8.0 / 8.0, accuracy: 0.01)
    }
    
    func testStepTitles_AreCorrect() {
        // Test each step has proper title
        XCTAssertEqual(OnboardingStep.account.title, "Account")
        XCTAssertEqual(OnboardingStep.termsOfService.title, "Terms & Privacy")
        XCTAssertEqual(OnboardingStep.businessDetails.title, "Business Details")
        XCTAssertEqual(OnboardingStep.inviteCode.title, "Invite Code")
        XCTAssertEqual(OnboardingStep.location.title, "Location")
        XCTAssertEqual(OnboardingStep.stripeConnect.title, "Payments")
        XCTAssertEqual(OnboardingStep.packages.title, "Packages")
        XCTAssertEqual(OnboardingStep.complete.title, "Complete")
    }
    
    // MARK: - Integration Tests
    
    func testCompleteOnboardingFlow_AllDataPersists() {
        // Given: Complete onboarding data
        let testData = TestFixtures.onboardingDataComplete()
        coordinator.data = testData
        
        // When: Check all steps complete
        let allStepsComplete = OnboardingStep.allCases.allSatisfy { step in
            coordinator.isStepComplete(step)
        }
        
        // Then: All steps should be complete
        XCTAssertTrue(allStepsComplete, "All steps should be complete with full data")
    }
    
    func testPartialOnboardingFlow_OnlyCompletedStepsPass() {
        // Given: Partial onboarding data (through business details)
        coordinator.data = TestFixtures.onboardingDataWithTerms()
        coordinator.data.contactPhone = "+1234567890"
        
        // When: Check which steps are complete
        let completedSteps: [OnboardingStep] = [.account, .termsOfService, .businessDetails]
        let incompleteSteps: [OnboardingStep] = [.inviteCode, .stripeConnect, .packages]
        
        // Then: Only completed steps should pass
        for step in completedSteps {
            XCTAssertTrue(coordinator.isStepComplete(step), "\(step.title) should be complete")
        }
        
        for step in incompleteSteps {
            XCTAssertFalse(coordinator.isStepComplete(step), "\(step.title) should not be complete")
        }
    }
}
