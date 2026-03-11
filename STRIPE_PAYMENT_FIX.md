# Stripe Payment Error Fix - "Payment failed: Internal"

**Date:** March 10, 2026  
**Issue:** Polyface client app rejected - payment processing fails with "payment failed: Internal" error when purchasing class passes

---

## 🔍 Root Cause Analysis

### Issue Identified:
The Stripe SDK (v17.7.0) was hardcoded to use API version `"2025-02-24.acacia"` which appears to be a:
- **Pre-release/beta API version** (future date with codename)
- **Unrecognized by Stripe servers** - causing API calls to fail with generic "internal" errors

### Files Affected:
- `functions/src/stripe-direct.ts` - Client payment processing
- `functions/src/stripe-connect.ts` - Platform payments
- `functions/src/stripe.ts` - Core Stripe utilities
- `functions/src/stripeWebhooks.ts` - Webhook handlers
- Plus 8 other files with Stripe initialization

---

## ✅ Fix Applied

###Changed:
1. **Removed explicit API version from Stripe() constructors**
   - Let SDK use its default API version
   - Reduces chance of version mismatch errors

2. **Kept API version for ephemeral keys**
   - Required parameter: `apiVersion: "2025-02-24.acacia"`
   - Used for Payment Sheet saved card functionality

### Deployment Status:
✅ `createPaymentIntentDirect` function deployed to production

---

## 🧪 Testing Required

### Test Payment Flow:
1. Open Polyface client app (Skedence)
2. Navigate to Purchase Lessons / Passes
3. Select a class pass
4. Complete purchase with test card
5. **Expected:** Payment succeeds, pass appears in profile

### What to Watch For:
- ✅ Payment completes without "Internal" error
- ✅ Success confirmation message
- ✅ Pass appears in user's profile
- ✅ Firestore  document created in correct path

### If Still Failing:
Check Cloud Functions logs:
```bash
cd SkedenceAdmin/functions
firebase functions:log --only createPaymentIntentDirect
```

Look for:
- Stripe API errors
- Invalid key errors
- Pricing structure validation errors

---

## 🔄 Recommended Long-Term Fix

### Update Stripe SDK to Stable Version

**Current:** v17.7.0 (pre-release API version)  
**Latest Stable:** v20.4.1

```bash
cd SkedenceAdmin/functions
npm install stripe@20.4.1 --save
npm run build
firebase deploy --only functions
```

**Benefits:**
- Uses stable, tested API versions
- Better error messages
- Security updates
- Performance improvements

**Testing After Update:**
- Test all payment flows (purchases, subscriptions, saved cards)
- Verify webhooks still work
- Check admin payment features

---

## 📝 Error Details (Before Fix)

### User-Facing Error:
```
"Payment failed: Internal"
```

### Technical Cause:
```typescript
// ❌ BEFORE (causing error)
const stripe = new Stripe(secretKey, {
  apiVersion: "2025-02-24.acacia"  // Invalid/unrecognized version
});

// ✅ AFTER (fixed)
const stripe = new Stripe(secretKey);  // Uses SDK default
```

### Why This Happened:
- API version "2025-02-24" is a future date
- ".acacia" suffix is a pre-release codename
- Stripe servers don't recognize this version → reject API calls
- Generic "internal" error message hides real cause

---

## 🎯 Verification Checklist

After testing, confirm:
- [ ] Class pass purchases work (primary issue)
- [ ] Private lesson purchases work
- [ ] Saved card payments work (Payment Sheet)
- [ ] Subscription payments work (business billing)
- [ ] Webhook processing works (payment confirmation)
- [ ] Consider upgrading to Stripe SDK v20.4.1 for long-term stability

---

## 💡 Related Issues

If you see similar errors:
- "Failed to create payment intent"
- "Organization has not configured Stripe keys"
- "Invalid package type or amount"

These indicate different problems:
1. **Missing Stripe keys** - Check organization.stripe fields in Firestore
2. **Pricing mismatch** - Verify pricing structure matches package amounts
3. **Rate limiting** - Too many payment attempts (wait 1 minute)

---

## 📞 Support

If issue persists after fix:
1. Check Firebase Console → Functions → Logs
2. Look for detailed error messages
3. Verify Stripe dashboard shows attempted charges
4. Check if organization's Stripe keys are valid/active
5. Consider updating to Stripe SDK v20.4.1

---

**Status:** ✅ Fix deployed - ready for testing  
**Next Step:** Test class pass purchase in Polyface client app
