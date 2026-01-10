# Email Configuration for Google Workspace

## Problem
The email extension is trying to use `smtp.skedence.com` which doesn't exist. Since your email is through Google Workspace, you need to use Gmail's SMTP servers.

## Solution: Configure Gmail SMTP

### Step 1: Generate Google App Password
1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left sidebar
3. Under "How you sign in to Google", enable **2-Step Verification** (if not already enabled)
4. After 2FA is enabled, search for "App passwords" or go to: https://myaccount.google.com/apppasswords
5. Click **Select app** → Choose "Mail"
6. Click **Select device** → Choose "Other (Custom name)" → Enter "Skedence Email"
7. Click **Generate**
8. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 2: Reconfigure Firebase Extension
Run this command in your terminal:

```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin"
firebase ext:configure firestore-send-email --project polyface-ae6d3
```

When prompted, enter these values:

- **SMTP connection URI**: `smtps://USERNAME@gmail.com:APP_PASSWORD@smtp.gmail.com:465`
  - Replace `USERNAME@gmail.com` with your actual Google Workspace email (e.g., `matt@skedence.com`)
  - Replace `APP_PASSWORD` with the 16-character password from Step 1 (remove spaces)
  - Example: `smtps://matt@skedence.com:abcdefghijklmnop@smtp.gmail.com:465`

- **Email documents collection**: `mail` (keep as is)

- **Default FROM address**: Your Google Workspace email (e.g., `noreply@skedence.com`)

- **Default REPLY-TO address**: Your support email (e.g., `support@skedence.com`)

### Step 3: Redeploy the Extension

After reconfiguring, the extension will automatically redeploy. Wait about 1-2 minutes for deployment to complete.

### Step 4: Test the Email

1. In your SkedenceAdmin app, go to the Admin tab
2. Try adding a new trainer or triggering another email
3. Check the `mail` collection in Firestore to see if the `state` changes to `SUCCESS`

## Alternative: SendGrid (Free Tier)

If you prefer not to use Gmail, you can use SendGrid's free tier (100 emails/day):

1. Sign up at https://sendgrid.com/
2. Create an API key
3. The SMTP URI format is:
   ```
   smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465
   ```

## Verification

After reconfiguring, check the Firestore `mail` collection:
- Before: `delivery.error` shows "getaddrinfo ENOTFOUND smtp.skedence.com"
- After: `delivery.state` should show "SUCCESS" or "DELIVERED"

## Gmail SMTP Limits

Gmail has sending limits:
- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2,000 emails per day

For a gym management app, this should be plenty!

---

## Current Error Analysis

Your current error:
```
Error: getaddrinfo ENOTFOUND smtp.skedence.com
```

This means the email extension is trying to connect to `smtp.skedence.com`, which doesn't exist as a mail server. You need to update the SMTP URI to point to Gmail's servers at `smtp.gmail.com`.
