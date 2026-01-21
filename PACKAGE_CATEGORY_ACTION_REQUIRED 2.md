# Package Category Fix - Action Required

## Problem Identified

The debug output shows:
```
🎨 Package: Class Pass, category: pass, type: class
```

The "Class Pass" package has:
- ❌ **category: pass** (WRONG - should be `classPass`)
- ✅ **type: class** (Correct)

This is why both packages show **blue** instead of the class package showing **orange**.

## Root Cause

The client app's Admin Panel was **missing the Package Category selector**. When you created or edited packages in the client app, there was no way to set whether it's a "Pass" (for lessons) or "Class" (for classes). The admin app (SkedenceAdmin) had this UI, but the client app didn't.

## What I Fixed

Added the Package Category selector to the client app's Admin Panel pricing editor:

**Before** (client app):
- Title
- Type (use_underscores)
- Price

**After** (client app - now matches admin app):
- Title
- Description
- **Package Type selector (Pass / Class)** ⭐ NEW
- Type (use_underscores)
- Price

## What You Need To Do

### Step 1: Update Your App
1. Pull latest code (commit 52ca129)
2. Build and run the client app
3. Sign in as admin

### Step 2: Fix the Package Category
1. Go to **Admin Panel** (👤 Profile → Admin access)
2. Tap **Pricing** tab (last tab)
3. Find your "Class Pass" package
4. You'll now see **"Package Type *"** section with two options:
   - ⚪ Pass
   - ⚪ Class
5. **Select "Class"** for your Class Pass package
6. Verify "1 athlete private" has **"Pass"** selected
7. Tap **"Save Pricing Structure"**

### Step 3: Verify Colors
1. Close and reopen the app (or kill and restart)
2. Go to Profile → Wallet tab
3. You should now see:
   - **"1 athlete private"** → Blue gradient ✅
   - **"Class Pass"** → Orange gradient ✅

---

## Technical Details

### What packageCategory Does

```swift
enum PackageCategory: String, Codable {
    case pass = "pass"      // For private lessons with trainers
    case classPass = "class" // For group classes
}
```

**In ProfileView**:
```swift
let gradientColor = category == .classPass ? AppTheme.secondary : AppTheme.primary
// .classPass → Orange (#F27121)
// .pass → Blue (#3258A3)
```

**In Cloud Function**:
- Validates that lesson packages have `packageCategory == "pass"`
- Validates that class registrations use `packageCategory == "class"`

### Why This Happened

1. When the `packageCategory` field was added to `PackageOption`, the UI was only added to the admin app
2. The client app's admin panel still had the old UI without the category selector
3. When packages were created/edited in the client app, `packageCategory` defaulted to `.pass`
4. The encoder fix (commit 9ca107c) now properly saves `packageCategory`, but the VALUE was wrong

### Files Changed

**Commit 52ca129**:
- `Skedence/Skedence/AdminPanelView.swift`
  - Added `PackageCategory` selector UI to `packageRow()`
  - Added description TextEditor field
  - Now matches admin app's interface

---

## Expected Behavior After Fix

### When Creating New Package:
1. Open Admin Panel → Pricing
2. Add new package
3. **Select category**: Pass or Class
4. Fill in title, description, type, price
5. Save
6. Package will have correct `packageCategory` in Firestore

### When Editing Existing Package:
1. Open Admin Panel → Pricing
2. Edit package
3. **Change category** if needed (Pass ↔ Class)
4. Save
5. Firestore will update with new `packageCategory`

### Color Logic:
- **Pass packages** (for private lessons):
  - ProfileView: **Blue** gradient (#3258A3)
  - PurchaseLessonsView: **Blue** gradient
  - Can book lessons with trainers
  
- **Class packages** (for group classes):
  - ProfileView: **Orange** gradient (#F27121)
  - PurchaseLessonsView: **Orange** gradient
  - Can register for group classes only

---

## Troubleshooting

### Still showing wrong colors after saving?

1. **Force quit the app** (swipe up in app switcher)
2. **Restart the app**
3. Check Profile → Wallet again

### Category not saving?

1. Make sure you're running latest code (commit 52ca129)
2. Check console for: `✅ Saved pricing structure with X tiers`
3. Verify the package shows correct category in the editor when you reopen it

### Debug output still shows wrong category?

Check the exact debug line:
```
🎨 Package: Class Pass, category: classPass, type: class  ← Should look like this
```

If it still shows `category: pass`, the save didn't work:
1. Try using the **SkedenceAdmin app** instead to edit pricing
2. That app already had the category selector and may work better
3. Check Firestore directly to see if `packageCategory` field exists

---

## Summary

✅ **Fixed**: Added Package Category selector to client app  
✅ **Committed**: Code pushed (commit 52ca129)  
⏳ **Action Required**: You need to edit the "Class Pass" package and set category to "Class"  
⏳ **Verification**: After saving and restarting, colors should be correct  

Once you do this, the class package will show **orange** and the private lesson package will stay **blue**! 🎨
