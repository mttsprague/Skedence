# App Store Connect - App Description Update

## ✅ FIXED IN iOS APP

I've added the required legal links to your **InAppSubscriptionView.swift** with:
- ✅ Privacy Policy link (https://skedence.com/privacy.html)
- ✅ Terms of Use link (Apple's Standard EULA)
- ✅ Support link (https://skedence.com/support.html)
- ✅ Auto-renewal disclosure text

**Location:** `SkedenceAdmin/Features/Billing/InAppSubscriptionView.swift`

---

## 📝 REQUIRED: Add This to Your App Store Description

Since you selected **"Use Apple's Standard EULA"** in App Store Connect, you MUST include a link to it in your **App Description**.

### Copy and Paste This Text

Add this section **at the very bottom** of your App Description in App Store Connect:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBSCRIPTION INFORMATION

Skedence offers auto-renewable monthly subscriptions with a 14-day free trial:

• Starter Plan - Perfect for solo coaches
• Studio Plan - Built for growing teams  
• Academy Plan - Scale your business
• Enterprise Plan - Maximum performance

Your subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal in your Account Settings after purchase.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://skedence.com/privacy.html
Support: https://skedence.com/support.html
```

---

## 📋 Step-by-Step Instructions

### 1. Open App Store Connect
Go to: https://appstoreconnect.apple.com

### 2. Navigate to Your App
1. Click on "My Apps"
2. Select "SkedenceAdmin" (or your admin app)
3. Go to the version that was rejected

### 3. Edit App Description
1. Scroll to "Description" field
2. Scroll to the **BOTTOM** of your current description
3. Add a blank line
4. **Paste the subscription information text above**
5. Click "Save"

### 4. Verify Legal Links in App Store Connect

Make sure these fields are filled:

**Privacy Policy URL:**
```
https://skedence.com/privacy.html
```

**License Agreement:**
- ✅ Select: "Use Apple's Standard EULA"

### 5. Reply to App Review

Click "Reply in App Store Connect" and send:

```
Hello,

Thank you for your feedback. I have made the following changes:

✅ ADDED TO APP:
- Privacy Policy link (https://skedence.com/privacy.html)
- Terms of Use link (Apple's Standard EULA)
- Support link (https://skedence.com/support.html)
- Auto-renewal disclosure text

✅ ADDED TO APP DESCRIPTION:
- Link to Apple's Standard EULA as required
- Complete subscription information section

All subscription screens in the app now display:
• Subscription title (e.g., "Starter Plan")
• Length of subscription ("Monthly")
• Price (displayed via StoreKit)
• Functional links to Privacy Policy and Terms of Use

App Description now includes the required EULA link at the bottom.

Thank you,
[Your Name]
```

### 6. Build and Submit New Version

**IMPORTANT:** You need to submit a new build with the updated code.

1. **In Xcode:**
   - Open `SkedenceAdmin.xcodeproj`
   - Increment Build Number: Product → Archive
   - Archive and upload to App Store Connect

2. **In App Store Connect:**
   - Select the new build
   - Submit for review

---

## ✅ What's Now Compliant

### In Your iOS App:
- ✅ Subscription titles displayed (Starter, Studio, Academy, Enterprise)
- ✅ Subscription length shown (Monthly)
- ✅ Prices shown (via StoreKit from App Store)
- ✅ **NEW:** Privacy Policy link → https://skedence.com/privacy.html
- ✅ **NEW:** Terms of Use link → https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- ✅ **NEW:** Support link → https://skedence.com/support.html
- ✅ **NEW:** Auto-renewal disclosure text

### In App Store Connect:
- ✅ Privacy Policy URL set
- ✅ Apple's Standard EULA selected
- ✅ **NEW:** EULA link in App Description (you need to add this)

---

## 🚨 Critical Reminders

1. **Build New Version:** The code changes require a new build to be submitted
2. **Update Description:** Add the subscription section to your App Description
3. **Test Links:** Make sure all 3 URLs work before submitting:
   - https://skedence.com/privacy.html ✅
   - https://skedence.com/support.html ✅
   - https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ ✅

4. **Deployment Required:** Deploy your website updates first (already done)
5. **Screenshot Opportunity:** You may want to update screenshots to show the new legal links

---

## 📱 What Users Will See

At the bottom of your subscription screen, users will now see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All subscriptions auto-renew unless canceled at least 24 hours 
before the end of the current period. Your account will be 
charged for renewal within 24 hours prior to the end of the 
current period. You can manage your subscription and turn off 
auto-renewal in your App Store Account Settings after purchase.

Privacy Policy  •  Terms of Use  •  Support
   (blue links - tappable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 Why This Fixes the Rejection

**Guideline 3.1.2 Requirements:**

| Requirement | Status |
|-------------|--------|
| Title of subscription in app | ✅ Already had |
| Length of subscription in app | ✅ Already had |
| Price of subscription in app | ✅ Already had |
| **Privacy Policy link in app** | ✅ **FIXED** |
| **Terms of Use link in app** | ✅ **FIXED** |
| Privacy Policy in App Store Connect | ✅ Already had |
| **EULA link in App Description** | ⚠️ **YOU MUST ADD** |

---

## ⏱️ Timeline

1. **Add description text:** 5 minutes
2. **Build & upload new version:** 20 minutes  
3. **App Review:** 24-48 hours
4. **Total:** 1-3 days until approved

---

Need help? Check the screenshot in the rejection email to see exactly what Apple is looking for.
