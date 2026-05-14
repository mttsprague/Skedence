const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const classBookingIds = ['xv6Gc6omXR6G6kIogfIa', 'Dq9kyuz8HoNKnNpXjou9', 'VYRYiFHZzP0bQj9ggkhn'];
  const classIds = ['attacking_class1778954400', 'passing_class1778958000'];
  const clients = ['jamie_sunderland', 'karen_knisely'];

  console.log('=== BOOKING DOCS (the problematic ones) ===');
  for (const id of classBookingIds) {
    const doc = await db.collection('bookings').doc(id).get();
    if (doc.exists) console.log(`  ${id}:`, JSON.stringify(doc.data()));
  }

  console.log('\n=== classRegistrations for these clients/classes ===');
  for (const clientId of clients) {
    for (const classId of classIds) {
      const snap = await db.collection('classRegistrations')
        .where('clientId', '==', clientId)
        .where('classId', '==', classId)
        .get();
      console.log(`  ${clientId} / ${classId}: ${snap.size} registration(s)`);
      snap.forEach(d => console.log(`    ${d.id}:`, JSON.stringify(d.data())));
    }
  }

  console.log('\n=== participants subcollections ===');
  for (const classId of classIds) {
    const snap = await db.collection('classes').doc(classId).collection('participants').get();
    console.log(`\n  ${classId} participants (${snap.size}):`);
    snap.forEach(d => console.log(`    ${d.id}:`, JSON.stringify(d.data())));
  }
}
run().catch(e => { console.error(e); process.exit(1); });
