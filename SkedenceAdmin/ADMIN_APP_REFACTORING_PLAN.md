# SkedenceAdmin App - Comprehensive Refactoring Plan

**Date Created:** February 4, 2026  
**Current State:** App is functional but has significant architectural debt  
**Estimated Time:** 2-3 weeks for full refactor, 4-6 days for targeted approach

---

## Executive Summary

The SkedenceAdmin app has grown organically and shows signs of technical debt similar to the client app:
- **Massive view files** (AdminPanelView: 1,794 lines, ClientCardView: 1,204 lines)
- **Inconsistent service layer** patterns across 18+ services
- **Duplicate code** (ClientCardView vs ClientCardViewOld, PricingPlan backup files)
- **Complex onboarding flow** (12 separate onboarding views without clear coordinator pattern)
- **State management** scattered across multiple @StateObject and @Published properties
- **Debug code proliferation** (~100+ print statements)

**Recommendation:** Implement a **phased, incremental refactor** over 5-7 days to dramatically improve maintainability.

---

## Current State Assessment

### Files & Lines of Code:
- **Total Swift files:** 94 files (all in root directory)
- **Total lines:** ~29,000 lines
- **Largest files:**
  - AdminPanelView.swift (1,794 lines) ⚠️
  - ClientCardView.swift (1,204 lines) ⚠️
  - SuperAdminView.swift (1,045 lines) ⚠️
  - FirestoreService.swift (1,031 lines) ⚠️
  - ScheduleView.swift (1,027 lines) ⚠️

### Major Pain Points:
1. **Zero folder organization** - all 94 Swift files in root directory
2. **Duplicate/backup files** - ClientCardViewOld, PricingPlan.backup
3. **ViewModels mixed with Views** - ScheduleViewModel, SuperAdminViewModel separate but not organized
4. **Services inconsistency** - Mix of protocols, repositories, and direct Firebase calls
5. **Onboarding complexity** - 12 views + coordinator with scattered state

---

## Phase 1: Critical View Decomposition (Priority: URGENT)
**Time Estimate:** 2-3 days

### 1.1 AdminPanelView Refactoring (1,794 lines → 200 lines)
**Current Issues:**
- 1,794 lines in single file
- 6 tabs all implemented in one file
- Pass management, pricing, locations, classes, wallet, settings mixed together
- 20+ @State properties at root level

**Refactoring Strategy:**
```
AdminPanel/
  ├── AdminPanelView.swift (main container, 200 lines)
  ├── Tabs/
  │   ├── PassesTabView.swift
  │   ├── ClassesTabView.swift
  │   ├── LocationsTabView.swift
  │   ├── WalletTabView.swift
  │   ├── PricingTabView.swift
  │   └── SettingsTabView.swift
  └── Components/
      ├── PassManagementCard.swift
      ├── PricingTierEditor.swift
      └── OrganizationCodeView.swift
```

**Benefits:**
- Each tab under 300 lines
- Clear separation of concerns
- Easier to test individual tabs
- Can work on tabs in parallel

---

### 1.2 ClientCardView Simplification (1,204 lines → 300 lines)
**Current Issues:**
- 1,204 lines showing client details, bookings, classes, documents, packages
- Duplicate version (ClientCardViewOld.swift - 400+ lines)
- Complex nested state management

**Refactoring Strategy:**
```
Clients/
  ├── ClientCardView.swift (main container, 300 lines)
  ├── Sections/
  │   ├── ClientInfoSection.swift
  │   ├── BookingsSection.swift
  │   ├── ClassesSection.swift
  │   ├── PackagesSection.swift
  │   └── DocumentsSection.swift
  └── Actions/
      ├── AddPassSheet.swift
      ├── CancelBookingSheet.swift
      └── SendMessageSheet.swift
```

**Action Items:**
- ✅ Delete ClientCardViewOld.swift (duplicate)
- Refactor into sections
- Extract action sheets

---

### 1.3 SuperAdminView Decomposition (1,045 lines → 250 lines)
**Current Issues:**
- 1,045 lines with multiple admin functions
- User management, org management, analytics all mixed
- SuperAdminViewModel separate but tightly coupled

**Refactoring Strategy:**
```
SuperAdmin/
  ├── SuperAdminView.swift (main container, 250 lines)
  ├── SuperAdminViewModel.swift
  ├── Sections/
  │   ├── UserManagementSection.swift
  │   ├── OrganizationManagementSection.swift
  │   ├── AnalyticsSection.swift
  │   └── SystemHealthSection.swift
  └── Components/
      ├── UserRow.swift
      ├── OrgRow.swift
      └── AnalyticsCard.swift
```

---

### 1.4 Schedule Views Consolidation
**Current Issues:**
- ScheduleView.swift (1,027 lines)
- ScheduleViewModel.swift (689 lines)
- DayScheduleView.swift (464 lines)
- TrainerWeekView.swift (793 lines)
- AllTrainersDayView.swift (969 lines)
- **Total: 3,942 lines of scheduling code**

**Refactoring Strategy:**
```
Schedule/
  ├── ScheduleView.swift (main container)
  ├── ScheduleViewModel.swift (business logic)
  ├── Views/
  │   ├── DayScheduleView.swift
  │   ├── WeekScheduleView.swift
  │   ├── AllTrainersView.swift
  │   └── TrainerWeekView.swift
  ├── Components/
  │   ├── TimeSlotCard.swift
  │   ├── BookingCell.swift
  │   ├── ClassCell.swift
  │   └── HourRow.swift
  └── Sheets/
      ├── AvailabilityEditorSheet.swift
      └── SessionDetailView.swift
```

---

### 1.5 Onboarding Flow Cleanup (12 views → organized structure)
**Current Issues:**
- 12 separate onboarding view files all in root
- OnboardingCoordinator.swift managing complex state
- Inconsistent navigation patterns

**Files to Organize:**
- OnboardingAccountView
- OnboardingBusinessDetailsView
- OnboardingCompleteView
- OnboardingContinueView
- OnboardingCoordinator
- OnboardingFlowView
- OnboardingInviteCodeView
- OnboardingLandingView
- OnboardingLocationView
- OnboardingOrphanedAccountView
- OnboardingPackagesView
- OnboardingProgress
- OnboardingStripeView
- OnboardingStripeViewDirect
- OnboardingTemplateView
- OnboardingTermsView

**Refactoring Strategy:**
```
Onboarding/
  ├── OnboardingFlowView.swift (main coordinator, 150 lines)
  ├── OnboardingCoordinator.swift (state management)
  ├── OnboardingProgress.swift (model)
  ├── Steps/
  │   ├── AccountView.swift
  │   ├── BusinessDetailsView.swift
  │   ├── InviteCodeView.swift
  │   ├── LocationView.swift
  │   ├── PackagesView.swift
  │   ├── StripeView.swift
  │   ├── StripeViewDirect.swift
  │   ├── TemplateView.swift
  │   └── TermsView.swift
  └── Completion/
      ├── CompleteView.swift
      ├── ContinueView.swift
      └── OrphanedAccountView.swift
```

**Benefits:**
- Clear onboarding flow progression
- Each step is independent and testable
- Easier to add/remove steps
- Coordinator pattern cleanly separated

---

## Phase 2: File Organization & Cleanup (Priority: HIGH)
**Time Estimate:** 1 day

### 2.1 Delete Duplicate/Backup Files
**Files to Delete:**
- ❌ ClientCardViewOld.swift (duplicate, 400+ lines)
- ❌ ClientCardView.swift.backup (backup file)
- ❌ PricingPlan.swift.backup (backup file)
- ❌ Item.swift (unused SwiftData template)

**Lines Removed:** ~600 lines

---

### 2.2 Create Organized Folder Structure
**Proposed Structure:**
```
SkedenceAdmin/
├── SkedenceAdminApp.swift
├── AppDelegate.swift
│
├── Models/
│   ├── Client.swift
│   ├── Trainer.swift
│   ├── GroupClass.swift
│   ├── LessonPackage.swift
│   ├── Location.swift
│   ├── TrainerScheduleSlot.swift
│   ├── PricingStructure.swift
│   ├── PricingPlan.swift
│   ├── OrganizationBilling.swift
│   ├── OrgSettings.swift
│   ├── DateOnly.swift
│   ├── CalendarInvite.swift
│   └── SportTemplate.swift
│
├── Services/
│   ├── Core/
│   │   └── (shared protocols if any)
│   ├── Authentication/
│   │   └── AuthManager.swift
│   ├── Admin/
│   │   ├── AdminService.swift
│   │   ├── ActivationService.swift
│   │   └── SubscriptionEnforcementService.swift
│   ├── Business/
│   │   ├── ClassesService.swift
│   │   ├── TrainersService.swift
│   │   ├── PackagesService.swift
│   │   ├── LocationsService.swift
│   │   └── SettingsService.swift
│   ├── Clients/
│   │   └── ClientsRepository.swift
│   ├── Schedule/
│   │   └── ScheduleRepository.swift
│   ├── Stripe/
│   │   ├── StripeCustomerService.swift
│   │   └── StoreKitManager.swift
│   ├── Subscription/
│   │   └── SubscriptionStatusService.swift
│   ├── Analytics/
│   │   ├── AnalyticsService.swift
│   │   ├── CrashlyticsService.swift
│   │   └── ActivityLogger.swift
│   ├── Utilities/
│   │   ├── FirestoreService.swift
│   │   ├── FunctionsService.swift
│   │   ├── TemplateService.swift
│   │   └── PricingStructureService.swift
│
├── Features/
│   ├── AdminPanel/
│   │   ├── AdminPanelView.swift
│   │   └── Tabs/ (6 tab views)
│   ├── Clients/
│   │   ├── ClientsView.swift
│   │   ├── ClientCardView.swift
│   │   └── Sections/ (5 section views)
│   ├── Schedule/
│   │   ├── ScheduleView.swift
│   │   ├── ScheduleViewModel.swift
│   │   └── Views/ (4 schedule views)
│   ├── SuperAdmin/
│   │   ├── SuperAdminView.swift
│   │   ├── SuperAdminViewModel.swift
│   │   └── Sections/
│   ├── Onboarding/
│   │   ├── OnboardingFlowView.swift
│   │   ├── OnboardingCoordinator.swift
│   │   └── Steps/ (9 step views)
│   ├── Billing/
│   │   ├── BillingPaywallView.swift
│   │   ├── CoachPaywallView.swift
│   │   ├── ManageSubscriptionView.swift
│   │   ├── ProcessPaymentView.swift
│   │   └── InAppSubscriptionView.swift
│   └── Setup/
│       ├── SetupChecklistView.swift
│       ├── SetupChecklistViewModel.swift
│       └── CreateBusinessView.swift
│
├── Screens/
│   ├── ContentView.swift
│   ├── ContentViewWrapper.swift
│   ├── PasswordSetupView.swift
│   ├── ActivationRequiredView.swift
│   └── SettingsView.swift
│
├── Components/
│   ├── Sheets/
│   │   ├── AddEditLocationSheet.swift
│   │   ├── AvailabilityEditorSheet.swift
│   │   ├── SessionDetailView.swift
│   │   └── ClassParticipantsView.swift
│   └── UI/
│       ├── WeekStrip.swift
│       └── (other reusable components)
│
├── Stripe/
│   ├── StripeKeysSetupView.swift
│   ├── StripeOnboardingView.swift
│   ├── StripeSettingsView.swift
│   ├── StripeSettingsViewDirect.swift
│   ├── SubscriptionWebView.swift
│   └── TrainerAvatarUploadView.swift
│
├── Utilities/
│   ├── DesignSystem.swift
│   ├── ReferenceCodeGenerator.swift
│   └── PhoneActionHelpers.swift
│
└── Views/ (legacy paywalls/pricing)
    ├── PaywallViews.swift
    └── PricingView.swift
```

---

## Phase 3: Service Layer Standardization (Priority: MEDIUM)
**Time Estimate:** 1-2 days

### 3.1 Current Service Issues
- **18+ service files** with inconsistent patterns
- Some use @Published, others don't
- Mix of services, repositories, and direct Firebase calls
- FirestoreService.swift is 1,031 lines (utility service, not domain service)

### 3.2 Services to Refactor
1. ✅ AuthManager - Already solid
2. 🔄 AdminService - Needs error handling improvement
3. 🔄 ClassesService - Consolidate duplicate logic
4. 🔄 TrainersService - Add caching layer
5. 🔄 PackagesService - Standardize CRUD operations
6. 🔄 LocationsService - Add validation
7. 🔄 SettingsService - Improve error messages
8. 🔄 ClientsRepository - Already repository pattern ✅
9. 🔄 ScheduleRepository - Already repository pattern ✅
10. 🔄 StripeCustomerService - Better error handling
11. 🔄 SubscriptionStatusService - Add retry logic
12. 🔄 ActivationService - Standardize activation flow
13. 🔄 SubscriptionEnforcementService - Clarify enforcement rules
14. 🔄 AnalyticsService - Already clean (from client app)
15. 🔄 CrashlyticsService - Already clean
16. 🔄 ActivityLogger - Remove debug print
17. 🔄 FirestoreService - Consider breaking into smaller utilities
18. 🔄 FunctionsService - Standardize cloud function calls
19. 🔄 TemplateService - Add error handling
20. 🔄 PricingStructureService - Already decent
21. 🔄 StoreKitManager - Add StoreKit 2 support

### 3.3 Standardization Pattern
Apply the same LoadingState<T> pattern from client app:
- Unified error/loading state infrastructure
- Consistent @Published properties
- Repository pattern for Firebase calls
- Testable with mock repositories

---

## Phase 4: Debug Code Removal (Priority: HIGH)
**Time Estimate:** 2-3 hours

### 4.1 Print Statements to Remove (~100+ found)

**Files with Debug Code:**
1. InAppSubscriptionView.swift - 3 prints
2. ActivityLogger.swift - 1 print
3. AddEditLocationSheet.swift - 1 print
4. SetupChecklistViewModel.swift - 5 prints
5. ClientCardViewOld.swift - 3 prints (delete entire file)
6. TrainerWeekView.swift - 8 prints
7. OnboardingBusinessDetailsView.swift - 4 prints
8. DayScheduleView.swift - prints in ClassParticipantsView
9. (Many more discovered from grep search)

**Estimated Lines Removed:** ~150 lines

---

## Phase 5: State Management Consolidation (Priority: MEDIUM-LOW)
**Time Estimate:** 1-2 days

### 5.1 Current Issues
- Multiple @StateObject instances per view (AdminPanelView has 6!)
- State scattered between Views, ViewModels, and Services
- Unclear ownership of state

### 5.2 Proposed Solution: Environment-Based DI

**Create App-Level Container:**
```swift
@MainActor
class AdminAppDependencies: ObservableObject {
    // Core Services
    let auth = AuthManager()
    let admin = AdminService()
    let activation = ActivationService()
    
    // Business Services
    let classes = ClassesService()
    let trainers = TrainersService()
    let packages = PackagesService()
    let locations = LocationsService()
    let settings = SettingsService()
    let pricing = PricingStructureService()
    
    // Client & Schedule
    let clients = ClientsRepository()
    let schedule = ScheduleRepository()
    
    // Stripe & Subscription
    let stripe = StripeCustomerService()
    let subscription = SubscriptionStatusService()
    let enforcement = SubscriptionEnforcementService()
    
    // Analytics
    let analytics = AnalyticsService()
    let crashlytics = CrashlyticsService()
    let activity = ActivityLogger()
    
    // View State
    @Published var selectedTab = 0
    @Published var onboardingStep: OnboardingStep?
}
```

**Benefits:**
- Single source of truth
- Easier testing with mock container
- Clearer dependencies
- Less @StateObject boilerplate

---

## Phase 6: Onboarding Flow Refactoring (Priority: MEDIUM)
**Time Estimate:** 1 day

### 6.1 Current Issues
- 16 onboarding-related files scattered in root
- Complex coordinator with dictionary-based data storage
- Navigation logic spread across multiple views
- Hard to understand flow progression

### 6.2 Proposed Solution
**Coordinator Pattern with Enum-Based Steps:**
```swift
enum OnboardingStep: Int, CaseIterable {
    case landing = 0
    case account
    case terms
    case inviteCode
    case orphanedAccount
    case businessDetails
    case location
    case template
    case packages
    case stripe
    case complete
    case continueToApp
    
    var title: String { ... }
    var progress: Double { Double(rawValue) / Double(Self.allCases.count) }
}

@MainActor
class OnboardingCoordinator: ObservableObject {
    @Published var currentStep: OnboardingStep = .landing
    @Published var onboardingData = OnboardingData() // Structured data model
    
    func advance() { ... }
    func goBack() { ... }
    func skip(to step: OnboardingStep) { ... }
}
```

**Benefits:**
- Clear step progression
- Type-safe navigation
- Easy to add/remove steps
- Better progress tracking
- Testable coordinator logic

---

## Phase 7: Testing Infrastructure (Priority: LOW-MEDIUM)
**Time Estimate:** 2-3 days

### 7.1 Current State
- No visible test files in directory listing
- Complex business logic untested
- Services tightly coupled to Firebase

### 7.2 Proposed Testing Strategy
Similar to client app:
```
SkedenceAdminTests/
  ├── Helpers/
  │   └── TestHelpers.swift
  ├── Mocks/
  │   ├── MockClientsRepository.swift
  │   ├── MockScheduleRepository.swift
  │   └── MockStripeService.swift
  ├── Services/
  │   ├── AdminServiceTests.swift
  │   ├── ClassesServiceTests.swift
  │   └── SubscriptionEnforcementTests.swift
  ├── ViewModels/
  │   ├── ScheduleViewModelTests.swift
  │   └── SuperAdminViewModelTests.swift
  └── BusinessLogic/
      ├── OnboardingFlowTests.swift
      ├── SubscriptionValidationTests.swift
      └── SchedulingConflictTests.swift
```

---

## Phase 8: Performance Optimization (Priority: LOW)
**Time Estimate:** 1-2 days

### 8.1 Potential Issues
- Large list views without pagination (clients, schedule)
- Firestore listener proliferation
- Image caching for trainer avatars
- Schedule view with many cells

### 8.2 Optimization Strategy
- Implement pagination for client lists
- Consolidate Firestore listeners
- Add image caching layer
- Optimize schedule rendering with LazyVStack
- Profile with Instruments

---

## Quick Wins (Can Do Immediately)

### Immediate Actions (30 minutes):
1. ✅ **Delete duplicate files:**
   - ClientCardViewOld.swift
   - ClientCardView.swift.backup
   - PricingPlan.swift.backup
   - Item.swift
   
2. ✅ **Remove all debug print statements** (~100+ prints)

3. ✅ **Create folder structure** and move files

**Impact:** ~1,000 lines removed, professional codebase

---

### Low-Hanging Fruit (2-3 hours):
1. Extract AdminPanelView tabs into separate files
2. Extract ClientCardView sections into separate files
3. Organize onboarding views into Onboarding/ folder
4. Move models into Models/ folder
5. Move services into Services/ folder

**Impact:** Immediate navigation improvement, clearer structure

---

## Recommended Approach

### Option A: Full Refactor (2-3 weeks)
**Pros:**
- Addresses all technical debt
- Modern, maintainable architecture
- Full test coverage
- Performance optimized

**Cons:**
- High time investment
- Higher risk of breaking changes
- Feature development pauses

---

### Option B: Tactical Refactor (5-7 days) ⭐ RECOMMENDED
**Pros:**
- Address critical pain points
- Lower risk
- Can ship features while refactoring

**Cons:**
- Some technical debt remains
- May need Phase 2 later

**Execution Plan:**
- **Day 1:** Quick wins (delete duplicates, remove debug code, create folders)
- **Day 2-3:** AdminPanelView decomposition
- **Day 4:** ClientCardView simplification
- **Day 5:** Onboarding flow cleanup
- **Day 6:** Service layer standardization (high-impact services only)
- **Day 7:** Testing infrastructure foundation

---

### Option C: Status Quo
**Pros:**
- No time investment
- No risk

**Cons:**
- 1,794-line view files get worse
- Harder to onboard developers
- Slower feature development
- More bugs from complexity

---

## Success Metrics

### Before Refactoring:
- **Files in root:** 94
- **Largest file:** 1,794 lines
- **Debug print statements:** ~100+
- **Duplicate files:** 4
- **Total lines:** 29,027

### After Phase 1 (Quick Wins + Critical Views):
- **Files in root:** 1 (just app entry point)
- **Largest file:** <500 lines
- **Debug print statements:** 0
- **Duplicate files:** 0
- **Total lines:** ~27,500 (1,500 removed)
- **Organized folders:** 8 top-level

### After Full Tactical Refactor:
- **All files organized** into logical folders
- **Services standardized** with LoadingState pattern
- **Onboarding flow** clear and maintainable
- **Test infrastructure** in place for critical paths
- **Development velocity** increased by 30-50%

---

## Next Steps

1. **Review this plan** - Discuss priorities and timeline
2. **Create refactoring branch** - `refactor/admin-app-architecture`
3. **Start with quick wins** - Delete duplicates, remove debug code, create folders
4. **Tackle AdminPanelView** - Biggest impact, prove the approach
5. **Continue systematically** - One phase at a time
6. **Evaluate at Day 3** - Decide whether to continue or pause

---

## Risk Mitigation

### Risks:
- Breaking existing functionality during refactoring
- Xcode not auto-fixing import paths
- Merge conflicts if other work in progress
- Time estimates too optimistic

### Mitigation Strategies:
- Work in feature branch with frequent commits
- Test each phase before moving to next
- Keep backup branch before major changes
- Use git tags at phase boundaries
- Verify build after every folder reorganization
- Run app and test critical flows after each phase

---

## Conclusion

The SkedenceAdmin app is **functionally solid but architecturally overdue for improvement**. A targeted refactor focusing on:

1. **View decomposition** (AdminPanelView, ClientCardView, Schedule views)
2. **File organization** (94 files → 8 organized folders)
3. **Debug code removal** (~100+ print statements)
4. **Onboarding cleanup** (16 files → organized structure)

Would provide **immediate value** with **manageable risk** over **5-7 days** of focused work.

**Recommendation:** Start with **Quick Wins + Phase 1** to prove the value, then continue based on results.
