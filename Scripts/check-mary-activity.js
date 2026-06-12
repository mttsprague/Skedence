const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const orgId = 'polyface_volleyball_academy_';
  
  // Check activity log for mary_wagnon
  console.log('=== Activity log for mary_wagnon ===');
  const activities = await db.collection('activities')
    .where('orgId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  
  const maryActivities = activities.docs.filter(d => {
    const data = d.data();
    return JSON.stringify(data).toLowerCase().includes('wagnon') || 
           JSON.stringify(data).toLowerCase().includes('mary');
  });
  console.log(`Found ${maryActivities.length} activities mentioning mary/wagnon`);
  maryActivities.forEach(d => {
    const data = d.data();
    console.log(`  [${data.createdAt?.toDate?.()}] type=${data.type} description=${data.description}`);
  });

  // Check unaccounted package
  console.log('\n=== Package mary_wagnon_1athleteprivate_1773871915 details ===');
  const pkg = await db.collection('organizations').doc(orgId)
    .collection('users').doc('mary_wagnon')
    .collection('packages').doc('mary_wagnon_1athleteprivate_1773871915').get();
  console.log(JSON.stringify(pkg.data(), null, 2));

  // Are there any bookings referencing this package?
  console.log('\n=== Any bookings using this package ===');
  const snap = await db.collection('bookings')
    .where('packageId', '==', 'mary_wagnon_1athleteprivate_1773871915')
    .get();
  console.log(`Bookings using packageId 'mary_wagnon_1athleteprivate_1773871915': ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: status=${data.status} startTime=${data.startTime?.toDate?.()}`);
  });

  const snap2 = await db.collection('bookings')
    .where('lessonPackageId', '==', 'mary_wagnon_1athleteprivate_1773871915')
    .get();
  console.log(`Bookings using lessonPackageId: ${snap2.size}`);
}
run().catch(console.error);
