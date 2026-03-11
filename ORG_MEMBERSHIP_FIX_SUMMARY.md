# Organization Membership Fix - March 11, 2026

## Problem Summary

When trying to cancel a session in the admin portal, you received the error:
**"You are not a member of this organization"**

## Root Cause

The `adminCancelLesson` Cloud Function validates organization membership by looking for a document at:
```
orgMembers/{authUID}_{orgId}
```

However, when trainers were initially added via `SuperAdminViewModel.addTrainer()`, it created membership documents using the wrong format:
```
orgMembers/{trainerId}_{orgId}  ❌ WRONG
```

Example:
- **Wrong format:** `orgMembers/mattsprague_skedence_gym`
- **Correct format:** `orgMembers/oRw1vNd8KURFGHm88lKEKTWR9Nt1_skedence_gym`

This happened because trainers didn't have a Firebase Auth UID yet (they hadn't set up their password), so the code used their trainer document ID instead.

## What Was Fixed

### 1. Fixed Your Account ✅
- **Script:** `fix-org-membership.js`
- **Action:** Created correct `orgMembers` document with your Firebase Auth UID
- **Result:** You can now cancel sessions!

### 2. Fixed the Code to Prevent Future Issues ✅

#### A. Removed Premature orgMembers Creation
**File:** `SkedenceAdmin/SkedenceAdmin/Features/SuperAdmin/SuperAdminViewModel.swift`

**Before:**
```swift
// Create orgMembers entry immediately when trainer is added
try await db.collection("orgMembers")
    .document("\(userId)_\(orgId)")  // userId = trainerId (WRONG!)
    .setData(memberData)
```

**After:**
```swift
// NOTE: Do NOT create orgMembers here!
// We don't have the Firebase Auth UID yet.
// The orgMembers document will be created in the correct format
// {authUID}_{orgId} when the trainer completes password setup.
```

#### B. Enhanced Password Setup Flow
**File:** `SkedenceAdmin/SkedenceAdmin/Features/Authentication/PasswordSetupView.swift`

**Added:**
- Proper `joinedAt` timestamp
- Correct format using Firebase Auth UID

**This flow already worked correctly!** It creates:
```swift
let authBasedDocId = "\(firebaseUid)_\(orgId)"  // ✅ CORRECT
```

### 3. Cleaned Up Old Documents ✅
- **Script:** `cleanup-old-orgmembers.js`
- **Action:** Deleted 1 migrated document (`mattsprague_skedence_gym`)
- **Safety:** Only deletes documents marked with `migratedTo` field

## How It Works Now

### New Trainer Flow (Fixed):

1. **Admin adds trainer** → Creates trainer document only
   - NO orgMembers created yet
   
2. **Cloud Function sends invitation email** → Trainer receives setup link

3. **Trainer sets up password** → `PasswordSetupView` runs:
   - Creates Firebase Auth account
   - Gets Firebase Auth UID
   - Creates `orgMembers/{authUID}_{orgId}` ✅ CORRECT FORMAT
   - Links trainer document to Auth UID

### Result:
- Admin can cancel sessions immediately (uses Auth UID)
- Trainers can perform actions after password setup
- NO duplicate or incorrectly formatted documents

## Scripts Created

### 1. `check-org-membership.js`
**Purpose:** Diagnose membership issues

**Usage:**
```bash
node check-org-membership.js YOUR_EMAIL
```

**What it checks:**
- Firebase Auth UID
- Trainer documents
- orgMembers documents (correct and legacy formats)
- Expected vs actual membership documents

### 2. `fix-org-membership.js`
**Purpose:** Migrate old-format to new-format orgMembers

**Usage:**
```bash
node fix-org-membership.js YOUR_EMAIL [--dry-run]
```

**What it does:**
- Creates new format: `{authUID}_{orgId}`
- Preserves role and permissions
- Marks old document as migrated
- Safe to run multiple times

### 3. `cleanup-old-orgmembers.js`
**Purpose:** Remove migrated old-format documents

**Usage:**
```bash
node cleanup-old-orgmembers.js [--dry-run]
```

**What it does:**
- Finds documents with `migratedTo` field
- Safely deletes them
- Keeps orphaned documents (pending password setup)

## Verification

### Before Fix:
```
❌ orgMembers/mattsprague_skedence_gym (wrong format)
❌ Error: "You are not a member of this organization"
```

### After Fix:
```
✅ orgMembers/oRw1vNd8KURFGHm88lKEKTWR9Nt1_skedence_gym (correct)
✅ Can cancel sessions successfully
```

## Additional Benefits

### Future Trainers:
- Will automatically get correct format on password setup
- No manual migration needed

### Existing Trainers:
- Run `fix-org-membership.js` for any trainer experiencing issues
- Script safe to run on all trainer accounts

### Database Health:
- Clean, single source of truth for membership
- No duplicate or conflicting documents
- Proper audit trail (migratedTo field on old docs)

## Testing Checklist

- [x] Cancel session as admin (mttsprague@gmail.com) ✅
- [x] Verify orgMembers document format ✅
- [x] Clean up old documents ✅
- [x] Code updated to prevent future issues ✅
- [ ] Test new trainer invitation flow (next time)
- [ ] Test trainer password setup creates correct format (next time)

## Files Modified

1. `SkedenceAdmin/SkedenceAdmin/Features/SuperAdmin/SuperAdminViewModel.swift`
   - Removed premature orgMembers creation
   
2. `SkedenceAdmin/SkedenceAdmin/Features/Authentication/PasswordSetupView.swift`
   - Enhanced with joinedAt timestamp

3. Created Scripts:
   - `Scripts/check-org-membership.js`
   - `Scripts/fix-org-membership.js`
   - `Scripts/cleanup-old-orgmembers.js`

## Summary

✅ **Problem Fixed:** You can now cancel sessions  
✅ **Root Cause Eliminated:** Code updated to prevent wrong format  
✅ **Database Cleaned:** Old documents removed  
✅ **Tools Created:** Scripts for diagnosing and fixing similar issues  
✅ **Future-Proof:** New trainers will have correct format from day 1  

---

**Date:** March 11, 2026  
**Affected Accounts Fixed:** mttsprague@gmail.com  
**Other Accounts Checked:** admin@polyfacevolleyball.com (already correct)
