# App Store Connect - Quick Reference Guide

## 📝 Subscription Display Names & Descriptions

**CRITICAL:** NO PRICES in display names or descriptions!

### Starter Plan
- **Display Name (30 char max):** `Starter Plan`
- **Description (45 char max):** `Perfect for solo coaches`
- **Promotional Image:** `AppLogos/SubscriptionPromos/starter_promo.png`

### Studio Plan  
- **Display Name (30 char max):** `Studio Plan`
- **Description (45 char max):** `Built for growing teams`
- **Promotional Image:** `AppLogos/SubscriptionPromos/studio_promo.png`

### Academy Plan
- **Display Name (30 char max):** `Academy Plan`
- **Description (45 char max):** `Scale your business`
- **Promotional Image:** `AppLogos/SubscriptionPromos/academy_promo.png`

### Enterprise Plan
- **Display Name (30 char max):** `Enterprise Plan`
- **Description (45 char max):** `Maximum performance & support`
- **Promotional Image:** `AppLogos/SubscriptionPromos/enterprise_promo.png`

---

## 📄 App Description Addition

**Add this to the BOTTOM of your App Description in App Store Connect:**

```
SUBSCRIPTION TERMS

Auto-renewable subscriptions available with 14-day free trial:
• Starter - $29/month - Perfect for solo coaches
• Studio - $99/month - Built for growing teams
• Academy - $249/month - Scale your business
• Enterprise - $499/month - Maximum performance

Payment will be charged to your iTunes Account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal in your Account Settings after purchase.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://skedence.com/privacy.html
Support: https://skedence.com/support.html
```

---

## 🔗 Required URLs

### Privacy Policy URL (in dedicated field)
```
https://skedence.com/privacy.html
```

### Terms of Use (EULA)
**Option 1 (RECOMMENDED):** Select "Use Apple's Standard EULA" checkbox in App Store Connect

**Option 2 (if you must use custom):**
```
https://skedence.com/terms.html
```

### Support URL
```
https://skedence.com/support.html
```

---

## 📋 Step-by-Step in App Store Connect

### 1. Update In-App Purchases
For EACH subscription (Starter, Studio, Academy, Enterprise):

1. Click on the subscription
2. **Promotional Image:**
   - Click "Add Promotional Image"
   - Upload corresponding `_promo.png` file
   - **DO NOT** add price text overlay
3. **Display Name:**
   - Update to display name from above (e.g., "Starter Plan")
   - Remove any $ or price references
4. **Description:**
   - Update to description from above
   - Remove any $ or price references  
5. Click "Save"

### 2. Update App Information

1. Go to "App Information" section
2. **License Agreement:**
   - Select radio button: "Use Apple's Standard EULA"
   - Save
3. **Privacy Policy URL:**
   - Enter: `https://skedence.com/privacy.html`
   - Save

### 3. Update App Description

1. Go to version that was rejected
2. Scroll to "Description" field
3. Scroll to the BOTTOM of your current description
4. Add the "SUBSCRIPTION TERMS" section from above
5. Save

### 4. Reply to App Review

Click "Reply in App Store Connect" and send this message:

```
Hello,

Thank you for the detailed feedback. I have made the following changes to address all three issues:

GUIDELINE 2.3.2 - PROMOTIONAL IMAGES:
✅ Replaced all promotional images with new 1024x1024px versions
✅ Removed all price references from promotional images
✅ Increased text size significantly for better readability
✅ Updated display names to remove prices
✅ Updated descriptions to remove prices and focus on features

GUIDELINE 3.1.2 - EULA & SUBSCRIPTION INFO:
✅ Selected "Use Apple's Standard EULA" in License Agreement section
✅ Added subscription terms section to App Description with functional links
✅ Verified Privacy Policy URL: https://skedence.com/privacy.html
✅ Verified Support URL: https://skedence.com/support.html
✅ All links are functional and properly formatted

All promotional images now:
• Use 1024x1024px format per Apple specs
• Contain large, easy-to-read text
• Focus on features, not pricing
• Accurately represent each subscription tier

The app description now includes all required subscription information, including subscription length, auto-renewal terms, and functional links to Terms of Use and Privacy Policy.

Please let me know if you need any additional information or clarification.

Thank you,
[Your Name]
```

### 5. Resubmit for Review

1. Click "Submit for Review"
2. Confirm submission

---

## ⚠️ Before You Deploy

You need to deploy the updated legal pages:

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified"
npm run build
firebase deploy --only hosting
```

This will make these URLs live:
- https://skedence.com/privacy.html
- https://skedence.com/terms.html
- https://skedence.com/support.html

---

## ✅ Final Checklist

### Before Resubmission:
- [ ] Deploy legal pages to Firebase Hosting (see command above)
- [ ] Verify all 3 URLs work in browser:
  - [ ] https://skedence.com/privacy.html
  - [ ] https://skedence.com/terms.html
  - [ ] https://skedence.com/support.html

### In App Store Connect:
- [ ] Updated all 4 promotional images (removed prices, large text)
- [ ] Updated all 4 display names (removed prices)
- [ ] Updated all 4 descriptions (removed prices)
- [ ] Selected "Use Apple's Standard EULA"  
- [ ] Added subscription terms to App Description
- [ ] Set Privacy Policy URL
- [ ] Replied to App Review with explanation
- [ ] Resubmitted for review

### Verification:
- [ ] All promotional images show large, readable text
- [ ] No prices anywhere in promotional image files
- [ ] No prices in display names or descriptions
- [ ] All URLs are functional
- [ ] App description includes subscription terms

---

**Estimated Time:** 30-45 minutes to complete all updates
**Expected Re-Review:** 24-48 hours after resubmission
