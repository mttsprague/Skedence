# Step 10: Stripe Setup Instructions

## 1. Create Stripe Products

### In Stripe Dashboard (https://dashboard.stripe.com):

1. **Navigate to Products**
   - Go to Products → Add product

2. **Create Starter Plan**
   - Name: "CoachFlow Admin Starter"
   - Description: "Up to 200 bookings per month"
   - Pricing: $29.00 USD
   - Billing period: Monthly
   - Click "Add pricing" → Copy the Price ID (starts with `price_`)

3. **Create Professional Plan**
   - Name: "CoachFlow Admin Professional"
   - Description: "Unlimited bookings"
   - Pricing: $79.00 USD
   - Billing period: Monthly
   - Click "Add pricing" → Copy the Price ID

4. **Set up Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://us-central1-polyface-ae6d3.cloudfunctions.net/stripeWebhook`
   - Select events:
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click "Add endpoint"
   - Copy the Signing secret (starts with `whsec_`)

## 2. Configure Firebase Environment Variables

Run these commands in your terminal:

```bash
cd "/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy/CoachFlow Admin/functions"

# Set Stripe price IDs
firebase functions:config:set \
  stripe.starter_price_id="price_YOUR_STARTER_ID" \
  stripe.professional_price_id="price_YOUR_PROFESSIONAL_ID" \
  --project polyface-ae6d3

# Set webhook secret
firebase functions:config:set \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
  --project polyface-ae6d3

# Deploy functions with new config
firebase deploy --only functions --project polyface-ae6d3
```

## 3. Test Stripe Configuration

Use Stripe test mode first:
- Test price IDs start with `price_test_`
- Test webhook secrets start with `whsec_test_`

Create test subscriptions to verify:
```bash
# View current config
firebase functions:config:get --project polyface-ae6d3
```

## 4. Add Swift Files to Xcode

The following files need to be added to the CoachFlow Admin Xcode project:

1. Open `CoachFlow Admin.xcodeproj` in Xcode
2. Right-click on the CoachFlow Admin folder
3. Select "Add Files to CoachFlow Admin..."
4. Navigate to the CoachFlow Admin folder and select:
   - `ManageSubscriptionView.swift`
   - `BillingPaywallView.swift`
5. Ensure "Copy items if needed" is unchecked (they're already in the right place)
6. Click "Add"

## 5. Verify Deployment

Check that billing functions are deployed:
```bash
firebase functions:list --project polyface-ae6d3 | grep -E "(createSubscription|cancelSubscription|updateSubscription|getBillingStatus|stripeWebhook)"
```

Expected output:
```
createSubscription(us-central1)
cancelSubscription(us-central1)
updateSubscription(us-central1)
getBillingStatus(us-central1)
stripeWebhook(us-central1)
```
