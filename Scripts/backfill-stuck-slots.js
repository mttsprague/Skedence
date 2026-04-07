/**
 * backfill-stuck-slots.js
 * 
 * Resets trainer schedule slots stuck at status: "booked" when no active
 * booking references them — caused by the slotId/scheduleSlotId mismatch
 * bug in cancelLesson / adminCancelLesson prior to the April 2026 fix.
 * 
 * DRY RUN by default. Set DRY_RUN=false to apply changes.
 * 
 * Run:  node Scripts/backfill-stuck-slots.js
 * Fix:  DRY_RUN=false node Scripts/backfill-stuck-slots.js
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function backfillStuckSlots() {
  console.log(`\n${DRY_RUN ? '🔎 DRY RUN' : '🔧 LIVE RUN'} — resetting stuck booked slots with no active booking\n`);
  if (DRY_RUN) {
    console.log('Set DRY_RUN=false to apply changes.\n');
  }

  const trainersSnap = await db.collection('trainers').get();
  console.log(`Found ${trainersSnap.size} trainer(s)\n`);

  let stuckCount = 0;
  let fixedCount = 0;

  for (const trainerDoc of trainersSnap.docs) {
    const trainerId = trainerDoc.id;
    const trainerData = trainerDoc.data();
    const trainerName = `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim();

    const slotsSnap = await db
      .collection('trainers')
      .doc(trainerId)
      .collection('schedules')
      .where('status', '==', 'booked')
      .get();

    if (slotsSnap.empty) continue;

    for (const slotDoc of slotsSnap.docs) {
      const slotId = slotDoc.id;
      const slotData = slotDoc.data();

      const [bySlotId, byScheduleSlotId] = await Promise.all([
        db.collection('bookings').where('slotId', '==', slotId).get(),
        db.collection('bookings').where('scheduleSlotId', '==', slotId).get(),
      ]);

      const isActive = (doc) => doc.data().status !== 'cancelled';
      const hasActiveBooking = bySlotId.docs.some(isActive) || byScheduleSlotId.docs.some(isActive);
      if (hasActiveBooking) continue;

      const startTime = slotData.startTime?.toDate?.() || slotData.startTime;
      stuckCount++;
      console.log(`  ⚠️  Stuck slot: trainer=${trainerName} (${trainerId}), slot=${slotId}, time=${startTime}`);

      if (!DRY_RUN) {
        await db
          .collection('trainers')
          .doc(trainerId)
          .collection('schedules')
          .doc(slotId)
          .update({
            status: 'open',
            clientId: null,
            clientName: null,
            bookedAt: null,
          });
        fixedCount++;
        console.log(`    ✅ Reset to "open"`);
      } else {
        console.log(`    (dry run — would reset to "open")`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\nStuck slots found: ${stuckCount}`);
  if (!DRY_RUN) {
    console.log(`Slots reset:       ${fixedCount}`);
    console.log('\n✅ Backfill complete.\n');
  } else {
    console.log('\nRe-run with DRY_RUN=false to apply.\n');
  }
}

backfillStuckSlots().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
