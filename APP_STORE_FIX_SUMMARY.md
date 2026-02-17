# App Store Rejection Fix - Summary

**Date:** February 17, 2026  
**Issue:** Guideline 2.3.2 (Promotional Images) + 3.1.2 (EULA)  
**Status:** ✅ Ready to Fix

---

## 🎯 What I Created For You

### 1. ✅ Subscription Promotional Images (1024x1024px)
**Location:** `/AppLogos/SubscriptionPromos/`

- `starter_promo.png` - Blue theme, clean, NO PRICES
- `studio_promo.png` - Purple theme, clean, NO PRICES  
- `academy_promo.png` - Pink theme, clean, NO PRICES
- `enterprise_promo.png` - Amber theme, clean, NO PRICES

**Features:**
✓ Large, easy-to-read text (80pt titles)
✓ No price references (App Store requirement)
✓ Feature-focused content
✓ Professional design
✓ 1024x1024px (exact App Store spec)

### 2. ✅ Legal Pages Deployed
**Location:** `/skedence-unified/public/`

- `privacy.html` - Privacy Policy
- `terms.html` - Terms of Service
- `support.html` - Support page

**These will be live at:**
- https://skedence.com/privacy.html
- https://skedence.com/terms.html
- https://skedence.com/support.html

**(After you deploy - see step 3 below)**

### 3. 📖 Documentation Created

- `APP_STORE_SUBMISSION_FIX.md` - Detailed explanation of all issues
- `APP_STORE_QUICK_REFERENCE.md` - Copy-paste ready text for App Store Connect
- `Scripts/generate_subscription_promos.py` - Image generation script (for future use)

---

## 🚀 Next Steps (In Order)

### STEP 1: Deploy Legal Pages (5 minutes)
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified"
npm run build
firebase deploy --only hosting
```

**THEN VERIFY URLS WORK:**
- Open https://skedence.com/privacy.html in browser
- Open https://skedence.com/terms.html in browser
- Open https://skedence.com/support.html in browser

### STEP 2: Update App Store Connect (30 minutes)

**For Each Subscription (Starter, Studio, Academy, Enterprise):**
1. Upload new promotional image (from AppLogos/SubscriptionPromos/)
2. Update Display Name (remove prices)
3. Update Description (remove prices)
4. Save changes

**In App Information:**
1. Select "Use Apple's Standard EULA"
2. Set Privacy Policy URL: https://skedence.com/privacy.html

**In App Description:**
1. Add subscription terms section at bottom (see APP_STORE_QUICK_REFERENCE.md)

### STEP 3: Reply & Resubmit (5 minutes)
1. Reply to App Review explaining changes (template in APP_STORE_QUICK_REFERENCE.md)
2. Click "Submit for Review"

---

## 📊 What Changed

### Before (Rejected) → After (Compliant)

**Promotional Images:**
- ❌ Included price text → ✅ Feature-focused, no prices
- ❌ Small, hard to read text → ✅ Large 80pt titles
- ❌ Unclear messaging → ✅ Clear tier benefits

**Metadata:**
- ❌ Prices in display names → ✅ Clean plan names
- ❌ Prices in descriptions → ✅ Feature descriptions

**EULA:**
- ❌ No EULA specified → ✅ Apple's Standard EULA
- ❌ Missing in app description → ✅ Full subscription terms
- ❌ Non-functional links → ✅ Live, functional URLs

---

## ❓ Your Question: Apple's EULA or Custom?

**ANSWER: Use Apple's Standard EULA** ✅

**Why?**
1. ✅ FREE - No lawyer fees ($2K-$5K saved)
2. ✅ FAST - Reviewers know it well
3. ✅ SAFE - Apple's legal team wrote it
4. ✅ MAINTAINED - Apple updates it automatically
5. ✅ GLOBAL - Auto-translated to all territories

**Custom EULA would require:**
- ❌ Lawyer review ($2,000-$5,000)
- ❌ Regular updates as laws change
- ❌ Your liability for any gaps
- ❌ Translation to all App Store territories
- ❌ More scrutiny from App Review

**Unless you have specific terms that Apple's EULA doesn't cover, use theirs!**

---

## 🎨 Preview Your Images

Open these files to see what you're uploading:
```
AppLogos/SubscriptionPromos/starter_promo.png
AppLogos/SubscriptionPromos/studio_promo.png
AppLogos/SubscriptionPromos/academy_promo.png
AppLogos/SubscriptionPromos/enterprise_promo.png
```

**They should look like:**
- Big colored header bar with tier name in white
- Tagline below
- Four features with checkmarks
- Clean, professional design
- NO PRICES ANYWHERE

---

## 📞 If You Hit Issues

### URLs Don't Work After Deploy?
**Check Firebase.json rewrites** - static HTML files should be in `public/` folder

### App Review Still Rejects?
**Request phone call** - Available in App Store Connect
- 3-5 business days wait
- Free service
- Can clarify exactly what they need

### Image Size Wrong?
**Re-run generator:**
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/Scripts"
python3 generate_subscription_promos.py
```

---

## ⏱️ Timeline

- **Fix & Deploy:** 1 hour (you)
- **App Review:** 24-48 hours (Apple)
- **Total:** 1-3 days until approved

---

## ✅ Success Criteria

You'll know you're ready to resubmit when:

- [ ] All 3 URLs work in browser
- [ ] All 4 promotional images uploaded
- [ ] All 4 display names have NO prices
- [ ] All 4 descriptions have NO prices
- [ ] "Use Apple's Standard EULA" is checked
- [ ] Subscription terms added to app description
- [ ] Privacy Policy URL is set
- [ ] Reply to App Review sent
---

**You're ready to fix this! All assets are prepared. Just follow the steps above.** 🚀

**Questions? Check:**
- `APP_STORE_QUICK_REFERENCE.md` for exact text to copy-paste
- `APP_STORE_SUBMISSION_FIX.md` for detailed explanations
