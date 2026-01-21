# Switching to Stripe Live Mode - Production Deployment Guide

## ⚠️ Important: Test Mode vs Live Mode

**Current Status**: Your system is running in **Stripe Test Mode**
- Test cards work (4242 4242 4242 4242)
- No real charges are made
- Test data is separate from production

**Live Mode**: Real payment processing
- Real credit cards only
- Actual charges are made
- Real customer data
- Requires verified Stripe account

---

## 📋 Prerequisites

Before switching to live mode, ensure:

### 1. Stripe Account Verification
- [ ] Go to Stripe Dashboard → Settings → Business details
- [ ] Complete business verification (name, address, tax ID, etc.)
- [ ] Add bank account for payouts
- [ ] Verify identity documents if required
- [ ] Account must show "Verified" status

### 2. Testing Complete
- [x] Trial signup flow tested
- [x] Payment success tested
- [x] Subscription created successfully
- [x] Webhook delivery confirmed
- [ ] Payment failure scenario tested (optional)
- [ ] Subscription cancellation tested (optional)

### 3. Legal & Compliance
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Refund policy defined
- [ ] Customer support email configured

---

## 🔑 Step 1: Get Live API Keys

### In Stripe Dashboard:

1. **Switch to Live Mode**
   - Top left corner: Toggle from "Test mode" to "Live mode"
   - URL will change from `test.stripe.com` to `dashboard.stripe.com`

2. **Get Live Publishable Key**
   - Go to: Developers → API keys
   - Find "Publishable key" under "Standard keys"
   - Starts with `pk_live_...`
   - Copy this key

3. **Get Live Secret Key**
   - Click "Reveal test key" next to "Secret key"
   - Starts with `sk_live_...`
   - ⚠️ **Never share or commit this key**
   - Copy this key

4. **Create Live Webhook Endpoint**
   - Go to: Developers → Webhooks
   - Click "+ Add endpoint"
   - Enter URL: `https://stripewebhook-d5rzjueqba-uc.a.run.app`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Click "Add endpoint"
   - Copy the "Signing secret" (starts with `whsec_...`)

---

## 🏗️ Step 2: Create Live Products

In Live Mode Stripe Dashboard:

### Create 4 Subscription Plans:

**1. Starter Plan - $29/month**
```
Name: Starter Plan
Description: Perfect for individual coaches
Price: $29.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID (starts with `price_...`)

**2. Studio Plan - $99/month**
```
Name: Studio Plan
Description: For growing coaching studios
Price: $99.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID

**3. Academy Plan - $249/month**
```
Name: Academy Plan
Description: For large academies
Price: $249.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID

**4. Enterprise Plan - $499/month**
```
Name: Enterprise Plan
Description: Custom solutions for enterprises
Price: $499.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID

### Create 3 Add-ons:

**1. Additional Trainer - $10/month**
```
Name: Additional Trainer
Price: $10.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID

**2. Additional Location - $25/month**
```
Name: Additional Location
Price: $25.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID

**3. Custom Domain - $15/month**
```
Name: Custom Domain
Price: $15.00 USD per month
Billing period: Monthly
```
→ Copy the Price ID

---

## 💻 Step 3: Update Configuration Files

### 3.1 Update functions/.env

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
```

Replace the keys in `.env`:

```dotenv
# Stripe Live Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE
```

### 3.2 Update PricingPlan.swift

File: `SkedenceAdmin/SkedenceAdmin/PricingPlan.swift`

Replace ALL test price IDs with your LIVE price IDs:

```swift
static let starter = PricingPlan(
    id: "starter",
    name: "Starter Plan",
    price: 29,
    stripePriceId: "price_LIVE_STARTER_HERE", // ← Update this
    // ... rest of the code
)

static let studio = PricingPlan(
    id: "studio",
    name: "Studio Plan",
    price: 99,
    stripePriceId: "price_LIVE_STUDIO_HERE", // ← Update this
    // ...
)

static let academy = PricingPlan(
    id: "academy",
    name: "Academy Plan",
    price: 249,
    stripePriceId: "price_LIVE_ACADEMY_HERE", // ← Update this
    // ...
)

static let enterprise = PricingPlan(
    id: "enterprise",
    name: "Enterprise Plan",
    price: 499,
    stripePriceId: "price_LIVE_ENTERPRISE_HERE", // ← Update this
    // ...
)

// Add-ons
static let additionalTrainer = PricingAddOn(
    id: "trainer",
    stripePriceId: "price_LIVE_TRAINER_HERE", // ← Update this
    // ...
)

static let additionalLocation = PricingAddOn(
    id: "location",
    stripePriceId: "price_LIVE_LOCATION_HERE", // ← Update this
    // ...
)

static let customDomain = PricingAddOn(
    id: "domain",
    stripePriceId: "price_LIVE_DOMAIN_HERE", // ← Update this
    // ...
)
```

### 3.3 Update stripeWebhooks.ts

File: `SkedenceAdmin/functions/src/stripeWebhooks.ts`

Update the price mapping around line 12:

```typescript
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    "price_LIVE_STARTER_HERE": "starter",
    "price_LIVE_STUDIO_HERE": "studio",
    "price_LIVE_ACADEMY_HERE": "academy",
    "price_LIVE_ENTERPRISE_HERE": "enterprise",
  };
  return priceMap[priceId] || "unknown";
}

function mapPriceIdToAddon(priceId: string): string {
  const addonMap: Record<string, string> = {
    "price_LIVE_TRAINER_HERE": "trainer",
    "price_LIVE_LOCATION_HERE": "location",
    "price_LIVE_DOMAIN_HERE": "domain",
  };
  return addonMap[priceId] || "unknown";
}
```

---

## 🚀 Step 4: Deploy to Production

### 4.1 Build and Deploy Functions

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin"

# Build TypeScript
npm --prefix functions run build

# Deploy all subscription functions
firebase deploy --only functions:stripeWebhook,functions:createStripeCheckout
```

### 4.2 Rebuild iOS Apps

1. Open `SkedenceAdmin.xcodeproj` in Xcode
2. Clean build folder: `Product → Clean Build Folder` (⇧⌘K)
3. Archive for distribution: `Product → Archive`
4. Submit to App Store

5. Open `Skedence.xcodeproj` in Xcode
6. Clean build folder
7. Archive for distribution
8. Submit to App Store

---

## ✅ Step 5: Verify Production Setup

### Test with Real Card (Small Amount)

1. Create a new test account or use a trusted account
2. Click "Upgrade Now" in the app
3. Select Starter plan ($29/month)
4. **Use a real credit card** (will be charged after 14-day trial)
5. Complete checkout

### Verify in Stripe Dashboard (Live Mode):

- [ ] Go to Customers → See new customer created
- [ ] Check Subscriptions → See active trial
- [ ] Go to Webhooks → Check delivery logs (all should be 200 OK)
- [ ] Go to Events → See checkout.session.completed event

### Verify in Firebase:

- [ ] Check Firestore → `organizations/{orgId}/billing`
- [ ] Should have:
  - `stripeCustomerId`: "cus_..."
  - `stripeSubscriptionId`: "sub_..."
  - `status`: "trialing"
  - `trialEndsAt`: 14 days from now

### Verify in App:

- [ ] Trial banner should appear: "Trial: 14 days remaining"
- [ ] Should show "Upgrade Now" button
- [ ] All features should be accessible

---

## 🔐 Security Checklist

Before going live:

- [x] Firestore rules restored to proper membership checks
- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] Live API keys stored securely (not in code)
- [ ] Webhook endpoint uses HTTPS
- [ ] Webhook signature verification enabled
- [ ] Database backups configured
- [ ] Monitoring/alerts set up for failed webhooks

---

## 📊 Monitoring After Launch

### Daily (First Week):

1. **Stripe Dashboard**
   - Check successful subscriptions
   - Monitor failed payments
   - Review webhook delivery logs

2. **Firebase Console**
   - Check Cloud Functions logs
   - Monitor Firestore billing documents
   - Review authentication logs

3. **App Reviews**
   - Monitor for payment-related issues
   - Respond to billing questions

### Weekly:

- Review Monthly Recurring Revenue (MRR)
- Check churn rate
- Analyze failed payment patterns
- Review trial-to-paid conversion rate

---

## 🆘 Rollback Plan

If issues occur in production:

### Quick Rollback to Test Mode:

1. In `.env`, switch back to test keys:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```

2. Redeploy functions:
   ```bash
   firebase deploy --only functions
   ```

3. Update iOS app via App Store (requires review)

### Refund Policy:

If a customer is charged incorrectly:

1. Go to Stripe Dashboard → Payments
2. Find the payment
3. Click "Refund" → Full refund
4. Contact customer explaining the issue

---

## 💰 Pricing & Billing Notes

### Trial Period:
- 14 days free trial on all plans
- No credit card required upfront (optional: you can require it)
- Automatically converts to paid subscription after trial
- Customer is notified before first charge

### Payment Schedule:
- First charge: 14 days after signup (end of trial)
- Recurring: Monthly on the same day
- Prorated: If customer upgrades mid-cycle

### Failed Payments:
- Grace period: 3 days (configurable in `stripeWebhooks.ts`)
- After grace: Subscription canceled, access blocked
- Customer receives email notification (configure in Stripe)

---

## 📞 Support

### Customer Billing Questions:

Direct customers to:
- Email: support@skedence.com
- Stripe Customer Portal: Users can manage their own subscriptions

### Technical Issues:

- Check Cloud Functions logs: Firebase Console → Functions
- Check webhook logs: Stripe Dashboard → Webhooks
- Check Firestore billing data: Firebase Console → Firestore

---

## ✨ Congratulations!

Once you complete these steps, your app will be processing real payments through Stripe! 🎉

**Remember**: Start with a few beta customers to test the full flow before mass rollout.
