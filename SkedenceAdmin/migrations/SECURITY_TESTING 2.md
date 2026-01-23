# Multi-Tenant Security Testing Guide

## Overview
This guide helps you verify that the new multi-tenant security rules properly isolate data between organizations.

## Prerequisites
- Firebase Emulator Suite installed (optional for local testing)
- Two test user accounts from different organizations
- Current orgId: `0Mtow1OaV7oUlCisKSNy` (Polyface Volleyball Academy)

## Test Scenarios

### Scenario 1: Users Can Access Their Own Org Data ✅
**Test:**
1. Sign in as a user with orgId `0Mtow1OaV7oUlCisKSNy`
2. Try to read from:
   - `/trainers` (should see trainers in your org)
   - `/users` (should see clients in your org)
   - `/classes` (should see classes in your org)
   - `/bookings` (should see relevant bookings)

**Expected Result:** ✅ All queries return data successfully

### Scenario 2: Users Cannot Access Other Org Data ❌
**Test:**
1. Create a second organization (Step 7)
2. Sign in as user from org A
3. Try to query data with orgId from org B
4. Attempt to read documents from org B

**Expected Result:** ❌ All queries return empty or throw permission denied

### Scenario 3: Role-Based Access Control
**Test Owner Role:**
- Can update organization settings
- Can manage org members (via backend)
- Has full admin access

**Test Admin Role:**
- Can create/update/delete classes
- Can manage user profiles
- Can create bookings

**Test Trainer Role:**
- Can read all clients in org
- Can create/update schedules
- Can create bookings for clients
- Cannot delete classes

**Test Client Role:**
- Can read own profile
- Can read classes in org
- Can register for classes
- Cannot read other users' profiles

### Scenario 4: Document-Level Security
**Test:**
1. User A from org X tries to read document from org Y
2. Verify query returns no results or permission denied

**Expected Result:** ❌ Access denied across org boundaries

### Scenario 5: Subcollection Isolation
**Test:**
1. Try to access lessonPackages from user in different org
2. Try to access schedules from trainer in different org
3. Verify subcollections respect org boundaries

**Expected Result:** ❌ Subcollections isolated by org

## Manual Testing Steps

### Step 1: Test Current Organization Access
```javascript
// Run in Firebase Console or app
const orgId = "0Mtow1OaV7oUlCisKSNy";

// Should succeed
db.collection("trainers")
  .where("orgId", "==", orgId)
  .get()
  .then(snap => console.log("Trainers:", snap.size));

db.collection("users")
  .where("orgId", "==", orgId)
  .get()
  .then(snap => console.log("Users:", snap.size));

db.collection("classes")
  .where("orgId", "==", orgId)
  .get()
  .then(snap => console.log("Classes:", snap.size));
```

### Step 2: Create Second Test Organization (Optional)
Run migrations to create a second organization:
```bash
cd PolyCal/migrations
node migrations/create-test-org.js
```

### Step 3: Verify Cross-Org Isolation
```javascript
// Try to access org B's data while signed in as org A user
const orgB = "<second-org-id>";

// Should return empty or fail
db.collection("trainers")
  .where("orgId", "==", orgB)
  .get()
  .then(snap => console.log("Should be 0:", snap.size));
```

### Step 4: Test Role Permissions
Sign in as different roles and test:
- Owner: Try updating organization document
- Trainer: Try creating a booking
- Client: Try creating a class (should fail)

## Automated Testing (Future)

Consider implementing:
1. Firebase Emulator Rules testing
2. Integration tests with multiple users
3. CI/CD pipeline that validates rules before deploy

## Common Issues

### Issue: "Missing or insufficient permissions"
**Cause:** User not in orgMembers collection or orgId mismatch
**Fix:** Verify orgMember document exists for user

### Issue: Queries return empty results
**Cause:** Documents missing orgId field or wrong orgId value
**Fix:** Run Step 4 migration again to add orgId to all docs

### Issue: Rules too restrictive
**Cause:** Role checks too strict
**Fix:** Review orgMembers collection for correct roles

## Validation Checklist

- [ ] All existing users can access their org's data
- [ ] Users cannot see data from other orgs
- [ ] Trainers can read all clients in their org
- [ ] Clients can only read their own profile
- [ ] Classes are visible only to org members
- [ ] Bookings respect org boundaries
- [ ] Schedules are org-scoped
- [ ] Subcollections (packages, documents) are isolated

## Success Criteria

✅ **Step 6 Complete** when:
1. New security rules deployed successfully
2. Existing functionality still works
3. Data properly scoped by orgId
4. No permission denied errors for valid operations

✅ **Step 7 Complete** when:
1. Created second test organization
2. Verified cross-org data isolation
3. Confirmed users cannot access other org's data
4. Role-based permissions working correctly

## Rollback Plan

If rules cause issues:
```bash
# Restore backup rules
cd PolyFace
cp firestore.rules.backup firestore.rules
firebase deploy --only firestore:rules
```

## Current Status
- ✅ Rules deployed to Firebase
- ⏳ Manual testing in progress
- ⏳ Cross-org isolation verification pending
