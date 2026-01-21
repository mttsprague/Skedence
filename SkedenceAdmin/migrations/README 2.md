# SaaS Migration Scripts

This directory contains step-by-step migration scripts for converting the app to a multi-tenant SaaS platform.

## Prerequisites

1. **Backup Complete** ✅
   - Git branch: `pre-saas-migration` created
   - Firestore export: `gs://polyface-ae6d3.firebasestorage.app/firestore-backups/20260107-184431-pre-saas-migration`

2. **Firebase Admin Setup**
   - Download service account key from Firebase Console
   - Place it in this directory as `serviceAccountKey.json`
   - **DO NOT COMMIT THIS FILE** (it's in .gitignore)

## How to Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/polyface-ae6d3/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in this `migrations/` directory

## Running Migrations

⚠️ **IMPORTANT**: Run these scripts in order, one at a time.

### Step 2: Create Organization Layer
```bash
cd migrations
npm install firebase-admin
node step2-create-org-layer.js
```

This creates the initial `organizations` collection with your first organization document.

**After running**: Save the Organization ID output for use in subsequent steps.

### Step 3: Create Organization Membership (Coming Next)
Will create the `orgMembers` collection to link users to organizations.

### Step 4: Add orgId to Existing Data (Coming Next)
Will update all existing trainers, clients, sessions with orgId field.

## Safety Notes

- ✅ All scripts are READ-ONLY by default until you uncomment the write operations
- ✅ Each script logs what it will do before making changes
- ✅ Test in a development environment first if possible
- ✅ Run during low-traffic hours
- ✅ Have the Firestore backup ready to restore if needed

## Rollback Plan

If something goes wrong:
1. Restore from backup: https://console.cloud.google.com/firestore/import-export?project=polyface-ae6d3
2. Checkout the `pre-saas-migration` git branch
3. Redeploy the old code

## Progress Tracker

- [x] Step 1: Freeze and Tag Production (Branch + Backup)
- [ ] Step 2: Create Organization Layer
- [ ] Step 3: Add Org Membership
- [ ] Step 4: Add orgId to Existing Collections
- [ ] Step 5: Data Migration Script
- [ ] Step 6: Update App Queries
- [ ] Step 7: Rewrite Security Rules
- [ ] Step 8: Stripe Connect Integration
- [ ] Step 9: Business Onboarding UI
- [ ] Step 10: Your Billing System
- [ ] Step 11: Multi-Business Tools
- [ ] Step 12: Launch Strategy
