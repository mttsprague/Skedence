# Bug Fixes - February 2026

## Overview
Fixed three critical bugs affecting booking flow, profile refresh, and account management.

---

## Bug 1: Athlete Picker Disappearing When Selecting Package

### Symptom
In the client app BookView, when a user clicks on a pass to use, the athlete selection dropdowns disappear, preventing booking completion.

### Root Cause
When a package was selected, the `selectedAthletes` array was immediately cleared to `[]`. The UI's `ForEach` loop used `min(athleteCount, selectedAthletes.count)` as its range. Since `selectedAthletes.count` was 0 immediately after clearing, the range became `0..<0`, rendering no athlete pickers.

### Solution
Changed the `onSelect` handler in `packageSelectionSection` to immediately initialize the `selectedAthletes` array with the correct count based on the package category, rather than clearing it to an empty array.

**File:** `Skedence/Skedence/Features/Booking/BookView.swift`

**Change:**
```swift
// BEFORE
onSelect: { package in
    selectedPackage = package
    selectedAthletes = []  // ❌ Causes UI to disappear
}

// AFTER
onSelect: { package in
    selectedPackage = package
    // Initialize selectedAthletes array immediately with correct count
    if let category = getPackageCategory(package), category.isPrivateLesson {
        selectedAthletes = Array(repeating: nil, count: category.athleteCount)
    } else {
        selectedAthletes = []
    }
}
```

**Impact:** Athlete pickers now remain visible when a package is selected, allowing users to complete bookings without issue.

---

## Bug 2: Profile Not Refreshing After Registration

### Symptom
After a client registers via the web portal and opens the mobile app, profile data (especially assigned passes) doesn't load until they sign out and back in.

### Root Cause
The ProfileView's `.task` modifier only runs when the view first appears. When a user completes registration, the `isSignedIn` state changes from `false` to `true`, but the `.task` doesn't re-run because the view itself doesn't disappear and reappear.

### Solution
Added an `.onChange(of: isSignedIn)` modifier to reload all profile data when the authentication state transitions from signed-out to signed-in.

**File:** `Skedence/Skedence/Screens/ProfileView.swift`

**Change:**
```swift
.task {
    if isSignedIn {
        await usersService.loadCurrentUserIfAvailable()
        await packagesService.loadMyPackages(orgId: auth.currentOrgId)
        if let orgId = auth.currentOrgId {
            await bookingsService.loadMyBookings(orgId: orgId)
        }
    }
}
.onChange(of: isSignedIn) { oldValue, newValue in
    // When user signs in or registers, reload all profile data
    if newValue == true && oldValue == false {
        Task {
            await usersService.loadCurrentUserIfAvailable()
            await packagesService.loadMyPackages(orgId: auth.currentOrgId)
            if let orgId = auth.currentOrgId {
                await bookingsService.loadMyBookings(orgId: orgId)
            }
        }
    }
}
```

**Impact:** Profile data (including assigned passes) now loads immediately after registration/sign-in without requiring a sign-out/sign-in cycle.

---

## Bug 3: Missing Account Tab (Trainer Passes View)

### Symptom
The admin app's Account tab was missing a way for trainers/admins to view their own lesson passes.

### Root Cause
The original `AccountView.swift` and `AccountViewModel.swift` files were orphaned in the `.xcodeproj` folder and contained old authentication code, not pass viewing functionality.

### Solution
Added a "My Passes" collapsible card to the `MoreView` (Account tab) that displays the trainer's own lesson packages. The section:
- Loads packages using the existing `PackagesService`
- Shows pass name, remaining lessons, and expiration date
- Expands/collapses with animation
- Handles loading and empty states

**File:** `SkedenceAdmin/SkedenceAdmin/Features/Core/ContentView.swift`

**Changes:**

1. **Added state and service accessor:**
```swift
@State private var showMyPasses = false
private var packagesService: PackagesService { dependencies.packages }
```

2. **Added task to load packages:**
```swift
.task {
    // Load trainer's own packages
    if auth.isAuthenticated {
        await packagesService.loadMyPackages()
    }
}
```

3. **Added UI section:**
```swift
// My Passes Section
CardView {
    VStack(alignment: .leading, spacing: Spacing.md) {
        Button {
            withAnimation {
                showMyPasses.toggle()
            }
        } label: {
            HStack {
                Text("My Passes")
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Spacer()
                
                Image(systemName: showMyPasses ? "chevron.up" : "chevron.down")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .buttonStyle(.plain)
        
        if showMyPasses {
            Divider()
            
            if packagesService.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, Spacing.md)
            } else if packagesService.packages.isEmpty {
                Text("No passes found")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, Spacing.md)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(packagesService.packages) { package in
                        VStack(spacing: Spacing.xs) {
                            HStack {
                                VStack(alignment: .leading, spacing: Spacing.xxs) {
                                    Text(package.packageName ?? package.packageType.capitalized)
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                    
                                    Text("\(package.lessonsRemaining) of \(package.totalLessons) remaining")
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                                
                                Spacer()
                                
                                if let expiration = package.expirationDate {
                                    Text(expiration > Date() ? "Expires \(expiration.formatted(date: .abbreviated, time: .omitted))" : "Expired")
                                        .font(.caption)
                                        .foregroundStyle(expiration > Date() ? AppTheme.textSecondary : AppTheme.error)
                                }
                            }
                            
                            if package != packagesService.packages.last {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
}
.padding(.horizontal, Spacing.lg)
```

**Impact:** Trainers and admins can now view their own lesson passes directly in the Account tab.

---

## Testing Checklist

### Bug 1 - Athlete Picker
- [ ] Open client app
- [ ] Navigate to Book view
- [ ] Select a trainer and time slot
- [ ] Select a lesson package (1, 2, or 3 athlete)
- [ ] ✅ Verify athlete selection dropdowns appear and remain visible
- [ ] Complete booking with athlete selection

### Bug 2 - Profile Refresh
- [ ] Register new account via web portal
- [ ] Assign passes to new account (via admin portal or web)
- [ ] Open client app with new credentials
- [ ] Sign in
- [ ] ✅ Verify profile data loads immediately (name, email, passes)
- [ ] No need to sign out and back in

### Bug 3 - My Passes View
- [ ] Open admin app
- [ ] Sign in as trainer/admin
- [ ] Navigate to Account tab
- [ ] Tap "My Passes" to expand
- [ ] ✅ Verify passes are displayed with:
  - Package name
  - Remaining/total lessons
  - Expiration date (if applicable)
- [ ] Verify loading state works
- [ ] Verify empty state message if no passes

---

## Files Modified

### Client App (Skedence)
1. `Skedence/Skedence/Features/Booking/BookView.swift`
   - Fixed athlete picker initialization in package selection handler

2. `Skedence/Skedence/Screens/ProfileView.swift`
   - Added `.onChange(of: isSignedIn)` to reload data after authentication

### Admin App (SkedenceAdmin)
3. `SkedenceAdmin/SkedenceAdmin/Features/Core/ContentView.swift`
   - Added `showMyPasses` state variable
   - Added `packagesService` convenience accessor
   - Added `.task` to load trainer's packages
   - Added "My Passes" collapsible card UI section

---

## Deployment Notes

1. **No database changes** - All fixes are client-side only
2. **No Cloud Function changes** - No backend deployment required
3. **iOS App Updates Required:**
   - Client app (Skedence) needs rebuild for bugs 1 & 2
   - Admin app (SkedenceAdmin) needs rebuild for bug 3
4. **Testing Priority:** Bug 1 is critical (blocks bookings) - test thoroughly before release

---

## Related Documentation

- See [CLAUDE.md](./CLAUDE.md) for full project context
- Package storage paths use standard location: `organizations/{orgId}/users/{userId}/packages`
- PackageService in admin app uses same data source as client app
- All fixes follow existing SwiftUI patterns and use established services

---

**Date:** February 17, 2026  
**Branch:** rebrand-coachflow  
**Status:** ✅ Fixes implemented, ready for testing
