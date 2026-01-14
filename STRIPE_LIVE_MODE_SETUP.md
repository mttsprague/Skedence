# Stripe Live Mode Setup Guide

## ⚠️ IMPORTANT: Use Live Mode for Real Payments

Your app is configured to accept **real payments** from clients. Make sure you're using **live mode** Stripe keys, not test mode.

## How to Tell Which Mode You're In

### Test Mode Keys (DON'T USE IN PRODUCTION)
- Secret Key: `sk_test_...`
- Publishable Key: `pk_test_...`
- ❌ No real money, just testing

### Live Mode Keys (USE FOR PRODUCTION)
- Secret Key: `sk_live_...`
- Publishable Key: `pk_live_...`
- ✅ Real payments, real bank transfers

## Step-by-Step: Configure Live Mode

### 1. Get Your Live Mode Keys from Stripe

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **IMPORTANT**: Toggle OFF "Test mode" in the top right corner
   - Should say "LIVE" or show you're in production mode
3. Go to **Developers** → **API keys**
4. Copy your **live** keys:
   - Secret key (starts with `sk_live_...`)
   - Publishable key (starts with `pk_live_...`)

### 2. Set Backend Secret Key (Firebase Functions)

```bash
# Navigate to your functions directory
cd SkedenceAdmin/functions

# Set the live secret key in Firebase
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY_HERE"

# Deploy functions to use new key
firebase deploy --only functions
```

**Alternative: Environment Variable**
```bash
export STRIPE_SECRET_KEY="sk_live_YOUR_SECRET_KEY_HERE"
```

### 3. Set iOS App Publishable Key

In your iOS app code, make sure `StripeConfig.swift` or similar uses your live publishable key:

```swift
// Use LIVE key for production
let publishableKey = "pk_live_YOUR_PUBLISHABLE_KEY_HERE"
```

### 4. Verify Live Mode is Active

After deployment:
1. Open your admin app
2. Go to Stripe Settings
3. Click "Connect Your Stripe Account"
4. **The Stripe page should NOT say "Test Mode"**
5. When you connect, it should be your real Stripe account

## What Happens in Live Mode

✅ **Business Owners:**
- Can sign in to their existing Stripe account OR create new one
- Connect their real bank account
- Receive real payments from clients

✅ **Clients:**
- Make real credit card payments
- Money goes directly to business owner's bank account
- Payments are processed securely by Stripe

## Testing Live Mode

Before going fully live:
1. Use a real credit card with a small amount ($1)
2. Verify payment shows in Stripe Dashboard (live mode)
3. Verify money appears in bank account (can take 2-7 days)
4. Then enable for all users

## Common Issues

### "It still says test mode"
- Double-check you copied the `sk_live_...` key, not `sk_test_...`
- Verify Firebase Functions config: `firebase functions:config:get`
- Redeploy functions after changing config

### "Connected accounts are test accounts"
- This means your secret key is still in test mode
- Update to live mode key and redeploy

### "Bank transfers aren't working"
- Make sure business owner completed full Stripe onboarding
- Verify identity and bank account in Stripe Dashboard
- Check Stripe Dashboard → Connect → Accounts for status

## Security Notes

🔒 **Never commit live keys to git**
🔒 **Keep secret keys SECRET** - never expose in client code
🔒 **Only use publishable keys** in iOS app
🔒 **Rotate keys** if ever compromised

## Need Help?

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Dashboard](https://dashboard.stripe.com)
- Check Firebase Functions logs: `firebase functions:log`
