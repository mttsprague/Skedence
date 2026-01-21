# Deployment In Progress - Testing Instructions

## Current Status

🔄 **Cloud Functions Deployment: IN PROGRESS**

The deployment was previously interrupted. I've restarted it and it's now running in the background.

---

## How to Delete Open Slots (Context Menu)

The delete functionality uses **iOS context menus**, which require a **long-press**:

### Steps:
1. Navigate to your schedule view (TrainerWeekView or ScheduleView)
2. Find an **open (green)** slot
3. **LONG-PRESS** on the slot (press and hold for ~1 second)
4. Context menu will appear with "Delete Availability" option
5. Tap "Delete Availability"
6. Slot will be removed from backend

### Important:
- ❌ **Short tap** = Opens slot details (existing behavior)
- ✅ **Long-press** = Shows context menu with delete option
- Only works on **open** slots (green), not booked slots

---

## Recurring Unavailability Status

### Why It's Still Showing "Added 0 slots"

The Cloud Function deployment hasn't completed yet. You're still running the OLD code.

**Evidence from your log**:
```
processTrainerAvailability: Availability processed successfully! Added 0 new slots. slotsAdded=0
```

This is the old code that skips existing slots instead of updating them.

### When Will It Work?

⏳ **Deployment Time**: 5-10 minutes for all 44 functions

**Once deployment completes**:
- Recurring unavailability will UPDATE existing open slots
- You'll see: "Added X slots" where X > 0
- Existing open slots will change to unavailable (red)

### How to Check if Deployment is Complete

Run this command in terminal:
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
ls -lt deploy_*.log | head -1 | xargs tail -5
```

Look for:
- ✅ `✔  Deploy complete!`
- ✅ All functions showing checkmarks
- ❌ Still deploying if you see "updating" messages

---

## Testing Checklist (After Deployment Completes)

### Test 1: Recurring Unavailability
1. Create some **open availability** (e.g., Monday 9am-5pm)
2. Create **recurring unavailability** over the same time (e.g., Monday 12pm-1pm lunch)
3. Check the log for: `Added X slots` where X > 0
4. Verify slots from 12pm-1pm changed from green (open) to red (unavailable)

### Test 2: Delete Open Slot
1. Find an open (green) slot
2. **Long-press** on it (hold for 1 second)
3. Context menu should appear
4. Tap "Delete Availability"
5. Slot should disappear
6. Cell should turn gray (empty)

---

## Deployment Commands

### Check if still deploying:
```bash
ps aux | grep "firebase deploy"
```

### View live deployment log:
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
tail -f deploy_*.log
```

### If deployment gets stuck:
Kill and restart:
```bash
pkill -f "firebase deploy"
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
npm run deploy
```

---

## Expected Behavior After Deployment

### Recurring Unavailability

**Before (OLD CODE - current)**:
```
processTrainerAvailability: Added 0 new slots
```
- Skips existing open slots
- Only creates NEW slots
- Doesn't update existing slots to unavailable

**After (NEW CODE - after deployment)**:
```
processTrainerAvailability: Added 15 new slots
```
- Updates existing open slots to unavailable
- Creates new slots where needed
- Protects booked slots (won't overwrite)

### Delete Context Menu

**Should work now** - just requires long-press:
- Available in: **TrainerWeekView**, **ScheduleView**
- Not in: AllTrainersDayView (removed due to scope issues)
- Gesture: **Long-press** (not tap)

---

## Troubleshooting

### Context menu not appearing?

**Check these**:
1. Are you **long-pressing** (not tapping)?
2. Is the slot **open** (green)? Only works on open slots
3. Are you in TrainerWeekView or ScheduleView? (Not AllTrainersDayView)
4. Try pressing and holding for 1-2 seconds

**Alternative**: You can still:
- Tap to open the slot details
- Edit the time to make it shorter
- Or use recurring unavailability to mark multiple slots

### Recurring unavailability still not working?

**Wait for deployment to complete first!**

Check deployment status:
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/functions"
tail -20 deploy_*.log
```

If you see:
- "updating Node.js 22" → Still deploying
- "✔ Deploy complete!" → Deployment done, try again

---

## Timeline

1. ⏳ **Now**: Deployment in progress (~5-10 minutes)
2. ✅ **After deployment**: Recurring unavailability will work
3. ✅ **Already working**: Delete context menu (use long-press)

---

## Summary

**Context Menu (Delete)**:
- ✅ Code deployed to iOS app
- ✅ Ready to use NOW
- Use: **Long-press** on open slots

**Recurring Unavailability**:
- ✅ Code deployed to Cloud Functions
- ⏳ Deployment in progress
- Wait: 5-10 minutes
- Then: Will work immediately

I'll monitor the deployment and let you know when it completes!
