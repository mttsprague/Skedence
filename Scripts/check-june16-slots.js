const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  // June 16 CDT full day window
  const start = new Date('2026-06-16T05:00:00Z');
  const end   = new Date('2026-06-17T05:00:00Z');
  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs   = admin.firestore.Timestamp.fromDate(end);

  // Check all trainer schedule slots for that day
  const trainersSnap = await db.collection('trainers').get();
  console.log(`Checking schedules for ${trainersSnap.size} trainers...\n`);

  for (const trainerDoc of trainersSnap.docs) {
    const trainerData = trainerDoc.data();
    const schedSnap = await db.collection('trainers').doc(trainerDoc.id)
      .collection('schedules')
      .where('startTime', '>=', startTs)
      .where('startTime', '<', endTs)
      .orderBy('startTime')
      .get();

    if (schedSnap.size > 0) {
      console.log(`Trainer: ${trainerDoc.id} (${trainerData.firstName} ${trainerData.lastName})`);
      schedSnap.forEach(d => {
        const data = d.data();
        const st = data.startTime?.toDate?.()?.toISOString() || 'n/a';
        const et = data.endTime?.toDate?.()?.toISOString() || 'n/a';
        console.log(`  Slot ${d.id}:`);
        console.log(`    startTime: ${st} (${new Date(st).toLocaleTimeString('en-US', {timeZone:'America/Chicago'})} CDT)`);
        console.log(`    endTime:   ${et}`);
        console.log(`    status: ${data.status}`);
        console.log(`    clientId: ${data.clientId || 'n/a'}`);
        console.log(`    isClassBooking: ${data.isClassBooking || false}`);
        console.log(`    classId: ${data.classId || 'n/a'}`);
        console.log(`    title: ${data.title || 'n/a'}`);
        console.log(`    notes: ${data.notes || 'n/a'}`);
      });
      console.log('');
    }
  }
}
run().catch(e => { console.error(e); process.exit(1); });
