const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const bookingId = 'k58yAckHvRH7wuewec6E';
  const doc = await db.collection('bookings').doc(bookingId).get();
  if (!doc.exists) {
    console.log('Booking not found (already deleted?)');
    return;
  }
  console.log('Found booking to delete:');
  const data = doc.data();
  console.log('  clientUID:', data.clientUID);
  console.log('  classId:', data.classId);
  console.log('  isClassBooking:', data.isClassBooking);
  console.log('  backfillNote:', data.backfillNote);
  await doc.ref.delete();
  console.log('Deleted booking:', bookingId);
  console.log('Done — Jason Hargis class registration now backed by classRegistrations + participants only (no booking doc).');
}
run().catch(e => { console.error(e); process.exit(1); });
