# Backfill Admin-Booked Lessons Script

## Problem
When admins scheduled lessons for clients, the booking documents may have been created with incorrect client IDs (random IDs or Auth UIDs) instead of the proper **`firstName_lastName`** document ID format. This prevented admin-booked lessons from appearing in client schedules because the iOS app queries by the `firstName_lastName` document ID.

## Solution
This script updates all existing bookings to use the correct `firstName_lastName` format by:
1. Reading each booking's current `clientId` field
2. Finding the correct user document (firstName_lastName format)
3. Updating `clientId`, `clientUID`, and `clientAuthUID` to use proper values

The script intelligently searches for the correct user document by:
- Trying current `clientId` as document ID
- Searching by `authUserId` field if not found
- Converting `clientName` to `firstName_lastName` format
- Querying by first/last name as fallback

## Prerequisites
- Node.js installed
- Firebase Admin SDK service account key (`serviceAccountKey.json` in functions directory)

## Usage

### Step 1: Dry Run (Preview Changes)
**ALWAYS run this first to see what will be changed:**

```bash
cd SkedenceAdmin/functions
node backfill-admin-bookings.js --dry-run
```

This will:
- Show you all bookings that need updating
- Display current vs correct values
- Count how many bookings would be changed
- **NOT make any actual changes**

### Step 2: Run the Backfill
Once you've reviewed the dry run output and confirmed it looks correct:

```bash
cd SkedenceAdmin/functions
node backfill-admin-bookings.js
```

This will:
- Wait 3 seconds (giving you time to cancel with Ctrl+C)
- Update all bookings with incorrect `clientAuthUID` values
- Add a `backfilledAt` timestamp to updated bookings
- Show progress as it processes batches
- Display a summary when complete

## What Gets Updated

For each booking where the client IDs don't use the proper `firstName_lastName` format:

**Before (Wrong Format - Random ID or Auth UID):**
```javascript
{
  clientId: "abc123xyz",          // WRONG - random ID or Auth UID
  clientUID: "abc123xyz",         // WRONG - random ID or Auth UID
  clientAuthUID: "admin_auth_uid", // WRONG - admin's UID
  clientName: "John Doe"
}
```

**After (Correct Format - firstName_lastName):**
```javascript
{
  clientId: "john_doe",           // FIXED - firstName_lastName document ID
  clientUID: "john_doe",          // FIXED - firstName_lastName document ID
  clientAuthUID: "client_auth_uid", // FIXED - client's actual Auth UID
  clientName: "John Doe",         // Unchanged
  backfilledAt: Timestamp         // NEW - audit trail
}
```

### How Client IDs Are Resolved:

1. **Try Direct Lookup**: Check if current `clientId` is a valid user document ID
2. **Try Auth UID Match**: Search users by `authUserId` field matching current `clientId`
3. **Try Name Conversion**: Convert `clientName` "John Doe" → `john_doe` and lookup
4. **Try Name Query**: Query users by `firstName` and `lastName` fields
5. **Match by Org**: All lookups verify the user belongs to the same `orgId`

This ensures even badly formatted admin bookings can be matched to the correct client!

## Safety Features

1. **Dry run mode** - Preview all changes before applying
2. **3-second delay** - Time to cancel before real changes
3. **Batch processing** - Commits in batches of 500 for efficiency
4. **Audit trail** - Adds `backfilledAt` timestamp to updated bookings
5. **Error handling** - Skips problem bookings and reports errors
6. **Read-only for correct bookings** - Only updates bookings that need fixing

## Expected Output

### Dry Run Output:
```
🔍 DRY RUN MODE - No changes will be made

📊 Found 45 total bookings

📝 WOULD UPDATE: booking_123
   Time: 2026-03-15T10:00:00.000Z
   Client: "John Doe"
   clientId: "abc123xyz" → "john_doe"
   clientAuthUID: "admin_uid" → "client_uid_xyz"

🔍 Found user by name conversion: "John Doe" → john_doe

📝 WOULD UPDATE: booking_456
   Time: 2026-03-16T14:00:00.000Z
   Client: "Jane Smith"
   clientId: "def456abc" → "jane_smith"

...

═══════════════════════════════════════
📊 DRY RUN SUMMARY
═══════════════════════════════════════
Total Bookings:        45
Would Update:          12
Already Correct:       31
Errors/Skip:           2
═══════════════════════════════════════

✅ 12 bookings need updating to firstName_lastName format.
📝 Run without --dry-run to apply changes: node backfill-admin-bookings.js
```

### Actual Run Output:
```
⚠️  WARNING: This will modify booking documents in Firestore

Press Ctrl+C to cancel, or wait 3 seconds to continue...

🔄 Starting backfill of admin-booked lessons...

📊 Found 45 total bookings

🔍 Found user by authUserId match: abc123xyz → john_doe

📝 Booking booking_123:
   Start Time: 2026-03-15T10:00:00.000Z
   OLD clientId: abc123xyz
   NEW clientId: john_doe (firstName_lastName format)
   OLD clientAuthUID: admin_uid_abc
   NEW clientAuthUID: client_uid_xyz

✓ Processing... 50/45 (10 updated, 29 already correct)

✅ Committed batch of 12 updates

═══════════════════════════════════════
📊 BACKFILL SUMMARY
═══════════════════════════════════════
Total Bookings:        45
Processed:             45
✅ Updated:            12
✓ Already Correct:     31
❌ Errors/Skipped:     2
═══════════════════════════════════════

✅ Backfill complete! Admin-booked lessons should now appear in client schedules.
📝 All clientId/clientUID fields now use firstName_lastName format.
```

## Verification

After running the script, verify the fix by:

1. **Check Firestore Console:**
   - Open a booking document that was updated
   - Verify `clientAuthUID` matches the client's Auth UID (not admin's)
   - Confirm `backfilledAt` timestamp is present

2. **Test Client App:**
   - Log in as a client who had admin-scheduled lessons
   - Navigate to Schedule tab
   - Verify all lessons now appear (including admin-booked ones)

3. **Check Logs:**
   - Review script output for any errors
   - All bookings should be either "Updated" or "Already Correct"

## Troubleshooting

### Error: "User document not found"
- Some bookings reference deleted users
- These will be skipped and counted in errors
- Manual review may be needed

### Error: "Missing authUserId field"
- Old user documents may not have migrated `authUserId` field
- Check user document in Firestore and add if necessary

### Error: "serviceAccountKey.json not found"
- Download service account key from Firebase Console
- Place in `SkedenceAdmin/functions/` directory
- Never commit this file to git

## Rollback

If you need to revert changes:
1. The script adds `backfilledAt` timestamp to updated bookings
2. Query bookings where `backfilledAt` exists
3. These are the ones that were changed
4. Original values are not stored - would need database backup to restore

**Recommendation:** Take a Firestore backup before running if you want rollback capability.

## Future Prevention

The Cloud Function has been updated (`bookLesson` in `index.ts`) to correctly set `clientAuthUID` for new admin bookings. This script only needs to run once to fix historical data.

**Updated Code:**
```typescript
// Now correctly fetches client's authUserId when admin books
if (clientId) {
  const clientUserDoc = await db.collection("users").doc(clientId).get();
  if (clientUserDoc.exists && clientUserDoc.data()?.authUserId) {
    clientAuthUID = clientUserDoc.data().authUserId; // Client's UID
  }
}
```

All new admin bookings will have the correct `clientAuthUID` from now on.
