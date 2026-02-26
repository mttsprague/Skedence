# Admin Panel Setup Guide

## Step-by-Step Setup Instructions

### 1. Get Firebase Service Account Key

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select project: **polyface-ae6d3**
3. Click the gear icon (⚙️) next to "Project Overview"
4. Select **Project Settings**
5. Go to **Service Accounts** tab
6. Click **"Generate New Private Key"**
7. Click **"Generate Key"** in the confirmation dialog
8. A JSON file will download - keep it safe!

### 2. Set Up Environment Variables

1. Navigate to the admin panel directory:
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/admin-panel"
```

2. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Open `.env.local` in your editor:
```bash
open .env.local
```

4. Add your configuration:

```env
# IMPORTANT: This should be the ENTIRE JSON content from the downloaded file
# Copy everything including the curly braces
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"polyface-ae6d3","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@polyface-ae6d3.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# Add your email(s) - comma separated for multiple admins
ADMIN_EMAILS=matthew@example.com,another-admin@example.com

# Firebase Project ID (already set, don't change)
FIREBASE_PROJECT_ID=polyface-ae6d3

# Node environment
NODE_ENV=development
```

**Important Notes:**
- The entire JSON must be on ONE line
- Keep all quotes and special characters as-is
- The private key will have `\n` characters - keep them

### 3. Install Dependencies (if not already done)

```bash
npm install
```

### 4. Run the Admin Panel

```bash
npm run dev
```

The admin panel will start at: **http://localhost:3001**

### 5. Access the Admin Panel

1. Open your browser and go to: http://localhost:3001
2. You should see the Skedence Admin Panel dashboard
3. If you see "Unauthorized" errors, check that your email is in `ADMIN_EMAILS`

## Troubleshooting

### "Unauthorized" Error
**Problem:** You see "Unauthorized" when trying to access API endpoints

**Solution:**
1. Double-check your email is in `ADMIN_EMAILS` in `.env.local`
2. Restart the dev server: `npm run dev`
3. Clear browser cache
4. Make sure emails match exactly (case-insensitive)

### "Firebase initialization error"
**Problem:** Errors about Firebase Admin SDK

**Solution:**
1. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
2. Check that you copied the ENTIRE JSON content
3. Ensure no line breaks were added (should be one long line)
4. Verify `FIREBASE_PROJECT_ID` is "polyface-ae6d3"

### "Cannot find organizations"
**Problem:** No organizations appear in the dashboard

**Solution:**
1. Verify Firestore has an `organizations` collection
2. Check Firebase console rules allow admin access
3. Ensure service account has Firestore permissions
4. Look for errors in the terminal where `npm run dev` is running

### Port 3001 already in use
**Problem:** Error says port 3001 is already in use

**Solution:**
```bash
# Kill the process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
npm run dev -- -p 3002
```

## Production Deployment

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `ADMIN_EMAILS`
   - `FIREBASE_PROJECT_ID`
   - `NODE_ENV=production`
5. Deploy!

### Option 2: Traditional Server

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

### Option 3: Docker

```bash
# Build image
docker build -t skedence-admin .

# Run container
docker run -p 3001:3001 \
  -e FIREBASE_SERVICE_ACCOUNT_KEY="..." \
  -e ADMIN_EMAILS="..." \
  -e FIREBASE_PROJECT_ID="polyface-ae6d3" \
  -e NODE_ENV="production" \
  skedence-admin
```

## Security Checklist

- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] Service account key JSON is never committed to git
- [ ] Only trusted emails are in `ADMIN_EMAILS`
- [ ] Production uses HTTPS (automatic on Vercel)
- [ ] Service account has minimum required permissions
- [ ] Regularly rotate service account keys (every 90 days)
- [ ] Monitor admin panel access logs

## Features Available

Once running, you can:

✅ **View all organizations**
- See total count, active subscriptions, trials, disabled orgs

✅ **Search organizations**
- By name or organization ID

✅ **View organization details**
- Members list
- Subscription status
- Recent events/activity

✅ **Enable/Disable organizations**
- One-click enable/disable
- Immediate effect on client apps

✅ **Monitor subscription status**
- Active, trialing, past due, canceled
- Plan information

## Next Steps

After the admin panel is running:

1. **Add more admins**: Update `ADMIN_EMAILS` in `.env.local`
2. **Deploy to production**: Choose Vercel or your preferred hosting
3. **Set up monitoring**: Add alerting for critical org events
4. **Create admin actions audit log**: Track who does what
5. **Add more features**: See PHASE11_COMPLETE.md for enhancement ideas

## Need Help?

- Check logs in terminal where `npm run dev` is running
- Check browser console (F12) for client-side errors
- Review `PHASE11_COMPLETE.md` for detailed documentation
- Check Firebase Console for Firestore data and rules
