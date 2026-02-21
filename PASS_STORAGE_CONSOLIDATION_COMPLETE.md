# Pass Storage Consolidation - Complete

**Date:** February 17, 2026  
**Status:** ✅ All code changes complete - Ready for testing and deployment

---

## 🎯 Objective Achieved

Consolidated all lesson package storage from **3 different patterns** to **1 single standard location**:

**STANDARD PATH (ONLY):**
```
organizations/{orgId}/users/{userId}/packages/{packageId}
```

**OLD PATHS (DEPRECATED):**
- ❌ `users/{userId}/lessonPackages/{packageId}` - No longer used

---

## 📝 Changes Made

### 1. ✅ Cloud Functions (Stripe Payments)

**File:** `SkedenceAdmin/functions/src/stripe-direct.ts`
- **Updated:** `createPaymentWithSavedCard` (line 521) - Write to standard path only
- **Updated:** `confirmDirectPaymentIntent` (line 774) - Write to standard path only
- **Status:** Ready to deploy

**File:** `SkedenceAdmin/functions/src/stripe.ts`
- **Updated:** `confirmPaymentAndCreatePackage` (line 191) - Write to standard path only
- **Added:** orgId extraction from payment intent metadata
- **Status:** Ready to deploy (legacy function, rarely used)

### 2. ✅ Web Admin Portal

**File:** `skedence-unified/src/app/(admin)/passes/page.tsx`
- **Removed:** Lines 295-303 (OLD path write)
- **Kept:** Lines 305-314 (STANDARD path write)
- **Updated:** Console logs and error messages for clarity
- **Status:** Ready to build and deploy

### 3. ✅ iOS Admin App

**File:** `SkedenceAdmin/SkedenceAdmin/Services/Admin/AdminService.swift`
- **Removed:** Lines 522-532 (OLD path write)
- **Kept:** Lines 538-551 (STANDARD path write)
- **Updated:** Console logs for clarity
- **Status:** Ready to build in Xcode

### 4. ✅ Client iOS App

**File:** `Skedence/Skedence/Services/Repositories/PackagesRepository.swift`
- **Updated 8 methods** to query STANDARD path only:
  - `fetchAll` - Removed fallback logic
  - `fetchById` - Changed to new path
  - `create` - Changed to new path
  - `update` - Changed to new path
  - `delete` - Changed to new path
  - `fetch(where:)` - Changed to new path
  - `fetch(orderedBy:)` - Changed to new path
  - `fetchActivePackages` - Removed fallback logic
- **Removed:** All `users/{userId}/lessonPackages` queries
- **Removed:** All fallback "try new, fall back to old" logic
- **Status:** Ready to build in Xcode

### 5. ✅ Data Migration Script

**File:** `SkedenceAdmin/functions/migrate-packages-to-new-path.js`
- **Created:** New migration script
- **Features:**
  - Queries all users with packages in old path
  - Reads orgId for each user
  - Copies packages to new path (same document IDs)
  - Keeps old data as backup (does NOT delete)
  - Logs detailed results
- **Status:** Ready to run

### 6. ✅ Documentation

**File:** `CLAUDE.md`
- **Updated:** "Package Storage Paths" section (lines 410-465)
- **Removed:** Dual-path patterns and fallback examples
- **Added:** Note about February 2026 consolidation
- **Added:** Migration information
- **Status:** Complete

---

## 🚀 Deployment Steps

### Step 1: Deploy Cloud Functions
```bash
cd SkedenceAdmin/functions
npm run build
firebase deploy --only functions
```

**What this does:** Updates Stripe payment functions to write packages to standard path

**Test after deploying:**
1. Make a test purchase in client app (use Stripe test mode)
2. Check Firebase Console: `organizations/{orgId}/users/{userId}/packages`
3. Verify package appears in new path (not old path)
4. Verify package shows in client app profile

---

### Step 2: Deploy Web Admin Portal
```bash
cd skedence-unified
npm run build
firebase deploy --only hosting
```

**What this does:** Updates admin portal to write packages to standard path only

**Test after deploying:**
1. Log in to https://skedence.com
2. Navigate to Passes page
3. Add a pass to a test client
4. Check Firebase Console for write to new path only
5. Verify pass shows in client app

---

### Step 3: Build and Test iOS Admin App
```bash
# Open in Xcode
open SkedenceAdmin/SkedenceAdmin.xcodeproj

# In Xcode:
# 1. Select SkedenceAdmin scheme
# 2. Build (Cmd+B)
# 3. Run on device or simulator (Cmd+R)
```

**Test after building:**
1. Open SkedenceAdmin app
2. Navigate to a client
3. Add a pass to the client
4. Check Firebase Console for write to new path only
5. Verify pass shows in client app

---

### Step 4: Build and Test Client iOS App
```bash
# Open in Xcode
open Skedence/Skedence.xcodeproj

# In Xcode:
# 1. Select Skedence scheme
# 2. Build (Cmd+B)
# 3. Run on device or simulator (Cmd+R)
```

**Test after building:**
1. Open Skedence app
2. Navigate to Profile → Passes
3. Verify all existing passes show correctly
4. Create a booking using a pass
5. Verify lessonUsed increments correctly

---

### Step 5: Run Data Migration (IMPORTANT)
```bash
cd SkedenceAdmin/functions
node migrate-packages-to-new-path.js
```

**What this does:**
- Copies all existing packages from old path to new path
- Uses same document IDs
- Keeps old data as backup
- Logs results for verification

**When to run this:**
- After deploying Stripe functions (Step 1)
- Before or after iOS app updates (Steps 3-4)
- Can be run multiple times (skips already-migrated packages)

**Expected output:**
```
🚀 Starting package migration...
📂 Querying all users...
✅ Found X users

👤 User: abc123 (John Doe)
   OrgId: elite_training_studio
   Packages to migrate: 3
   ✅ Migrated package pkg_001 (private)
   ✅ Migrated package pkg_002 (2_athlete)
   ✅ Migrated package pkg_003 (class_pass)

📊 Migration Summary:
Total users processed: X
Packages migrated: Y
Packages skipped (already existed): Z
Errors: 0
```

---

## ✅ Verification Checklist

After all deployments and migration:

- [ ] **Stripe Purchases:** Test card purchase creates package in new path only
- [ ] **Web Admin:** Adding pass in portal writes to new path only
- [ ] **iOS Admin:** Adding pass in app writes to new path only
- [ ] **Client App:** All passes display correctly in profile
- [ ] **Booking:** Can create booking using pass from new path
- [ ] **Pass Balance:** lessonsUsed increments correctly after booking
- [ ] **Migration:** All old packages copied to new path
- [ ] **Firebase Console:** Check random samples of packages in new location
- [ ] **No Errors:** Check Firebase Console for Cloud Function errors
- [ ] **No Errors:** Check Xcode console for iOS app errors

---

## 📊 Impact Summary

### Before Consolidation:
- **Write Locations:** 6 different places writing packages
  - Stripe: 3 functions → old path
  - Web Admin: → both old and new paths
  - iOS Admin: → both old and new paths
  - Client iOS: → old path
- **Read Locations:** 2 systems with fallback queries
  - Client iOS: Try new, fall back to old (8 methods)
  - Web Admin: Single path reads
- **Data Duplication:** Yes (dual writes created duplicates)
- **Query Performance:** Slower (fallback queries)
- **Maintenance Burden:** High (3 different patterns)

### After Consolidation:
- **Write Locations:** 1 standard path everywhere
  - Stripe: → standard path
  - Web Admin: → standard path
  - iOS Admin: → standard path
  - Client iOS: → standard path
- **Read Locations:** 1 standard path everywhere
  - Client iOS: Direct query (no fallbacks)
  - Web Admin: Direct query
- **Data Duplication:** None (single path only)
- **Query Performance:** Faster (direct queries)
- **Maintenance Burden:** Low (single pattern)

### Benefits:
1. **Data Integrity:** Single source of truth
2. **Performance:** No fallback queries
3. **Simplicity:** Easier to understand and debug
4. **Cost:** Fewer Firestore reads (no fallbacks)
5. **Future-Proof:** Clean foundation for new features

---

## ⚠️ Important Notes

1. **Old Data Preserved:** Migration script does NOT delete old packages
   - They remain as backup
   - No reads query them anymore
   - Can be manually deleted later if desired

2. **Client App Update Required:** Users must update to new client app version
   - Old app versions will show empty passes (querying old path)
   - New app versions query new path correctly

3. **Backward Compatibility:** None (by design)
   - No fallback queries anymore
   - All systems must use new path
   - Migration script ensures data is in new path

4. **Testing Order Matters:**
   - Deploy Stripe functions FIRST (client purchases)
   - Test purchases immediately
   - Then deploy admin portals
   - Run migration script
   - Finally test all systems together

5. **Rollback Plan:**
   - If issues arise, can temporarily add fallback logic back
   - Old data still exists as backup
   - Can re-run migration script if needed

---

## 🎉 Next Steps

**Immediate Actions:**
1. Review this document and understand all changes
2. Deploy Cloud Functions (Step 1)
3. Test Stripe purchases
4. Deploy Web Admin (Step 2)
5. Test admin portal pass creation
6. Build iOS apps (Steps 3-4)
7. Run migration script (Step 5)
8. Complete verification checklist

**After Testing:**
1. Update iOS apps in App Store (when ready)
2. Monitor Firebase Console for errors
3. Monitor user reports
4. Consider deleting old packages after 30 days (optional)

---

## 📞 Support

If issues arise during deployment or testing:
1. Check Firebase Console for error logs
2. Check Xcode console for iOS errors
3. Verify migration script completed successfully
4. Check this document for troubleshooting steps

**Common Issues:**
- **Packages not showing:** Run migration script
- **Duplicate packages:** Old app version still installed
- **Purchase fails:** Check Stripe function deployment
- **orgId missing:** Check user document has orgId field

---

**Document created:** February 17, 2026  
**Status:** Ready for deployment and testing
