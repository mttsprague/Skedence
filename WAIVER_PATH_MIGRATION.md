# Waiver Path Migration - Complete Guide

**Date:** March 6, 2026  
**Issue:** Duplicate waivers appearing in SkedenceAdmin client cards  
**Root Cause:** Waivers being saved to two different paths (Auth UID and firstName_lastName)

---

## 📋 Problem Summary

When clients signed waivers, the documents were being saved to:
1. **OLD PATH:** `users/{firebaseAuthUID}/documents/{waiverId}` (e.g., `users/abc123xyz/documents/...`)
2. **NEW PATH:** `users/{firstName_lastName}/documents/{waiverId}` (e.g., `users/jane_smith/documents/...`)

Different parts of the codebase were using different paths, causing:
- Duplicate waiver displays in admin app
- Inconsistent document fetching
- Confusion about which path is canonical

---

## ✅ Solutions Implemented

### 1. Standardized Waiver Saving (4 files updated)

**Files Updated:**
- `Skedence/Skedence/Features/Booking/BookView.swift`
- `Skedence/Skedence/Features/Booking/BookView/Views/ClassRegistrationSheet.swift`
- `Skedence-PolyFace/Skedence/Features/Booking/BookView.swift`
- `Skedence-PolyFace/Skedence/Features/Booking/BookView/Views/ClassRegistrationSheet.swift`

**Change:**
```swift
// BEFORE:
guard let userId = Auth.auth().currentUser?.uid,

// AFTER:
guard let userId = auth.currentUserDocId,
```

**Impact:** All NEW waivers are now saved to `users/{firstName_lastName}/documents/`

### 2. Standardized Waiver Checking (10 locations updated)

Updated all waiver status checks to look in firstName_lastName path:
- Pre-booking waiver checks
- `checkWaiverStatusForAthlete()` methods
- Class registration waiver checks
- Multi-athlete waiver validation

### 3. Updated Document Fetching in Client Apps (2 files)

**Files Updated:**
- `Skedence/Skedence/Screens/DocumentsView.swift`
- `Skedence-PolyFace/Skedence/Screens/DocumentsView.swift`

**Change:**
```swift
// BEFORE:
.task {
    if let userId = Auth.auth().currentUser?.uid {
        try? await documentsService.fetch(userId: userId)
    }
}

// AFTER:
.task {
    if let userId = auth.currentUserDocId {
        try? await documentsService.fetch(userId: userId)
    }
}
```

**Impact:** Client apps now fetch documents from correct firstName_lastName path

### 4. Updated Admin App Document Fetching (1 file)

**File Updated:**
- `SkedenceAdmin/SkedenceAdmin/Services/Utilities/FirestoreService.swift`

**Change:**
```swift
// NEW LOGIC: Try firstName_lastName first, fall back to authUserId
// 1. Check users/{clientId}/documents/ (firstName_lastName path)
// 2. If empty, check users/{authUserId}/documents/ (old path)
```

**Impact:** Admin app prioritizes new path, maintains backward compatibility

---

## 🔄 Migration Script

**Location:** `Scripts/migrate-waivers-to-name-path.js`

### What It Does:
1. Queries all users in Firestore
2. For users with `authUserId` field, checks for documents in old path
3. Copies documents from `users/{authUserId}/documents/` to `users/{firstName_lastName}/documents/`
4. Deletes documents from old path after successful copy
5. Skips documents that already exist in new path

### Prerequisites:
- Node.js installed
- Firebase Admin SDK service account key at `SkedenceAdmin/functions/service-account-key.json`

### How to Run:

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps"
node Scripts/migrate-waivers-to-name-path.js
```

### Expected Output:
```
🚀 Starting waiver migration...

📊 Found 45 total users

👤 Processing user: jane_smith
   Auth UID: abc123xyz789
   📄 Found 2 document(s) in old path
   ✅ Copied document waiver_001 to new path
   🗑️  Deleted waiver_001 from old path
   ✅ Copied document waiver_002 to new path
   🗑️  Deleted waiver_002 from old path

...

============================================================
📊 MIGRATION SUMMARY
============================================================
Total users:                    45
Users with authUserId:          40
Users with old documents:       15
Documents copied:               28
Documents deleted from old path:28
Documents already in new path:  5
Errors encountered:             0
============================================================

✅ Migration complete!
```

---

## 🧪 Testing Checklist

After running migration and deploying code changes:

### Client App (Skedence)
- [ ] Existing client can view their old waivers in Documents tab
- [ ] New client signs waiver during class registration
- [ ] New waiver appears in Documents tab
- [ ] No duplicate waivers shown

### Admin App (SkedenceAdmin)
- [ ] Client card shows waivers correctly
- [ ] No duplicate waivers displayed
- [ ] Can view waiver PDFs
- [ ] Client card handles clients with no waivers gracefully

### White-Label App (Skedence-PolyFace)
- [ ] PolyFace clients can view waivers
- [ ] New waivers save correctly
- [ ] Documents tab works identically to main app

---

## 📊 Database Schema

### User Document Structure:
```
users/
  {firstName_lastName}/           ← Document ID (e.g., "jane_smith")
    authUserId: "abc123xyz789"    ← Firebase Auth UID
    firstName: "Jane"
    lastName: "Smith"
    email: "jane@example.com"
    documents/                    ← NEW CANONICAL PATH
      {waiverId}/
        name: "Waiver - Jane Smith"
        type: "waiver"
        url: "gs://..."
        uploadedAt: Timestamp
        metadata: {...}
```

### OLD Path (Being Migrated):
```
users/
  {firebaseAuthUID}/              ← Auth UID as document ID (LEGACY)
    documents/
      {waiverId}/
        [same structure]
```

---

## 🔐 AuthManager Properties Reference

```swift
// SkedenceApp.swift / SkedenceAdminApp.swift
@StateObject private var auth = AuthManager.shared

// AuthManager.swift
@Published private(set) var currentUserId: String?      // Firebase Auth UID (abc123xyz)
@Published private(set) var currentUserDocId: String?   // Firestore doc ID (firstName_lastName)
```

**Usage:**
- **Authentication:** Use `currentUserId` (Firebase Auth UID)
- **Firestore Operations:** Use `currentUserDocId` (firstName_lastName)
- **Document Storage:** Use `currentUserDocId` (firstName_lastName)

---

## ⚠️ Important Notes

1. **Do not delete Users during migration** - Script expects user documents to exist
2. **Run script once** - It's idempotent but avoid running multiple times simultaneously
3. **Backup Firestore** - Consider exporting Firestore before running migration
4. **Test on staging first** - If you have a staging Firebase project, test there first
5. **Monitor for errors** - Check script output for any errors during migration
6. **Client re-sign option** - If migration fails for any client, they can simply sign waiver again

---

## 🚀 Deployment Order

1. **Run Migration Script:**
   ```bash
   node Scripts/migrate-waivers-to-name-path.js
   ```

2. **Build and Deploy iOS Apps:**
   - Build in Xcode
   - Test with TestFlight
   - Submit to App Store

3. **Verify in Production:**
   - Check existing clients can see waivers
   - Have new client sign waiver
   - Verify no duplicates in admin app

---

## 📞 Rollback Plan

If issues occur:

1. **iOS Apps:** Revert commits and redeploy previous version
2. **Database:** Old waivers are deleted during migration - restore from backup if needed
3. **Client Impact:** Clients can re-sign waivers if documents are missing

---

## ✅ Files Modified Summary

**iOS Client Apps (Waiver Saving):**
- `Skedence/Skedence/Features/Booking/BookView.swift`
- `Skedence/Skedence/Features/Booking/BookView/Views/ClassRegistrationSheet.swift`
- `Skedence-PolyFace/Skedence/Features/Booking/BookView.swift`
- `Skedence-PolyFace/Skedence/Features/Booking/BookView/Views/ClassRegistrationSheet.swift`

**iOS Client Apps (Document Fetching):**
- `Skedence/Skedence/Screens/DocumentsView.swift`
- `Skedence-PolyFace/Skedence/Screens/DocumentsView.swift`

**iOS Admin App:**
- `SkedenceAdmin/SkedenceAdmin/Services/Utilities/FirestoreService.swift`

**Migration Scripts:**
- `Scripts/migrate-waivers-to-name-path.js` (NEW)

**Total Files Modified:** 7 files + 1 new script

---

*This migration ensures consistent document storage using firstName_lastName as the canonical user identifier for Firestore operations.*
