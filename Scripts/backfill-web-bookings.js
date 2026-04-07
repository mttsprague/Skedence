// backfill-web-bookings.js
// Fixes bookings created by the web portal before clientName/trainerName were added.
// Also updates the corresponding schedule slot docs with clientName.
// Run from: skedence-unified/  (has firebase-admin)

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

const ORG_ID = 'polyface_volleyball_academy_';

async function buildTrainerMap() {
  const snap = await db.collection('trainers').where('orgId', '==', ORG_ID).get();
  const map = {};
  snap.forEach(d => {
    const { firstName, lastName } = d.data();
    map[d.id] = [firstName, lastName].filter(Boolean).join(' ');
  });
  return map;
}

async function buildUserMap() {
  const snap = await db.collection('users').where('orgId', '==', ORG_ID).get();
  const map = {};
  snap.forEach(d => {
    const { firstName, lastName } = d.data();
    map[d.id] = [firstName, lastName].filter(Boolean).join(' ');
  });
  return map;
}

async function run() {
  console.log('Building trainer and user maps...');
  const [trainerMap, userMap] = await Promise.all([buildTrainerMap(), buildUserMap()]);
  console.log(`  Trainers: ${Object.keys(trainerMap).length}`);
  console.log(`  Users:    ${Object.keys(userMap).length}`);

  // Find ALL bookings in the org missing clientName or trainerName
  const bookingsSnap = await db.collection('bookings').where('orgId', '==', ORG_ID).get();

  const toFix = [];
  bookingsSnap.forEach(d => {
    const data = d.data();
    const missingClientName  = !data.clientName;
    const missingTrainerName = !data.trainerName;
    const missingBookedAt    = !data.bookedAt;
    if (missingClientName || missingTrainerName || missingBookedAt) {
      toFix.push({ id: d.id, data });
    }
  });

  console.log(`\nFound ${toFix.length} booking(s) needing backfill:`);

  if (toFix.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  let fixed = 0;
  let slotFixed = 0;

  for (const { id, data } of toFix) {
    const clientId  = data.clientId  || data.clientUID;
    const trainerId = data.trainerId || data.trainerUID;
    const slotId    = data.scheduleSlotId || data.slotId || data.scheduleId;

    const clientName  = userMap[clientId]   || data.clientName  || null;
    const trainerName = trainerMap[trainerId] || data.trainerName || null;

    const update = {};
    if (!data.clientName  && clientName)  update.clientName  = clientName;
    if (!data.trainerName && trainerName) update.trainerName = trainerName;
    if (!data.bookedAt)                   update.bookedAt    = data.createdAt || admin.firestore.FieldValue.serverTimestamp();

    console.log(`\n  Booking ${id}`);
    console.log(`    clientId=${clientId} → clientName=${clientName}`);
    console.log(`    trainerId=${trainerId} → trainerName=${trainerName}`);
    console.log(`    slotId=${slotId}`);
    console.log(`    Updating fields: ${JSON.stringify(Object.keys(update))}`);

    await db.collection('bookings').doc(id).update(update);
    fixed++;

    // Also patch the schedule slot doc if it's missing clientName
    if (slotId && trainerId) {
      const slotRef = db.collection('trainers').doc(trainerId).collection('schedules').doc(slotId);
      const slotSnap = await slotRef.get();
      if (slotSnap.exists) {
        const slotData = slotSnap.data();
        if (!slotData.clientName && clientName) {
          await slotRef.update({ clientName, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          console.log(`    ✅ Slot ${slotId} → clientName="${clientName}"`);
          slotFixed++;
        } else {
          console.log(`    ℹ️  Slot ${slotId} already has clientName="${slotData.clientName}"`);
        }
      } else {
        console.log(`    ⚠️  Slot doc not found: trainers/${trainerId}/schedules/${slotId}`);
      }
    }
  }

  console.log(`\n✅ Done. Fixed ${fixed} booking(s), ${slotFixed} slot doc(s).`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
