# Stripe Connect Integration Complete

**Date:** February 17, 2026  
**Status:** ✅ Implemented (needs testing & deployment)

---

## 🎯 Objective

Consolidate all Stripe payment settings in the web admin portal and ensure Stripe Connect configuration synchronizes to both iOS apps (client and admin).

---

## 📋 Changes Made

### 1. **Web Admin Portal - Stripe Settings Page**

**File:** `skedence-unified/src/app/(admin)/settings/stripe/page.tsx`

**Changes:**
- **Removed:** Manual API key entry fields (pk_live_, sk_live_)
- **Added:** Stripe Connect integration flow
- **New Features:**
  - Connect Stripe Account button (creates Express Connect account)
  - Status card showing connection state (charges, payouts, onboarding)
  - Refresh Status button (syncs latest status from Stripe)
  - Instructions for Stripe Connect onboarding process
  - Automatic synchronization to both iOS apps

**Flow:**
1. Owner clicks "Connect Stripe Account"
2. Calls `createConnectAccount` Cloud Function
3. Redirects to Stripe onboarding portal
4. After completion, returns to web app
5. Click "Refresh Status" to sync connection state
6. Platform publishable key automatically saved to Firestore
7. Both iOS apps immediately have access to Stripe payments

---

### 2. **iOS Client App - Stripe Loading**

**File:** `Skedence/Skedence/Services/AuthManager.swift` (lines 297-303)

**Before:**
```swift
// Read from organizations/{orgId}/stripe/config subcollection
let stripeDoc = try await Firestore.firestore()
    .collection("organizations")
    .document(orgId)
    .collection("stripe")
    .document("config")
    .getDocument()
```

**After:**
```swift
// Read from organizations/{orgId}.stripe.publishableKey field
if let stripe = orgData["stripe"] as? [String: Any],
   let pubKey = stripe["publishableKey"] as? String, !pubKey.isEmpty {
    stripePublishableKey = pubKey
    print("AuthManager: Loaded Stripe publishable key from Connect")
}
```

**Why:** 
- Matches storage location used by Cloud Functions and iOS Admin app
- Ensures all three apps read from same Firestore location
- Eliminates data synchronization issues

---

### 3. **iOS Admin App - Stripe Loading**

**File:** `SkedenceAdmin/SkedenceAdmin/Services/Authentication/AuthManager.swift` (lines 383-386)

**Status:** ✅ Already correct!

```swift
// Load Stripe publishable key
if let stripe = orgData["stripe"] as? [String: Any],
   let pubKey = stripe["publishableKey"] as? String, !pubKey.isEmpty {
    stripePublishableKey = pubKey
}
```

**Note:** iOS Admin app was already reading from the correct location (`organizations/{orgId}.stripe.publishableKey`). No changes needed.

---

### 4. **Cloud Functions - Stripe Connect**

**File:** `SkedenceAdmin/functions/src/stripe-connect.ts`

#### A. `createConnectAccount` Function (lines 103-121)

**Added:**
```typescript
// Get platform publishable key from environment
const platformPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const updateData: any = {
  "stripe.connectAccountId": account.id,
  "stripe.onboardingComplete": false,
  "stripe.chargesEnabled": false,
  "stripe.payoutsEnabled": false,
  "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
};

// Save platform publishable key for iOS apps
if (platformPublishableKey) {
  updateData["stripe.publishableKey"] = platformPublishableKey;
} else {
  console.warn("⚠️ STRIPE_PUBLISHABLE_KEY not set in environment");
}

await db.collection("organizations").doc(orgId).update(updateData);
```

**Why:** Saves platform's publishable key immediately when Connect account is created.

#### B. `refreshConnectAccountStatus` Function (lines 228-251)

**Added:**
```typescript
// Get platform publishable key from environment
const platformPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
if (!platformPublishableKey) {
  console.warn("⚠️ STRIPE_PUBLISHABLE_KEY not set in environment");
}

// Update organization with latest status
const updateData: any = {
  "stripe.chargesEnabled": account.charges_enabled,
  "stripe.payoutsEnabled": account.payouts_enabled,
  "stripe.onboardingComplete": account.details_submitted,
  "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
};

// Add publishable key if available (platform key used for all Connect payments)
if (platformPublishableKey) {
  updateData["stripe.publishableKey"] = platformPublishableKey;
}

await db.collection("organizations").doc(orgId).update(updateData);
```

**Why:** Updates publishable key when status is refreshed from Stripe.

---

## 🗄️ Data Architecture

### Firestore Storage Structure

```
organizations/{orgId}
├── stripe: {
│   ├── connectAccountId: string        // "acct_xxx" (Stripe Connect account)
│   ├── publishableKey: string          // "pk_live_xxx" (PLATFORM's key)
│   ├── onboardingComplete: boolean     // true after Stripe setup
│   ├── chargesEnabled: boolean         // true when can accept payments
│   └── payoutsEnabled: boolean         // true when can receive payouts
│   }
└── ownerUserId: string
```

**Key Points:**
- **ONE publishableKey** for ALL organizations (platform's key)
- **Unique connectAccountId** per organization (for payment routing)
- **Backend routing** sends payments to correct organization's bank account
- **iOS apps** all use same platform key for client-side payment processing

---

## 💳 Payment Flow Explained

### How Stripe Connect Works

1. **Client App Payment:**
   - Client opens Skedence app → View lesson packages
   - Selects package → Clicks "Purchase"
   - iOS SDK uses `stripe.publishableKey` (platform's key)
   - Creates payment method with Stripe

2. **Backend Processing:**
   - Calls `createPaymentIntentConnect` Cloud Function
   - Function validates pricing structure
   - Creates payment intent with:
     - Full amount charged to client's card
     - 5% application fee for platform
     - Remaining 95% transferred to organization's Connect account

3. **Money Transfer:**
   - **Client pays:** $80.00
   - **Platform receives:** $4.00 (5% fee)
   - **Business receives:** $76.00 (in their Stripe Connect account)
   - **Payout:** Goes directly to business's bank account

4. **iOS Apps Sync:**
   - Both iOS apps load `stripe.publishableKey` from Firestore
   - Client app uses it for purchase flows
   - Admin app uses it for Wallet charge flows
   - All payments route correctly based on `orgId`

---

## 🔐 Security Notes

### Platform Key vs. Connected Account Keys

**Platform Publishable Key:**
- Used by ALL iOS apps for ALL organizations
- Stored in Firebase Environment Config: `process.env.STRIPE_PUBLISHABLE_KEY`
- Value: `pk_live_51SnNeOFIh2MhEffNF7SS0liDja5jF9tha3SnJVAO42OcVDkBVIiTralDrcZplXU7JO4E3lijrDIA31RwIrh2oq2r00HBWB8fTD`
- Safe to expose client-side (it's "publishable")

**Platform Secret Key:**
- Used ONLY by Cloud Functions
- Stored in Firebase Environment Config: `process.env.STRIPE_SECRET_KEY`
- Value: `sk_live_xxx` (NOT shown in this document)
- NEVER exposed to clients

**Connect Account IDs:**
- Each organization has unique ID: `acct_xxx`
- Stored at `organizations/{orgId}.stripe.connectAccountId`
- Used by backend to route payments
- Associated with organization owner's Stripe account

---

## 🚀 Deployment Steps

### 1. Deploy Cloud Functions

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
npm run build
firebase deploy --only functions:createConnectAccount,functions:refreshConnectAccountStatus
```

### 2. Deploy Web App

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified"
npm run build
firebase deploy --only hosting
```

### 3. Build iOS Apps

**Client App:**
- Open Xcode project: `Skedence/Skedence.xcodeproj`
- Build and test on device
- Archive and upload to TestFlight

**Admin App:**
- Open Xcode project: `SkedenceAdmin/SkedenceAdmin.xcodeproj`
- Build and test on device
- Archive and upload to TestFlight

---

## ✅ Testing Checklist

### Web App Testing

- [ ] Navigate to https://skedence.com/settings/stripe
- [ ] Verify "Connect Stripe Account" button appears (for orgs without Stripe)
- [ ] Click button and verify redirect to Stripe onboarding
- [ ] Complete Stripe Express setup (or use existing Stripe account)
- [ ] Return to web app
- [ ] Click "Refresh Status" button
- [ ] Verify green status card appears showing:
  - ✅ Stripe Connected
  - ✅ Accepting payments: Enabled
  - ✅ Payouts to bank: Enabled
- [ ] Check Firestore Console: `organizations/{orgId}.stripe` should have:
  - `connectAccountId`: "acct_xxx"
  - `publishableKey`: "pk_live_xxx"
  - `onboardingComplete`: true
  - `chargesEnabled`: true
  - `payoutsEnabled`: true

### iOS Client App Testing

- [ ] Launch Skedence app on iPhone/iPad
- [ ] Sign in as client user
- [ ] Navigate to Passes page
- [ ] Tap "Buy Pass" button
- [ ] Verify Stripe payment sheet appears (should show $X amount)
- [ ] Complete test payment with card: `4242 4242 4242 4242`
- [ ] Verify payment succeeds
- [ ] Check pass appears in "My Passes"
- [ ] Verify money went to business's Stripe account (5% platform fee deducted)

### iOS Admin App Testing

- [ ] Launch SkedenceAdmin app on iPhone/iPad
- [ ] Sign in as admin/owner user
- [ ] Navigate to Business → Wallet tab
- [ ] Tap "Charge Client" button
- [ ] Select client and amount
- [ ] Verify Stripe payment sheet appears
- [ ] Complete test charge
- [ ] Verify charge appears in Stripe Dashboard
- [ ] Verify money routed to organization's Connect account

### Edge Cases

- [ ] Test with organization that has NO Stripe setup yet
  - Should show "Connect Stripe Account" button
  - Should complete onboarding flow
  - Should refresh status successfully
  
- [ ] Test with organization mid-onboarding (incomplete)
  - Should show orange "Setup Incomplete" card
  - Should allow "Continue Stripe Setup" button
  
- [ ] Test "Manage in Stripe" link
  - Should open Stripe Dashboard in browser
  - Should show organization's account

---

## 🐛 Troubleshooting

### Issue: "No Connect account exists"

**Cause:** Organization document doesn't have `stripe.connectAccountId`

**Solution:**
1. Go to web app → Settings → Stripe
2. Click "Connect Stripe Account"
3. Complete onboarding
4. Click "Refresh Status"

---

### Issue: "Organization's Stripe account is not ready to accept payments"

**Cause:** Onboarding incomplete or charges not enabled

**Solution:**
1. Go to web app → Settings → Stripe
2. Check status card:
   - If orange "Setup Incomplete" → Click "Continue Stripe Setup"
   - If green but charges disabled → Click "Refresh Status"
3. May need to complete identity verification in Stripe

---

### Issue: iOS apps show "Stripe not configured"

**Cause:** Organization document missing `stripe.publishableKey`

**Solution:**
1. Check Firestore: `organizations/{orgId}.stripe.publishableKey`
2. If missing, go to web app → Settings → Stripe → Click "Refresh Status"
3. If still missing, redeploy Cloud Functions (they set this value)

---

### Issue: Payments going to wrong account

**Cause:** Backend using wrong `connectAccountId`

**Solution:**
1. Check Cloud Function logs for errors
2. Verify `organizations/{orgId}.stripe.connectAccountId` is correct
3. Test payment with Stripe Dashboard test mode first
4. Check webhook events for payment routing

---

## 📝 Implementation Notes

### Why Platform Key for All Organizations?

With **Stripe Connect destination charges**, the platform processes ALL payments through its own Stripe account, then routes funds to the appropriate connected account. This means:

- **Client-side:** Uses platform's publishable key (pk_live_xxx)
- **Server-side:** Routes payment to correct Connect account (acct_xxx)
- **Payout:** Goes directly to organization's bank (linked during onboarding)

**Benefits:**
- Simplified iOS app code (one key for all)
- Platform controls payment flow (fraud detection, refunds)
- Automatic 5% platform fee collection
- Organizations don't need developer accounts or API access

**Alternative Approach (Direct Charges):**
- Each organization would have their own Stripe account
- Each would need unique publishable key
- Platform would need to manage multiple Stripe integrations
- More complex, harder to maintain

---

## 🔄 Migration Path for Existing Organizations

If any organizations currently have manual API keys stored in old location:

```
OLD: organizations/{orgId}/stripe/config
     └── publishableKey: "pk_live_individual_org_key"
     └── secretKey: "sk_live_individual_org_key"

NEW: organizations/{orgId}.stripe
     └── connectAccountId: "acct_xxx"
     └── publishableKey: "pk_live_platform_key"
     └── onboardingComplete: true
     └── chargesEnabled: true
     └── payoutsEnabled: true
```

**Migration Steps:**
1. Owner goes to web app → Settings → Stripe
2. Sees "Connect Stripe Account" button
3. Completes Connect onboarding (can use existing Stripe account)
4. System replaces old keys with new Connect setup
5. All payments flow through Connect (platform fee applied)

**No Data Loss:**
- Old payment history remains in Firestore
- Lesson passes still valid
- Client relationships unchanged
- Just payment routing updated

---

## 📊 Success Metrics

After deployment, monitor:

- ✅ Organizations successfully connecting Stripe accounts
- ✅ Payments processing through Connect (check Stripe Dashboard)
- ✅ Platform fees being collected (5% per transaction)
- ✅ Payouts reaching organization bank accounts
- ✅ iOS apps successfully using Stripe for purchases
- ✅ No errors in Cloud Function logs
- ✅ No client payment failures

---

## 🔗 Related Files

### Web App
- `skedence-unified/src/app/(admin)/settings/stripe/page.tsx` - Stripe settings UI
- `skedence-unified/src/hooks/useAuth.tsx` - Auth state management

### iOS Client
- `Skedence/Skedence/Services/AuthManager.swift` - Loads Stripe key
- `Skedence/Skedence/Services/StripeService.swift` - Payment processing

### iOS Admin
- `SkedenceAdmin/SkedenceAdmin/Services/Authentication/AuthManager.swift` - Loads Stripe key
- `SkedenceAdmin/SkedenceAdmin/Views/Business/Wallet/` - Wallet payment UI

### Cloud Functions
- `SkedenceAdmin/functions/src/stripe-connect.ts` - Connect account management
- `SkedenceAdmin/functions/src/stripe-payments.ts` - Payment processing (if exists)
- `SkedenceAdmin/functions/.env` - Environment variables (STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY)

### Documentation
- `CLAUDE.md` - Complete project reference
- `STRIPE_SETUP.md` - Original Stripe setup guide (now outdated)

---

## ✨ Next Steps

1. Deploy changes to staging environment
2. Test all three apps with test Stripe account
3. Verify payment flow end-to-end
4. Deploy to production
5. Monitor for issues in first 24 hours
6. Update CLAUDE.md with final deployment notes
7. Document any issues encountered during testing

---

**Status:** ✅ Code Complete - Ready for Testing

**Last Updated:** February 17, 2026 by GitHub Copilot
