# Google Analytics Setup Guide

## ✅ Step 1: Code Implementation (COMPLETE)

The following has been added to your Next.js app:

### Files Created:
1. **`src/components/analytics/GoogleTagManager.tsx`** - GTM integration
2. **`src/lib/analytics.ts`** - Custom event tracking utility

### Files Modified:
1. **`src/app/layout.tsx`** - Added GTM scripts to <head> and <body>

Your GTM Container ID: **GTM-WMG9BTJW**  
Your GA4 Measurement ID: **G-J3S897MHJJ**

---

## 🎯 Step 2: Configure GA4 in Google Tag Manager

Now you need to connect GA4 to GTM:

### A. Create Google Tag (Modern GA4 Setup)

1. Go to https://tagmanager.google.com/
2. Select your container: **GTM-WMG9BTJW**
3. Click **Tags** → **New**
4. Name it: `GA4 - Google Tag`
5. Click **Tag Configuration**:
   - Choose: **Google Tag** (this is the modern way)
   - **Tag ID:** Enter `G-J3S897MHJJ`
   - **Configuration Settings (dropdown):** Leave as default
   - **Shared Event Settings (dropdown):** Leave as default
   - **Advanced Settings (dropdown):** Leave as default
6. Click **Triggering**:
   - Select: **All Pages**
7. Click **Save**

### B. Create GA4 Event Tag (For Custom Events)

1. Click **Tags** → **New**
2. Name it: `GA4 - All Events`
3. Click **Tag Configuration**:
   - Choose: **Google Analytics: GA4 Event**
   - **Configuration Tag:** Select `GA4 - Google Tag` (the tag you just created)
   - **Event Name:** Click the **"+"** icon next to the field
     - Select: **Event** (this is a built-in variable)
     - Or type: `{{Event}}`
4. Click **Triggering**:
   - Click the **"+"** to create a new trigger
   - Name it: `All Custom Events`
   - **Trigger Type:** Select **Custom Event**
   - **Event name:** `.*` (this is regex that matches all events)
   - **Check the box:** "Use regex matching"
   - Click **Save**
5. Click **Save** on the tag

### C. Submit & Publish

1. Click **Submit** (top right)
2. Version Name: `Initial GA4 Setup`
3. Description: `Added Google Tag and custom event tracking`
4. Click **Publish**

✅ **Done!** Your analytics are now live and tracking events.

---

## 📊 Step 3: Using Analytics in Your Code

### Track Page Views
```typescript
import { trackPageView } from '@/lib/analytics';

// In useEffect or component
trackPageView('/dashboard');
```

### Track Subscription Events
```typescript
import { trackSubscription } from '@/lib/analytics';

// When user starts trial
trackSubscription.started('Studio', true, 99);

// When user upgrades
trackSubscription.upgraded('Starter', 'Studio', 99);

// When user cancels
trackSubscription.cancelled('Studio', 'Too expensive');
```

### Track Business Actions
```typescript
import { trackBusiness } from '@/lib/analytics';

// When client is added
trackBusiness.clientAdded(orgId);

// When trainer is added
trackBusiness.trainerAdded(orgId);

// When Stripe is connected
trackBusiness.stripeConnected(orgId);

// When package is created
trackBusiness.packageCreated('private', 8000);
```

### Track Button Clicks
```typescript
import { trackClick } from '@/lib/analytics';

<Button onClick={() => {
  trackClick('start_trial', 'subscription_page', { plan: 'Studio' });
  handleStartTrial();
}}>
  Start Free Trial
</Button>
```

### Track Feature Usage
```typescript
import { trackFeature } from '@/lib/analytics';

// When search is used
trackFeature.search('john doe', 5);

// When data is exported
trackFeature.export('clients_csv', 120);

// Generic feature tracking
trackFeature.used('schedule_view_changed', { view: 'week' });
```

### Set User Properties
```typescript
import { setUserProperties } from '@/lib/analytics';

// After login
setUserProperties({
  userId: user.uid,
  orgId: user.orgId,
  role: user.role,
  subscriptionTier: 'Studio',
});
```

### Track Errors
```typescript
import { trackError } from '@/lib/analytics';

try {
  // code
} catch (error) {
  trackError('payment_failed', error.message, {
    amount: 99,
    plan: 'Studio',
  });
}
```

---

## 🔍 Step 4: Verify Tracking is Working

### Option A: GTM Preview Mode
1. In GTM, click **Preview** (top right)
2. Enter your site URL: `https://skedence.com`
3. Browse your site and watch events fire in real-time

### Option B: GA4 Real-Time Reports
1. Go to https://analytics.google.com/
2. Select your property
3. Go to **Reports** → **Realtime**
4. Visit your site and watch events appear

### Option C: Browser Console (Development)
In development mode, all events are logged to console with 📊 prefix.

---

## 📈 Recommended Events to Add

Add these tracking calls to your existing pages:

### Subscription Page
```typescript
// /subscription/page.tsx
const handleSelectPlan = async (plan: string) => {
  trackClick('select_plan', 'subscription_page', { plan });
  trackSubscription.started(plan, true, getPlanPrice(plan));
  // ... existing code
};
```

### Login/Signup
```typescript
// After successful signup
trackAuth.signUp('email', orgId);

// After successful login
trackAuth.login('email');
```

### Stripe Connection
```typescript
// After Stripe connects successfully
trackBusiness.stripeConnected(orgId);
```

### Client Management
```typescript
// When client is added
trackBusiness.clientAdded(orgId);
```

### Trainer Management
```typescript
// When trainer is invited
trackBusiness.trainerAdded(orgId);
```

---

## 🎯 Key Metrics to Monitor

Once set up, track these KPIs in GA4:

1. **Conversion Rate**: Visitors → Sign-ups
2. **Trial Conversion**: Trial starts → Paid subscriptions
3. **Feature Adoption**: Which features are used most
4. **User Flow**: How users navigate the portal
5. **Subscription Churn**: Cancellation rate and reasons
6. **Time to Value**: How long until first booking/client
7. **Average Session Duration**: Engagement level
8. **Popular Plans**: Which subscription tier is chosen most

---

## 🚀 Next Steps

1. **Deploy Changes**: Build and deploy your Next.js app
2. **Configure GTM**: Follow Step 2 above
3. **Add Tracking**: Add tracking calls to key user actions
4. **Verify**: Use Preview mode to test
5. **Monitor**: Check GA4 reports daily

---

## 📝 Notes

- All tracking calls are safe - they do nothing if GTM isn't loaded
- Development mode logs all events to console for debugging
- GTM loads asynchronously and doesn't block page rendering
- You can add more tags in GTM without code changes
- Consider adding Facebook Pixel, LinkedIn Insight Tag via GTM later

---

## Need Help?

Common issues:
- **Events not showing in GA4**: Wait 24-48 hours for data to populate
- **Real-time not working**: Check GTM is published and GA4 tag is configured
- **Development console not logging**: GTM only logs in dev mode with NODE_ENV=development
