const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const orgId = 'polyface_volleyball_academy_';

  // Check unaccounted package details
  console.log('=== Package mary_wagnon_1athleteprivate_1773871915 details ===');
  const pkg = await db.collection('organizations').doc(orgId)
    .collection('users').doc('mary_wagnon')
    .collection('packages').doc('mary_wagnon_1athleteprivate_1773871915').get();
  console.log(JSON.stringify(pkg.data(), null, 2));

  // Are there any bookings referencing this package?
  console.log('\n=== Bookings using this package (packageId) ===');
  const snap = await db.collection('bookings')
    .where('packageId', '==', 'mary_wagnon_1athleteprivate_1773871915')
    .get();
  console.log(`Results: ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: status=${data.status} startTime=${data.startTime?.toDate?.()}`);
  });

  // Recent activity for mary (no compound filter)
  console.log('\n=== All recent activities (last 30) ===');
  const acts = await db.collection('activities').orderBy('createdAt', 'desc').limit(30).get();
  acts.docs.forEach(d => {
    const data = d.data();
    const desc = data.description || '';
    if (desc.toLowerCase().includes('wagnon') || desc.toLowerCase().includes('mary')) {
      console.log(`  [${data.createdAt?.toDate?.()}] type=${data.type} | ${desc}`);
    }
  });
}
run().catch(console.error);
