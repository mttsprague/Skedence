# Fixes Complete - Package Colors & Recurring Schedule

## Issues Fixed

### 1. ✅ Package Category Colors Not Working
**Problem**: Class passes were showing blue instead of orange after re-saving pricing structure

**Root Cause**: 
- When implementing a custom `init(from decoder:)`, Swift doesn't automatically generate the `encode(to encoder:)` function
- This meant `packageCategory` was never being saved to Firestore when updating pricing
- The decoder was working fine (could read old data), but the encoder was missing (couldn't write new data)

**Solution**:
- Added custom `encode(to encoder:)` function to `PackageOption` struct in both apps
- Now when admin saves pricing, `packageCategory` field is properly written to Firestore
- Decoder defaults to `.pass` for backward compatibility with old data

**Files Changed**:
- `SkedenceAdmin/SkedenceAdmin/PricingStructure.swift`
- `Skedence/Skedence/PricingStructure.swift`

**Commit**: `9ca107c - Fix packageCategory not being saved to Firestore`

---

### 2. ✅ Recurring Schedule Slots Not Appearing in Client App
**Problem**: Admin could create recurring schedules, but they didn't show up in the client app's Book view

**Root Cause**:
- Cloud Function `processTrainerAvailability` was creating schedule slots without the `orgId` field
- Client app's `ScheduleService.loadOpenSlots` filters by `orgId` using `.whereField("orgId", isEqualTo: orgId)`
- Slots without `orgId` were invisible to the client query

**Solution**:
- Modified Cloud Function to extract `orgId` from trainer data: `const orgId = trainerData.orgId || null;`
- Added `orgId` to each slot: `if (orgId) { slotData.orgId = orgId; }`
- After deployment, recurring schedules will include `orgId` and be queryable by client app

**Files Changed**:
- `SkedenceAdmin/functions/index.ts` - `processTrainerAvailability` function

**Commit**: `8042578 - Add orgId to recurring schedule slots and debug logging for package colors`

---

## What You Need To Do

### For Package Colors:
1. **Re-save your pricing structure in the admin app**
   - Go to Pricing/Packages tab
   - Make any small change or just hit save
   - The encoder fix will now properly save `packageCategory` to Firestore

2. **Verify in client app**
   - Restart the client app to clear cache
   - Check the Profile → Wallet tab
   - Class passes should now show **orange** gradient
   - Regular passes should show **blue** gradient

3. **Check debug output** (optional)
   - Look for console messages like: `🎨 Package: Class Pass, category: classPass, type: class_pass`
   - This confirms the category is being loaded correctly

### For Recurring Schedule:
1. **Wait for Cloud Function deployment to complete**
   - Deployment is currently running in background
   - Check terminal for "Deploy complete!" message
   - Takes about 5-10 minutes for all 44 functions

2. **Recreate recurring availability**
   - Old recurring slots don't have `orgId` and won't show up
   - Delete old recurring schedule
   - Create a new recurring schedule in admin app
   - New slots will include `orgId` field

3. **Verify in client app**
   - Open client app Book view
   - Select a date within the recurring schedule range
   - Recurring time slots should now appear
   - You should be able to book them

---

## Technical Details

### Package Category System
- **Enum Values**: 
  - `.pass` = "pass" (for private lessons) → Royal Blue (#3258A3)
  - `.classPass` = "class" (for group classes) → Vibrant Orange (#F27121)

- **Color Logic** (ProfileView.swift):
  ```swift
  let gradientColor = category == .classPass ? AppTheme.secondary : AppTheme.primary
  ```

- **Encoding/Decoding**:
  - Decoder defaults to `.pass` for backward compatibility
  - Encoder now explicitly writes `packageCategory` field
  - Both apps must use matching encode/decode implementations

### Schedule Slot System
- **Query Requirements**:
  - Client app filters: `orgId`, `trainerId`, `status: "open"`, date range
  - All filters must match for slots to appear
  - Missing `orgId` makes slots invisible to client queries

- **Cloud Function Flow**:
  1. Admin opens recurring availability
  2. Calls Cloud Function `processTrainerAvailability`
  3. Function creates individual hourly slots with orgId
  4. Client app queries slots by orgId + trainerId + date
  5. Matching slots appear in Book view calendar

---

## Debug Logging Added

Debug print statement in ProfileView.swift (line ~390):
```swift
let _ = print("🎨 Package: \(packageOption.title), category: \(packageOption.packageCategory), type: \(packageOption.packageType)")
```

This helps verify what category values are being loaded from Firestore.

---

## Commits
1. `b88598b` - Fix Apply Recurring button validation
2. `c0c3262` - Fix packageCategory decoding
3. `8efd9a6` - Fix applyRecurring default end date
4. `8042578` - Add orgId to schedule slots + debug logging
5. `9ca107c` - Fix packageCategory encoding ⭐ **KEY FIX**

---

## Color Scheme Reference
- **Royal Blue** (#3258A3) - Primary, Pass packages
- **Vibrant Orange** (#F27121) - Secondary, Class Pass packages
- **Deep Navy** (#1A2B6D) - Accent
- **Silver Gray** (#B1B3B6) - Subtle
