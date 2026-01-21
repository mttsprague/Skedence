# Payment Flow - Trainer Stripe Account Integration

## ✅ Implementation Complete

Client purchases now correctly route to the **trainer/admin's Stripe account**, not a central account.

---

## 🔄 How It Works

### **Payment Flow Overview**

```
Client App (PurchaseLessonsView)
├── Client selects lesson package
├── Client enters payment info
│
├─► Cloud Function: createPaymentIntentConnect
│   ├── Loads trainer's organization
│   ├── Gets organization's Stripe Connect account ID
│   ├── Creates payment intent with:
│   │   ├── Amount goes to trainer's account
│   │   ├── 5% platform fee (optional - you control this)
│   │   └── Transfer to trainer's connected account
│   └── Returns clientSecret
│
├─► Stripe PaymentSheet (iOS SDK)
│   ├── Client enters card details
│   ├── Stripe processes payment
│   └── Money deposited to trainer's Stripe account ✅
│
└─► Cloud Function: confirmPaymentAndCreatePackage
    ├── Verifies payment succeeded
    ├── Creates lesson package in client's account
    └── Returns success
```

---

## 💰 Money Flow

### **Where Payments Go**

1. **Client Purchases Lesson** ($80)
   - Payment initiated in Skedence client app
   - Uses trainer's organization Stripe publishable key

2. **Stripe Processing**
   - Payment processed by Stripe
   - 5% platform fee: **$4.00** (configurable)
   - To trainer: **$76.00**
   - Stripe fee (~2.9% + $0.30): deducted from trainer's portion

3. **Final Distribution**
   - **Trainer receives**: ~$73.50 (after Stripe fees)
   - **Platform receives**: $4.00 (5% fee)
   - **Client pays**: $80.00 total

**Note**: You can adjust or remove the platform fee by changing `applicationFeeAmount` in the Cloud Function.

---

## 🔧 What Changed

### **1. StripeService.swift** (Client App)
```swift
// NOW: Routes to trainer's account
func createPaymentIntent(
    packageType: String,
    amount: Int,
    trainerId: String,
    orgId: String? = nil // NEW: Organization receiving payment
) async throws -> String {
    // Uses createPaymentIntentConnect when orgId provided
    // Payment goes to organization's Stripe Connect account
}
```

### **2. PurchaseLessonsView.swift** (Client App)
```swift
// NOW: Passes orgId to route payment
let clientSecret = try await stripeService.createPaymentIntent(
    packageType: selected.packageType,
    amount: selected.amountInCents,
    trainerId: trainerId,
    orgId: orgId // Payment goes to trainer's organization ✅
)
```

### **3. Cloud Function** (Backend)
```typescript
// createPaymentIntentConnect - Already existed!
const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    application_fee_amount: applicationFeeAmount, // 5% platform fee
    transfer_data: {
        destination: connectAccountId, // Trainer's Stripe account
    }
});
```

---

## 🎯 Setup Requirements

### **For Trainers/Admins:**

1. **Enter Stripe Keys in SkedenceAdmin**
   - Go through onboarding
   - Click "Connect Stripe"
   - Enter publishable key (pk_test_... or pk_live_...)
   - Enter secret key (sk_test_... or sk_live_...)

2. **Keys Stored:**
   - Publishable key → Firestore `organizations/{orgId}/stripe.publishableKey`
   - Secret key → Firebase Functions config (manual via CLI)

3. **Client App Automatically:**
   - Loads publishable key from organization
   - Routes all payments to that organization
   - No additional configuration needed!

---

## 💡 Platform Fee Configuration

### **Current Setting: 5%**

Located in: `functions/src/stripe-connect.ts`

```typescript
// Calculate platform application fee (5% of payment)
const applicationFeeAmount = Math.round(amount * 0.05);
```

### **To Change Platform Fee:**

```typescript
// 3% fee
const applicationFeeAmount = Math.round(amount * 0.03);

// 0% fee (no platform fee)
const applicationFeeAmount = 0;

// Fixed $2 fee per transaction
const applicationFeeAmount = 200; // $2.00 in cents
```

After changing, redeploy:
```bash
firebase deploy --only functions --project polyface-ae6d3
```

---

## 🔒 Security

### **What's Protected:**
- ✅ Secret keys never stored in Firestore
- ✅ Secret keys never in client apps
- ✅ Payments routed server-side
- ✅ Can't override destination account client-side
- ✅ Organization validation on backend
- ✅ User authentication required

### **Payment Validation:**
- ✅ Amount verified against package pricing
- ✅ Organization exists and has Stripe connected
- ✅ Organization's Stripe account is active
- ✅ User authenticated
- ✅ Transaction recorded in Firestore

---

## 🧪 Testing

### **Test with Stripe Test Mode:**

1. **Admin Setup** (SkedenceAdmin):
   - Use test publishable key: `pk_test_...`
   - Use test secret key: `sk_test_...`
   - Configure via CLI: `firebase functions:config:set stripe.secret_key="sk_test_..."`

2. **Client Purchase** (Skedence):
   - Select lesson package
   - Click "Purchase"
   - Use test card: **4242 4242 4242 4242**
   - Any future expiry, any CVC

3. **Verify Payment**:
   - Check Stripe Dashboard → Payments
   - Payment appears in admin's Stripe account
   - Platform fee (if any) appears in your account
   - Client gets lesson package

---

## 📊 Payment Tracking

### **Firestore Records**

**Lesson Package** (Created):
```
users/{userId}/lessonPackages/{packageId}
├── packageType: "private"
├── totalLessons: 1
├── lessonsUsed: 0
├── purchaseDate: timestamp
├── expirationDate: timestamp (12 months)
└── transactionId: "pi_..." (Stripe payment intent ID)
```

**Stripe Records** (External):
- Payment in trainer's Stripe dashboard
- Platform fee in your Stripe dashboard (if configured)
- Full transaction history
- Automatic payout to trainer's bank account

---

## ⚡ Quick Reference

### **Who Gets Paid?**
- Client purchases → **Trainer's Stripe account**
- Admin charges (Wallet tab) → **Admin's Stripe account** (same trainer account)

### **Which Function Does What?**
- `createPaymentIntentConnect` - Client purchases (routes to trainer)
- `adminChargeClient` - Admin charges from Wallet tab (uses trainer's keys)
- `confirmPaymentAndCreatePackage` - Creates lesson package after payment

### **Key Files Modified:**
- ✅ `Skedence/Skedence/StripeService.swift` - Added orgId parameter
- ✅ `Skedence/Skedence/PurchaseLessonsView.swift` - Passes orgId
- ✅ Already had: `functions/src/stripe-connect.ts` - Connect payment processing

---

## 🚀 Ready to Use!

**Everything is configured** to route client purchases to the trainer's Stripe account.

**What Trainers Need to Do:**
1. Enter their Stripe keys in SkedenceAdmin (one-time setup)
2. Start accepting payments!

**What Clients See:**
- Same purchase flow
- Money goes to their trainer
- Lesson packages added immediately

**What You Control:**
- Platform fee percentage (currently 5%)
- Can be changed or removed entirely
- Configure in `stripe-connect.ts`

---

Last Updated: January 9, 2026
