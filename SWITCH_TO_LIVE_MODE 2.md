# Switch to Live Mode - Complete Checklist

## Prerequisites

Before starting, gather from Stripe Dashboard (LIVE mode):
1. Live Secret Key: `sk_live_...`
2. Live Publishable Key: `pk_live_...`
3. Live Price IDs for your subscription plans
4. Live Webhook Signing Secret: `whsec_...` (already have this)

---

## Step 1: Create Live Subscription Products in Stripe

1. Go to https://dashboard.stripe.com (toggle OFF test mode)
2. Go to **Products** → **Add product**
3. Create these products with monthly pricing:

   **Starter Plan**
   - Name: Starter
   - Price: $29/month
   - Copy the Price ID (starts with `price_...`)

   **Studio Plan**
   - Name: Studio
   - Price: $99/month
   - Copy the Price ID

   **Academy Plan**
   - Name: Academy
   - Price: $249/month
   - Copy the Price ID

   **Enterprise Plan**
   - Name: Enterprise
   - Price: $499/month
   - Copy the Price ID

---

## Step 2: Update Firebase Functions Configuration

```bash
cd SkedenceAdmin

# Set live secret key
firebase functions:config:set stripe.secret_key="sk_live_YOUR_LIVE_KEY_HERE"

# Set live price IDs
firebase functions:config:set \
  stripe.starter_price_id="price_LIVE_STARTER_ID" \
  stripe.studio_price_id="price_LIVE_STUDIO_ID" \
  stripe.academy_price_id="price_LIVE_ACADEMY_ID" \
  stripe.enterprise_price_id="price_LIVE_ENTERPRISE_ID"

# Webhook secret should already be set (obtain from Stripe Dashboard)
# firebase functions:config:set stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET"

# Verify configuration
firebase functions:config:get
```

---

## Step 3: Update iOS App Price IDs

Update these files with your live price IDs:

**File: `SkedenceAdmin/SkedenceAdmin/ManageSubscriptionView.swift`**
- Line 289: starter price ID
- Line 290: studio price ID  
- Line 291: academy price ID
- Line 292: enterprise price ID

**File: `SkedenceAdmin/SkedenceAdmin/PricingPlan.swift`**
- Line 90: starter
- Line 110: studio
- Line 130: academy
- Line 150: enterprise

---

## Step 4: Update iOS App Publishable Key

**File: `SkedenceAdmin/SkedenceAdmin/StripeConfig.swift`**
Update the publishable key to your live key: `pk_live_...`

**File: `Skedence/Skedence/StripeConfig.swift`** (client app)
Update the publishable key to your live key: `pk_live_...`

---

## Step 5: Deploy Firebase Functions

```bash
cd SkedenceAdmin
firebase deploy --only functions
```

Wait for deployment to complete.

---

## Step 6: Add Stripe Connect Webhook (for organizations)

This webhook handles events when organizations connect their Stripe accounts.

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Use URL: `https://stripeconnectwebhook-d5rzjueqba-uc.a.run.app` (will create next)
4. Select events:
   - `account.updated`
   - `account.application.deauthorized`
5. Copy the signing secret (`whsec_...`)

```bash
# Set Stripe Connect webhook secret
firebase functions:config:set stripe.connect_webhook_secret="whsec_YOUR_CONNECT_SECRET"

# Deploy the new webhook function
firebase deploy --only functions:stripeConnectWebhook
```

---

## Step 7: Test in Production

### Test Platform Subscription (organizations paying you):
1. Create a test organization
2. Go to Subscription settings
3. Subscribe to a plan using a real card ($1 test)
4. Verify:
   - Payment appears in Stripe Dashboard (live mode)
   - Subscription status updates in app
   - Webhook events show as successful

### Test Stripe Connect (organizations receiving payments):
1. Organization connects their Stripe account
2. Client books a lesson and pays
3. Verify:
   - Payment goes to organization's bank account
   - Payment shows in their Stripe Connect dashboard
   - Your platform receives any application fees

---

## Step 8: Monitor and Verify

```bash
# Watch Firebase Functions logs
firebase functions:log --only stripeWebhook,stripeConnectWebhook

# Check Stripe Dashboard
# - Payments tab: Should see live transactions
# - Webhooks tab: Check webhook delivery status
# - Connect > Accounts: See connected organizations
```

---

## Rollback Plan (if needed)

If something goes wrong, quickly revert to test mode:

```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_TEST_KEY"
firebase deploy --only functions
```

---

## Security Checklist

- [ ] Live keys are NOT committed to git
- [ ] Firebase Functions config is secure
- [ ] Webhook endpoints are using HTTPS
- [ ] Stripe Dashboard has 2FA enabled
- [ ] API keys are restricted to necessary permissions

---

## Status Tracking

- [ ] Step 1: Created live products in Stripe
- [ ] Step 2: Updated Firebase config with live keys
- [ ] Step 3: Updated iOS app price IDs
- [ ] Step 4: Updated iOS publishable keys
- [ ] Step 5: Deployed functions
- [ ] Step 6: Set up Stripe Connect webhook
- [ ] Step 7: Tested with real transaction
- [ ] Step 8: Monitoring in production

