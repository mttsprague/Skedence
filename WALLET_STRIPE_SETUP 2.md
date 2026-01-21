# Wallet Tab - Stripe Setup Guide

## 🔑 Required Stripe Information

To make the Wallet tab functional, you need to provide the following from your Stripe account:

### 1. **Stripe Secret Key** (Backend)
- **Location**: Stripe Dashboard → Developers → API Keys
- **Type**: Secret Key (starts with `sk_test_` for test mode or `sk_live_` for live mode)
- **Purpose**: Used by Firebase Cloud Functions to process payments
- **Where to add**: Firebase Functions environment configuration

### 2. **Stripe Publishable Key** (iOS App)
- **Location**: Stripe Dashboard → Developers → API Keys  
- **Type**: Publishable Key (starts with `pk_test_` for test mode or `pk_live_` for live mode)
- **Purpose**: Used by iOS app to initialize Stripe SDK
- **Where to add**: Will be loaded from Firestore `organizations/{orgId}` collection

---

## 📋 Setup Steps

### Step 1: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API Keys**
3. Copy both keys:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...) - Click "Reveal test key"

⚠️ **Important**: Start with TEST mode keys first, switch to LIVE keys only when ready for production.

---

### Step 2: Configure Firebase Functions (Secret Key)

You need to add your Stripe secret key to Firebase Functions configuration:

```bash
cd SkedenceAdmin/functions
firebase functions:config:set stripe.secret_key="sk_test_YOUR_KEY_HERE"
```

Or if you prefer environment variables, create a `.env` file in `functions/` folder:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

Then deploy the functions:

```bash
firebase deploy --only functions
```

---

### Step 3: Add Publishable Key to Organization

Your Stripe publishable key should be stored in your organization document in Firestore. Update your organization document:

**Collection**: `organizations/{your-org-id}`
**Field to add**:
```json
{
  "stripe": {
    "publishableKey": "pk_test_YOUR_KEY_HERE"
  }
}
```

---

### Step 4: Install Stripe iOS SDK

The Skedence app needs the Stripe iOS SDK. Add it via Swift Package Manager:

1. Open `Skedence.xcodeproj` in Xcode
2. Go to **File** → **Add Package Dependencies**
3. Enter URL: `https://github.com/stripe/stripe-ios`
4. Select version: **23.0.0** or later
5. Add to target: **Skedence**

Or add to your Package.swift:
```swift
.package(url: "https://github.com/stripe/stripe-ios", from: "23.0.0")
```

---

## ✅ What's Already Set Up

### Firebase Rules ✅
- Admins can add/remove lesson packages from users
- Admins can read client payment methods
- Transactions collection accessible by admins and clients
- All security rules implemented

### Cloud Functions ✅
The following functions are ready to use:

1. **`adminChargeClient`** - Create payment intent for admin charge
   - Input: `{clientId, amount, description?, saveCard?}`
   - Output: `{clientSecret, paymentIntentId, customerId}`
   - Requires: Admin permissions

2. **`adminConfirmCharge`** - Confirm payment and create transaction
   - Input: `{paymentIntentId, clientId, amount, description?}`
   - Output: `{success, transactionId}`
   - Creates transaction record in Firestore
   - Saves payment method if card was saved

3. **`getPaymentMethods`** (existing) - Get saved payment methods
   - Input: `{userId}`
   - Output: `{paymentMethods: [{id, brand, last4, expMonth, expYear}]}`

4. **`detachPaymentMethod`** (existing) - Remove saved card
   - Input: `{userId, paymentMethodId}`
   - Output: `{success}`

### Firestore Collections ✅
The following collections are ready:

- **`transactions/{txnId}`** - Payment records
  - Fields: clientId, adminId, amount, currency, status, stripePaymentIntentId, etc.
  
- **`users/{userId}/paymentMethods/{pmId}`** - Saved cards
  - Fields: stripePaymentMethodId, last4, brand, expiryMonth, expiryYear

---

## 🚧 Next Steps to Complete Wallet Tab

Once you provide the Stripe keys, these remaining tasks need completion:

### 1. Update AdminPanelView.swift
Replace the placeholder wallet content with full payment UI:
- Amount input field
- Stripe PaymentSheet integration
- Save card checkbox
- Charge button
- Display saved payment methods

### 2. Create AdminPaymentService.swift
New service class to handle:
- Loading Stripe publishable key from org settings
- Calling Cloud Functions
- Managing payment flow
- Error handling

### 3. Update StripeConfig.swift
Load publishable key dynamically from organization document instead of hardcoded value.

---

## 🧪 Testing Checklist

Once Stripe keys are configured:

### Test Mode Credit Cards (Stripe Test Mode)
- **Success**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 9995
- **Insufficient funds**: 4000 0000 0000 9995

Use any:
- Future expiry date (e.g., 12/34)
- Any 3-digit CVC
- Any zip code

### Test Scenarios
- [ ] Admin can charge client with new card
- [ ] Payment succeeds and transaction created
- [ ] Save card checkbox works
- [ ] Saved card appears in payment methods
- [ ] Can charge using saved card
- [ ] Transaction shows in Firestore
- [ ] Error handling for declined cards
- [ ] Client can see their transactions
- [ ] Amount properly converted (cents)

---

## 📊 Firestore Structure

### Transaction Document
```
transactions/{transactionId}
├── clientId: string
├── adminId: string
├── amount: number (in cents)
├── currency: string ("usd")
├── description: string
├── stripePaymentIntentId: string
├── status: string ("succeeded", "failed", etc.)
├── createdAt: timestamp
├── orgId: string
└── type: string ("admin_charge")
```

### Payment Method Document
```
users/{userId}/paymentMethods/{paymentMethodId}
├── stripePaymentMethodId: string
├── last4: string
├── brand: string ("visa", "mastercard", etc.)
├── expiryMonth: number
├── expiryYear: number
└── createdAt: timestamp
```

---

## 🔒 Security Notes

- ✅ Admin permissions verified on all operations
- ✅ Secret key never exposed to client app
- ✅ Payment intents created server-side
- ✅ Client customer IDs validated
- ✅ Minimum charge: $0.50 (50 cents)
- ✅ All writes to transactions/paymentMethods restricted to backend

---

## 💡 Quick Start Command

After you provide your Stripe keys, run:

```bash
# Configure Stripe secret key
firebase functions:config:set stripe.secret_key="sk_test_YOUR_KEY_HERE"

# Deploy all functions
cd SkedenceAdmin/functions
npm install
npm run build
firebase deploy --only functions

# Deploy updated Firestore rules
cd ../..
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

---

## ❓ FAQ

**Q: Should I use test mode or live mode?**
A: Start with test mode keys (sk_test_ and pk_test_). Only switch to live mode when you're ready to accept real payments.

**Q: Where do I find my Stripe account?**
A: If you don't have one, create a free account at https://stripe.com

**Q: What fees does Stripe charge?**
A: Stripe charges 2.9% + $0.30 per successful card charge in the US. Check Stripe's pricing page for your region.

**Q: Can I test without real money?**
A: Yes! Use test mode keys and Stripe's test card numbers. No real money changes hands.

**Q: How do I switch from test to live mode?**
A: Simply replace the test keys (sk_test_, pk_test_) with live keys (sk_live_, pk_live_) and redeploy.

---

## 📞 Ready to Proceed?

Please provide:
1. ✉️ Your Stripe **Secret Key** (sk_test_... or sk_live_...)
2. ✉️ Your Stripe **Publishable Key** (pk_test_... or pk_live_...)
3. 📧 Your organization ID from Firestore (if you don't know it)

Once I have these, I'll complete the wallet integration! 🚀
