/**
 * check-stuck-slots.js
 * 
 * Finds trainer schedule slots stuck at status: "booked" with no matching
 * active booking — a side effect of the slotId/scheduleSlotId mismatch bug.
 * 
 * Run: node Scripts/check-stuck-slots.js
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}

const db = admin.firestore();

async function checkStuckSlots() {
  console.log('\n🔍 Scanning for trainer schedule slots stuck at status: "booked"...\n');

  // 1. Fetch all trainers
  const trainersSnap = await db.collection('trainers').get();
  console.log(`Found ${trainersSnap.size} trainer(s)\n`);

  const stuckSlots = [];

  for (const trainerDoc of trainersSnap.docs) {
    const trainerId = trainerDoc.id;
    const trainerData = trainerDoc.data();
    const trainerName = `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim();

    // 2. Find all booked slots for this trainer
    const slotsSnap = await db
      .collection('trainers')
      .doc(trainerId)
      .collection('schedules')
      .where('status', '==', 'booked')
      .get();

    if (slotsSnap.empty) continue;

    console.log(`Trainer: ${trainerName} (${trainerId}) — ${slotsSnap.size} booked slot(s)`);

    for (const slotDoc of slotsSnap.docs) {
      const slotId = slotDoc.id;
      const slotData = slotDoc.data();

      // 3. Look for a non-cancelled booking referencing this slot
      // Fetch by slotId only (no composite index needed), then filter in JS
      const [bySlotId, byScheduleSlotId] = await Promise.all([
        db.collection('bookings').where('slotId', '==', slotId).get(),
        db.collection('bookings').where('scheduleSlotId', '==', slotId).get(),
      ]);

      const isActive = (doc) => doc.data().status !== 'cancelled';
      const hasActiveBooking = bySlotId.docs.some(isActive) || byScheduleSlotId.docs.some(isActive);

      if (!hasActiveBooking) {
        const startTime = slotData.startTime?.toDate?.() || slotData.startTime;
        stuckSlots.push({ trainerId, trainerName, slotId, startTime });
        console.log(`  ⚠️  STUCK: slot ${slotId} (${startTime}) — no active booking`);
      } else {
        console.log(`  ✅ slot ${slotId} — active booking exists (ok)`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\nTotal stuck slots: ${stuckSlots.length}`);

  if (stuckSlots.length > 0) {
    console.log('\nSlots that will be reset by the backfill script:');
    stuckSlots.forEach(s => {
      console.log(`  - trainer: ${s.trainerName} (${s.trainerId}), slot: ${s.slotId}, time: ${s.startTime}`);
    });
    console.log('\nRun "node Scripts/backfill-stuck-slots.js" to fix these.\n');
  } else {
    console.log('\n✅ No stuck slots found — no backfill needed.\n');
  }
}

checkStuckSlots().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
