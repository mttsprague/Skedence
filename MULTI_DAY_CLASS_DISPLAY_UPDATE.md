# Multi-Day Class Display Update

## Overview
Updated how multi-day class series are displayed across client booking views, while preserving full schedule visibility for admin/trainer calendars.

## Problem
When admins create a class for multiple days (e.g., Monday/Tuesday/Wednesday), the system creates 3 separate Firestore documents linked by a `seriesId`. Previously, all 3 days showed as separate, independent classes in client booking views, which was confusing for clients who might think they're registering for only one day.

## Solution
**Client Booking Views:** Show only the FIRST class of each series with an indication that it's for multiple days and display all dates/times.

**Admin/Trainer Calendars:** NO CHANGE - Continue showing all days to properly block the schedule.

**Web Admin Class List:** Group by series to show single entry with all dates.

## Changes Made

### 1. iOS Data Models (Both Apps)
**Files:**
- `Skedence/Skedence/Models/GroupClass.swift`
- `Skedence-PolyFace/Skedence/Models/GroupClass.swift`

**Added fields:**
```swift
var seriesId: String? // Links classes in a multi-day series
var isPartOfSeries: Bool? // Indicates if part of a multi-day series
var totalSeriesClasses: Int? // Total number of classes in the series
```

### 2. iOS Client Booking Views (Both Apps)
**Files:**
- `Skedence/Skedence/Features/Booking/BookView.swift`
- `Skedence-PolyFace/Skedence/Features/Booking/BookView.swift`

**Updated `availableClasses` computed property:**
- Filters future classes
- Groups by `seriesId` and keeps only FIRST occurrence per series
- Single-day classes (no seriesId) always included

**Logic:**
```swift
// Filter to only show first class of multi-day series
var seenSeries = Set<String>()
var filtered: [GroupClass] = []

for classItem in futureClasses {
    if let seriesId = classItem.seriesId, classItem.isPartOfSeries == true {
        // This is part of a multi-day series
        if !seenSeries.contains(seriesId) {
            // First occurrence of this series - include it
            seenSeries.insert(seriesId)
            filtered.append(classItem)
        }
        // Skip subsequent classes in the same series
    } else {
        // Single-day class or no series - always include
        filtered.append(classItem)
    }
}
```

### 3. iOS Class Cards (Both Apps)
**Files:**
- `Skedence/Skedence/Components/Cards/ClassCard.swift`
- `Skedence-PolyFace/Skedence/Components/Cards/ClassCard.swift`

**Added:**
- `@State private var seriesClasses: [GroupClass] = []` - Holds all classes in series
- "X-Day Series" badge indicator
- Multi-day date/time display

**Display logic:**
- If `isPartOfSeries == true` and `seriesClasses` is populated:
  - Date row: "Mon 3/10, Tue 3/11, Wed 3/12"
  - Time row: "9:00 AM - 10:00 AM" (same time each day)
- Otherwise: Standard single-day display

**Helper methods:**
```swift
// Load all classes in series from ClassesService
private func loadSeriesClasses(_ seriesId: String) async

// Format as "Mon 3/10, Tue 3/11, Wed 3/12"
private func formatSeriesDates(_ classes: [GroupClass]) -> String

// Format as "9:00 AM - 10:00 AM"
private func formatSeriesTimes(_ classes: [GroupClass]) -> String
```

### 4. Web Admin Class List
**File:** `skedence-unified/src/app/(admin)/classes/page.tsx`

**Added series grouping:**
```typescript
// Filter to only show first class of multi-day series
const uniqueClasses = useMemo(() => {
  const seenSeries = new Set<string>();
  const filtered: GroupClass[] = [];
  
  for (const cls of displayedClasses) {
    if (cls.seriesId && cls.isPartOfSeries) {
      if (!seenSeries.has(cls.seriesId)) {
        seenSeries.add(cls.seriesId);
        filtered.push(cls);
      }
    } else {
      filtered.push(cls);
    }
  }
  
  return filtered;
}, [displayedClasses]);
```

**Added `useMemo` import:**
```typescript
import { useEffect, useState, useMemo } from 'react';
```

### 5. Admin/Trainer Calendars (NO CHANGES)
**Files:**
- `skedence-unified/src/app/(admin)/scheduling/page.tsx`
- Admin iOS app schedule views

**Why no changes needed:**
- These views load classes directly with date range queries
- No filtering by `seriesId` applied
- All days of multi-day series will continue to appear
- This is the DESIRED behavior - trainers need to see schedule blocked on all days

## Testing Checklist

### Client Booking View (iOS)
- [ ] Multi-day class shows only once
- [ ] Badge shows "3-Day Series" (or correct number)
- [ ] Date row shows all dates: "Mon 3/10, Tue 3/11, Wed 3/12"
- [ ] Time row shows single time range: "9:00 AM - 10:00 AM"
- [ ] Single-day classes still display normally
- [ ] Search still works correctly
- [ ] Registration still applies to all days in series

### Web Admin Class List
- [ ] Multi-day class shows only once
- [ ] All dates should eventually be displayed (future enhancement)
- [ ] Search/filtering works correctly
- [ ] Edit/delete still functions properly

### Admin/Trainer Calendars
- [ ] **CRITICAL:** Multi-day classes still show on ALL days
- [ ] Schedule is properly blocked on Monday, Tuesday, AND Wednesday
- [ ] No filtering by seriesId occurring
- [ ] Calendar view functions as before

### Integration Tests
- [ ] Create new 3-day class series from admin app
- [ ] Verify: Client sees 1 class with 3 dates
- [ ] Verify: Admin calendar shows class on all 3 days
- [ ] Register client for class
- [ ] Verify: Client registered for all 3 days
- [ ] Check client's schedule: Should see all 3 days

## Technical Notes

### Data Structure
Multi-day classes are created as separate Firestore documents:
```
classes/
  class_1: { seriesId: "abc123", startTime: Mon, isPartOfSeries: true, totalSeriesClasses: 3 }
  class_2: { seriesId: "abc123", startTime: Tue, isPartOfSeries: true, totalSeriesClasses: 3 }
  class_3: { seriesId: "abc123", startTime: Wed, isPartOfSeries: true, totalSeriesClasses: 3 }
```

### Why This Approach?
1. **Database:** Keeps existing data structure (no migration needed)
2. **Registration:** Existing registration logic works unchanged
3. **Calendar Blocking:** Trainers see full schedule impact
4. **Client UX:** Simplified booking view with clear multi-day indication

### Client App Display Flow
1. `ClassesService.loadOpenClasses()` - Fetches all classes from Firestore
2. `BookView.availableClasses` - Filters future + groups by seriesId
3. `BookView.filteredClasses` - Applies search filter
4. `BookView` renders - Shows list of classes
5. `ClassCard` - Displays individual class
6. `ClassCard.loadSeriesClasses()` - Fetches all classes in series for date display

### Web Admin Display Flow
1. Page loads all classes from Firestore
2. `uniqueClasses` memo - Groups by seriesId (first class only)
3. `filteredClasses` - Applies search filter
4. Render - Shows grouped list
5. Edit/view - Still accesses all classes in series

## Future Enhancements

### Web Admin Class Cards
Consider showing all dates in the class card display:
```tsx
{cls.isPartOfSeries && cls.seriesId && (
  <Badge>
    {cls.totalSeriesClasses}-Day Series
  </Badge>
)}
```

### Registration Confirmation
Update registration confirmation to explicitly list all dates:
```
"You're registered for:
Tennis Class
Monday 3/10 - 9:00 AM
Tuesday 3/11 - 9:00 AM
Wednesday 3/12 - 9:00 AM"
```

### Calendar Integration
When client taps on series class, show mini-calendar with all dates highlighted.

## Deployment

### iOS Apps
1. Build both Skedence and Skedence-PolyFace in Xcode
2. Test on simulators/devices
3. Archive and submit to App Store Connect
4. Beta test via TestFlight
5. Submit for App Store review

### Web Admin Portal
```bash
cd skedence-unified
npm run build
firebase deploy --only hosting
```

### Verification Steps
1. Test in client app: Book → Classes → Verify single entry with multiple dates
2. Test in admin app: Schedule → Verify all days show
3. Test in web admin: Classes → Verify grouping works
4. Test registration: Verify applies to all days
5. Check Firestore: Verify no data structure changes

## Related Documentation
- Multi-day class creation: Admin app class creation flow
- Series registration: `ClassRegistrationSheet.swift`
- Firestore schema: `CLAUDE.md` - Classes Collection

---

**Status:** ✅ Code complete - Ready for testing  
**Last Updated:** February 17, 2026  
**Files Modified:** 8 files across 3 codebases
