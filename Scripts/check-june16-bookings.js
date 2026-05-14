const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const orgId = 'polyface_volleyball_academy_';

  // June 16 2026 CDT = UTC-5 (CDT is UTC-5)
  // 1pm CDT = 18:00 UTC, 2pm CDT = 19:00 UTC
  // But let's cast a wide net: full day June 16 CDT = June 16 05:00 UTC to June 17 05:00 UTC
  const start = new Date('2026-06-16T05:00:00Z');
  const end   = new Date('2026-06-17T05:00:00Z');

  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs   = admin.firestore.Timestamp.fromDate(end);

  console.log(`Searching bookings for ${orgId} on June 16 CDT...`);
  console.log(`UTC window: ${start.toISOString()} to ${end.toISOString()}\n`);

  const snap = await db.collection('bookings')
    .where('orgId', '==', orgId)
    .where('startTime', '>=', startTs)
    .where('startTime', '<', endTs)
    .orderBy('startTime')
    .get();

  console.log(`Total bookings found: ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    const st = data.startTime?.toDate?.()?.toISOString() || 'n/a';
    console.log(`\n  ID: ${d.id}`);
    console.log(`  clientUID/clientId: ${data.clientUID || data.clientId}`);
    console.log(`  trainerId: ${data.trainerId || data.trainerUID}`);
    console.log(`  trainerName: ${data.trainerName}`);
    console.log(`  startTime: ${st}`);
    console.log(`  status: ${data.status}`);
    console.log(`  isClassBooking: ${data.isClassBooking}`);
    console.log(`  classId: ${data.classId}`);
    console.log(`  packageId/lessonPackageId: ${data.packageId || data.lessonPackageId}`);
    console.log(`  scheduleSlotId/scheduleId: ${data.scheduleSlotId || data.scheduleId}`);
    console.log(`  location: ${data.location}`);
    console.log(`  athleteName: ${data.athleteName}`);
  });

  // Also check classes on that day
  console.log('\n--- Classes on June 16 ---');
  const classSnap = await db.collection('classes')
    .where('orgId', '==', orgId)
    .where('startTime', '>=', startTs)
    .where('startTime', '<', endTs)
    .orderBy('startTime')
    .get();

  console.log(`Classes found: ${classSnap.size}`);
  classSnap.forEach(d => {
    const data = d.data();
    const st = data.startTime?.toDate?.()?.toISOString() || 'n/a';
    console.log(`\n  Class ID: ${d.id}`);
    console.log(`  title: ${data.title}`);
    console.log(`  startTime: ${st}`);
    console.log(`  trainerId: ${data.trainerId}`);
    console.log(`  trainerName: ${data.trainerName}`);
    console.log(`  currentParticipants: ${data.currentParticipants}`);
    console.log(`  maxParticipants: ${data.maxParticipants}`);
  });
}
run().catch(e => { console.error(e); process.exit(1); });
