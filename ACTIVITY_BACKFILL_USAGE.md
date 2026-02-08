# Activity Feed Backfill Scripts

Two Cloud Functions are available to populate the activity feed with historical data for testing and demonstration purposes.

## 1. Complete Historical Backfill

This function processes **all historical data** from the beginning of time.

**Function:** `backfillActivities`  
**URL:** https://backfillactivities-d5rzjueqba-uc.a.run.app

### Usage

```bash
curl -X POST "https://backfillactivities-d5rzjueqba-uc.a.run.app?orgId=YOUR_ORG_ID"
```

### What it processes
- All trainers (creation events)
- All bookings (lesson bookings and cancellations)
- All class enrollments and class creations
- All locations (creation events)
- All pass purchases/issuances
- All client signups
- All trainer availability additions

---

## 2. Recent Activity Backfill (Recommended for Testing)

This function processes **only recent activities** from the last N days (default: 3 days).

**Function:** `backfillRecentActivities`  
**URL:** https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillRecentActivities

### Usage

**Default (last 3 days):**
```bash
curl -X POST "https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillRecentActivities?orgId=YOUR_ORG_ID"
```

**Custom time period:**
```bash
# Last 7 days
curl -X POST "https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillRecentActivities?orgId=YOUR_ORG_ID&days=7"

# Last 24 hours
curl -X POST "https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillRecentActivities?orgId=YOUR_ORG_ID&days=1"

# Last 14 days
curl -X POST "https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillRecentActivities?orgId=YOUR_ORG_ID&days=14"
```

### What it processes
All actions within the specified time window:
- Trainer creations and activations
- Lesson bookings and cancellations
- Class creations and enrollments
- Location additions
- Pass purchases/issuances
- Client signups
- Trainer availability changes

### Response Format

Both functions return a JSON response with statistics:

```json
{
  "success": true,
  "message": "Successfully backfilled 127 activities from the last 3 days",
  "stats": {
    "trainers": 2,
    "bookings": 45,
    "classes": 8,
    "classEnrollments": 34,
    "locations": 1,
    "passes": 23,
    "clients": 12,
    "availability": 2,
    "total": 127
  },
  "orgId": "your-org-id",
  "daysBack": 3,
  "cutoffDate": "2026-02-05T12:00:00.000Z"
}
```

---

## Finding Your Organization ID

Your `orgId` can be found in:
1. Firebase Console → Firestore → any trainer or user document
2. Web app URL parameters (if applicable)
3. Admin settings in the web app

---

## Notes

- **Idempotent:** Both functions can be run multiple times safely - they will create duplicate activity entries, so run only when needed
- **Performance:** The recent backfill function is faster and more efficient for testing
- **Production Use:** The complete historical backfill should only be run once for initial setup
- **Authentication:** Both functions are currently public HTTP endpoints (consider adding authentication if needed)
- **Timeout:** Functions have a 540-second (9-minute) timeout for large datasets

---

## Viewing Results

After running either function:
1. Navigate to your admin portal at https://polyface-ae6d3.web.app
2. Go to the Activity tab
3. You should see all backfilled activities with proper timestamps
4. Activities are sorted by timestamp (most recent first)

---

## Trainer Deactivation Feature

The web app now includes the ability to deactivate trainers:

1. Go to Trainers tab
2. In the "Active" tab, each trainer card now has a red "Deactivate" button
3. Click to deactivate - you'll see a confirmation dialog
4. Deactivation is logged in the activity feed with:
   - Actor: Admin who performed the action
   - Target: Trainer name
   - Description: "Admin deactivated trainer [name]"
   - Timestamp: When the action occurred

Deactivated trainers:
- Move to the "Inactive" tab
- Can be reactivated using the blue "Reactivate" button
- Cannot access the system while deactivated
- All historical data is preserved
