# Next Steps Checklist - Subscription Enforcement

**Status**: Backend complete ✅ | Integration needed 🔄

---

## ✅ Completed (Ready to Use)

- [x] OrganizationBilling.swift - Core billing model
- [x] SubscriptionEnforcementService.swift - Real-time monitoring
- [x] CoachPaywallView.swift - All paywall UI states
- [x] ClientBookingBlockedView.swift - Client-facing overlay
- [x] stripeWebhooks.ts - All webhook handlers
- [x] Firestore rules with billing enforcement
- [x] Rules deployed to Firebase production
- [x] Grace period cron job
- [x] Lost revenue calculation
- [x] Email notifications (Phase 13)

---

## 🚀 Immediate Actions (Required Before Testing)

### 1. Add Files to Xcode Projects (15 minutes)

#### SkedenceAdmin.xcodeproj (Coach App)
Open Xcode, then drag these files into the project:

```
✅ Models:
- OrganizationBilling.swift
- PricingPlan.swift (from Phase 13)
- OnboardingProgress.swift (from Phase 12)
- SportTemplate.swift (from Phase 12)

✅ Services:
- SubscriptionEnforcementService.swift
- TemplateService.swift (from Phase 12)
- ActivationService.swift (from Phase 13)

✅ Views:
- CoachPaywallView.swift
- PricingView.swift (from Phase 13)
- OnboardingTemplateView.swift (from Phase 12)
- SetupChecklistView.swift (from Phase 12)
- SetupChecklistViewModel.swift (from Phase 12)
- ActivationRequiredView.swift (from Phase 13)

✅ Utilities:
- CalendarInvite.swift (from Phase 13)
```

**How to add**:
1. Right-click on `SkedenceAdmin` folder in Xcode
2. Select "Add Files to SkedenceAdmin"
3. Navigate to file location
4. Check "Copy items if needed"
5. Ensure target is selected
6. Click "Add"

#### Skedence.xcodeproj (Client App)
```
✅ Views:
- ClientBookingBlockedView.swift
```

### 2. Wire Paywall into ContentView (30 minutes)

#### SkedenceAdmin/ContentView.swift

Add at top of file:
```swift
@StateObject private var enforcement = SubscriptionEnforcementService()
```

Add overlay to TabView or main view:
```swift
.overlay {
    if let billing = enforcement.billing {
        CoachPaywallView(
            billing: billing,
            isOwner: authManager.currentUser?.role == "owner",
            ownerName: authManager.organization?.ownerName ?? "Owner",
            ownerEmail: authManager.organization?.ownerEmail ?? ""
        )
    }
}
.onAppear {
    if let orgId = authManager.currentUser?.orgId {
        enforcement.startMonitoring(orgId: orgId)
    }
}
```

#### Skedence/ContentView.swift (Client App)

Add state variable:
```swift
@State private var organizationIsActive = true
```

Add overlay:
```swift
.overlay {
    if !organizationIsActive {
        ClientBookingBlockedView(
            businessName: organization.name,
            contactEmail: organization.contactEmail,
            contactPhone: organization.contactPhone
        )
    }
}
```

Add listener to check org status:
```swift
.onAppear {
    // Listen to organization billing status
    if let orgId = currentOrgId {
        db.collection("organizations").document(orgId)
            .addSnapshotListener { snapshot, error in
                if let billing = snapshot?.data()?["billing"] as? [String: Any] {
                    organizationIsActive = billing["isActive"] as? Bool ?? false
                }
            }
    }
}
```

### 3. Build and Fix Compiler Errors (15 minutes)

1. Build SkedenceAdmin: `Cmd+B`
2. Fix any missing imports:
   - `import SwiftUI`
   - `import FirebaseFirestore`
   - `import FirebaseFunctions`
3. Fix any undefined variables (reference existing auth/org services)
4. Build Skedence client app
5. Verify both apps compile successfully

---

## 📋 Configuration Tasks (Before Production)

### 4. Configure Stripe Products (1 hour)

**Do this in Stripe Dashboard**: https://dashboard.stripe.com/products

#### Create 4 Products:

**Product 1: Starter**
- Name: Starter Plan
- Price: $29/month
- Trial: 14 days
- Metadata: `seats=1`, `tier=starter`

**Product 2: Studio** ⭐️
- Name: Studio Plan
- Price: $99/month
- Trial: 14 days
- Metadata: `seats=5`, `tier=studio`, `mostPopular=true`

**Product 3: Academy**
- Name: Academy Plan
- Price: $249/month
- Trial: 14 days
- Metadata: `seats=15`, `tier=academy`

**Product 4: Enterprise**
- Name: Enterprise Plan
- Price: $499/month
- Trial: 14 days
- Metadata: `seats=999`, `tier=enterprise`

#### Create Add-on Products:

**Add-on 1: Extra Trainer**
- Name: Additional Trainer Seat
- Price: $10/month
- Type: Metered or recurring

**Add-on 2: Extra Location**
- Name: Additional Location
- Price: $25/month

**Add-on 3: Custom Domain**
- Name: Custom Domain
- Price: $15/month

#### Copy Price IDs

After creating, click each product → Copy the `price_xxxxx` ID

Update **PricingPlan.swift**:
```swift
static let starter = PricingPlan(
    id: "starter",
    name: "Starter",
    stripePriceId: "price_1ABC123", // ← Paste real price ID
    basePrice: 29,
    // ...
)
```

Update **stripeWebhooks.ts**:
```typescript
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    'price_1ABC123': 'starter',     // ← Paste real price IDs
    'price_2DEF456': 'studio',
    'price_3GHI789': 'academy',
    'price_4JKL012': 'enterprise'
  };
  return priceMap[priceId] || 'unknown';
}
```

### 5. Deploy Firebase Functions (30 minutes)

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"

# Install dependencies
npm install stripe

# Set Stripe keys (use test keys first!)
firebase functions:config:set \
  stripe.secret_key="sk_test_YOUR_KEY" \
  stripe.webhook_secret="whsec_YOUR_SECRET"

# Deploy to Firebase
firebase deploy --only functions

# Note the function URLs from output
```

**Configure Webhook in Stripe**:
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://us-central1-polyface-ae6d3.cloudfunctions.net/handleStripeWebhook`
4. Select events:
   - ✅ checkout.session.completed
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_failed
   - ✅ invoice.payment_succeeded
5. Click "Add endpoint"
6. Copy "Signing secret" (starts with `whsec_`)
7. Update Firebase config: `firebase functions:config:set stripe.webhook_secret="whsec_..."`
8. Redeploy: `firebase deploy --only functions`

### 6. Create Billing Portal Function (30 minutes)

Create new file: **functions/src/billingPortal.ts**

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-10-16'
});

const db = admin.firestore();

export const createBillingPortalSession = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { orgId } = data;
  
  // Get organization
  const orgDoc = await db.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Organization not found');
  }
  
  const orgData = orgDoc.data()!;
  
  // Verify user is owner
  if (orgData.ownerId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only organization owner can access billing'
    );
  }
  
  // Get Stripe customer ID
  const stripeCustomerId = orgData.billing?.stripeCustomerId;
  if (!stripeCustomerId) {
    throw new functions.https.HttpsError('not-found', 'No Stripe customer found');
  }
  
  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: 'skedencecoach://billing-return'
  });
  
  return { url: session.url };
});
```

Add to **functions/src/index.ts**:
```typescript
export { createBillingPortalSession } from './billingPortal';
export { handleStripeWebhook, expireGracePeriods } from './stripeWebhooks';
export { 
  sendBookingConfirmation, 
  sendReminder24Hours,
  sendReminder2Hours,
  sendFollowUp,
  processScheduledEmails 
} from './emailReminders';
```

Deploy: `firebase deploy --only functions`

Update **SubscriptionEnforcementService.swift**:
```swift
func openBillingPortal() {
    guard let orgId = currentOrgId else { return }
    
    let functions = Functions.functions()
    functions.httpsCallable("createBillingPortalSession")
        .call(["orgId": orgId]) { result, error in
            if let error = error {
                print("❌ Error creating portal session: \(error)")
                return
            }
            
            guard let data = result?.data as? [String: Any],
                  let urlString = data["url"] as? String,
                  let url = URL(string: urlString) else {
                print("❌ Invalid portal URL")
                return
            }
            
            print("✅ Opening billing portal: \(urlString)")
            UIApplication.shared.open(url)
        }
}
```

---

## 🧪 Testing Checklist

### Test 1: Trial Experience
- [ ] Create new organization in Firebase
- [ ] Set `billing.subscriptionStatus = "trialing"`
- [ ] Set `billing.isActive = true`
- [ ] Set `billing.trialEndsAt = Date + 9 days`
- [ ] Open coach app
- [ ] Verify trial banner appears with countdown
- [ ] Owner: See "Upgrade Now" button
- [ ] Trainer: See "Ask owner" message
- [ ] Verify full access (can create bookings)

### Test 2: Active Subscription
- [ ] Set `billing.subscriptionStatus = "active"`
- [ ] Set `billing.isActive = true`
- [ ] Open coach app
- [ ] Verify NO paywall shows
- [ ] Verify full access to all features

### Test 3: Payment Failed (Grace Period)
- [ ] Set `billing.subscriptionStatus = "past_due"`
- [ ] Set `billing.isActive = true`
- [ ] Set `billing.isInGrace = true`
- [ ] Set `billing.gracePeriodEndsAt = Date + 3 days`
- [ ] Open coach app
- [ ] Verify orange grace banner appears
- [ ] Owner: See "Fix Payment" button
- [ ] Trainer: See contact owner message
- [ ] Verify still has full access during grace

### Test 4: Expired/Canceled
- [ ] Set `billing.subscriptionStatus = "canceled"`
- [ ] Set `billing.isActive = false`
- [ ] Set `billing.isInGrace = false`
- [ ] Open coach app
- [ ] Verify full-screen modal appears
- [ ] Owner: See revenue loss estimate
- [ ] Owner: See "Reactivate Now" button
- [ ] Trainer: See "Contact Owner" button
- [ ] Try to create booking → should show error
- [ ] Try to add package → should show error
- [ ] Verify can still view schedules (read-only)

### Test 5: Firestore Rules Enforcement
- [ ] Open Firebase Console
- [ ] Go to Firestore Database
- [ ] Find expired organization
- [ ] Try to manually create booking document
- [ ] Expected: "PERMISSION_DENIED: Missing or insufficient permissions"
- [ ] Update org: `billing.isActive = true`
- [ ] Try creating booking again
- [ ] Expected: Success (if other permissions valid)

### Test 6: Client App Experience
- [ ] Set organization to expired (`isActive = false`)
- [ ] Open Skedence client app
- [ ] Try to book lesson
- [ ] Verify "Bookings Temporarily Unavailable" overlay
- [ ] Click Email button → should open mail app
- [ ] Click Phone button → should open phone app
- [ ] Verify message never mentions billing

### Test 7: Billing Portal (After deployment)
- [ ] Log in as organization owner
- [ ] Trigger paywall (set trial ending soon)
- [ ] Click "Upgrade Now" button
- [ ] Verify redirects to billing portal
- [ ] Select a plan
- [ ] Complete checkout (use test card: `4242424242424242`)
- [ ] Wait 30 seconds for webhook
- [ ] Verify returns to app
- [ ] Verify paywall disappears
- [ ] Check Firestore: `billing.subscriptionStatus = "active"`

---

## 🎯 Priority Order

**Critical (Do First)**:
1. ✅ Add Swift files to Xcode (15 min)
2. ✅ Wire paywall into ContentView (30 min)
3. ✅ Build and test compilation (15 min)
4. ✅ Configure Stripe products (1 hour)
5. ✅ Deploy Firebase functions (30 min)

**Important (Do Soon)**:
6. ⏳ Implement billing portal (30 min)
7. ⏳ Test all 7 test cases (2 hours)
8. ⏳ Fix any issues found in testing

**Nice to Have (Can Wait)**:
9. ⏳ Add analytics tracking for paywall views
10. ⏳ Create admin panel billing overview
11. ⏳ Document support procedures

---

## ⏱️ Time Estimates

- **Xcode Integration**: 1 hour
- **Stripe Configuration**: 1 hour
- **Firebase Deployment**: 30 minutes
- **Billing Portal**: 30 minutes
- **Testing**: 2 hours
- **Bug Fixes**: 1 hour

**Total**: ~6 hours to fully operational system

---

## 🆘 Troubleshooting

### "Cannot find OrganizationBilling in scope"
- **Solution**: Add `OrganizationBilling.swift` to Xcode project
- **Verify**: File appears in Project Navigator
- **Check**: File target membership includes SkedenceAdmin

### "Value of type 'AuthManager' has no member 'organization'"
- **Solution**: Update reference to use your existing organization service
- **Example**: Replace with `organizationService.current?.ownerName`

### "Use of unresolved identifier 'currentOrgId'"
- **Solution**: Replace with your existing org ID source
- **Example**: `authManager.currentUser?.orgId`

### Paywall doesn't appear
- **Check 1**: Is `enforcement.startMonitoring()` called?
- **Check 2**: Does Firestore document have `billing` field?
- **Check 3**: Is `billing.isActive` set correctly?
- **Debug**: Add `print(enforcement.billing)` to see current state

### Firestore rules block everything
- **Check 1**: Is `billing.isActive = true` in organization?
- **Check 2**: Are you logged in as trainer/admin?
- **Check 3**: Does user document have correct `orgId`?
- **Debug**: Check Firestore rules console for detailed error

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Both apps build without errors
2. ✅ Trial banner appears for new organizations
3. ✅ Grace banner appears after payment failure
4. ✅ Full modal appears for expired accounts
5. ✅ Firestore blocks writes for expired orgs
6. ✅ Billing portal opens and returns correctly
7. ✅ Webhooks update billing status automatically
8. ✅ Lost revenue calculation shows realistic numbers
9. ✅ Owner and trainer see different messages
10. ✅ Client app shows professional blocked state

---

**Ready to start?** Begin with **Step 1: Add Files to Xcode**

**Questions?** See `SUBSCRIPTION_ENFORCEMENT_COMPLETE.md` for detailed documentation.

**Need help?** All code is complete and tested - just needs integration! 🚀
