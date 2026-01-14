# Stripe Production Setup Guide

## Overview
This guide explains how to switch from Stripe **test mode** to **production mode** so that real payments can be processed and go directly to business owners' Stripe accounts.

## Current Status: TEST MODE ⚠️
- Using test API keys (sk_test_*, pk_test_*)
- Test accounts only
- No real money transferred

## Goal: PRODUCTION MODE ✅
- Use live API keys (sk_live_*, pk_live_*)
- Real Stripe accounts
- Real money goes to business owners

---

## How Stripe Connect Works

### Multi-Tenant Payment Architecture
1. **Platform (You)**: Has a main Stripe account with Connect enabled
2. **Business Owners**: Each connects their own Stripe account (existing or new)
3. **Clients**: Pay through the app
4. **Money Flow**: Client → Owner's Stripe account (optionally minus platform fee)

### Owner Onboarding Flow
When a business owner sets up Stripe in your app:

1. **App calls `createConnectAccount`**: Creates a Stripe Express Connect account
2. **App opens onboarding link**: Opens Stripe's hosted onboarding page
3. **Owner chooses**:
   - **Sign in** to existing Stripe account → Links it to your platform
   - **Create new** Stripe account → Creates and links new account
4. **Owner completes setup**:
   - Verifies identity
   - Connects bank account
   - Accepts terms
5. **Owner returns to app**: App verifies setup is complete
6. **Ready to accept payments**: Clients can now pay for lessons

---

## Step 1: Get Your Live Stripe Keys

### A. Create/Access Your Platform Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign in or create an account (this is YOUR platform account)
3. Complete business verification if not done

### B. Enable Stripe Connect

1. Go to **Stripe Dashboard** → **Connect** → **Settings**
2. Enable **Connect**
3. Choose platform type: **Marketplace** or **Platform**
4. Complete Connect onboarding

### C. Get Live API Keys

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top right)
2. Go to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key**: `pk_live_...` (safe to expose in apps)
   - **Secret key**: `sk_live_...` (NEVER expose, server-only)

### D. Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter endpoint URL:
   ```
   https://us-central1-polyface-ae6d3.cloudfunctions.net/stripeWebhook
   ```
   (Replace `polyface-ae6d3` with your Firebase project ID)
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated` (for Connect accounts)
   - `account.application.authorized`
   - `account.application.deauthorized`
5. Copy the **Signing secret** (`whsec_...`)

---

## Step 2: Update Firebase Functions

### A. Update .env File

Edit `SkedenceAdmin/functions/.env`:

```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET
```

⚠️ **IMPORTANT**: Never commit this file to git! Add to `.gitignore`

### B. Set Environment Variables in Firebase

```bash
cd SkedenceAdmin/functions

# Set secret key (server-side only)
firebase functions:config:set \
  stripe.secret_key="sk_live_YOUR_ACTUAL_SECRET_KEY" \
  stripe.webhook_secret="whsec_YOUR_ACTUAL_WEBHOOK_SECRET"

# Verify
firebase functions:config:get
```

### C. Redeploy Functions

```bash
cd SkedenceAdmin
firebase deploy --only functions
```

This will deploy all functions with the new live keys.

---

## Step 3: Update iOS App (Optional)

If you have any Stripe publishable keys hardcoded in the app:

1. Open `SkedenceAdmin.xcodeproj`
2. Search for `pk_test_`
3. Replace with `pk_live_YOUR_ACTUAL_PUBLISHABLE_KEY`
4. Rebuild and redeploy app

---

## Step 4: Test with Real Stripe Account

### A. Complete Onboarding as Test Owner

1. Create a test organization in your app
2. Go to **Business** tab → **Stripe Settings**
3. Click **Connect Your Stripe Account**
4. In the browser:
   - **Option 1**: Sign in with an existing Stripe account
   - **Option 2**: Create a new Stripe account
5. Complete the Express onboarding:
   - Enter business details
   - Verify identity
   - Connect bank account
6. Return to app
7. Click **I've Completed Setup**

### B. Verify Connection

Check in Stripe Dashboard → **Connect** → **Accounts**
- You should see the connected account
- Status should show "Charges enabled" and "Payouts enabled"

### C. Test a Payment

1. In your app, have a test client book a lesson
2. Process payment through the app
3. Check Stripe Dashboard:
   - Payment should appear in the connected account's balance
   - Money will be transferred to the owner's bank account

---

## Step 5: Production Checklist

Before going live with real customers:

- [ ] Platform Stripe account fully verified
- [ ] Stripe Connect enabled
- [ ] Live API keys obtained
- [ ] Webhook endpoint configured and verified
- [ ] Firebase Functions updated with live keys
- [ ] Functions redeployed successfully
- [ ] Test onboarding flow completed
- [ ] Test payment processed successfully
- [ ] Money appeared in test owner's Stripe account
- [ ] Bank payout tested (may take 2-7 days)
- [ ] iOS app updated (if needed)
- [ ] Legal terms and privacy policy updated
- [ ] Stripe's terms of service accepted
- [ ] Customer support process documented

---

## Important Notes

### Test vs Live Mode

| Aspect | Test Mode | Live Mode |
|--------|-----------|-----------|
| API Keys | `sk_test_*`, `pk_test_*` | `sk_live_*`, `pk_live_*` |
| Money | Fake | Real |
| Cards | Test cards only | Real cards only |
| Webhooks | Separate endpoint | Separate endpoint |
| Dashboard | Separate data | Separate data |

### Stripe Express Connect

- **Express accounts**: Owners can use existing Stripe login
- **Full branding**: Stripe branding during onboarding (simpler for you)
- **Easier compliance**: Stripe handles most regulatory requirements
- **Owner control**: Owners can access their Stripe dashboard directly

### Security Best Practices

1. **Never expose secret keys**: Keep in server environment only
2. **Use environment variables**: Don't hardcode keys
3. **Rotate keys regularly**: If compromised, generate new keys
4. **Monitor webhook signatures**: Verify all webhook events
5. **Enable 2FA**: On your platform Stripe account

### Troubleshooting

**"No such account" error**:
- Account ID might be from test mode but using live keys (or vice versa)
- Delete the organization and recreate in correct mode

**"Account not onboarded" error**:
- Owner hasn't completed Stripe onboarding
- Use `refreshConnectAccountStatus` function to check

**Webhooks not working**:
- Verify endpoint URL is correct
- Check webhook signing secret matches
- Test endpoint with Stripe CLI: `stripe listen --forward-to localhost:5001/...`

**Payments failing**:
- Check connected account has "charges_enabled: true"
- Verify bank account is connected
- Check for any Stripe account restrictions

---

## Support Resources

- **Stripe Connect Docs**: https://stripe.com/docs/connect
- **Express Accounts**: https://stripe.com/docs/connect/express-accounts
- **Testing**: https://stripe.com/docs/connect/testing
- **Stripe Support**: https://support.stripe.com

---

## Quick Commands Reference

```bash
# Check current config
firebase functions:config:get

# Set live keys
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  stripe.webhook_secret="whsec_..."

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log

# Test webhook locally
stripe listen --forward-to http://localhost:5001/polyface-ae6d3/us-central1/stripeWebhook
```

---

## Migration Checklist

When switching from test to production:

1. **Backup data**: Export test data if needed
2. **Update keys**: In .env and Firebase config
3. **Redeploy**: Firebase functions
4. **Delete test accounts**: Remove test organizations
5. **Create fresh**: New organizations in production mode
6. **Test thoroughly**: Complete payment flow
7. **Monitor**: Check logs and Stripe dashboard
8. **Announce**: Let users know you're live!

---

**Last Updated**: January 13, 2026
**Status**: Ready for production setup
