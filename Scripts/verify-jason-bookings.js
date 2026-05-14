const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  // Direct ID lookup
  const directDoc = await db.collection('bookings').doc('k58yAckHvRH7wuewec6E').get();
  console.log('Direct lookup k58yAckHvRH7wuewec6E exists:', directDoc.exists);

  // Search all bookings with clientUID or clientId = jason_hargis
  const snap1 = await db.collection('bookings').where('clientUID', '==', 'jason_hargis').get();
  console.log('Bookings by clientUID=jason_hargis:', snap1.size);
  snap1.forEach(d => console.log(' ', d.id, d.data().isClassBooking));

  const snap2 = await db.collection('bookings').where('clientId', '==', 'jason_hargis').get();
  console.log('Bookings by clientId=jason_hargis:', snap2.size);
  snap2.forEach(d => console.log(' ', d.id, d.data().isClassBooking));
}
run().catch(e => { console.error(e); process.exit(1); });
