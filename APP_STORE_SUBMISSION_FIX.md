# App Store Submission - Subscription EULA & Compliance

## Issue #3: Missing EULA Requirements (Guideline 3.1.2)

Apple requires specific information for apps with auto-renewable subscriptions:

### ✅ Required in the App (Already Compliant?)
Your app needs to display:
- Title of subscription (e.g., "Starter Plan")
- Length of subscription (e.g., "Monthly")
- Price of subscription
- **Functional links to Privacy Policy**
- **Functional links to Terms of Use (EULA)**

### ✅ Required in App Store Connect
- Privacy Policy URL (in the dedicated field)
- Terms of Use (EULA) - either link in description OR upload custom EULA

---

## 🎯 RECOMMENDATION: Use Apple's Standard EULA

**Why?**
1. **Less Legal Liability** - Apple's legal team drafted it
2. **Faster Approval** - Reviewers are familiar with it
3. **Auto-Updates** - Apple handles changes
4. **International Support** - Automatically translated
5. **Less Maintenance** - No need to update your own legal docs

**Why NOT to use custom EULA?**
- Requires lawyer review ($$$)
- Must cover all App Store territories
- You're liable for any gaps
- Needs regular updates as laws change

---

## 📋 How to Fix This Rejection

### Option 1: Use Apple's Standard EULA (RECOMMENDED)

**In App Store Connect:**
1. Go to App Information
2. Scroll to "License Agreement" section
3. Select "Use Apple's Standard EULA"
4. In your App Description, add this text at the bottom:

```
SUBSCRIPTION TERMS

Auto-renewable subscriptions available:
• Starter - $29/month
• Studio - $99/month
• Academy - $249/month
• Enterprise - $499/month

All subscriptions include a 14-day free trial. Payment will be charged to your iTunes Account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal in your Account Settings after purchase.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://skedence.com/privacy-policy
Support: https://skedence.com/support
```

**In Your iOS App:**
Add links to subscription management screen (if not already there):

```swift
// In your subscription/onboarding view
Link("Terms of Use", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
Link("Privacy Policy", destination: URL(string: "https://skedence.com/privacy-policy")!)
```

---

### Option 2: Create Custom EULA (NOT RECOMMENDED)

If you MUST use custom terms:

**Requirements:**
1. Must be reviewed by a lawyer
2. Must cover:
   - Subscription terms
   - Auto-renewal policy
   - Cancellation policy
   - Refund policy
   - Payment terms
   - Dispute resolution
   - Liability limitations
   - Data collection/usage
3. Must be uploaded to App Store Connect (EULA field)
4. Must have functional link in app

**Cost:** $2,000-$5,000 for lawyer review

---

## 🔗 What URLs You Need

### 1. Terms of Use (EULA)
**If using Apple's Standard:** `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
**If custom:** `https://skedence.com/terms` (you already have this)

### 2. Privacy Policy
**Current URL:** `https://skedence.com/privacy-policy` or use your existing terms.html

**Check if it exists:**
- `https://skedence.com/privacy-policy` (may need to create redirect)
- Or deploy static page to Firebase Hosting

---

## ✅ Action Items (Use Apple's Standard EULA)

### Step 1: Update App Store Connect
- [ ] Select "Use Apple's Standard EULA" in License Agreement section
- [ ] Add subscription terms paragraph to App Description (see above)
- [ ] Verify Privacy Policy URL field has: `https://skedence.com/privacy-policy`

### Step 2: Update iOS App (if needed)
Add to subscription/settings screen:
```swift
Section("Legal") {
    Link("Terms of Use", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
    Link("Privacy Policy", destination: URL(string: "https://skedence.com/privacy-policy")!)
    Link("Support", destination: URL(string: "https://skedence.com/support")!)
}
```

### Step 3: Update Subscription Promotional Images
- [ ] Upload new images from `/AppLogos/SubscriptionPromos/`
- [ ] Remove price references from display names
- [ ] Update descriptions to be feature-focused

### Step 4: Resubmit
- [ ] Verify all changes
- [ ] Reply to App Review in App Store Connect
- [ ] Explain changes made
- [ ] Resubmit for review

---

## 📱 Subscription Display in App

**Make sure your app shows this info on subscription screen:**

```
STARTER PLAN
$29/month

✓ 1 Location
✓ Unlimited Clients
✓ Basic Scheduling
✓ Payment Processing

14-Day Free Trial
Cancel Anytime

[Subscribe] [Terms] [Privacy Policy]

Subscription renews automatically unless canceled at least 24 hours before the end of the current period.
```

---

## 🚨 What NOT to Do

❌ Don't include prices in promotional image itself
❌ Don't use tiny text on promotional images
❌ Don't link to non-functional URLs
❌ Don't forget to update Privacy Policy URL if domain changed
❌ Don't create custom EULA without lawyer review

---

## 📞 If You Get Stuck

**Request App Review Phone Call:**
- Available in App Store Connect
- Within 3-5 business days
- Can clarify requirements
- Free service

**Or use "Reply in App Store Connect":**
- Ask specific questions
- Usually responds in 1-2 days

---

## Final Checklist

- [x] Generated promotional images (1024x1024px, no prices, large text)
- [ ] Uploaded new promotional images to App Store Connect
- [ ] Updated display names (max 30 chars, no prices)
- [ ] Updated descriptions (max 45 chars, no prices)
- [ ] Selected "Apple's Standard EULA" in App Store Connect
- [ ] Added subscription terms to App Description
- [ ] Verified Privacy Policy URL works
- [ ] Added Terms/Privacy links in app (if not already there)
- [ ] Tested all links are functional
- [ ] Replied to App Review explaining changes
- [ ] Resubmitted for review

**Estimated Fix Time:** 1-2 hours
**Estimated Re-Review Time:** 24-48 hours
