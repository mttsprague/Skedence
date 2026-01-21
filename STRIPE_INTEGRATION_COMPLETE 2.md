# Admin Stripe Integration - Complete Setup Guide

## ✅ What's Been Implemented

### 1. **Pass Management** (Fully Functional)
- ✅ Add passes to clients
- ✅ Remove passes from clients  
- ✅ Smart removal (oldest packages first)
- ✅ Firebase rules updated and deployed

### 2. **Stripe Keys Onboarding Flow** (NEW!)
- ✅ New setup view for admins to input Stripe keys
- ✅ Integrated into onboarding checklist
- ✅ Validates key format (test vs live mode)
- ✅ Stores publishable key in Firestore organization document
- ✅ Marks onboarding as complete when keys added

### 3. **Cloud Functions** (Deployed)
- ✅ `adminChargeClient` - Create payment intent
- ✅ `adminConfirmCharge` - Confirm and record transaction
- ✅ Both functions deployed to Firebase (us-central1)

### 4. **Client App Integration** (Ready)
- ✅ AdminPaymentService created
- ✅ Automatically loads Stripe keys from organization
- ✅ Ready for payment sheet integration

---

## 🔄 How It Works

### **Admin Flow (SkedenceAdmin App)**

1. **During Onboarding:**
   - Admin sees "Connect Stripe" in setup checklist
   - Clicks item → Opens StripeKeysSetupView
   - Selects Test Mode or Live Mode
   - Enters Publishable Key (pk_test_... or pk_live_...)
   - Enters Secret Key (sk_test_... or sk_live_...)
   - Keys validated by format
   - Clicks "Save & Continue"

2. **What Happens:**
   ```
   StripeKeysSetupView
   ├── Validates key format
   ├── Saves to Firestore:
   │   organizations/{orgId}
   │   ├── stripe.publishableKey: "pk_test_..."
   │   ├── stripe.mode: "test" 
   │   ├── stripe.keysConfigured: true
   │   └── onboardingProgress.hasConnectedStripe: true
   └── Marks setup complete ✓
   ```

3. **Note on Secret Key:**
   - NOT stored in Firestore (security)
   - Admin shown message to configure via Firebase CLI
   - Command: `firebase functions:config:set stripe.secret_key="sk_test_..."`

### **Client App Flow (Skedence)**

1. **Admin Opens Wallet Tab:**
   - Selects client from dropdown
   - Enters charge amount
   - Checks "Save card" if desired
   - Clicks "Charge Card"

2. **Payment Processing:**
   ```
   AdminPanelView (Wallet Tab)
   ├── Calls adminChargeClient() Cloud Function
   │   ├── Creates Stripe customer (if needed)
   │   ├── Creates payment intent with amount
   │   └── Returns clientSecret
   │
   ├── Shows Stripe PaymentSheet (NOT YET IMPLEMENTED)
   │   ├── User enters card details
   │   └── Stripe processes payment
   │
   └── Calls adminConfirmCharge() Cloud Function
       ├── Verifies payment succeeded
       ├── Creates transaction in Firestore
       ├── Saves payment method (if checked)
       └── Returns transactionId
   ```

---

## 📁 Files Created/Modified

### SkedenceAdmin (Admin App)
1. **`StripeKeysSetupView.swift`** (NEW)
   - Full UI for Stripe key input
   - Test/Live mode toggle
   - Key format validation
   - Saves to Firestore

2. **`SetupChecklistView.swift`** (MODIFIED)
   - Added sheet presentation for StripeKeysSetupView
   - Listens for "ShowStripeKeysSetup" notification
   - Shows view when "Connect Stripe" clicked

3. **`SetupChecklistViewModel.swift`** (MODIFIED)
   - Changed navigateToStripeSetup() to post notification
   - Triggers StripeKeysSetupView presentation

### Skedence (Client App)
1. **`AdminPanelView.swift`** (PREVIOUSLY MODIFIED)
   - Wallet tab with client selection
   - Placeholder for payment processing

2. **`AdminPaymentService.swift`** (NEW)
   - Service class for payment operations
   - chargeClient() - Initiates payment
   - confirmCharge() - Confirms and records
   - loadSavedPaymentMethods() - Loads saved cards

3. **`AdminService.swift`** (PREVIOUSLY MODIFIED)
   - removePassFromClient() function

### Backend
1. **`functions/src/stripe.ts`** (MODIFIED)
   - adminChargeClient function
   - adminConfirmCharge function
   - Both deployed successfully ✅

2. **`Skedence/firestore.rules`** (MODIFIED & DEPLOYED)
   - Transactions collection rules
   - Payment methods subcollection rules
   - Deployed successfully ✅

---

## 🚀 Deployment Status

### ✅ Deployed
- Firestore security rules
- Cloud Functions:
  - `adminChargeClient(us-central1)` ✅ 
  - `adminConfirmCharge(us-central1)` ✅

### ⏳ Remaining Integration
- Stripe iOS SDK installation (Swift Package Manager)
- PaymentSheet UI in Wallet tab
- Wire up AdminPaymentService to UI
- Test with Stripe test cards

---

## 🔐 Security Architecture

### **What's Stored Where**

**Firestore (Public - in org document):**
```json
organizations/{orgId}
└── stripe
    ├── publishableKey: "pk_test_..." ✅ SAFE
    ├── mode: "test" or "live"
    └── keysConfigured: true
```

**Firebase Functions Config (Private):**
```bash
stripe.secret_key = "sk_test_..." ✅ SECURE
```

**Never Stored:**
- ❌ Secret keys in Firestore
- ❌ Secret keys in client apps
- ❌ Secret keys in code repositories

---

## 📝 Next Steps for Admin

### **Step 1: Get Stripe Keys**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API Keys**
3. Copy both:
   - Publishable key (pk_test_...)
   - Secret key (sk_test_...)

### **Step 2: Enter Keys in SkedenceAdmin App**
1. Open SkedenceAdmin app
2. If onboarding: Click "Connect Stripe" in checklist
3. If already onboarded: Go to Settings → Stripe
4. Select "Test Mode"
5. Paste both keys
6. Click "Save & Continue"

### **Step 3: Configure Secret Key via Firebase CLI**
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"

firebase functions:config:set stripe.secret_key="YOUR_SECRET_KEY_HERE" --project polyface-ae6d3

firebase deploy --only functions --project polyface-ae6d3
```

### **Step 4: Test in Client App**
1. Open Skedence client app
2. Go to Admin Panel → Wallet tab
3. Select a test client
4. Enter amount (e.g., $10.00)
5. Click "Charge Card"
6. Use test card: 4242 4242 4242 4242
7. Any future expiry, any CVC
8. Verify payment succeeded

---

## 🧪 Testing Checklist

### Admin Onboarding
- [ ] Can access StripeKeysSetupView from checklist
- [ ] Test/Live mode toggle works
- [ ] Validates key format correctly
- [ ] Rejects invalid keys
- [ ] Saves keys to Firestore
- [ ] Marks onboarding complete
- [ ] Publishable key loads in client app

### Payment Processing (Once UI Complete)
- [ ] Can select client
- [ ] Can enter amount
- [ ] Payment sheet appears
- [ ] Can enter test card
- [ ] Payment succeeds
- [ ] Transaction created in Firestore
- [ ] Save card checkbox works
- [ ] Saved card appears in list
- [ ] Can charge using saved card
- [ ] Error handling for declined cards

---

## 💰 Stripe Test Cards

**Success:**
- 4242 4242 4242 4242 (Visa)
- 5555 5555 5555 4444 (Mastercard)

**Requires Authentication:**
- 4000 0025 0000 3155 (3D Secure)

**Declined:**
- 4000 0000 0000 9995 (Generic decline)
- 4000 0000 0000 9987 (Insufficient funds)

**For all test cards:**
- Any future expiry (e.g., 12/34)
- Any 3-digit CVC
- Any zip code

---

## 🔧 Configuration Commands

### View Current Config
```bash
firebase functions:config:get --project polyface-ae6d3
```

### Set Secret Key
```bash
firebase functions:config:set stripe.secret_key="sk_test_..." --project polyface-ae6d3
```

### Remove Config (if needed)
```bash
firebase functions:config:unset stripe.secret_key --project polyface-ae6d3
```

### Deploy After Config Change
```bash
firebase deploy --only functions --project polyface-ae6d3
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN ONBOARDING                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin enters Stripe keys in SkedenceAdmin               │
│     ├── Publishable Key → Firestore org document           │
│     └── Secret Key → Firebase Functions config (manual)    │
│                                                             │
│  2. Keys automatically available in client app              │
│     └── Loaded from org document on auth                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT PROCESSING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Skedence Client App (Wallet Tab)                          │
│  │                                                          │
│  ├─ Admin selects client                                   │
│  ├─ Enters amount ($50.00)                                 │
│  └─ Clicks "Charge Card"                                   │
│      │                                                      │
│      v                                                      │
│  Cloud Function: adminChargeClient                         │
│  │                                                          │
│  ├─ Creates/retrieves Stripe customer                      │
│  ├─ Creates payment intent ($50 = 5000 cents)              │
│  └─ Returns clientSecret                                   │
│      │                                                      │
│      v                                                      │
│  Stripe PaymentSheet (iOS SDK)                             │
│  │                                                          │
│  ├─ Admin enters card: 4242 4242 4242 4242                 │
│  ├─ Stripe processes payment                               │
│  └─ Returns payment intent ID                              │
│      │                                                      │
│      v                                                      │
│  Cloud Function: adminConfirmCharge                        │
│  │                                                          │
│  ├─ Verifies payment succeeded                             │
│  ├─ Creates transaction document                           │
│  ├─ Saves payment method (if checked)                      │
│  └─ Returns transaction ID                                 │
│      │                                                      │
│      v                                                      │
│  ✅ Success message shown                                   │
│  ✅ Transaction in Firestore                                │
│  ✅ Card saved (optional)                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Summary

**What's Working:**
- ✅ Admin can input Stripe keys during onboarding
- ✅ Keys saved to Firestore organization
- ✅ Cloud Functions deployed and ready
- ✅ Pass add/remove fully functional
- ✅ Firebase rules secure
- ✅ Payment service layer created

**What's Needed to Complete:**
1. Install Stripe iOS SDK in Xcode
2. Integrate PaymentSheet in Wallet tab UI
3. Configure secret key via Firebase CLI
4. Test with Stripe test cards
5. Switch to live keys when ready for production

**Time to Complete:** ~15-30 minutes once you have Stripe keys

---

Last Updated: January 9, 2026
