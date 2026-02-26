# Phase 7.1: Testing Infrastructure Analysis

**Date:** February 4, 2026  
**Status:** ✅ COMPLETE  
**Next Phase:** 7.2 - Test Implementation

---

## Executive Summary

Phase 7.1 analyzed the SkedenceAdmin codebase to identify testing needs and establish a comprehensive testing strategy. The analysis revealed:

- **Zero production test coverage** - Only boilerplate test files exist
- **66 Service files** with complex business logic untested
- **5 ViewModels** managing critical UI state without tests
- **19 Onboarding files** with multi-step flow logic untested
- **30+ Cloud Functions** handling critical payment and booking operations

**Priority Level:** MEDIUM-HIGH  
**Estimated Implementation Time:** 2-3 days (Phase 7.2)

---

## 1. Current Test Coverage Analysis

### 1.1 Existing Test Files

**Location:** `SkedenceAdmin/SkedenceAdminTests/`

**Files Found:**
- `PolyCalTests.swift` - Empty boilerplate test class
- `PolyCalTests 2.swift` - Duplicate boilerplate (should be deleted)

**Current Coverage:** 0%

**Assessment:**
- No actual tests implemented
- Only XCTest scaffolding exists
- Legacy file naming (PolyCalTests from old project name)
- Duplicate files indicate abandoned test setup

### 1.2 Test Infrastructure Status

❌ No mock objects  
❌ No test helpers  
❌ No protocol-based dependency injection  
❌ No test fixtures or sample data  
❌ No integration test setup  
❌ Services tightly coupled to Firebase (untestable)

---

## 2. Critical Components Requiring Tests

### 2.1 HIGH PRIORITY - Business Logic Services

#### Subscription & Billing Logic
**Risk Level:** 🔴 CRITICAL

Files requiring urgent test coverage:

1. **SubscriptionEnforcementService.swift** (258 lines)
   - Subscription status validation
   - Trial period management
   - Grace period calculations
   - Legacy billing data migration
   - Lost revenue calculations
   - Owner permission checks
   
   **Why Critical:**
   - Controls app access based on subscription
   - Financial implications of bugs
   - Complex state management with multiple date-based conditions
   - Migration logic could corrupt data if wrong

2. **SubscriptionStatusService.swift**
   - Read-only mode enforcement
   - Organization access validation
   - Real-time subscription monitoring
   
   **Why Critical:**
   - Prevents access when subscription expires
   - Wrong logic = lost revenue or angry customers

3. **OrganizationBilling.swift**
   - Billing state computations
   - Subscription tier logic
   - Date comparisons for expiration
   
   **Why Critical:**
   - Wrong tier = wrong features or pricing

#### Booking & Scheduling Logic
**Risk Level:** 🟡 HIGH

4. **ScheduleRepository.swift**
   - Slot availability calculations
   - Conflict detection
   - Booking state management
   
   **Test Focus:**
   - Double-booking prevention
   - Time zone handling
   - Concurrent booking scenarios

5. **ClassesService.swift**
   - Class capacity management
   - Registration validation
   - Participant tracking
   
   **Test Focus:**
   - Capacity overflow prevention
   - Duplicate registration blocking
   - Waitlist logic

#### Package & Payment Logic
**Risk Level:** 🟡 HIGH

6. **PackagesService.swift**
   - Package validation
   - Expiration checking
   - Remaining lessons calculations
   
   **Test Focus:**
   - Prevent booking with expired packages
   - Accurate usage tracking
   - Refund calculations

7. **ClientsRepository.swift**
   - Client data management
   - Package associations
   - Booking history aggregation

### 2.2 MEDIUM PRIORITY - ViewModels

**Files:** 5 ViewModels identified

1. **ScheduleViewModel.swift** (~500+ lines)
   - Week-based schedule state
   - Slot filtering and grouping
   - Class participant prefetching
   - Booking selection state
   
   **Test Focus:**
   - Date range calculations
   - Slot filtering logic
   - State updates on data changes

2. **SuperAdminViewModel.swift** (3 classes: SuperAdminViewModel, CreateOrgViewModel, AddTrainerViewModel)
   - Organization CRUD operations
   - Trainer management
   - Super admin permission checks
   
   **Test Focus:**
   - Permission validation
   - Data validation before Firestore writes
   - Error handling

3. **SetupChecklistViewModel.swift**
   - Onboarding completion tracking
   - Setup step validation
   
   **Test Focus:**
   - Completion state calculations
   - Progress tracking accuracy

### 2.3 MEDIUM PRIORITY - Onboarding Flow

**Files:** 19 files in Features/Onboarding/

**Recently Refactored:** Phase 6.2 (Type-safe data model)

**Test Focus:**
- **OnboardingCoordinator** step progression logic
- **OnboardingData** struct validation
- Step completion checks (`isStepComplete()`)
- Data persistence between steps
- Navigation flow (forward/backward/skip)

**Why Important:**
- Poor onboarding = user drop-off
- Type-safe refactor needs verification
- Multi-step flows prone to state bugs

### 2.4 LOW-MEDIUM PRIORITY - Utilities & Services

8. **AuthManager.swift** - Authentication state management
9. **TemplateService.swift** - Template CRUD operations
10. **LocationsService.swift** - Location management
11. **TrainersService.swift** - Trainer CRUD operations
12. **SettingsService.swift** - Organization settings management
13. **AnalyticsService.swift** - Analytics tracking
14. **CrashlyticsService.swift** - Error logging

---

## 3. Cloud Functions Test Requirements

### 3.1 Critical Functions (HIGH Priority)

**Location:** `SkedenceAdmin/functions/src/`

#### Booking Operations
1. **bookLesson** - Books 1-on-1 lessons
   - Package validation
   - Slot marking
   - Usage decrementing
   - Dual-path package support
   
2. **registerForClass** - Class registration
   - Capacity checking
   - Package consumption
   - Participant tracking
   
3. **cancelLesson** - Lesson cancellation
   - Refund calculations
   - Package credit restoration
   - Notification triggers

4. **adminCancelLesson** - Admin-initiated cancellation
   - Permission validation
   - Credit handling

#### Subscription & Billing
5. **validateAppleReceipt** (appleIAP.ts)
   - Receipt verification with Apple
   - Subscription sync to Firestore
   - Fraud prevention

6. **stripeWebhook** (stripeWebhooks.ts)
   - Payment confirmation
   - Subscription updates
   - Failed payment handling

7. **createSubscription** (billing.ts)
   - Stripe subscription creation
   - Plan validation
   - Customer creation

8. **updateSubscription** (billing.ts)
   - Plan upgrades/downgrades
   - Proration calculations

#### Access Control
9. **checkOrgAccess** (quotas.ts)
   - Subscription validation
   - Read-only enforcement
   - Grace period checking

10. **checkQuota** (quotas.ts)
    - Resource limit enforcement
    - Plan-based quotas
    - Rate limiting

### 3.2 Test Strategy for Cloud Functions

**Approach:** Unit tests with mocked Firebase Admin SDK

**Tools:**
- Jest (already configured in functions/)
- Firebase Functions Test SDK
- Mock Firestore data

**Test Structure:**
```
functions/
  ├── src/
  │   └── *.ts
  └── test/
      ├── setup.ts
      ├── mocks/
      │   ├── firestore.ts
      │   ├── stripe.ts
      │   └── auth.ts
      └── unit/
          ├── booking.test.ts
          ├── billing.test.ts
          ├── quotas.test.ts
          └── webhooks.test.ts
```

---

## 4. Recommended Test Infrastructure

### 4.1 iOS App Test Structure

```
SkedenceAdminTests/
  ├── Helpers/
  │   ├── TestHelpers.swift          # Common test utilities
  │   ├── MockFirestore.swift        # Firestore mock
  │   └── TestFixtures.swift         # Sample data generators
  │
  ├── Mocks/
  │   ├── Services/
  │   │   ├── MockAuthManager.swift
  │   │   ├── MockSubscriptionEnforcementService.swift
  │   │   ├── MockScheduleRepository.swift
  │   │   ├── MockClientsRepository.swift
  │   │   └── MockPackagesService.swift
  │   └── Firebase/
  │       └── MockFirestoreDocument.swift
  │
  ├── Services/
  │   ├── SubscriptionTests/
  │   │   ├── SubscriptionEnforcementServiceTests.swift
  │   │   ├── SubscriptionStatusServiceTests.swift
  │   │   └── OrganizationBillingTests.swift
  │   ├── BookingTests/
  │   │   ├── ScheduleRepositoryTests.swift
  │   │   └── ClassesServiceTests.swift
  │   ├── BusinessLogicTests/
  │   │   ├── PackagesServiceTests.swift
  │   │   ├── ClientsRepositoryTests.swift
  │   │   └── TrainersServiceTests.swift
  │   └── UtilityTests/
  │       ├── TemplateServiceTests.swift
  │       └── AnalyticsServiceTests.swift
  │
  ├── ViewModels/
  │   ├── ScheduleViewModelTests.swift
  │   ├── SuperAdminViewModelTests.swift
  │   └── SetupChecklistViewModelTests.swift
  │
  ├── Features/
  │   └── OnboardingTests/
  │       ├── OnboardingCoordinatorTests.swift
  │       ├── OnboardingDataTests.swift
  │       └── OnboardingFlowTests.swift
  │
  └── Integration/
      ├── SubscriptionFlowTests.swift
      └── BookingFlowTests.swift
```

### 4.2 Dependency Injection Refactoring

**Current Problem:** Services use singletons and directly instantiate Firebase

**Solution:** Protocol-based dependency injection

**Example Refactor:**

```swift
// Before
class SubscriptionEnforcementService {
    private let db = Firestore.firestore()
    
    func startMonitoring(organizationId: String) {
        listener = db.collection("organizations")...
    }
}

// After
protocol FirestoreProvider {
    func collection(_ path: String) -> CollectionReference
}

class SubscriptionEnforcementService {
    private let db: FirestoreProvider
    
    init(db: FirestoreProvider = FirebaseFirestoreProvider()) {
        self.db = db
    }
    
    func startMonitoring(organizationId: String) {
        listener = db.collection("organizations")...
    }
}

// Test
class MockFirestoreProvider: FirestoreProvider {
    var mockData: [String: Any] = [:]
    
    func collection(_ path: String) -> CollectionReference {
        return MockCollectionReference(data: mockData)
    }
}
```

### 4.3 Test Fixtures & Sample Data

**Create reusable test data:**

```swift
struct TestFixtures {
    static func subscriptionTrialing() -> OrganizationBilling {
        OrganizationBilling(
            status: "trialing",
            plan: "starter",
            trialEndsAt: Date().addingTimeInterval(86400 * 7),
            currentPeriodEnd: nil,
            graceEndsAt: nil,
            stripeCustomerId: "cus_test123",
            stripeSubscriptionId: "sub_test123",
            isActive: true,
            isInGrace: false
        )
    }
    
    static func subscriptionExpired() -> OrganizationBilling { ... }
    static func subscriptionActive() -> OrganizationBilling { ... }
    static func subscriptionPastDue() -> OrganizationBilling { ... }
}
```

---

## 5. Priority Test Cases by Component

### 5.1 SubscriptionEnforcementService (CRITICAL)

**Test Suite:** `SubscriptionEnforcementServiceTests.swift`

**Priority Test Cases:**

1. **Trial Period Management**
   ```swift
   func testTrialPeriodIsActive_WhenTrialNotExpired()
   func testTrialPeriodExpires_WhenDatePassed()
   func testLegacyBillingMigration_CreatesTrialPeriod()
   ```

2. **Subscription Status Validation**
   ```swift
   func testCanPerformAction_BlocksWhenExpired()
   func testCanPerformAction_AllowsReadOnlyWhenPastDue()
   func testCanPerformAction_AllowsAllWhenActive()
   func testCanPerformAction_AllowsDuringGracePeriod()
   ```

3. **Grace Period Logic**
   ```swift
   func testGracePeriod_Calculates7DaysFromExpiration()
   func testGracePeriod_ExpiresAfter7Days()
   func testGracePeriod_AllowsModification()
   ```

4. **Owner Permission Checks**
   ```swift
   func testIsOwner_ReturnsTrueForOwner()
   func testIsOwner_ReturnsFalseForNonOwner()
   func testIsOwner_RequiredForUpgrade()
   ```

5. **Lost Revenue Calculation**
   ```swift
   func testLostRevenue_CalculatesFromBookings()
   func testLostRevenue_IgnoresCancelledBookings()
   func testLostRevenue_UsesCorrectPlanPrice()
   ```

### 5.2 ScheduleViewModel (HIGH)

**Test Suite:** `ScheduleViewModelTests.swift`

1. **Week Calculation**
   ```swift
   func testLoadWeekSchedule_CalculatesCorrectDateRange()
   func testLoadWeekSchedule_HandlesCrossingMonthBoundary()
   func testLoadWeekSchedule_HandlesCrossingYearBoundary()
   ```

2. **Slot Filtering**
   ```swift
   func testFilterSlots_GroupsByDay()
   func testFilterSlots_SortsByTime()
   func testFilterSlots_ExcludesPastSlots()
   ```

3. **Class Participant Prefetching**
   ```swift
   func testPrefetchParticipants_LoadsForVisibleClasses()
   func testPrefetchParticipants_CachesResults()
   func testPrefetchParticipants_HandlesEmptyClasses()
   ```

### 5.3 OnboardingCoordinator (MEDIUM)

**Test Suite:** `OnboardingCoordinatorTests.swift`

1. **Step Progression**
   ```swift
   func testMoveToNextStep_AdvancesStep()
   func testMoveToNextStep_StopsAtComplete()
   func testMoveToPreviousStep_GoesBack()
   func testMoveToPreviousStep_StopsAtFirst()
   ```

2. **Step Completion**
   ```swift
   func testIsStepComplete_AccountRequiresOrgId()
   func testIsStepComplete_TermsRequiresAcceptance()
   func testIsStepComplete_BusinessDetailsRequiresPhoneOrEmail()
   func testIsStepComplete_LocationIsOptional()
   ```

3. **Type-Safe Data Model**
   ```swift
   func testOnboardingData_StoresTypedValues()
   func testOnboardingData_HandlesOptionalFields()
   func testOnboardingData_BackwardCompatibility()
   ```

### 5.4 Cloud Functions (CRITICAL)

**Test Suite:** `functions/test/unit/booking.test.ts`

1. **bookLesson Function**
   ```typescript
   test('bookLesson validates package has remaining lessons')
   test('bookLesson prevents booking with expired package')
   test('bookLesson decrements package usage')
   test('bookLesson marks slot as booked')
   test('bookLesson rejects class packages')
   test('bookLesson enforces org quotas')
   test('bookLesson creates booking document with all fields')
   ```

2. **registerForClass Function**
   ```typescript
   test('registerForClass checks capacity')
   test('registerForClass prevents double registration')
   test('registerForClass validates class package')
   test('registerForClass increments currentParticipants')
   test('registerForClass adds to participantIds array')
   ```

3. **Webhook Handlers**
   ```typescript
   test('stripeWebhook verifies signature')
   test('stripeWebhook updates subscription status')
   test('stripeWebhook handles failed payment')
   test('stripeWebhook creates grace period')
   ```

---

## 6. Testing Tools & Dependencies

### 6.1 iOS Testing Stack

**Framework:** XCTest (built-in)

**Additional Libraries:**
```swift
// SPM Dependencies to add
.package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.10.0"),
.package(url: "https://github.com/Quick/Nimble", from: "12.0.0")
```

**Mock Firebase:**
- Manually create protocol wrappers
- OR use [FirebaseMock](https://github.com/firebase/firebase-ios-sdk/tree/master/FirebaseAuth/Tests/Unit)

### 6.2 Cloud Functions Testing Stack

**Current Setup:** (check `functions/package.json`)
```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "firebase-functions-test": "^3.0.0"
  }
}
```

**Additional Tools Needed:**
- `@shelf/jest-mongodb` - If testing Firestore locally
- `stripe-mock` - Mock Stripe API responses
- `nock` - HTTP mocking for webhook tests

---

## 7. Risk Assessment

### 7.1 Risks of NOT Testing

| Component | Bug Impact | Revenue Risk | User Experience Risk |
|-----------|------------|--------------|---------------------|
| Subscription Enforcement | App access during expired trial | **HIGH** - Lost revenue | **CRITICAL** - Broken app |
| Booking Logic | Double bookings, conflicts | **MEDIUM** - Reputation | **HIGH** - Client complaints |
| Package Validation | Booking with expired pass | **LOW** - Small loss | **HIGH** - User frustration |
| Cloud Functions | Payment failures | **HIGH** - Payment issues | **CRITICAL** - Broken payments |
| Onboarding Flow | User drop-off | **HIGH** - Lost customers | **MEDIUM** - Confusion |

### 7.2 Cost-Benefit Analysis

**Cost to Implement Tests:**
- **Time:** 2-3 days (Phase 7.2)
- **Complexity:** Medium (need dependency injection refactoring)
- **Maintenance:** Low (once set up)

**Benefits:**
- **Prevent Production Bugs:** Catch subscription/billing errors before deployment
- **Faster Development:** Confidence to refactor without fear
- **Regression Prevention:** Ensure Phase 6.2 refactor didn't break anything
- **Documentation:** Tests serve as living documentation
- **Onboarding:** New developers understand logic through tests

**ROI:** HIGH - Critical systems untested is high-risk

---

## 8. Recommended Implementation Order (Phase 7.2)

### Week 1: Foundation + Critical Tests

**Day 1: Test Infrastructure (4 hours)**
1. Delete duplicate `PolyCalTests 2.swift`
2. Rename `PolyCalTests.swift` → `SubscriptionEnforcementServiceTests.swift`
3. Create test folder structure
4. Create `TestHelpers.swift` and `TestFixtures.swift`
5. Set up dependency injection for `SubscriptionEnforcementService`

**Day 2: Subscription Tests (6 hours)**
6. Write 20+ test cases for `SubscriptionEnforcementService`
7. Write 10+ test cases for `OrganizationBilling`
8. Write 10+ test cases for `SubscriptionStatusService`
9. Verify all subscription logic paths covered

**Day 3: ViewModel Tests (6 hours)**
10. Write 15+ test cases for `ScheduleViewModel`
11. Write 10+ test cases for `SuperAdminViewModel`
12. Write 5+ test cases for `SetupChecklistViewModel`

### Week 2: Onboarding + Cloud Functions

**Day 4: Onboarding Tests (4 hours)**
13. Write 15+ test cases for `OnboardingCoordinator`
14. Write 10+ test cases for onboarding step completion logic
15. Verify Phase 6.2 refactor integrity

**Day 5: Cloud Functions Setup (6 hours)**
16. Set up Jest test environment for functions
17. Create mock Firestore helpers
18. Create mock Stripe client
19. Write test utilities for webhook validation

**Day 6: Critical Function Tests (6 hours)**
20. Write 20+ test cases for `bookLesson`
21. Write 15+ test cases for `registerForClass`
22. Write 10+ test cases for `stripeWebhook`
23. Write 10+ test cases for `checkOrgAccess` and quotas

---

## 9. Success Metrics

**Phase 7.2 will be considered COMPLETE when:**

✅ **iOS App:**
- [ ] 50+ test cases written
- [ ] 60%+ code coverage for Services/
- [ ] 80%+ code coverage for SubscriptionEnforcementService
- [ ] All ViewModels have basic test coverage
- [ ] Onboarding flow has comprehensive tests
- [ ] All tests pass in CI/CD

✅ **Cloud Functions:**
- [ ] 40+ test cases written
- [ ] 70%+ code coverage for critical functions
- [ ] Booking operations fully tested
- [ ] Webhook handlers fully tested
- [ ] Quota/access control fully tested

✅ **Infrastructure:**
- [ ] Mock objects for all Firebase dependencies
- [ ] Test helpers and fixtures created
- [ ] Dependency injection implemented
- [ ] CI/CD integration (GitHub Actions)

---

## 10. Long-Term Testing Strategy

### Beyond Phase 7.2

**Phase 7.3 (Future):** Integration Tests
- End-to-end booking flow
- Payment processing flow
- Subscription upgrade flow

**Phase 7.4 (Future):** UI Tests
- Onboarding flow walkthrough
- Schedule view interactions
- Client management operations

**Phase 7.5 (Future):** Performance Tests
- Load testing for Cloud Functions
- Firestore query optimization
- Memory leak detection

---

## 11. Phase 7.1 Completion Summary

### ✅ Analysis Complete

**What Was Analyzed:**
- ✅ Current test coverage (0%)
- ✅ 66 Service files reviewed
- ✅ 5 ViewModels identified
- ✅ 19 Onboarding files assessed
- ✅ 30+ Cloud Functions catalogued
- ✅ Risk assessment completed
- ✅ Test infrastructure designed

**Key Findings:**
1. No meaningful test coverage exists
2. Subscription/billing logic is critical untested code
3. Cloud Functions handle payment operations without tests
4. Services tightly coupled to Firebase (need dependency injection)
5. Phase 6.2 refactor needs verification through tests

**Recommendations:**
- Prioritize subscription/billing tests (highest risk)
- Implement dependency injection for testability
- Create comprehensive test fixtures
- Set up Cloud Functions test environment
- Target 60% code coverage minimum

### 📋 Ready for Phase 7.2

**Next Steps:**
1. Get approval for Phase 7.2 implementation
2. Allocate 2-3 days for test development
3. Follow recommended implementation order
4. Track progress against success metrics

**Estimated Effort:** 2-3 days  
**Risk Reduction:** HIGH  
**Business Value:** HIGH (prevents revenue loss from subscription bugs)

---

**Phase 7.1 Status:** ✅ **COMPLETE**  
**Ready to proceed:** Phase 7.2 - Test Implementation
