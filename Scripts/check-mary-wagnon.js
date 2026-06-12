const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

const ORG_ID = 'polyface_volleyball_academy_';

async function run() {
  console.log('=== Checking Mary Wagnon bookings ===\n');

  // 1. Find Mary's user docs
  const users = await db.collection('users')
    .where('firstName', '==', 'Mary')
    .where('lastName', '==', 'Wagnon')
    .get();
  console.log('User docs:', users.size);
  const userDocIds = [];
  const authUids = [];
  users.forEach(d => {
    const data = d.data();
    console.log(`  Doc ID: ${d.id} | authUserId: ${data.authUserId} | email: ${data.email || data.emailAddress}`);
    userDocIds.push(d.id);
    if (data.authUserId) authUids.push(data.authUserId);
  });

  // 2. Search bookings by clientId / clientUID (name-based doc IDs)
  console.log('\n--- Bookings by clientId (name-based) ---');
  for (const docId of userDocIds) {
    const snap = await db.collection('bookings').where('clientId', '==', docId).get();
    console.log(`  bookings where clientId='${docId}': ${snap.size}`);
    snap.forEach(d => {
      const data = d.data();
      console.log(`    Doc ID: ${d.id}`);
      console.log(`      status: ${data.status}`);
      console.log(`      startTime: ${data.startTime?.toDate?.()}`);
      console.log(`      packageId: ${data.packageId}`);
      console.log(`      clientAuthUID: ${data.clientAuthUID}`);
      console.log(`      clientUID: ${data.clientUID}`);
      console.log(`      trainerId: ${data.trainerId}`);
      console.log(`      slotId: ${data.slotId || data.scheduleSlotId}`);
    });

    const snap2 = await db.collection('bookings').where('clientUID', '==', docId).get();
    if (snap2.size > 0) {
      console.log(`  bookings where clientUID='${docId}': ${snap2.size}`);
      snap2.forEach(d => {
        const data = d.data();
        console.log(`    Doc ID: ${d.id} | status: ${data.status} | startTime: ${data.startTime?.toDate?.()}`);
      });
    }
  }

  // 3. Search bookings by authUID
  console.log('\n--- Bookings by clientAuthUID ---');
  for (const uid of authUids) {
    const snap = await db.collection('bookings').where('clientAuthUID', '==', uid).get();
    console.log(`  bookings where clientAuthUID='${uid}': ${snap.size}`);
    snap.forEach(d => {
      const data = d.data();
      console.log(`    Doc ID: ${d.id} | status: ${data.status} | startTime: ${data.startTime?.toDate?.()}`);
    });
  }

  // 4. Check packages
  console.log('\n--- Packages ---');
  for (const docId of userDocIds) {
    const pkgs = await db.collection('organizations').doc(ORG_ID)
      .collection('users').doc(docId).collection('packages').get();
    console.log(`  organizations/.../users/${docId}/packages: ${pkgs.size}`);
    pkgs.forEach(p => {
      const d = p.data();
      console.log(`    ${p.id}: type=${d.packageType} total=${d.totalLessons} used=${d.lessonsUsed} remaining=${d.remainingLessons}`);
    });
  }

  // 5. Check if booking IDs that appear in client app might be in a sub-collection or different place
  // Look for any booking with Mary in the name
  console.log('\n--- Searching booking IDs starting with mary ---');
  const byId = await db.collection('bookings').where('__name__', '>=', 'mary_wagnon').where('__name__', '<', 'mary_wagnonn').get();
  console.log(`  Bookings with ID starting with 'mary_wagnon': ${byId.size}`);
  byId.forEach(d => {
    const data = d.data();
    console.log(`    Doc ID: ${d.id} | status: ${data.status} | startTime: ${data.startTime?.toDate?.()}`);
  });

  console.log('\n=== Done ===');
}

run().catch(console.error);
