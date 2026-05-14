const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const userId = 'jason_hargis';
  const classId = 'attacking_class1778954400';

  // Check bookings
  const bookingsSnap = await db.collection('bookings')
    .where('clientUID', '==', userId)
    .get();
  console.log(`Bookings for jason_hargis (by clientUID): ${bookingsSnap.size}`);
  bookingsSnap.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: isClassBooking=${data.isClassBooking}, classId=${data.classId}, status=${data.status}, backfillNote=${data.backfillNote}`);
  });

  // Also check clientId field
  const bookingsSnap2 = await db.collection('bookings')
    .where('clientId', '==', userId)
    .get();
  console.log(`Bookings for jason_hargis (by clientId): ${bookingsSnap2.size}`);
  bookingsSnap2.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: isClassBooking=${data.isClassBooking}, classId=${data.classId}, status=${data.status}`);
  });

  // Check classRegistrations
  const regSnap = await db.collection('classRegistrations')
    .where('clientId', '==', userId)
    .where('classId', '==', classId)
    .get();
  console.log(`\nclassRegistrations for this class: ${regSnap.size}`);
  regSnap.forEach(d => console.log(`  ${d.id}:`, JSON.stringify(d.data())));

  // Check participants subcollection
  const partSnap = await db.collection('classes').doc(classId).collection('participants').get();
  const jasonParts = partSnap.docs.filter(d => d.id.includes('jason'));
  console.log(`\nParticipants for ${classId} matching 'jason': ${jasonParts.length}`);
  jasonParts.forEach(d => console.log(`  ${d.id}:`, JSON.stringify(d.data())));
}
run().catch(e => { console.error(e); process.exit(1); });
