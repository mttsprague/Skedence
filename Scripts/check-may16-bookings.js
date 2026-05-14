const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const orgId = 'polyface_volleyball_academy_';

  // May 16 2026 CDT (UTC-5) full day window
  const start = new Date('2026-05-16T05:00:00Z');
  const end   = new Date('2026-05-17T05:00:00Z');
  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs   = admin.firestore.Timestamp.fromDate(end);

  console.log(`Searching bookings for ${orgId} on May 16 CDT...`);
  console.log(`UTC window: ${start.toISOString()} to ${end.toISOString()}\n`);

  // Check bookings
  const snap = await db.collection('bookings')
    .where('orgId', '==', orgId)
    .where('startTime', '>=', startTs)
    .where('startTime', '<', endTs)
    .orderBy('startTime')
    .get();

  console.log(`=== BOOKINGS (${snap.size}) ===`);
  snap.forEach(d => {
    const data = d.data();
    const st = data.startTime?.toDate?.()?.toLocaleTimeString('en-US', {timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit'}) || 'n/a';
    console.log(`\n  ID: ${d.id}`);
    console.log(`  clientUID/clientId: ${data.clientUID || data.clientId}`);
    console.log(`  trainerName: ${data.trainerName}`);
    console.log(`  startTime: ${st} CDT`);
    console.log(`  status: ${data.status}`);
    console.log(`  isClassBooking: ${data.isClassBooking}`);
    console.log(`  classId: ${data.classId}`);
    console.log(`  athleteName: ${data.athleteName}`);
  });

  // Check trainer schedule slots
  console.log('\n=== TRAINER SCHEDULE SLOTS ===');
  const trainersSnap = await db.collection('trainers').where('orgId', '==', orgId).get();
  for (const trainerDoc of trainersSnap.docs) {
    const trainerData = trainerDoc.data();
    const schedSnap = await db.collection('trainers').doc(trainerDoc.id)
      .collection('schedules')
      .where('startTime', '>=', startTs)
      .where('startTime', '<', endTs)
      .orderBy('startTime')
      .get();

    if (schedSnap.size > 0) {
      console.log(`\nTrainer: ${trainerDoc.id} (${trainerData.firstName} ${trainerData.lastName})`);
      schedSnap.forEach(d => {
        const data = d.data();
        const st = data.startTime?.toDate?.()?.toLocaleTimeString('en-US', {timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit'}) || 'n/a';
        const et = data.endTime?.toDate?.()?.toLocaleTimeString('en-US', {timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit'}) || 'n/a';
        console.log(`  Slot ${d.id}: ${st}–${et} CDT | status=${data.status} | clientId=${data.clientId||'n/a'} | isClassBooking=${data.isClassBooking||false} | classId=${data.classId||'n/a'}`);
      });
    }
  }

  // Check classes
  console.log('\n=== CLASSES ===');
  const classSnap = await db.collection('classes')
    .where('orgId', '==', orgId)
    .where('startTime', '>=', startTs)
    .where('startTime', '<', endTs)
    .orderBy('startTime')
    .get();

  console.log(`Classes found: ${classSnap.size}`);
  classSnap.forEach(d => {
    const data = d.data();
    const st = data.startTime?.toDate?.()?.toLocaleTimeString('en-US', {timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit'}) || 'n/a';
    const et = data.endTime?.toDate?.()?.toLocaleTimeString('en-US', {timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit'}) || 'n/a';
    console.log(`  ${d.id}: "${data.title}" ${st}–${et} CDT | participants=${data.currentParticipants}/${data.maxParticipants}`);
  });
}
run().catch(e => { console.error(e); process.exit(1); });
