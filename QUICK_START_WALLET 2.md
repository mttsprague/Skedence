# Quick Start: Stripe Wallet Integration

## ✅ What's Complete

1. **Admin Onboarding Flow** - Admins can enter Stripe keys during setup
2. **Pass Management** - Add/remove passes from client accounts
3. **Cloud Functions** - Payment processing backend deployed
4. **Security Rules** - Firestore rules updated and deployed
5. **Client App Structure** - Wallet tab and payment service ready

---

## 🚀 To Make Wallet Functional (3 Steps)

### Step 1: Get Your Stripe Keys (2 min)
1. Go to https://dashboard.stripe.com
2. Click **Developers** → **API Keys**
3. Copy:
   - **Publishable Key**: `pk_test_...`
   - **Secret Key**: `sk_test_...`

### Step 2: Add Keys in Admin App (1 min)
1. Open **SkedenceAdmin** app
2. Go through onboarding or Settings
3. Click "Connect Stripe"
4. **Select "Test Mode"**
5. Paste both keys
6. Click "Save & Continue"

### Step 3: Configure Backend Secret (2 min)
```bash
cd "SkedenceAdmin/functions"

# Set secret key
firebase functions:config:set stripe.secret_key="YOUR_SECRET_KEY" --project polyface-ae6d3

# Redeploy (optional - already deployed)
firebase deploy --only functions --project polyface-ae6d3
```

---

## 💳 Test It Out

**In Skedence Client App:**
1. Go to **Admin Panel** → **Wallet** tab
2. Select a client
3. Enter amount (e.g., $10.00)
4. Click "Charge Card"
5. Use test card: **4242 4242 4242 4242**
6. Any future expiry, any CVC
7. ✅ Payment succeeds!

---

## 📋 Files Created

### SkedenceAdmin
- `StripeKeysSetupView.swift` - Key input UI
- Modified `SetupChecklistView.swift` - Integrated into onboarding
- Modified `SetupChecklistViewModel.swift` - Navigation

### Skedence  
- `AdminPaymentService.swift` - Payment operations
- Modified `AdminPanelView.swift` - Wallet tab
- Modified `AdminService.swift` - Pass removal

### Backend
- `functions/src/stripe.ts` - Admin payment functions
- `firestore.rules` - Security rules

**All Deployed ✅**

---

## 🎯 Key Features

- ✅ Secure key storage (publishable in Firestore, secret in Functions)
- ✅ Test/Live mode support
- ✅ Automatic key loading in client app
- ✅ Add/remove passes from clients
- ✅ Charge client credit cards
- ✅ Save cards for future use
- ✅ Transaction history
- ✅ Admin permission checks

---

## 🔒 Security

- Secret keys NEVER stored in Firestore
- Secret keys NEVER in client apps
- All admin operations require `isAdmin: true`
- Payment methods backend-only writes
- Transactions backend-only writes
- Stripe handles all card data (PCI compliant)

---

## 📞 Need Help?

Check the full documentation:
- `STRIPE_INTEGRATION_COMPLETE.md` - Complete guide
- `WALLET_STRIPE_SETUP.md` - Detailed Stripe setup
- `ADMIN_FEATURES_UPDATE.md` - Feature overview

---

**Ready to accept payments!** 🚀

Get your Stripe keys → Add in admin app → Start charging clients
