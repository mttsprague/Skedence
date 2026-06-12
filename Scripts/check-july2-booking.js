const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  // July 2, 10am CDT = July 2 15:00 UTC
  const targetEpoch = new Date('2026-07-02T15:00:00Z');
  // Also July 2 10am CST = July 2 16:00 UTC
  const targetEpoch2 = new Date('2026-07-02T16:00:00Z');
  
  console.log('=== Looking for any booking July 2 ===');
  
  // Search all bookings for jeffschmitz on July 2
  const slot2 = await db.collection('trainers').doc('jeffschmitz').collection('schedules')
    .where('startTime', '>=', new Date('2026-07-02T00:00:00Z'))
    .where('startTime', '<', new Date('2026-07-03T00:00:00Z'))
    .get();
  console.log(`Jeff Schmitz schedule slots on July 2: ${slot2.size}`);
  slot2.forEach(d => console.log(`  ${d.id}:`, JSON.stringify(d.data(), null, 2)));

  // Any booking in the entire July 2 window
  const bookingsJuly2 = await db.collection('bookings')
    .where('startTime', '>=', new Date('2026-07-02T00:00:00Z'))
    .where('startTime', '<', new Date('2026-07-03T00:00:00Z'))
    .get();
  console.log(`\nAll bookings on July 2: ${bookingsJuly2.size}`);
  bookingsJuly2.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: clientUID=${data.clientUID} clientId=${data.clientId} clientAuthUID=${data.clientAuthUID} status=${data.status}`);
  });

  // Also check jeffschmitz slots for the entire July 1 window (all hours)
  console.log('\n=== jeffschmitz all slots July 1-2 ===');
  const allSlots = await db.collection('trainers').doc('jeffschmitz').collection('schedules')
    .where('startTime', '>=', new Date('2026-07-01T00:00:00Z'))
    .where('startTime', '<', new Date('2026-07-03T00:00:00Z'))
    .get();
  console.log(`Jeff Schmitz schedule slots July 1-2: ${allSlots.size}`);
  allSlots.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: status=${data.status} clientId=${data.clientId} startTime=${data.startTime?.toDate?.()}`);
  });
}
run().catch(console.error);
