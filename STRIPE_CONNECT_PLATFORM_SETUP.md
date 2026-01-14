# Stripe Connect Platform Setup Required

## ⚠️ IMPORTANT: Complete This First!

You're getting an error because Stripe requires you to complete a platform profile questionnaire before you can create connected accounts in **live mode**.

## Error You're Seeing

```
Failed to connect stripe: internal
```

**Actual Error from Logs:**
```
You must complete your platform profile to use Connect and create live connected accounts. 
Visit your dashboard at https://dashboard.stripe.com/connect/accounts/overview to answer the questionnaire.
```

## How to Fix This

### Step 1: Go to Stripe Connect Settings

1. Open your browser and go to: [https://dashboard.stripe.com/connect/accounts/overview](https://dashboard.stripe.com/connect/accounts/overview)
2. **Make sure you're in LIVE mode** (toggle in top right should be OFF or say "LIVE")

### Step 2: Complete the Platform Profile

You'll be asked questions about your platform business model. Answer honestly:

**Example Answers for Your Coaching/Training Platform:**

1. **What does your platform do?**
   - "Connects fitness trainers/coaches with clients"
   - "Marketplace for coaching services and training sessions"

2. **Who are your connected accounts?**
   - "Independent fitness trainers and coaches"
   - "Small training businesses"

3. **How do payments work?**
   - "Clients pay trainers directly for sessions/packages"
   - "Trainers receive payments to their own bank accounts"

4. **Your role as the platform:**
   - "We provide the booking and scheduling software"
   - "We facilitate connections between trainers and clients"

5. **Application fee (if asked):**
   - You can say "No application fee" for now
   - Or specify a percentage if you plan to take a cut

### Step 3: Business Information

Stripe will ask for:
- Your business type (LLC, Corporation, Sole Prop)
- Your business address
- Tax ID (EIN or SSN)
- Website URL (if you have one)
- Estimated annual revenue
- Description of business model

### Step 4: Bank Account (For Platform Fees)

If you plan to take platform fees, you'll need to add your own bank account.

### Step 5: Submit and Wait for Approval

- Click "Submit" when done
- Stripe may review (usually instant or within 1 business day)
- You'll get an email when approved

## After Approval

Once approved:
1. Return to your SkedenceAdmin app
2. Try "Connect Your Stripe Account" again
3. It should work now!

## Why This Is Required

Stripe Connect is for **platforms** (marketplaces) that facilitate payments between multiple businesses. Stripe needs to verify:
- Your business is legitimate
- You understand your liability as a platform
- You comply with platform regulations
- You're not facilitating illegal activities

## Common Questions

**Q: Do I need a business entity?**
A: You can start as a sole proprietor, but LLC/Corp is better for liability protection.

**Q: Can I skip this?**
A: No, it's required for live mode Connect. Test mode works without it.

**Q: How long does approval take?**
A: Usually instant, sometimes up to 1 business day.

**Q: What if I make a mistake?**
A: You can update your answers later in the Stripe Dashboard.

## Next Steps

1. ✅ Complete platform profile at: https://dashboard.stripe.com/connect/accounts/overview
2. ⏳ Wait for approval (check email)
3. 🎉 Retry "Connect Your Stripe Account" in app
4. ✅ Should work now!

## Need Help?

- Stripe Connect Setup Guide: https://stripe.com/docs/connect/get-started
- Stripe Support: https://support.stripe.com
- Platform Profile FAQ: https://stripe.com/docs/connect/onboarding/platform-profile

---

**Last Updated:** January 14, 2026
**Status:** Action Required - Complete Stripe Connect Platform Profile
