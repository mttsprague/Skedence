# Package Dropdown Grouping Fix

**Date:** January 28, 2026  
**Issue:** Package dropdown showing duplicate entries for same package type with incorrect remaining counts

## Problem Description

When booking a lesson, the dropdown menu to choose which pass to use was showing:
- Multiple entries for the same pricing package (duplicates)
- Individual package remaining counts instead of total combined count
- Packages showing "no allocation left" when lessons were available
- Old/expired package types from previous pricing structures

## Root Cause

The dropdown was displaying individual package documents. When a user purchased the same package type multiple times, each purchase created a separate document, resulting in duplicate entries in the UI.

## Solution Implemented

### iOS App (BookView.swift)

**Added Helper Functions:**
```swift
// Get unique package types from available packages
private var uniquePackageTypes: [String] {
    let types = Set(availableLessonPackages.map { $0.packageType })
    return Array(types).sorted()
}

// Get total remaining lessons for a specific package type
private func totalRemainingForLessons(packageType: String) -> Int {
    return availableLessonPackages.filter { $0.packageType == packageType }
        .reduce(0) { $0 + $1.lessonsRemaining }
}

// Get the first package of a specific type (for booking)
private func firstPackage(ofType packageType: String) -> LessonPackage? {
    return availableLessonPackages.first { $0.packageType == packageType }
}
```

**Updated Package Selection Menu:**
- Changed ForEach to iterate over `uniquePackageTypes` instead of `availableLessonPackages`
- Display format: `"Package Name (X left)"` where X is the total combined remaining
- Selection stores the first package of that type
- When booking, uses the selected package's type to find an available package document

### Admin Portal (bookings/page.tsx)

**Updated Interface:**
```typescript
interface LessonPackage {
  id: string;
  userId: string;
  packageName: string;
  packageType: string;  // Added
  remainingLessons: number;
  totalLessons: number;
}
```

**Added State Management:**
- `rawPackages`: Stores all individual package documents (for finding actual package ID when booking)
- `packages`: Stores grouped packages by packageType (for display)
- `selectedPackageType`: Stores the selected package type instead of package ID

**Implemented Grouping Logic:**
```typescript
// Group packages by packageType and sum remaining lessons
const groupedPackages = new Map<string, LessonPackage>();
packagesData.forEach(pkg => {
  if (groupedPackages.has(pkg.packageType)) {
    const existing = groupedPackages.get(pkg.packageType)!;
    existing.remainingLessons += pkg.remainingLessons;
    existing.totalLessons += pkg.totalLessons;
  } else {
    groupedPackages.set(pkg.packageType, { ...pkg });
  }
});
```

**Updated Booking Flow:**
1. User selects a packageType from dropdown
2. On booking, find the first package of that type with remaining lessons:
   ```typescript
   const packageToUse = rawPackages.find(pkg => 
     pkg.packageType === selectedPackageType && 
     pkg.remainingLessons > 0
   );
   ```
3. Pass the actual package document ID to `bookLesson` Cloud Function

## Results

### Before
```
Dropdown shows:
- 10-Pack Private (5 of 10 remaining)
- 10-Pack Private (3 of 10 remaining)
- 20-Pack Group (0 of 20 remaining)
```

### After
```
Dropdown shows:
- 10-Pack Private (8 left)
- 20-Pack Group (15 left)
```

## Key Features

1. **Grouping by Package Type:** All packages of the same type are combined into a single dropdown entry
2. **Aggregated Totals:** Shows the sum of all remaining lessons across all packages of that type
3. **Current Pricing Only:** Filters using `getCurrentPackageTypes()` to show only packages from the active pricing structure
4. **Clean Display:** Format changed to "(X left)" for consistency and clarity
5. **Schema Unchanged:** No database modifications required - purely UI/logic changes
6. **Backwards Compatible:** Maintains support for both old and new package storage paths

## Files Modified

1. `Skedence/Skedence/BookView.swift`
   - Lines 56-88: Added helper functions for grouping and aggregation
   - Lines 448-508: Updated package selection Menu to use grouped types

2. `admin-portal/src/app/bookings/page.tsx`
   - Lines 27-34: Updated LessonPackage interface
   - Lines 50-62: Added rawPackages state and selectedPackageType
   - Lines 149-207: Extracted and enhanced loadPackages function
   - Lines 265-289: Updated handleCreateBooking to find package by type
   - Lines 326: Updated selectedPackageData lookup
   - Lines 383-392: Updated dropdown to use packageType
   - Lines 511-519: Updated display format

## Testing Checklist

- [ ] iOS app shows grouped packages with combined totals
- [ ] Admin portal shows grouped packages with combined totals
- [ ] Booking with grouped packages works correctly
- [ ] Package count decrements after booking
- [ ] Multiple packages of same type are consumed in order
- [ ] Old packages (expired pricing) are filtered out
- [ ] No duplicate entries in dropdown
- [ ] Display format is consistent: "(X left)"

## Related Documentation

- `PROJECT_REFERENCE.md` - Package schema and paths
- `SCHEMA_STANDARDS.md` - orgId and package path standards
- `SCHEMA_VERIFICATION.md` - Verification of schema compliance
