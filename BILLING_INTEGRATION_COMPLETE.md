# Platform Billing Integration - Implementation Complete

## ✅ Completed Implementation

### 1. AuthManager Billing Status
**File**: [CoachFlow Admin/CoachFlow Admin/AuthManager.swift](CoachFlow Admin/CoachFlow Admin/AuthManager.swift)

Added billing status tracking:
```swift
@Published var billingPlan: String = "free"
@Published var billingStatus: String = "active"
@Published var subscriptionEndDate: Date?
@Published var isBillingBlocked: Bool = false
```

The `loadOrgBranding()` method now loads billing data from the organization document and sets `isBillingBlocked` to true when status is `past_due`, `canceled`, or `unpaid`.

### 2. Cloud Function Billing Checks
**File**: [CoachFlow Admin/functions/src/index.ts](CoachFlow Admin/functions/src/index.ts)

The `bookLesson` function now checks organization billing status before allowing bookings:
```typescript
// STEP 10: Check trainer's organization billing status
const trainerDataForBilling = trainerDoc.data();
if (trainerDataForBilling && trainerDataForBilling.orgId) {
  const orgDoc = await transaction.get(
    db.collection("organizations").doc(trainerDataForBilling.orgId)
  );
  
  if (orgDoc.exists) {
    const orgData = orgDoc.data();
    const billing = orgData?.billing;
    
    if (billing) {
      const status = billing.status;
      const blockedStatuses = ["past_due", "canceled", "unpaid"];
      
      if (blockedStatuses.includes(status)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Booking unavailable: The trainer's organization has a billing issue. Status: ${status}`
        );
      }
    }
  }
}
```

### 3. ScheduleView Paywall Check
**File**: [CoachFlow Admin/CoachFlow Admin/ScheduleView.swift](CoachFlow Admin/CoachFlow Admin/ScheduleView.swift)

Added client-side billing check before creating bookings:
```swift
Task {
    // Check billing status before booking
    if auth.isBillingBlocked {
        print("❌ Billing blocked, cannot book")
        return
    }
    
    let startTime = Date(timeIntervalSinceReferenceDate: startInterval)
    let endTime = Date(timeIntervalSinceReferenceDate: endInterval)
    let _ = await viewModel.bookLessonForClient(
        clientId: clientId,
        startTime: startTime,
        endTime: endTime,
        packageId: packageId
    )
}
```

### 4. Manage Subscription UI
**File**: [CoachFlow Admin/CoachFlow Admin/ContentView.swift](CoachFlow Admin/CoachFlow Admin/ContentView.swift)

Added navigation link in MoreView (Account tab) for admins to manage subscriptions:
```swift
// Billing Management (Admin only)
if auth.isAdmin {
    NavigationLink(destination: ManageSubscriptionView().environmentObject(auth)) {
        CardView {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Manage Subscription")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text("\(auth.billingPlan.capitalized) Plan")
                        .font(.bodyMedium)
                        .foregroundStyle(auth.isBillingBlocked ? .red : AppTheme.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }
    .padding(.horizontal, Spacing.lg)
}
```

## 📋 Remaining Setup Steps

### Step 1: Add Swift Files to Xcode

The following files need to be added to the CoachFlow Admin Xcode project:

1. Open `CoachFlow Admin.xcodeproj` in Xcode
2. Right-click on the `CoachFlow Admin` folder in the project navigator
3. Select **"Add Files to CoachFlow Admin..."**
4. Navigate to the CoachFlow Admin folder and select:
   - ✅ `ManageSubscriptionView.swift` (already created)
   - ✅ `BillingPaywallView.swift` (already created)
5. Ensure **"Copy items if needed"** is **UNCHECKED** (files are already in correct location)
6. Click **"Add"**
7. Build the project in Xcode to verify no errors

### Step 2: Complete Firebase Deployment

The Cloud Functions deployment was in progress. Complete it:

```bash
cd "/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy/CoachFlow Admin/functions"
firebase deploy --only functions --project polyface-ae6d3
```

Expected functions to deploy:
- ✅ `bookLesson` (updated with billing check)
- ✅ `createSubscription` (new)
- ✅ `cancelSubscription` (new)
- ✅ `updateSubscription` (new)
- ✅ `getBillingStatus` (new)
- ✅ `stripeWebhook` (new)

Verify deployment:
```bash
firebase functions:list --project polyface-ae6d3 | grep -E "(createSubscription|cancelSubscription|updateSubscription|getBillingStatus|stripeWebhook)"
```

### Step 3: Create Stripe Products

In your Stripe Dashboard (https://dashboard.stripe.com):

#### Starter Plan Product
1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: CoachFlow Admin Starter
   - **Description**: Up to 200 bookings per month
   - **Pricing model**: Standard pricing
   - **Price**: $29.00 USD
   - **Billing period**: Monthly
   - **Recurring**: Yes
3. Click **"Add pricing"**
4. Copy the **Price ID** (starts with `price_`)

#### Professional Plan Product
1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: CoachFlow Admin Professional
   - **Description**: Unlimited bookings
   - **Pricing model**: Standard pricing
   - **Price**: $79.00 USD
   - **Billing period**: Monthly
   - **Recurring**: Yes
3. Click **"Add pricing"**
4. Copy the **Price ID** (starts with `price_`)

### Step 4: Set Up Stripe Webhook

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **"Add endpoint"**
3. Fill in:
   - **Endpoint URL**: `https://us-central1-polyface-ae6d3.cloudfunctions.net/stripeWebhook`
   - **Description**: CoachFlow Admin Platform Billing
   - **Events to send**: Select these events:
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **"Add endpoint"**
5. Copy the **Signing secret** (starts with `whsec_`)

### Step 5: Configure Firebase Environment Variables

Run these commands with your actual Stripe IDs:

```bash
cd "/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy/CoachFlow Admin/functions"

# Set Stripe price IDs (replace with your actual price IDs)
firebase functions:config:set \
  stripe.starter_price_id="price_YOUR_STARTER_PRICE_ID" \
  stripe.professional_price_id="price_YOUR_PROFESSIONAL_PRICE_ID" \
  --project polyface-ae6d3

# Set webhook secret (replace with your actual webhook secret)
firebase functions:config:set \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
  --project polyface-ae6d3

# View current config to verify
firebase functions:config:get --project polyface-ae6d3

# Redeploy functions with new config
firebase deploy --only functions --project polyface-ae6d3
```

### Step 6: Test the Integration

#### Test Billing Status Loading
1. Open CoachFlow Admin app
2. Sign in as an admin user
3. Navigate to **Account** tab
4. Verify "Manage Subscription" card appears with "Free Plan"

#### Test Subscription Management
1. Tap "Manage Subscription"
2. Verify ManageSubscriptionView loads without errors
3. Check that usage shows 0 bookings (or correct count)
4. Verify plan cards display (Free, Starter, Professional)

#### Test Billing Block (Simulate)
1. In Firebase Console, go to Firestore
2. Find your organization document
3. Update `billing.status` to `"past_due"`
4. Restart CoachFlow Admin app
5. Try to create a booking
6. Verify booking is blocked with error message

#### Test Subscription Creation (Mock)
Since payment UI isn't fully built yet, test the function directly:
```bash
# Test getBillingStatus
firebase functions:shell --project polyface-ae6d3
> getBillingStatus({orgId: "0Mtow1OaV7oUlCisKSNy"})
```

## 🎯 Integration Points Summary

### Data Flow
1. **Organization Creation** → Includes `billing` object with free plan
2. **User Sign In** → AuthManager loads org billing status
3. **Booking Attempt** → 
   - Client checks `auth.isBillingBlocked`
   - Server checks org billing status
   - Both block if status is past_due/canceled/unpaid
4. **Stripe Webhook** → Updates org billing status in real-time
5. **Admin UI** → ManageSubscriptionView shows current plan and allows upgrades

### Firestore Schema
```
organizations/{orgId}
  ├── billing
  │   ├── plan: "free" | "starter" | "professional"
  │   ├── status: "active" | "past_due" | "canceled" | "unpaid"
  │   ├── subscriptionId: string | null
  │   ├── customerId: string | null
  │   ├── currentPeriodEnd: Timestamp | null
  │   ├── cancelAtPeriodEnd: boolean
  │   └── lastPaymentDate: Timestamp | null
```

### Cloud Functions
| Function | Purpose | Auth Required | Admin Only |
|----------|---------|---------------|------------|
| `createSubscription` | Create new subscription | Yes | Yes (via orgMember role) |
| `cancelSubscription` | Cancel at period end | Yes | Yes |
| `updateSubscription` | Upgrade/downgrade plan | Yes | Yes |
| `getBillingStatus` | Get usage stats | Yes | Yes |
| `stripeWebhook` | Handle Stripe events | No | N/A |
| `bookLesson` | Create booking (with billing check) | Yes | No |

### Swift UI Components
| Component | Purpose | Access |
|-----------|---------|--------|
| `ManageSubscriptionView` | Full subscription management | Admin only |
| `BillingPaywallView` | Block access for billing issues | All users |
| `ContentView` (MoreView) | Navigation to subscription | Admin only |

## 🚀 Next Steps

After completing the setup steps above:

1. **Test End-to-End Flow**
   - Create test organization
   - Subscribe to Starter plan
   - Create 50 bookings
   - Verify upgrade prompt appears
   - Upgrade to Professional
   - Verify unlimited bookings allowed

2. **Monitor Stripe Webhooks**
   - Check webhook logs in Stripe Dashboard
   - Verify events are being received
   - Test failed payment scenario
   - Confirm status updates in Firestore

3. **Production Checklist**
   - Switch Stripe to live mode
   - Update price IDs to live mode
   - Update webhook URL if different
   - Test with real credit card (then refund)
   - Set up Stripe tax collection
   - Configure email notifications

## 📚 Related Documentation
- [STRIPE_BILLING_SETUP.md](STRIPE_BILLING_SETUP.md) - Detailed Stripe configuration
- [PAYMENT_IMPLEMENTATION_SUMMARY.md](PAYMENT_IMPLEMENTATION_SUMMARY.md) - Client payment system
- [STEP10_COMPLETE.md](STEP10_COMPLETE.md) - (Create after verification)
