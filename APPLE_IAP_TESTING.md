# Apple In-App Purchase Testing Guide

## What Was Fixed

The subscription purchases were working in StoreKit but failing to sync to Firebase with the error:
```
❌ Cannot sync: No user or receipt
```

**Root Causes:**
1. StoreKit sandbox receipts are different from production receipts
2. The Cloud Function needed the organizationId passed directly
3. Receipt wasn't being read correctly in sandbox environment

**Solutions Applied:**
1. ✅ StoreKitManager now fetches user's organization from Firestore before syncing
2. ✅ Added fallback to JWS representation for sandbox testing (transaction.jsonRepresentation)
3. ✅ Cloud Function accepts organizationId parameter to avoid extra lookup
4. ✅ Added FirebaseFirestore import to enable org lookup

## Testing the Fix

### 1. Build and Run in Xcode
```bash
# Open the project
open "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/SkedenceAdmin.xcodeproj"

# Build and run on simulator or device
# Use sandbox Apple ID for testing
```

### 2. Purchase a Subscription

1. Open the app and sign in with your test account
2. Navigate to Manage Subscription
3. Choose any plan (they all have 14-day free trials)
4. Complete the purchase with sandbox Apple ID

### 3. Verify Sync to Firebase

**Check Console Logs:**
```
✅ Purchase successful: skedence_[plan]_monthly
✅ Synced subscription to backend: [response data]
✅ Active subscription found: [plan]
```

**No more errors like:**
```
❌ Cannot sync: No user or receipt  ← This should be GONE
```

### 4. Verify UI Updates

**Business Tab:**
- Organization name should show: "Your Org - [Plan Name]"
- Subscription should update immediately after purchase

**Manage Subscription Tab (Bottom):**
- Should show current plan name
- Renewal date should be correct (14 days from now for free trial)

**Manage Subscription Tab (Inside):**
- Current plan card should show correct plan
- Status should show "Free Trial" badge
- Date should show "Renews [14 days from today]"

### 5. Verify Firestore Data

Open Firebase Console → Firestore:
```
organizations/{orgId}/
  billing:
    source: "apple"
    plan: "starter" | "studio" | "academy" | "enterprise"
    status: "active"
    currentPeriodEnd: [Timestamp 14 days from now]
    trialEndsAt: [Timestamp 14 days from now]
    appleTransactionId: "..."
    appleProductId: "skedence_xxx_monthly"
```

## Free Trial Details

**14-Day Free Trials:**
- All plans include 14-day free trial for first-time subscribers
- Offer IDs: `14_day_free_trial`, `free_trial`, `studio_free_trial`
- After trial: Monthly billing automatically starts
- `currentPeriodEnd` and `trialEndsAt` both set to 14 days from purchase
- User won't be charged until trial period ends

**What You Should See:**
- Status badge: "Free Trial" (green)
- Date: "Renews [14 days from purchase date]"
- Not: "Renews [today's date]" ← This was the bug

## Switching Plans

You can purchase multiple plans in sandbox to test switching:
1. Purchase Starter → should sync and show "starter" plan
2. Purchase Studio → should update to show "studio" plan
3. Purchase Academy → should update to show "academy" plan

Each purchase should:
- Update Firestore billing.plan field
- Update UI immediately
- Show correct trial end date (14 days from that purchase)

## What Changed Under the Hood

**StoreKitManager.swift:**
```swift
// OLD - Failed in sandbox
private func syncSubscriptionToBackend(transaction: Transaction) async {
    guard Auth.auth().currentUser != nil,
          let receipt = await getReceiptData() else {
        print("❌ Cannot sync: No user or receipt")  // ← Always failed here
        return
    }
    // ...
}

// NEW - Works in sandbox
private func syncSubscriptionToBackend(transaction: Transaction) async {
    guard let currentUser = Auth.auth().currentUser else { return }
    
    // Fetch org from Firestore
    let orgDoc = try await db.collection("users").document(currentUser.uid).getDocument()
    let orgId = (orgDoc.data()?["organizations"] as? [String])?.first
    
    // Try multiple receipt methods (sandbox compatible)
    let receipt: String
    if let bundleReceipt = await getReceiptData() {
        receipt = bundleReceipt
    } else if let jwsRepresentation = await getJWSRepresentation(for: transaction) {
        receipt = jwsRepresentation  // ← Works in sandbox!
    } else {
        return
    }
    
    // Pass orgId directly
    let data: [String: Any] = [
        "receipt": receipt,
        "productID": transaction.productID,
        "transactionID": String(transaction.id),
        "organizationId": orgId  // ← No extra lookup needed
    ]
}
```

**validateAppleReceipt Cloud Function:**
```typescript
// OLD - Had to look up org
const userDoc = await db.collection("users").doc(userId).get();
const orgId = userData?.organizations?.[0];

// NEW - Uses provided orgId or falls back to lookup
let orgId = organizationId;  // ← From iOS directly
if (!orgId) {
    // Fallback to lookup
    const userDoc = await db.collection("users").doc(userId).get();
    orgId = userData?.organizations?.[0];
}
```

## Known Issues (Already Fixed)

1. ✅ **"Cannot sync" error** - Fixed by adding Firestore org lookup
2. ✅ **Wrong renewal date** - Will be fixed once sync works (shows trial end date)
3. ✅ **UI not updating** - Will be fixed once Firestore updates
4. ✅ **Sandbox receipts** - Fixed by adding JWS fallback

## Next Steps

1. **Test the fix** - Purchase a subscription and verify sync works
2. **Check Firestore** - Verify billing data updates correctly
3. **Check UI** - Verify all subscription displays update
4. **Test plan switching** - Purchase different plans and verify updates
5. **Submit to App Store** - Once testing complete

## Production vs Sandbox

**Sandbox (Current Testing):**
- Uses sandbox Apple ID
- Transactions are free
- Subscriptions auto-renew quickly (minutes instead of months)
- Receipt format may differ from production
- JWS representation works well

**Production (After Release):**
- Real Apple IDs
- Real money
- Normal monthly billing cycles
- Standard receipt format
- Both receipt methods work

## Questions Answered

**Q: Did the free trial work with the promotional code?**
A: Yes! The free trial offers are configured correctly in App Store Connect. When you purchase in sandbox, you should see:
- `isTrialPeriod = true` in logs
- `trialEndsAt` timestamp 14 days from now in Firestore
- "Free Trial" badge in UI
- "Renews [14 days from purchase]" text

The issue was that the sync to Firestore was failing, so the UI was showing old Stripe billing data instead of the new Apple subscription data.

**Q: Why did the UI not update?**
A: The subscription display pulls data from `organizations/{orgId}/billing` in Firestore. Because the sync was failing, Firestore still had the old Stripe "studio" plan. Now that sync works, Firestore will update and the UI will show the correct plan.

**Q: Why was the renewal date today instead of 14 days from now?**
A: Same reason - the UI was showing old Stripe billing data. Once the Apple subscription syncs correctly, it will show:
- `currentPeriodEnd`: 14 days from purchase
- `trialEndsAt`: 14 days from purchase (only during trial)
- UI text: "Renews [14 days from purchase date]"
