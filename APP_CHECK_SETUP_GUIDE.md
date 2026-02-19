# Firebase App Check Setup Guide

**Date:** February 19, 2026  
**Project:** polyface-ae6d3  
**App ID:** 1:12415846104:ios:d6cbc4031cfe02b91d39ad

---

## 🔐 Why App Check is Important

Firebase App Check protects your Firebase resources from abuse by ensuring requests come from your authentic apps. Without it:

- ❌ Anyone can access your Firebase APIs if they know your project ID
- ❌ Malicious actors can spam your Cloud Functions
- ❌ Database abuse can rack up unexpected costs
- ❌ Rate limiting is harder to enforce

With App Check enabled:
- ✅ Only your registered apps can access Firebase resources
- ✅ Protection against automated abuse
- ✅ Better security for Cloud Functions and Firestore
- ✅ Token-based verification for every request

---

## 📱 Current Status

**Admin App (SkedenceAdmin):**
- ❌ App Check temporarily disabled (see AppDelegate.swift)
- ⚠️  App ID not registered in Firebase Console
- 🔧 Needs setup to enable protection

**Client App (Skedence):**
- Status: Check if App Check is enabled
- May need similar setup

---

## 🚀 Setup Instructions

### Step 1: Register App in Firebase Console

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/project/polyface-ae6d3/appcheck
   - Or navigate: Firebase Console → Project Settings → App Check

2. **Register the Admin App:**
   - Click "Register" next to your iOS app
   - App Bundle ID: `com.polyfacevolleyball.SkedenceAdmin` (verify in Xcode)
   - App ID: `1:12415846104:ios:d6cbc4031cfe02b91d39ad`

3. **Choose Provider:**
   - For Production: **DeviceCheck** (recommended)
   - For Debug/Development: **Debug Provider** (already configured in code)

### Step 2: Enable App Check for Services

After registering the app, enable App Check for:

**✅ Enable for these services:**
- Firestore Database
- Cloud Functions
- Firebase Authentication
- Firebase Storage (if used)

**Settings:**
- Enforcement Mode: **Enforced** (for production)
- Or use **Unenforced** initially to monitor without blocking

### Step 3: Update AppDelegate.swift

Once the app is registered in Firebase Console, uncomment App Check initialization:

**File:** `SkedenceAdmin/SkedenceAdmin/AppDelegate.swift`

```swift
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Configure Firebase FIRST
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        
        #if DEBUG
        // Use Debug Provider for development builds
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #else
        // Use DeviceCheck for production builds
        let providerFactory = AppCheckProviderFactory()
        AppCheck.setAppCheckProviderFactory(providerFactory)
        #endif
        
        return true
    }
}
```

### Step 4: Test in Debug Mode

1. **Run the app in debug mode**
2. **Check console for debug token:**
   ```
   [AppCheckCore][I-GAC004001] App Check debug token: '7A768864-4616-4EFB-9107-09BDBB6733DD'
   ```

3. **Add debug token to Firebase Console:**
   - Go to: App Check → Apps → Your App → Debug Tokens
   - Click "Add debug token"
   - Paste the token from console
   - Give it a name (e.g., "Matt's iPhone - Dev")

4. **Test sign-in and Firebase operations:**
   - Sign in should work without App Check errors
   - No more "App not registered" errors
   - Firestore queries succeed

### Step 5: Production Setup

For production builds (App Store):

1. **Enable DeviceCheck Provider:**
   - iOS automatically uses DeviceCheck on real devices
   - No additional configuration needed in Console

2. **Update build configuration:**
   ```swift
   #if DEBUG
   AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
   #else
   let providerFactory = AppCheckProviderFactory()
   AppCheck.setAppCheckProviderFactory(providerFactory)
   #endif
   ```

3. **Test with TestFlight:**
   - Build production archive
   - Upload to TestFlight
   - Test on real device
   - Verify no App Check errors in production mode

---

## 🧪 Testing Checklist

After enabling App Check:

### Debug Mode Testing
- [ ] App launches without errors
- [ ] Sign in works
- [ ] Debug token appears in console
- [ ] Add debug token to Firebase Console
- [ ] Firestore queries work
- [ ] Cloud Functions callable from app
- [ ] No "App not registered" errors

### Production Mode Testing
- [ ] Build production archive
- [ ] Upload to TestFlight
- [ ] Download on test device
- [ ] Sign in works
- [ ] All Firebase features work
- [ ] No App Check errors in logs

---

## 🔧 Troubleshooting

### Error: "App not registered"

**Symptom:**
```
Error: App not registered: 1:12415846104:ios:d6cbc4031cfe02b91d39ad
```

**Solutions:**
1. Register app in Firebase Console App Check section
2. Verify Bundle ID matches (`com.polyfacevolleyball.SkedenceAdmin`)
3. Wait 5-10 minutes for registration to propagate
4. Clean build folder in Xcode and rebuild

---

### Error: "Debug token invalid"

**Solutions:**
1. Get fresh debug token from console logs
2. Add token to Firebase Console → App Check → Debug Tokens
3. Ensure token is copied exactly (no extra spaces)
4. Token expires after 7 days - regenerate if needed

---

### Error: "Too many attempts"

**Solutions:**
1. App Check rate limiting activated
2. Wait 1 hour for rate limit to reset
3. Use debug tokens for development to avoid limits
4. In production, this protects against abuse

---

### Production Build Issues

**Symptom:** App Check works in debug but fails in production

**Solutions:**
1. Ensure DeviceCheck is enabled in Firebase Console
2. Verify app is signed with correct provisioning profile
3. Check Bundle ID matches registered app exactly
4. May take a few minutes after first install for DeviceCheck to activate

---

## 📋 Migration Path

**Current State:**
- App Check disabled in code
- Sign-in works but unprotected

**Recommended Steps:**
1. ✅ Register app in Console (5 minutes)
2. ✅ Enable App Check for services (2 minutes)
3. ✅ Uncomment App Check code (1 minute)
4. ✅ Test debug build (10 minutes)
5. ✅ Test production build in TestFlight (15 minutes)
6. ✅ Enable enforcement mode in Console (1 minute)

**Total Time:** ~35 minutes to full App Check protection

---

## 🔒 Security Impact

### Without App Check (Current):
- Anyone with Firebase config can access your database
- Cloud Functions callable by any client
- Rate limiting relies on IP addresses only
- Vulnerable to automated scraping

### With App Check (After Setup):
- Only your authentic apps can access Firebase
- Cloud Functions protected by token verification
- Per-app rate limiting
- Protection against replay attacks

**Recommendation:** Enable App Check ASAP for production security.

---

## 📞 Support

If you encounter issues:

1. **Firebase Documentation:**
   - [App Check Overview](https://firebase.google.com/docs/app-check)
   - [iOS Setup Guide](https://firebase.google.com/docs/app-check/ios/devicecheck-provider)

2. **Firebase Console:**
   - [App Check Dashboard](https://console.firebase.google.com/project/polyface-ae6d3/appcheck)

3. **Contact Support:**
   - Firebase Support (for billing/enterprise)
   - GitHub Copilot (for code implementation)

---

## ✅ Next Steps

1. **Immediate:** Register app in Firebase Console
2. **Today:** Enable debug tokens and test
3. **This Week:** Test production build in TestFlight
4. **Production:** Enable enforcement mode

Once complete, uncomment the App Check code in AppDelegate.swift and redeploy.

---

**Last Updated:** February 19, 2026  
**Status:** App Check temporarily disabled, awaiting Console setup
