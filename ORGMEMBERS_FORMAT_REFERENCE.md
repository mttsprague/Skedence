# orgMembers Document Format - Complete Reference

**Last Updated:** March 11, 2026  
**Status:** ✅ All systems now consistent

---

## Document ID Format

**STANDARD FORMAT:** `{trainerId}_{orgId}` or `{userId}_{orgId}`

- `trainerId` = ID of the trainer document in the `trainers` collection
- `userId` = ID of the user document in the `users` collection  
- `orgId` = ID of the organization

**Example:** `mattsprague_skedence_gym`

---

## Document Schema

```typescript
orgMembers/{userId}_{orgId} {
  userId: string,           // Trainer or user document ID
  authUserId: string,       // Firebase Auth UID (added after password setup)
  orgId: string,            // Organization ID
  role: "owner" | "admin" | "trainer" | "client",
  isActive: boolean,
  joinedAt: Timestamp,
  updatedAt?: Timestamp     // Added when authUserId is set
}
```

---

## Creation & Update Flow

### 1. **When Admin Adds Trainer (SuperAdminViewModel.swift)**
```swift
// Creates orgMembers document immediately
try await db.collection("orgMembers")
    .document("\(trainerId)_\(orgId)")
    .setData([
        "userId": trainerId,  // trainer document ID
        "orgId": orgId,
        "role": "trainer",
        "isActive": true,
        "joinedAt": Timestamp()
    ])
```

**At this point:**
- ✅ Document ID: `{trainerId}_{orgId}`
- ✅ userId field: trainerId
- ❌ authUserId field: NOT SET YET (trainer hasn't set password)

### 2. **When Trainer Sets Password (PasswordSetupView.swift + setupTrainerPassword Cloud Function)**

**iOS App (PasswordSetupView.swift):**
```swift
// Updates existing document with authUserId
let memberDocId = "\(trainerId)_\(orgId)"
try await db.collection("orgMembers").document(memberDocId).updateData([
    "authUserId": firebaseAuthUID,
    "updatedAt": Timestamp()
])
```

**Cloud Function (passwordSetup.ts):**
```typescript
// Updates existing document with authUserId
const orgMemberId = `${trainerId}_${orgId}`;
await orgMemberRef.update({
  authUserId: authUserId,  // Firebase Auth UID
  updatedAt: FieldValue.serverTimestamp(),
});
```

**After password setup:**
- ✅ Document ID: `{trainerId}_{orgId}` (unchanged)
- ✅ userId field: trainerId (unchanged)
- ✅ authUserId field: Firebase Auth UID (NOW SET)

---

## Querying orgMembers

### ❌ WRONG - Looking Up by Auth UID in Document ID
```typescript
// DON'T DO THIS - Document ID is NOT based on auth UID
const memberDoc = await db.collection("orgMembers")
  .doc(`${request.auth.uid}_${orgId}`)
  .get();
```

### ✅ CORRECT - Query by authUserId Field
```typescript
// DO THIS - Query by the authUserId field
const memberQuery = await db.collection("orgMembers")
  .where("authUserId", "==", request.auth.uid)
  .where("orgId", "==", orgId)
  .limit(1)
  .get();

if (memberQuery.empty) {
  throw new Error("Not a member");
}

const memberDoc = memberQuery.docs[0];
```

### ✅ CORRECT - Direct Lookup When You Have userId
```typescript
// If you have the userId (trainer/user document ID), you can look up directly
const userId = "mattsprague"; // from trainer or user document
const memberDoc = await db.collection("orgMembers")
  .doc(`${userId}_${orgId}`)
  .get();
```

---

## Updated Cloud Functions (All Fixed ✅)

All authorization functions now use the correct query pattern:

1. ✅ **stripe-connect.ts** - `isUserAdmin()` helper
2. ✅ **billing.ts** - `isUserAdmin()` helper + `getBillingStatus()`
3. ✅ **deleteTrainer.ts** - Admin verification
4. ✅ **index.ts** - `manualRegisterForClass()` + `adminCancelLesson()`
5. ✅ **wallet.ts** - `getPaymentMethodsForUser()`
6. ✅ **admin-payment.ts** - `adminProcessPayment()` + `adminChargeWithSavedCard()`
7. ✅ **deletePricingPackages.ts** - Admin verification
8. ✅ **passwordSetup.ts** - FIXED to update existing doc instead of creating new one

---

## Deletion Pattern

When deleting trainers/users, use the userId from their document:

```typescript
// Get userId from trainer/user document
const userId = trainerData.userId;

// Delete orgMembers entry
const membershipId = `${userId}_${orgId}`;
await db.collection("orgMembers").doc(membershipId).delete();
```

**Files that delete correctly:**
- ✅ deleteTrainer.ts
- ✅ trainerLimits.ts
- ✅ deleteUserAccount.ts

---

## Key Differences: Document ID vs Fields

| Field | Value | Notes |
|-------|-------|-------|
| **Document ID** | `{userId}_{orgId}` | Never changes, based on trainer/user doc ID |
| **userId** field | Trainer/user doc ID | Matches first part of document ID |
| **authUserId** field | Firebase Auth UID | Added after password setup, used for queries |
| **orgId** field | Organization ID | Matches second part of document ID |

**Critical Understanding:**
- The document ID is based on the **trainer document ID**, not the Firebase Auth UID
- The Firebase Auth UID is stored in the **authUserId field**
- All queries by authenticated users must use the **authUserId field**, not document ID lookup

---

## Migration History

**Before (WRONG):**
- Cloud Functions tried to look up: `{authUID}_{orgId}` as document ID
- Result: "Not a member of this organization" errors

**After (CORRECT):**
- Document IDs remain: `{trainerId}_{orgId}` (unchanged since creation)
- Cloud Functions query: WHERE authUserId == request.auth.uid
- Result: Authorization works correctly

---

## Testing Checklist

When testing orgMembers functionality:

- [ ] Admin can cancel sessions (adminCancelLesson)
- [ ] Admin can process payments (adminProcessPayment)
- [ ] Admin can delete trainers (deleteTrainer)
- [ ] Admin can manually register clients (manualRegisterForClass)
- [ ] Admin can delete pricing packages (deletePricingPackages)
- [ ] Admin can view client payment methods (getPaymentMethodsForUser)
- [ ] New trainers can set passwords (setupTrainerPassword updates existing doc)
- [ ] Trainer invitation flow creates correct document format

---

## Summary

**DO NOT CHANGE:**
- ❌ Document ID format (`{userId}_{orgId}`)
- ❌ Document creation in SuperAdminViewModel
- ❌ Document update in PasswordSetupView

**ALWAYS USE FOR QUERIES:**
- ✅ Query by `authUserId` field when you have Firebase Auth UID
- ✅ Direct lookup by `{userId}_{orgId}` when you have the trainer/user document ID

**ALL SYSTEMS NOW CONSISTENT:** iOS apps and Cloud Functions use the same format! 🎉
