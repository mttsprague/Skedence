//
//  SERVICE_LAYER_ANALYSIS.md
//  Skedence - Phase 2.1: Current Service Layer Issues
//

# Service Layer Analysis

## Current State Assessment

### Services Inventory
**Total Services: 18**

| Service | Lines | @Published | Error Handling | Pattern |
|---------|-------|------------|----------------|---------|
| UsersService | 293 | ✅ Yes | ✅ errorMessage | Standard |
| AdminService | 493 | ✅ Yes | ✅ errorMessage | Standard |
| ClassesService | 277 | ✅ Yes | ✅ errorMessage | Standard |
| AnalyticsService | 217 | ❌ No | ❌ None | Singleton |
| SubscriptionStatusService | 193 | ✅ Yes | ⚠️ Partial | Mixed |
| PackagesService | 176 | ✅ Yes | ✅ errorMessage | Standard |
| ScheduleService | 163 | ✅ Yes | ✅ errorMessage | Standard |
| AdminPaymentService | 162 | ✅ Yes | ✅ errorMessage | Standard |
| StripeService | 160 | ✅ Yes | ✅ errorMessage | Standard |
| CrashlyticsService | 156 | ❌ No | ❌ None | Singleton |
| DocumentsService | 153 | ❌ No | ❌ Throws | Stateless |
| StripeCustomerService | 147 | ✅ Yes | ⚠️ Partial | Standard |
| PricingStructureService | 119 | ✅ Yes | ❌ None | Standard |
| CancellationService | 97 | ✅ Yes | ✅ errorMessage | Standard |
| SettingsService | ~80 | ✅ Yes | ⚠️ Partial | Standard |
| TrainersService | ~50 | ✅ Yes | ✅ errorMessage | Standard |
| BookingsService | ~85 | ✅ Yes | ✅ errorMessage | Standard |
| LocationsService | ~50 | ✅ Yes | ✅ errorMessage | Standard |

## Key Issues Identified

### 1. **Inconsistent Error Handling Patterns**

**Problem Examples:**

```swift
// BookingsService - Good
@Published private(set) var errorMessage: String?

// ClassesService - Good  
@Published private(set) var errorMessage: String?

// PricingStructureService - Missing
// No error handling at all!

// AnalyticsService - None (singleton)
// Fails silently
```

**Impact:** Users don't know when operations fail, debugging is difficult

---

### 2. **Inconsistent Loading States**

**Problem Examples:**

```swift
// Most services - Good
@Published private(set) var isLoading = false

// AnalyticsService - None
// No way to show loading indicators

// DocumentsService - None  
// Synchronous-looking API that blocks
```

**Impact:** Can't show loading spinners consistently, poor UX

---

### 3. **Mixed Singleton vs ObservableObject Patterns**

**Singletons:**
- `AnalyticsService.shared`
- `CrashlyticsService.shared`

**ObservableObject:**
- All other services

**Problem:** Inconsistent access patterns, testing challenges

---

### 4. **Direct Firebase Calls in Services**

**Examples from ALL services:**

```swift
private let db = Firestore.firestore()
private let functions = Functions.functions()

// Then direct calls:
try await db.collection("bookings")
    .whereField("orgId", isEqualTo: orgId)
    .getDocuments()
```

**Problems:**
- ❌ Tight coupling to Firebase
- ❌ Can't mock for testing
- ❌ Can't add caching layer
- ❌ Can't switch backends
- ❌ Repeated query logic

---

### 5. **Inconsistent Data Decoding**

**BookingsService:**
```swift
private func decodeBooking(id: String, data: [String: Any]) -> Booking {
    // Manual decoding with fallbacks
    Booking(
        id: id,
        clientUID: data["clientUID"] as? String ?? "",
        trainerUID: (data["trainerUID"] as? String) ?? (data["trainerId"] as? String) ?? "",
        // ... lots of manual casting
    )
}
```

**ClassesService:**
```swift
private func decodeClass(id: String, data: [String: Any]) -> GroupClass? {
    // Similar but different error handling
    guard let title = data["title"] as? String else { return nil }
    // ...
}
```

**Problems:**
- ❌ Code duplication
- ❌ No standardized null handling
- ❌ Verbose and error-prone
- ❌ Hard to maintain legacy field mappings

---

### 6. **No Caching Strategy**

**Current behavior:**
- Every view load = new Firebase query
- Redundant network calls
- Slow UX
- Unnecessary Firebase reads (costs money!)

**Example:**
```swift
// HomeView loads
await classesService.loadUpcomingClasses(orgId: orgId)

// User switches tabs and comes back
await classesService.loadUpcomingClasses(orgId: orgId) // Same query again!
```

---

### 7. **Missing Service Lifecycle Management**

**No standardized patterns for:**
- Initial load vs refresh
- Clearing stale data on logout
- Cancelling in-flight requests
- Retry logic
- Offline handling

---

### 8. **Verbose Method Signatures**

**Current:**
```swift
func loadMyBookings(orgId: String, limit: Int = 50) async
func loadOpenClasses(orgId: String) async
func loadAll(orgId: String) async
```

**Problems:**
- OrgId passed explicitly every time
- Could use environment/auth context
- Repeated parameters

---

## Proposed Solutions (Phase 2.1)

### ✅ **Solution 1: Base ServiceProtocol**

Create `/Services/Core/ServiceProtocol.swift`:

```swift
@MainActor
protocol ServiceProtocol: ObservableObject {
    associatedtype DataType
    
    var items: [DataType] { get }
    var isLoading: Bool { get }
    var error: Error? { get }
    
    func fetch() async throws
    func refresh() async
}
```

**Benefits:**
- Consistent interface
- Standard loading/error states
- Predictable API

---

### ✅ **Solution 2: Standard Service Template**

Update all services to follow this pattern:

```swift
@MainActor
final class BookingsService: ObservableObject {
    // MARK: - Published State
    @Published private(set) var items: [Booking] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Dependencies
    private let repository: BookingsRepositoryProtocol
    
    // MARK: - Initialization
    init(repository: BookingsRepositoryProtocol = FirebaseBookingsRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    func fetch() async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            items = try await repository.fetchBookings()
        } catch {
            self.error = error
            throw error
        }
    }
    
    func refresh() async {
        try? await fetch()
    }
}
```

---

### ✅ **Solution 3: Standardized Error Types**

```swift
enum ServiceError: LocalizedError {
    case notAuthenticated
    case networkError(Error)
    case decodingError(String)
    case invalidData(String)
    case notFound
    case unauthorized
    
    var errorDescription: String? { ... }
}
```

---

### ✅ **Solution 4: Repository Pattern** (Phase 2.2)

Move Firebase logic to repositories:

```swift
protocol BookingsRepositoryProtocol {
    func fetchBookings() async throws -> [Booking]
    func createBooking(_ booking: Booking) async throws
}

class FirebaseBookingsRepository: BookingsRepositoryProtocol {
    private let db = Firestore.firestore()
    
    func fetchBookings() async throws -> [Booking] {
        // Firebase-specific implementation
    }
}
```

**Benefits:**
- Services don't know about Firebase
- Easy to add MockRepository for tests
- Can add CachedRepository wrapper
- Can switch to different backend

---

## Implementation Priority

### Phase 2.1 (Current) - Service Standardization
1. ✅ Create ServiceProtocol and error types
2. 🔄 Refactor BookingsService as template
3. 🔄 Refactor ClassesService
4. 🔄 Refactor TrainersService
5. 🔄 Refactor PackagesService
6. 🔄 Apply pattern to remaining services

### Phase 2.2 - Repository Pattern
1. Create repository protocols
2. Extract Firebase logic
3. Add caching layer

### Phase 2.3 - Testing
1. Create mock repositories
2. Add service unit tests

---

## Estimated Impact

**Before:**
- 18 services with inconsistent patterns
- No testing strategy
- Tight Firebase coupling
- Redundant network calls

**After Phase 2.1:**
- ✅ Consistent service interfaces
- ✅ Standard error handling
- ✅ Predictable loading states
- ✅ Foundation for repository pattern

**After Phase 2.2:**
- ✅ Testable services
- ✅ Cacheable data
- ✅ Backend flexibility
- ✅ 50% reduction in Firebase reads

---

## Time Estimate

- **Phase 2.1**: 3-4 hours (create protocol + refactor 5 core services)
- **Phase 2.2**: 4-6 hours (repository pattern implementation)
- **Phase 2.3**: 2-3 hours (basic test coverage)

**Total: 1-2 days for complete service layer standardization**
