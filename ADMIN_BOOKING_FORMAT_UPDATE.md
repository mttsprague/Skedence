# Admin Booking Format - Complete Update

**Date:** March 10, 2026  
**Status:** ✅ All systems updated

---

## 🎯 Objective

Ensure that when admins book lessons for clients, the booking documents use the correct `firstName_lastName` document ID format for `clientId` and `clientUID` fields, allowing client apps to find all admin-scheduled lessons.

---

## 🐛 Issues Found & Fixed

### 1. **Web Admin Portal** - Missing clientId Parameter
**File:** `skedence-unified/src/app/(admin)/bookings/page.tsx`

**Problem:** Bookings page wasn't passing `clientId` to Cloud Function.

**Fix:**
```typescript
await bookLesson({
  trainerId: selectedTrainer,
  slotId: selectedSlot,
  lessonPackageId: selectedPackage,
  clientId: selectedClient, // ✅ NOW PASSES: firstName_lastName document ID
});
```

**File:** `skedence-unified/src/components/admin/scheduling-modals.tsx`

**Fix:**
```typescript
await bookLessonFunc({
  trainerId,
  slotId,
  lessonPackageId: selectedPackageId,
  clientId: selectedClientId, // ✅ ALREADY HAD THIS: firstName_lastName document ID
});
```

### 2. **iOS Admin App** - Missing clientId Field in Booking Document
**File:** `SkedenceAdmin/SkedenceAdmin/Services/Utilities/FirestoreService.swift`

**Problem:** `adminBookLesson` function was setting `clientUID` but NOT `clientId` in booking documents. Client apps query by `clientId`, so couldn't find these bookings.

**Fix:**
```swift
var bookingData: [String: Any] = [
    "clientUID": safeClientId,  // firstName_lastName document ID
    "clientId": safeClientId,   // ✅ ADDED: Client apps query by this field
    "clientName": clientName,
    ...
]
```

### 3. **iOS Admin App** - Missing clientAuthUID Field in Booking Document
**File:** `SkedenceAdmin/SkedenceAdmin/Services/Utilities/FirestoreService.swift`

**Problem:** Booking documents didn't include `clientAuthUID` (client's Firebase Auth UID), which is used as a fallback query field.

**Fix:**
```swift
// Extract client's Auth UID from user document
var clientAuthUID: String? = nil
if let clientData = clientSnap.data() {
    clientAuthUID = clientData["authUserId"] as? String  // ✅ ADDED
}

// Add to booking document
if let authUID = clientAuthUID {
    bookingData["clientAuthUID"] = authUID  // ✅ ADDED
}
```

---

## ✅ Systems Already Correct (No Changes Needed)

### 1. **Client App** - User Creation
- Uses `IDGenerator.generateUserId()` to create `firstName_lastName` document IDs
- Format: `john_doe`, `mary_smith`, etc.
- **File:** `Skedence/Skedence/Services/AuthManager.swift`

### 2. **Client Selection in Admin Apps**
- Both iOS and web admin apps fetch clients from Firestore using document IDs
- These IDs are already in `firstName_lastName` format (for properly created users)
- **iOS:** `ClientsRepository` → `FirestoreService.fetchTrainerClients()`
- **Web:** Loads from `orgMembers.userId` → user document ID

### 3. **Cloud Functions** - bookLesson
- Already correctly handles `clientId` as document ID
- Fetches client's `authUserId` from user document
- Sets both `clientId` and `clientAuthUID` in booking
- **File:** `SkedenceAdmin/functions/src/index.ts`

```typescript
if (clientId) {
  userId = clientId; // Uses firstName_lastName document ID directly
  
  // Fetches client's Auth UID
  const clientUserDoc = await db.collection("users").doc(clientId).get();
  if (clientUserDoc.exists && clientUserDoc.data()?.authUserId) {
    clientAuthUID = clientUserDoc.data().authUserId; // Client's UID, not admin's
  }
}
```

---

## 📋 Booking Document Structure (After All Updates)

```javascript
{
  // Primary identifiers (firstName_lastName format)
  clientId: "john_doe",           // ✅ User document ID
  clientUID: "john_doe",          // ✅ Same as clientId (backward compatibility)
  
  // Firebase Auth UID
  clientAuthUID: "firebase_auth_uid_abc123", // ✅ Client's actual Auth UID
  
  // Other fields
  clientName: "John Doe",
  trainerId: "trainer_doc_id",
  trainerUID: "trainer_doc_id",
  trainerName: "Jane Coach",
  startTime: Timestamp,
  endTime: Timestamp,
  status: "confirmed",
  packageId: "package_doc_id",
  lessonPackageId: "package_doc_id",
  slotId: "schedule_slot_id",
  orgId: "org_id",
  bookedAt: Timestamp,
  location: "Gym A",
  // ... profile data, athletes, etc.
}
```

---

## 🚀 Deployment Steps

### 1. Deploy Web Admin Portal
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified"
npm run build
firebase deploy --only hosting
```

**Changes:**
- Bookings page now passes `clientId` to Cloud Function
- Scheduling modal already had this fix (confirmed)

### 2. Build & Deploy iOS Admin App
1. Open Xcode project: `SkedenceAdmin/SkedenceAdmin.xcodeproj`
2. Build for iOS (Cmd+B) - verify no errors
3. Archive and upload to TestFlight/App Store

**Changes:**
- `adminBookLesson` now sets `clientId` in booking documents
- `adminBookLesson` now extracts and sets `clientAuthUID` from client's user document

### 3. Cloud Functions (No Changes Needed)
Already deployed and correct. No redeployment necessary.

---

## 🔍 Verification Steps

### After Deployment:

1. **Test iOS Admin App:**
   - Log in as admin/trainer
   - Select a client (e.g., "John Doe")
   - Book a lesson for them
   - Check Firestore booking document has:
     - `clientId: "john_doe"` ✅
     - `clientUID: "john_doe"` ✅
     - `clientAuthUID: "firebase_auth_uid"` ✅

2. **Test Web Admin Portal:**
   - Log in to https://skedence.com as admin
   - Go to Bookings page
   - Select client, trainer, slot, package
   - Create booking
   - Check Firestore booking document has same fields as above

3. **Test Client App:**
   - Log in to client app as "John Doe"
   - Navigate to Schedule tab
   - **Verify:** Admin-scheduled lesson appears in the schedule ✅
   - Should see all lessons (self-booked AND admin-booked)

---

## 📦 Historical Data Fix

For existing admin bookings that have wrong `clientId` format (random IDs or Auth UIDs):

**Run Backfill Script:**
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"

# Dry run first (preview changes)
node backfill-admin-bookings.js --dry-run

# Execute (after verifying dry run looks correct)
node backfill-admin-bookings.js
```

**What it does:**
- Finds bookings with wrong clientId format
- Resolves correct `firstName_lastName` document ID using smart strategies:
  1. Direct document lookup
  2. Query users by authUserId field
  3. Convert clientName to firstName_lastName
  4. Query users by firstName/lastName fields
- Updates:
  - `clientId` → firstName_lastName format
  - `clientUID` → firstName_lastName format
  - `clientAuthUID` → Client's actual Auth UID
  - Adds `backfilledAt` timestamp for audit trail

**See:** `BACKFILL_ADMIN_BOOKINGS.md` for complete instructions

---

## 📊 Summary

### Fixed Issues:
1. ✅ Web admin bookings page - now passes `clientId`
2. ✅ iOS admin app - now sets `clientId` in booking documents
3. ✅ iOS admin app - now sets `clientAuthUID` in booking documents

### No Changes Needed:
- ✅ Client app user creation (already uses firstName_lastName)
- ✅ Client selection in admin apps (already uses document IDs)
- ✅ Cloud Functions bookLesson (already correct)

### Next Steps:
1. Deploy web admin portal
2. Build and deploy iOS admin app
3. Test booking flow end-to-end
4. Run backfill script for historical data
5. Verify clients can see all admin-scheduled lessons

---

**Result:** All three systems (web, iOS admin, cloud functions) now consistently use `firstName_lastName` document IDs when creating admin bookings, ensuring client apps can find all lessons scheduled for them.
