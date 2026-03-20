# Google Calendar Integration Setup Guide

## Overview
This guide will help you set up Google Calendar OAuth credentials for the Import Schedule feature.

---

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**  
   https://console.cloud.google.com

2. **Select your Firebase project** (polyface-ae6d3)  
   - Click the project dropdown at the top
   - Select "polyface-ae6d3" from the list
   - If it doesn't exist, it should already be created by Firebase

---

## Step 2: Enable Google Calendar API

1. **Navigate to APIs & Services**  
   - In the left sidebar, click "APIs & Services" → "Library"

2. **Search for Google Calendar API**  
   - Type "Google Calendar API" in the search box
   - Click on "Google Calendar API" result

3. **Enable the API**  
   - Click the blue "Enable" button
   - Wait for it to activate (takes a few seconds)

---

## Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth consent screen**  
   - In the left sidebar, click "OAuth consent screen"

2. **Choose User Type**  
   - Select **"External"** (allows any Google account)
   - Click "Create"

3. **Fill in App Information**  
   ```
   App name: Skedence Admin Portal
   User support email: support@skedence.com (or your email)
   App logo: (Optional - upload Skedence logo)
   
   Application home page: https://skedence.com
   Application privacy policy: https://skedence.com/privacy
   Application terms of service: https://skedence.com/terms
   
   Authorized domains:
   - skedence.com
   
   Developer contact: support@skedence.com (or your email)
   ```

4. **Scopes**  
   - Click "Add or Remove Scopes"
   - Search for: `https://www.googleapis.com/auth/calendar.readonly`
   - Check the box next to it
   - Click "Update"

5. **Test Users** (Optional for now)  
   - Can add test users if needed
   - Click "Save and Continue"

6. **Summary**  
   - Review and click "Back to Dashboard"

---

## Step 4: Create OAuth 2.0 Credentials

1. **Navigate to Credentials**  
   - In the left sidebar, click "Credentials"

2. **Create Credentials**  
   - Click "+ CREATE CREDENTIALS" at the top
   - Select "OAuth client ID"

3. **Application Type**  
   - Select "Web application"

4. **Configure the OAuth Client**  
   ```
   Name: Skedence Admin Portal - Import Calendar
   
   Authorized JavaScript origins:
   - https://skedence.com
   - https://polyface-ae6d3.web.app
   - https://skedence.web.app
   - http://localhost:3000 (for local testing)
   
   Authorized redirect URIs:
   - https://skedence.com/import-schedule/callback
   - https://polyface-ae6d3.web.app/import-schedule/callback
   - http://localhost:3000/import-schedule/callback
   ```

5. **Create**  
   - Click "Create"
   - You'll see a popup with your credentials

6. **Save Your Credentials**  
   - **Client ID**: Copy this (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-xxxxx`)
   - Click "OK"
   - You can always retrieve these later from the Credentials page

---

## Step 5: Set Firebase Environment Variables

### Option A: Using Firebase CLI (Recommended)

```bash
# Navigate to functions directory
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"

# Set environment variables
firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_ID
# Paste your Client ID when prompted

firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_SECRET
# Paste your Client Secret when prompted

firebase functions:secrets:set GOOGLE_CALENDAR_REDIRECT_URI
# Enter: https://skedence.com/import-schedule/callback
```

### Option B: Using .env file (Local Development)

Create/update: `SkedenceAdmin/functions/.env`

```env
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=https://skedence.com/import-schedule/callback
```

**⚠️ IMPORTANT:** Never commit `.env` file to git! It's already in `.gitignore`.

---

## Step 6: Redeploy Cloud Functions

```bash
# Build and deploy
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
npm run build
firebase deploy --only functions:initGoogleCalendarAuth,functions:completeGoogleCalendarAuth,functions:syncGoogleCalendar
```

---

## Step 7: Test the Integration

1. **Go to Admin Portal**  
   https://skedence.com/import-schedule

2. **Click "Add Calendar"**  
   - Should show the connection modal

3. **Click "Connect Google"**  
   - Opens Google OAuth consent screen
   - Sign in with a Google account
   - Grant calendar read permissions

4. **Authorize**  
   - Should redirect back to your admin portal
   - Calendar should appear in the list
   - Events should start syncing

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Check that the redirect URI in Google Cloud Console exactly matches:  
  `https://skedence.com/import-schedule/callback`
- Make sure there are no trailing slashes or typos

### Error: "Access blocked: This app isn't verified"
- This is normal for new apps
- Click "Advanced" → "Go to Skedence Admin Portal (unsafe)"
- Only affects you during testing
- Submit app for verification once ready for production

### Error: "Invalid client"
- Double-check your Client ID and Client Secret
- Make sure they're set correctly in Firebase secrets
- Redeploy functions after setting secrets

### Events not syncing
- Check Cloud Function logs: https://console.firebase.google.com/project/polyface-ae6d3/functions
- Verify the scheduled function is running (every 15 minutes)
- Manually trigger sync with "Sync All" button in the UI

---

## Production Checklist

Before launching to customers:

- [ ] OAuth consent screen configured with correct branding
- [ ] Privacy policy and terms of service links valid
- [ ] Authorized domains include skedence.com
- [ ] Credentials created with production redirect URIs
- [ ] Environment variables set in Firebase (production)
- [ ] Cloud Functions deployed with correct config
- [ ] Test with at least 2 different Google accounts
- [ ] Verify auto-sync works (wait 15 minutes between syncs)
- [ ] Test token refresh (wait for tokens to expire ~1 hour)
- [ ] Consider submitting app for Google verification (removes warning)

---

## Security Notes

✅ **What's secure:**
- Tokens stored in Firestore (server-side only)
- Read-only calendar access
- Admin-only feature (role-based access)
- Tokens auto-refresh before expiry

⚠️ **Important:**
- Never commit `.env` files to git
- Never share Client Secret publicly
- Use Firebase Secrets for production
- Regularly audit connected calendars

---

## Support

If you run into issues:
1. Check Cloud Function logs in Firebase Console
2. Verify environment variables are set correctly
3. Test OAuth flow in incognito/private window
4. Check Google Cloud Console for API quotas

---

**Last Updated:** March 20, 2026  
**Feature:** Import Schedule - Google Calendar Integration  
**Status:** Ready for OAuth setup
