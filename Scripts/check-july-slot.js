const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  // Check the trainer slot for July 1 19:00 UTC
  const slotRef = db.collection('trainers').doc('jeffschmitz').collection('schedules').doc('2026-07-01T19');
  const slot = await slotRef.get();
  console.log('=== jeffschmitz schedule slot 2026-07-01T19 ===');
  console.log('Exists:', slot.exists);
  if (slot.exists) console.log(JSON.stringify(slot.data(), null, 2));

  // Also check the package that was used
  const pkgRef = db.collection('organizations').doc('polyface_volleyball_academy_')
    .collection('users').doc('mary_wagnon')
    .collection('packages').doc('mary_wagnon_1athleteprivate_1773871579');
  const pkg = await pkgRef.get();
  console.log('\n=== Package mary_wagnon_1athleteprivate_1773871579 ===');
  console.log('Exists:', pkg.exists);
  if (pkg.exists) console.log(JSON.stringify(pkg.data(), null, 2));

  // Double check booking exists
  const booking = await db.collection('bookings').doc('46meJIsoJoPI89LNJjke').get();
  console.log('\n=== Booking 46meJIsoJoPI89LNJjke ===');
  console.log('Exists:', booking.exists, '| Status:', booking.data()?.status);
}
run().catch(console.error);
