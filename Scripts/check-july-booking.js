const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();
async function run() {
  // Full details of the July 1 booking
  const doc = await db.collection('bookings').doc('46meJIsoJoPI89LNJjke').get();
  console.log('=== 46meJIsoJoPI89LNJjke ===');
  console.log('Exists:', doc.exists);
  console.log(JSON.stringify(doc.data(), null, 2));

  // Search all mary_wagnon bookings around July 1-3
  const start = new Date('2026-07-01T00:00:00Z');
  const end = new Date('2026-07-03T23:59:00Z');
  const snap = await db.collection('bookings')
    .where('clientUID', '==', 'mary_wagnon')
    .where('startTime', '>=', start)
    .where('startTime', '<', end)
    .get();
  console.log('\n=== mary_wagnon bookings July 1-3 ===', snap.size);
  snap.forEach(d => {
    console.log(d.id);
    console.log(JSON.stringify(d.data(), null, 2));
  });

  // Also search by clientId field in same window
  const snap2 = await db.collection('bookings')
    .where('clientId', '==', 'mary_wagnon')
    .where('startTime', '>=', start)
    .where('startTime', '<', end)
    .get();
  console.log('\n=== by clientId July 1-3 ===', snap2.size);
  snap2.forEach(d => console.log(d.id, d.data().status, d.data().startTime?.toDate?.()));
}
run().catch(console.error);
