# Stripe Products & Webhooks Configuration Guide

## Quick Start

**Option 1: Automated Setup (Recommended)**
```bash
./setup-stripe.sh
```

**Option 2: Manual Setup**
Follow the steps below.

---

## Manual Setup Instructions

### Step 1: Create Products in Stripe Dashboard

Go to: **https://dashboard.stripe.com/products**

#### 1️⃣ Starter Plan
- Click **"+ Add product"**
- Product name: `Starter Plan`
- Pricing model: **Recurring**
- Price: `$29` USD
- Billing period: **Monthly**
- **Add trial period**: 14 days
- Add metadata:
  - `tier` = `starter`
  - `seats` = `1`
- Click **"Add product"**
- **Copy the Price ID** (starts with `price_`)

#### 2️⃣ Studio Plan (Most Popular)
- Product name: `Studio Plan`
- Price: `$99` USD
- Billing period: **Monthly**
- Trial period: **14 days**
- Metadata:
  - `tier` = `studio`
  - `seats` = `5`
  - `mostPopular` = `true`
- **Copy the Price ID**

#### 3️⃣ Academy Plan
- Product name: `Academy Plan`
- Price: `$249` USD
- Billing period: **Monthly**
- Trial period: **14 days**
- Metadata:
  - `tier` = `academy`
  - `seats` = `15`
- **Copy the Price ID**

#### 4️⃣ Enterprise Plan
- Product name: `Enterprise Plan`
- Price: `$499` USD
- Billing period: **Monthly**
- Trial period: **14 days**
- Metadata:
  - `tier` = `enterprise`
  - `seats` = `999`
- **Copy the Price ID**

#### Add-ons

#### 5️⃣ Additional Trainer Seat
- Product name: `Additional Trainer Seat`
- Price: `$10` USD
- Billing period: **Monthly**
- Metadata:
  - `addon` = `trainer`
- **Copy the Price ID**

#### 6️⃣ Additional Location
- Product name: `Additional Location`
- Price: `$25` USD
- Billing period: **Monthly**
- Metadata:
  - `addon` = `location`
- **Copy the Price ID**

#### 7️⃣ Custom Domain
- Product name: `Custom Domain`
- Price: `$15` USD
- Billing period: **Monthly**
- Metadata:
  - `addon` = `domain`
- **Copy the Price ID**

---

### Step 2: Update Code with Price IDs

#### Update `SkedenceAdmin/SkedenceAdmin/PricingPlan.swift`

Find each plan and replace `stripePriceId: nil` with your actual Price IDs:

```swift
static let starter = PricingPlan(
    id: "starter",
    name: "Starter",
    stripePriceId: "price_YOUR_STARTER_ID_HERE", // ← Replace
    basePrice: 29,
    // ...
)

static let studio = PricingPlan(
    id: "studio",
    name: "Studio",
    stripePriceId: "price_YOUR_STUDIO_ID_HERE", // ← Replace
    basePrice: 99,
    // ...
)

static let academy = PricingPlan(
    id: "academy",
    name: "Academy",
    stripePriceId: "price_YOUR_ACADEMY_ID_HERE", // ← Replace
    basePrice: 249,
    // ...
)

static let enterprise = PricingPlan(
    id: "enterprise",
    name: "Enterprise",
    stripePriceId: "price_YOUR_ENTERPRISE_ID_HERE", // ← Replace
    basePrice: 499,
    // ...
)
```

And for add-ons:

```swift
static let extraTrainer = AddOn(
    id: "trainer",
    name: "Additional Trainer",
    stripePriceId: "price_YOUR_TRAINER_ADDON_ID", // ← Replace
    price: 10,
    unit: "seat"
)

static let extraLocation = AddOn(
    id: "location",
    name: "Additional Location",
    stripePriceId: "price_YOUR_LOCATION_ADDON_ID", // ← Replace
    price: 25,
    unit: "location"
)

static let customDomain = AddOn(
    id: "domain",
    name: "Custom Domain",
    stripePriceId: "price_YOUR_DOMAIN_ADDON_ID", // ← Replace
    price: 15,
    unit: "domain"
)
```

#### Update `SkedenceAdmin/functions/src/stripeWebhooks.ts`

Add this function at the end of the file (before the export at the bottom):

```typescript
// Price ID to Plan mapping
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    'price_YOUR_STARTER_ID': 'starter',
    'price_YOUR_STUDIO_ID': 'studio',
    'price_YOUR_ACADEMY_ID': 'academy',
    'price_YOUR_ENTERPRISE_ID': 'enterprise',
  };
  return priceMap[priceId] || 'unknown';
}

// Add-on price mapping
function mapPriceIdToAddon(priceId: string): string {
  const addonMap: Record<string, string> = {
    'price_YOUR_TRAINER_ADDON_ID': 'trainer',
    'price_YOUR_LOCATION_ADDON_ID': 'location',
    'price_YOUR_DOMAIN_ADDON_ID': 'domain',
  };
  return addonMap[priceId] || 'unknown';
}
```

Then find the `handleSubscriptionUpdate` function and update it to use the mapping:

```typescript
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  
  // Map price ID to plan name
  const planName = mapPriceIdToPlan(priceId);
  
  // ... rest of function
}
```

---

### Step 3: Configure Firebase Functions

```bash
cd SkedenceAdmin

# Set Stripe keys in Firebase config
firebase functions:config:set \
  stripe.secret_key="sk_live_YOUR_KEY_HERE" \
  stripe.webhook_secret="PLACEHOLDER"

# Install Stripe npm package
cd functions
npm install stripe

# Deploy functions
cd ..
firebase deploy --only functions
```

After deployment, note the function URL. It will be something like:
```
https://us-central1-polyface-ae6d3.cloudfunctions.net/stripeWebhook
```

---

### Step 4: Configure Webhook in Stripe

1. Go to: **https://dashboard.stripe.com/webhooks**
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: Paste your Cloud Function URL from Step 3
4. **Events to send**: Select these 6 events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.payment_succeeded`
5. Click **"Add endpoint"**
6. After creation, click the endpoint to view details
7. Copy the **"Signing secret"** (starts with `whsec_`)

---

### Step 5: Update Webhook Secret

```bash
cd SkedenceAdmin

# Update the webhook secret
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET_HERE"

# Redeploy to pick up the new secret
firebase deploy --only functions
```

---

### Step 6: Test the Webhook

1. Go to: **https://dashboard.stripe.com/webhooks**
2. Click your webhook endpoint
3. Click **"Send test webhook"**
4. Select `customer.subscription.created`
5. Click **"Send test webhook"**
6. Check the response - should see **200 OK**

If you see errors, check:
- Firebase Functions logs: `firebase functions:log`
- Webhook secret is correct
- Function URL is correct

---

## Verification Checklist

After setup, verify:

- [ ] All 7 products created in Stripe
- [ ] All price IDs copied to `PricingPlan.swift`
- [ ] `mapPriceIdToPlan()` function added to `stripeWebhooks.ts`
- [ ] Firebase functions deployed successfully
- [ ] Webhook endpoint created in Stripe
- [ ] Webhook secret configured in Firebase
- [ ] Test webhook sends successfully (200 OK)
- [ ] Functions log shows no errors: `firebase functions:log`

---

## Troubleshooting

### "Invalid signature" error in webhook
**Cause**: Webhook secret mismatch  
**Fix**: 
```bash
firebase functions:config:get
# Verify stripe.webhook_secret matches Stripe dashboard
```

### "Cannot find price in mapping"
**Cause**: Price ID not in `mapPriceIdToPlan()`  
**Fix**: Add the price ID to the mapping function

### Webhook returns 500 error
**Cause**: Code error in webhook handler  
**Fix**: Check logs: `firebase functions:log --only stripeWebhook`

### Products not showing in app
**Cause**: Swift code not updated with price IDs  
**Fix**: Update `PricingPlan.swift` and rebuild app

---

## Production Checklist

Before going live:

- [ ] Use live Stripe keys (not test keys)
- [ ] Update `STRIPE_SECRET_KEY` with live key: `sk_live_...`
- [ ] Create products in **live mode** (toggle in Stripe dashboard)
- [ ] Update webhook endpoint to use live function URL
- [ ] Test a real subscription (use real card or remove test mode)
- [ ] Verify billing records created in Firestore
- [ ] Test grace period (use card that declines: `4000000000000341`)
- [ ] Verify paywall shows correctly in all states

---

## Quick Commands

```bash
# View Firebase config
firebase functions:config:get

# View function logs
firebase functions:log

# View webhook deliveries in Stripe
open https://dashboard.stripe.com/webhooks

# Redeploy functions after code changes
cd SkedenceAdmin && firebase deploy --only functions

# Test webhook locally (requires stripe CLI)
stripe listen --forward-to http://localhost:5001/polyface-ae6d3/us-central1/stripeWebhook
```

---

## Price IDs Reference

Keep a record of your price IDs:

| Product | Price ID |
|---------|----------|
| Starter Plan | `price_` |
| Studio Plan | `price_` |
| Academy Plan | `price_` |
| Enterprise Plan | `price_` |
| Extra Trainer | `price_` |
| Extra Location | `price_` |
| Custom Domain | `price_` |

---

## Support

If you encounter issues:
1. Check Firebase logs: `firebase functions:log`
2. Check Stripe webhook logs in dashboard
3. Verify all price IDs are correct
4. Ensure webhook secret matches

---

**Ready to test?** After completing all steps, you can test by:
1. Opening the coach app
2. Going to Account → Manage Subscription
3. Selecting a plan
4. Using test card: `4242 4242 4242 4242`
5. Verifying webhook fires and billing record updates
