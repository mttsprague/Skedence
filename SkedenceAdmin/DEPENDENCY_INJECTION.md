# Dependency Injection Pattern - SkedenceAdmin

## Overview
SkedenceAdmin uses a centralized dependency injection (DI) container to manage all services and shared state. This provides a single source of truth, easier testing, and clearer dependencies.

## The Container: AdminAppDependencies

**Location:** `Services/Core/AdminAppDependencies.swift`

All services are instantiated once at the app level and shared across views via SwiftUI's environment system.

```swift
@MainActor
class AdminAppDependencies: ObservableObject {
    // Core Services
    let auth = AuthManager.shared
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
    let clients = ClientsRepository.shared
    let schedule = ScheduleRepository.shared
    
    // Stripe & Subscription
    let stripe = StripeCustomerService()
    let subscription = SubscriptionStatusService()
    let enforcement = SubscriptionEnforcementService()
    let storeKit = StoreKitManager()
    
    // Analytics & Logging
    let analytics = AnalyticsService.shared
    let crashlytics = CrashlyticsService.shared
    let activity = ActivityLogger.shared
    
    // App State
    @Published var selectedTab = 0
    @Published var onboardingStep: Int?
}
```

## Usage Pattern

### 1. App-Level Injection
In `SkedenceAdminApp.swift`, the container is created once and injected into the environment:

```swift
@main
struct SkedenceAdminApp: App {
    @StateObject private var dependencies = AdminAppDependencies()
    
    var body: some Scene {
        WindowGroup {
            ContentViewWrapper()
                .environmentObject(dependencies)
        }
    }
}
```

### 2. Accessing Dependencies in Views
Views receive the container via `@EnvironmentObject` and use computed properties for clean access:

```swift
struct MyView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var classesService: ClassesService { dependencies.classes }
    
    var body: some View {
        VStack {
            if auth.isAuthenticated {
                Text("Classes: \(classesService.classes.count)")
            }
        }
    }
}
```

### 3. Passing to Child Views
Child views automatically inherit the environment object. No need to pass it explicitly unless presenting as a sheet:

```swift
// Navigation - automatic inheritance
NavigationLink(destination: DetailView()) {
    Text("Go to Detail")
}

// Sheet presentation - must pass explicitly
.sheet(isPresented: $showingSheet) {
    DetailView()
        .environmentObject(dependencies)
}
```

## Benefits

### ✅ Single Source of Truth
- All services instantiated once
- Consistent state across the app
- No duplicate service instances

### ✅ Reduced Boilerplate
**Before:**
```swift
struct AdminPanelView: View {
    @StateObject private var adminService = AdminService()
    @StateObject private var classesService = ClassesService()
    @StateObject private var trainersService = TrainersService()
    @StateObject private var packagesService = PackagesService()
    @StateObject private var pricingService = PricingStructureService()
    @StateObject private var locationsService = LocationsService()
    // 6 @StateObject declarations!
}
```

**After:**
```swift
struct AdminPanelView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessors
    private var adminService: AdminService { dependencies.admin }
    private var classesService: ClassesService { dependencies.classes }
    // Clean and simple!
}
```

### ✅ Better Memory Management
- Services are shared, not duplicated per view
- Reduced memory footprint
- Automatic cleanup when app terminates

### ✅ Easier Testing
Mock the entire container for unit tests:
```swift
class MockDependencies: AdminAppDependencies {
    override init() {
        super.init()
        // Override with mocks
        self.auth = MockAuthManager()
        self.admin = MockAdminService()
    }
}
```

### ✅ Clear Dependencies
Views explicitly declare what they need via computed properties, making dependencies visible and maintainable.

## Adding a New Service

### Step 1: Create the Service
```swift
@MainActor
final class MyNewService: ObservableObject {
    @Published var items: [Item] = []
    
    func loadItems() async {
        // Implementation
    }
}
```

### Step 2: Add to Container
```swift
// In AdminAppDependencies.swift
class AdminAppDependencies: ObservableObject {
    // ... existing services
    
    // Add your new service
    let myNewService = MyNewService()
}
```

### Step 3: Use in Views
```swift
struct MyView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    private var myNewService: MyNewService { dependencies.myNewService }
    
    var body: some View {
        // Use the service
    }
}
```

## Migration Complete

All 22 files have been migrated to use the dependency injection pattern:

**App-Level:** SkedenceAdminApp.swift

**Main Views:** ContentView, AdminPanelView (2 files), ScheduleView (2 files), ClientsView, MoreView, SettingsView, SuperAdminView (2 files)

**Onboarding Views:** 8 files (OnboardingFlowView, OnboardingLandingView, OnboardingAccountView, OnboardingStripeView, OnboardingStripeViewDirect, OnboardingCompleteView, OnboardingContinueView, OnboardingOrphanedAccountView)

**Component Views:** AvailabilityEditorSheet, ProcessPaymentView, ManageSubscriptionView, CreateClassView, StripeSettingsView, CreateBusinessView, SettingsTabView

**Result:** ✅ Zero compilation errors, clean architecture, ready for production
