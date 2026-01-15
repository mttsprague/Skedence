# Stripe Connect Redirect Flow Implementation

## Overview

Implemented a proper redirect flow for Stripe Connect onboarding that works for both the onboarding process and the business tab settings.

## The Problem

Stripe's API requires HTTPS URLs for redirect URLs - it cannot accept custom URL schemes like `skedenceadmin://`. When we tried using deep links directly, Stripe returned:
```
StripeInvalidRequestError: Not a valid URL
code: 'url_invalid'
param: 'return_url'
```

## The Solution

Created a hosted redirect page that serves as an intermediary:

### 1. Hosted Redirect Page
**File**: `SkedenceAdmin/public/stripe-redirect.html`
**URL**: `https://polyface-ae6d3.web.app/stripe-redirect`

**Features**:
- ✅ Beautiful success animation with checkmark
- ✅ Auto-redirects to deep link after 1.5 seconds
- ✅ Manual "Return to App" button as fallback
- ✅ Passes orgId through URL parameters
- ✅ Works on both iOS and other browsers

**Flow**:
1. Stripe redirects to: `https://polyface-ae6d3.web.app/stripe-redirect?orgId=xxx`
2. Page shows success message and animation
3. JavaScript auto-opens deep link: `skedenceadmin://stripe-connect/complete?orgId=xxx`
4. If deep link doesn't auto-open, button is available to retry

### 2. Backend Changes

**File**: `SkedenceAdmin/functions/src/stripe-connect.ts`
**Function**: `createConnectAccountLink`

```typescript
const redirectUrl = `https://polyface-ae6d3.web.app/stripe-redirect?orgId=${orgId}`;
const accountLink = await stripe.accountLinks.create({
  account: connectAccountId,
  refresh_url: redirectUrl,
  return_url: redirectUrl,
  type: "account_onboarding",
});
```

- Both refresh_url and return_url now point to the hosted redirect page
- orgId parameter is passed through the entire flow
- Works for both new onboarding and reconnection flows

**Deployed**: ✅ January 15, 2026

### 3. iOS App Changes

#### A. Deep Link Handler
**File**: `SkedenceAdmin/SkedenceAdmin/SkedenceAdminApp.swift`

Added URL handler that:
- Listens for `skedenceadmin://stripe-connect/complete` deep links
- Automatically refreshes Stripe Connect status when deep link is opened
- Calls `refreshConnectAccountStatus` Firebase Function
- Updates UI state across the app

#### B. Onboarding View
**File**: `SkedenceAdmin/SkedenceAdmin/OnboardingStripeView.swift`

- Added `.onAppear` handler that auto-checks status when in "waiting" state
- Waits 1 second after appearing, then calls `checkStatus()`
- Handles case where user returns from browser via deep link

#### C. Settings View
**File**: `SkedenceAdmin/SkedenceAdmin/StripeSettingsView.swift`

- Added `.onAppear` handler that refreshes Stripe Connect status
- Ensures status is current when user returns from browser
- Works for both tab (Business → Stripe Settings)

## User Experience

### Complete Flow

1. **User clicks "Connect Stripe Account"**
   - In onboarding wizard, OR
   - In Business tab → Stripe Settings

2. **App calls Firebase Functions**
   - Creates Stripe Connect account (if needed)
   - Generates onboarding link with proper redirect URL
   - Opens Safari/browser

3. **User completes Stripe setup in browser**
   - Signs in or creates Stripe account
   - Enters business details
   - Adds bank account
   - Verifies identity
   - Submits application

4. **Stripe redirects to hosted page**
   - URL: `https://polyface-ae6d3.web.app/stripe-redirect?orgId=xxx`
   - Shows success animation
   - Auto-opens deep link after 1.5 seconds

5. **Deep link returns to app**
   - URL: `skedenceadmin://stripe-connect/complete?orgId=xxx`
   - App automatically refreshes Stripe status
   - UI updates to show "Connected" state
   - In onboarding: advances to next step
   - In settings: updates status card

### Fallback Handling

If deep link doesn't auto-open:
- Manual "Return to App" button displayed after 2 seconds
- User can click button to try opening deep link again
- Works even if first attempt fails

## Testing

### Test the Complete Flow

1. **Start Stripe Connect**
   ```
   - Open admin app
   - Go to onboarding OR Business tab → Stripe Settings
   - Click "Connect Your Stripe Account"
   ```

2. **Verify Browser Opens**
   ```
   - Should open Safari/browser
   - Should load Stripe onboarding page
   - Should show "LIVE mode" (not test mode)
   ```

3. **Complete Stripe Setup**
   ```
   - Enter business details
   - Add bank account
   - Verify identity (if required)
   - Submit application
   ```

4. **Verify Redirect**
   ```
   - Should redirect to polyface-ae6d3.web.app/stripe-redirect
   - Should show checkmark animation
   - Should say "Stripe Setup Complete! ✓"
   - Should auto-return to app after ~2 seconds
   ```

5. **Verify App Status**
   ```
   - App should automatically refresh status
   - Status should show "Connected" or "Charges Enabled"
   - In onboarding: should advance to next step automatically
   - In settings: should show green "Connected" card
   ```

### Manual Testing Commands

Check Firebase Function logs:
```bash
cd SkedenceAdmin
firebase functions:log --only createConnectAccountLink,refreshConnectAccountStatus --limit 50
```

Check hosted page:
```bash
# Open in browser to test
open https://polyface-ae6d3.web.app/stripe-redirect?orgId=test123
```

## Configuration Files

### Firebase Hosting Config
**File**: `SkedenceAdmin/firebase.json`

```json
"hosting": {
  "public": "public",
  "rewrites": [
    {
      "source": "/stripe-redirect",
      "destination": "/stripe-redirect.html"
    }
  ]
}
```

### Info.plist (Already configured)
**File**: `SkedenceAdmin/SkedenceAdmin/Info.plist`

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>skedenceadmin</string>
    </array>
  </dict>
</array>
```

## Deployment Status

✅ **Firebase Hosting**: Deployed
- Redirect page available at: https://polyface-ae6d3.web.app/stripe-redirect

✅ **Firebase Functions**: Deployed
- `createConnectAccountLink` updated with redirect URL
- Deployed January 15, 2026 at 18:21 UTC

✅ **iOS App**: Updated
- Deep link handler added
- Auto-refresh on return implemented
- Works for both onboarding and settings

⏳ **Pending**: User testing and verification

## Troubleshooting

### Deep link doesn't open
- **Check**: Info.plist has URL scheme configured
- **Check**: App is installed on device
- **Workaround**: Use manual "Return to App" button

### Status doesn't refresh automatically
- **Check**: Firebase Functions deployed
- **Check**: Internet connection active
- **Workaround**: Tap "Refresh Status" or "Check Status" button manually

### Still redirects to Stripe docs
- **Check**: Firebase Functions deployed successfully
- **Check**: Using latest deployed version
- **Verify**: `firebase deploy --only functions:createConnectAccountLink`

### Redirect page shows error
- **Check**: Firebase Hosting deployed
- **Check**: firebase.json has rewrite rule
- **Verify**: `firebase deploy --only hosting`

## Next Steps

1. **Test Complete Flow**
   - Test onboarding path
   - Test settings path
   - Verify auto-refresh works

2. **Monitor Logs**
   - Watch Firebase Functions logs for errors
   - Check Stripe Dashboard for Connect account creation
   - Verify webhook deliveries

3. **Optional Improvements**
   - Custom domain for redirect page (more professional)
   - Better error handling if status check fails
   - Loading indicator during auto-refresh
   - Analytics tracking for completion rate

## Related Documentation

- [STRIPE_LIVE_MODE_SETUP.md](STRIPE_LIVE_MODE_SETUP.md) - Live mode configuration
- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) - Security verification
- [Info.plist](SkedenceAdmin/SkedenceAdmin/Info.plist) - URL scheme configuration
- [Stripe Connect Docs](https://stripe.com/docs/connect) - Official documentation
