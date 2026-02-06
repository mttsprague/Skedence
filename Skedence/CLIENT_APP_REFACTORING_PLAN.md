# Skedence Client App - Comprehensive Refactoring Plan

**Date Created:** February 3, 2026  
**Current State:** App is functional but has architectural debt  
**Estimated Time:** 1-2 weeks for full refactor, 2-4 days for targeted approach

---

## Executive Summary

The Skedence client app has grown organically and now shows signs of technical debt:
- Complex views exceeding SwiftUI compiler limits (BookView required 15 computed properties)
- Inconsistent service layer patterns
- Tight coupling between UI and business logic
- State management scattered across multiple levels
- Limited code reusability

**Recommendation:** Implement a **phased, incremental refactor** over 3-5 days to improve maintainability without disrupting functionality.

---

## Phase 1: Critical View Decomposition (Priority: HIGH)
**Time Estimate:** 1-2 days

### 1.1 BookView Optimization
**Current Issues:**
- 2000+ lines in single file
- Already hit compiler complexity limits
- 15 computed properties just to compile
- Mixing booking, class registration, athlete management in one view

**Refactoring Strategy:**
```
BookView/
  ├── BookView.swift (main container, 200 lines)
  ├── Views/
  │   ├── BookLessonView.swift (lesson booking flow)
  │   ├── BookClassView.swift (class registration flow)
  │   ├── ClassRegistrationSheet.swift (already extracted)
  │   ├── AthleteSelectionView.swift
  │   ├── TrainerSelectionView.swift
  │   └── DateTimeSelectionView.swift
  └── Components/
      ├── AvailabilitySlotCard.swift
      ├── PricingDisplayCard.swift
      └── ClassPassPicker.swift
```

**Benefits:**
- Each subview under 300 lines
- Reusable components across app
- Easier to test and debug
- No more compiler timeouts

---

### 1.2 AdminPanelView Restructure
**Current Issues:**
- Multiple tabs (Passes, Classes, Locations, Wallet, Pricing, Settings)
- All logic in one 1500+ line file
- State management complexity

**Refactoring Strategy:**
```
AdminPanel/
  ├── AdminPanelView.swift (tab container, 100 lines)
  ├── Tabs/
  │   ├── PassesTabView.swift
  │   ├── ClassesTabView.swift
  │   ├── LocationsTabView.swift
  │   ├── WalletTabView.swift
  │   ├── PricingTabView.swift
  │   └── SettingsTabView.swift
  └── Shared/
      ├── QRCodeView.swift (organization code)
      └── AdminActionCard.swift
```

---

### 1.3 HomeView Simplification
**Current Issues:**
- Cluttered with multiple service calls
- Hero header, upcoming lessons, classes, locations all mixed
- Hard to maintain and extend

**Refactoring Strategy:**
```
Home/
  ├── HomeView.swift (main container)
  └── Sections/
      ├── HeroHeaderView.swift
      ├── UpcomingLessonsSection.swift
      ├── FeaturedClassesSection.swift
      ├── NearbyLocationsSection.swift
      └── QuickActionsSection.swift
```

---

## Phase 2: Service Layer Standardization (Priority: MEDIUM)
**Time Estimate:** 1 day

### 2.1 Current Service Layer Issues
- Inconsistent patterns across services
- Some use @Published, others don't
- Error handling varies
- No unified loading states
- Direct Firebase calls mixed in views

### 2.2 Proposed Service Architecture

**Base Service Protocol:**
```swift
// Services/Core/ServiceProtocol.swift
protocol ServiceProtocol: ObservableObject {
    associatedtype DataType
    
    var items: [DataType] { get }
    var isLoading: Bool { get }
    var error: Error? { get }
    
    func fetch() async throws
    func refresh() async
}
```

**Standardized Service Template:**
```swift
// Example: Services/BookingsService.swift
@MainActor
class BookingsService: ObservableObject, ServiceProtocol {
    @Published var items: [Booking] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    private let repository: BookingsRepository
    
    init(repository: BookingsRepository = FirebaseBookingsRepository()) {
        self.repository = repository
    }
    
    func fetch() async throws {
        isLoading = true
        defer { isLoading = false }
        
        do {
            items = try await repository.fetchBookings()
            error = nil
        } catch {
            self.error = error
            throw error
        }
    }
}
```

### 2.3 Services to Refactor
1. ✅ **AuthManager** - Already solid
2. 🔄 **BookingsService** - Needs error handling improvement
3. 🔄 **ClassesService** - Consolidate duplicate logic
4. 🔄 **ScheduleService** - Separate read/write operations
5. 🔄 **TrainersService** - Add caching layer
6. 🔄 **PackagesService** - Standardize CRUD operations
7. 🔄 **UsersService** - Split into UserProfileService & UserManagementService
8. 🔄 **LocationsService** - Add validation logic
9. 🔄 **IntakeFormService** - Improve form field handling
10. 🔄 **StripeService** - Better error messages

---

## Phase 3: Repository Pattern Implementation (Priority: MEDIUM)
**Time Estimate:** 1 day

### 3.1 Problem
- Services directly call Firebase
- Hard to test
- Difficult to switch backends
- No caching strategy

### 3.2 Solution: Repository Layer

**Structure:**
```
Repositories/
  ├── Core/
  │   ├── Repository.swift (protocol)
  │   └── CachePolicy.swift
  ├── Firebase/
  │   ├── FirebaseBookingsRepository.swift
  │   ├── FirebaseUsersRepository.swift
  │   ├── FirebaseClassesRepository.swift
  │   └── FirebaseScheduleRepository.swift
  └── Mock/
      ├── MockBookingsRepository.swift (for testing)
      └── MockUsersRepository.swift
```

**Benefits:**
- Services don't know about Firebase
- Easy to add caching
- Testable with mock repositories
- Can switch to different backend without touching UI

---

## Phase 4: State Management Consolidation (Priority: LOW-MEDIUM)
**Time Estimate:** 1 day

### 4.1 Current Issues
- Some views pass 6+ @ObservedObject parameters
- State scattered between views and services
- Unclear ownership of state

**Example Problem (BookView):**
```swift
init(
    trainersService: TrainersService,
    scheduleService: ScheduleService,
    packagesService: PackagesService,
    usersService: UsersService,
    selectedTab: Binding<Int>
) { ... }
```

### 4.2 Proposed Solution: Environment-Based DI

**Create App-Level Container:**
```swift
// Core/Dependencies/AppDependencies.swift
@MainActor
class AppDependencies: ObservableObject {
    // Services
    let auth = AuthManager()
    let bookings = BookingsService()
    let classes = ClassesService()
    let trainers = TrainersService()
    let schedule = ScheduleService()
    let packages = PackagesService()
    let users = UsersService()
    let intakeForms = IntakeFormService()
    
    // View State
    @Published var selectedTab = 0
    @Published var bookViewMode = 0
}
```

**Inject at Root:**
```swift
@main
struct SkedenceApp: App {
    @StateObject private var deps = AppDependencies()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(deps)
        }
    }
}
```

**Access in Views:**
```swift
struct BookView: View {
    @EnvironmentObject var deps: AppDependencies
    
    var body: some View {
        // Access deps.trainers, deps.bookings, etc.
    }
}
```

---

## Phase 5: Component Library (Priority: LOW)
**Time Estimate:** 1 day

### 5.1 Extract Reusable Components

**Already Have (DesignSystem.swift):**
- ✅ CardView
- ✅ SectionHeaderView
- ✅ BadgeView
- ✅ EmptyStateView
- ✅ PrimaryButton / SecondaryButton

**Need to Add:**
```
Components/
  ├── Cards/
  │   ├── BookingCard.swift (reuse in multiple views)
  │   ├── ClassCard.swift
  │   ├── TrainerCard.swift
  │   └── LocationCard.swift
  ├── Forms/
  │   ├── FormTextField.swift
  │   ├── FormPicker.swift
  │   ├── FormDatePicker.swift
  │   └── FormSection.swift
  ├── Lists/
  │   ├── LoadingListView.swift
  │   └── EmptyListView.swift
  └── Modals/
      ├── ConfirmationModal.swift
      └── ErrorModal.swift
```

---

## Phase 6: Error Handling & Loading States (Priority: MEDIUM)
**Time Estimate:** 1 day

### 6.1 Current Issues
- Inconsistent error presentation
- Some views show errors, others silently fail
- Loading states vary (some spinners, some nothing)

### 6.2 Unified Approach

**Create LoadableView:**
```swift
// Views/Core/LoadableView.swift
struct LoadableView<Content: View, Data>: View {
    let state: LoadingState<Data>
    let content: (Data) -> Content
    
    var body: some View {
        switch state {
        case .idle:
            EmptyStateView(...)
        case .loading:
            ProgressView()
        case .success(let data):
            content(data)
        case .failure(let error):
            ErrorStateView(error: error)
        }
    }
}

enum LoadingState<T> {
    case idle
    case loading
    case success(T)
    case failure(Error)
}
```

**Usage:**
```swift
struct BookingsListView: View {
    @StateObject private var viewModel = BookingsViewModel()
    
    var body: some View {
        LoadableView(state: viewModel.state) { bookings in
            List(bookings) { booking in
                BookingRow(booking: booking)
            }
        }
    }
}
```

---

## Phase 7: Testing Infrastructure (Priority: LOW)
**Time Estimate:** 1 day

### 7.1 Add Unit Tests

**Test Structure:**
```
SkedenceTests/
  ├── Services/
  │   ├── BookingsServiceTests.swift
  │   ├── ClassesServiceTests.swift
  │   └── AuthManagerTests.swift
  ├── ViewModels/
  │   ├── BookViewModelTests.swift
  │   └── HomeViewModelTests.swift
  └── Repositories/
      └── MockRepositories.swift
```

### 7.2 Key Tests to Add
1. Service data fetching
2. Booking creation logic
3. Class registration flow
4. Payment processing
5. Form validation
6. Date/time calculations

---

## File Structure After Refactor

```
Skedence/
├── Core/
│   ├── Dependencies/
│   │   └── AppDependencies.swift
│   ├── Protocols/
│   │   ├── ServiceProtocol.swift
│   │   └── Repository.swift
│   └── Extensions/
│       ├── Date+Extensions.swift
│       └── View+Extensions.swift
├── Features/
│   ├── Authentication/
│   │   ├── Views/
│   │   ├── Services/
│   │   └── Models/
│   ├── Booking/
│   │   ├── Views/
│   │   │   ├── BookView.swift
│   │   │   ├── BookLessonView.swift
│   │   │   └── BookClassView.swift
│   │   ├── ViewModels/
│   │   ├── Services/
│   │   └── Models/
│   ├── Classes/
│   ├── Schedule/
│   ├── Profile/
│   ├── Admin/
│   └── Home/
├── Shared/
│   ├── Components/
│   │   ├── Cards/
│   │   ├── Forms/
│   │   ├── Lists/
│   │   └── Modals/
│   ├── DesignSystem/
│   │   ├── Theme.swift
│   │   ├── Typography.swift
│   │   └── Spacing.swift
│   └── Models/
├── Services/
│   ├── Core/
│   ├── Firebase/
│   └── Stripe/
├── Repositories/
│   ├── Firebase/
│   └── Mock/
└── Resources/
    └── Assets.xcassets/
```

---

## Risk Assessment

### High Risk
- **BookView refactor** - Most complex, heavily used
  - Mitigation: Thorough testing, incremental changes

### Medium Risk
- **Service layer changes** - Affects entire app
  - Mitigation: Keep old services until new ones proven

### Low Risk
- **Component extraction** - Additive changes
- **Repository pattern** - Doesn't affect existing code until adopted

---

## Migration Strategy

### Approach: Feature Flags & Gradual Rollout

1. **Create new structure alongside old**
   - Don't delete anything initially
   - Build new patterns in parallel

2. **Migrate one feature at a time**
   - Week 1: BookView
   - Week 2: AdminPanel
   - Week 3: Services
   - Week 4: Components

3. **Use feature flags for testing**
   ```swift
   let useNewBookingFlow = UserDefaults.standard.bool(forKey: "useNewBookingFlow")
   ```

4. **Validate each migration**
   - Test with real users
   - Monitor crash reports
   - Gather feedback

---

## Success Metrics

### Code Quality
- [ ] Average file size < 300 lines
- [ ] No compiler timeout errors
- [ ] 80%+ code coverage (aspirational)

### Developer Experience
- [ ] 50% faster to add new features
- [ ] Easier onboarding for new developers
- [ ] Reduced bug rate

### Performance
- [ ] No regression in load times
- [ ] Improved memory usage (fewer @StateObject instances)

---

## Quick Wins (Can Start Immediately)

### 1. Extract BookView Components (2 hours)
```swift
// NEW: BookView/Components/AvailabilitySlotCard.swift
struct AvailabilitySlotCard: View {
    let slot: AvailabilitySlot
    let trainer: Trainer
    let onSelect: () -> Void
    
    var body: some View {
        // Extract existing slot UI
    }
}
```

### 2. Standardize Error Views (1 hour)
```swift
// NEW: Shared/Components/ErrorView.swift
struct ErrorView: View {
    let error: Error
    let retry: () -> Void
    
    var body: some View {
        VStack {
            Text(error.localizedDescription)
            Button("Retry", action: retry)
        }
    }
}
```

### 3. Create LoadingState Wrapper (1 hour)
```swift
// Apply to one view first, then expand
```

---

## Recommended Timeline

### Conservative Approach (Minimal Risk)
- **Week 1-2:** Phase 1 (View Decomposition)
- **Week 3:** Phase 2 (Service Standardization)  
- **Week 4:** Phase 3 (Repository Pattern)
- **Week 5:** Polish & Testing

### Aggressive Approach (Faster, Higher Risk)
- **Days 1-2:** BookView refactor
- **Days 3-4:** Service layer refactor
- **Day 5:** Component extraction
- **Days 6-7:** Testing & fixes

---

## Decision Points

### Option A: Full Refactor (Recommended if time allows)
**Pros:**
- Clean slate
- Consistent patterns
- Easier to maintain long-term

**Cons:**
- 1-2 weeks commitment
- Higher risk
- More testing required

### Option B: Tactical Refactor (Recommended for now)
**Pros:**
- Address immediate pain points
- Lower risk
- Can ship features while refactoring

**Cons:**
- Technical debt remains in some areas
- Inconsistent patterns across app

### Option C: Status Quo
**Pros:**
- No time investment
- No risk

**Cons:**
- Will hit more compiler limits
- Slower feature development
- Harder to onboard developers

---

## Next Steps

1. **Review this plan** - Discuss priorities and timeline
2. **Create refactoring branch** - `refactor/client-app-architecture`
3. **Start with quick wins** - Build confidence
4. **Commit to Phase 1** - BookView decomposition
5. **Evaluate progress** - After 3 days, decide on continuing

---

## Questions to Answer

1. **Timeline:** Do you have 1-2 weeks to dedicate to this, or prefer tactical approach?
2. **Risk Tolerance:** Comfortable with larger changes, or prefer incremental?
3. **Priority:** Which pain points matter most? (Compiler errors? Development speed? Maintainability?)
4. **Testing:** Do you have QA resources, or should we add automated tests first?
5. **Team Size:** Solo developer or team? (Affects coordination needs)

---

## Conclusion

The Skedence client app is **functionally solid but architecturally due for improvement**. A targeted refactor focusing on:

1. **BookView decomposition** (biggest pain point)
2. **Service layer standardization** (foundation for growth)
3. **Component library** (speed up development)

Would provide **immediate value** with **manageable risk** over **3-5 days** of focused work.

**Recommendation:** Start with Phase 1 (BookView) as a proof of concept, then decide whether to continue based on results.
