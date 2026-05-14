const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  // Check all bookings for jason_hargis
  const snap1 = await db.collection('bookings').where('clientUID', '==', 'jason_hargis').get();
  const snap2 = await db.collection('bookings').where('clientId', '==', 'jason_hargis').get();
  console.log('clientUID=jason_hargis:', snap1.size, 'docs');
  snap1.docs.forEach(d => {
    const data = d.data();
    console.log(' -', d.id);
    console.log('   status:', data.status, '| isClassBooking:', data.isClassBooking);
    console.log('   startTime:', data.startTime && data.startTime.toDate ? data.startTime.toDate().toISOString() : data.startTime);
    console.log('   orgId:', data.orgId);
  });
  console.log('\nclientId=jason_hargis:', snap2.size, 'docs');
  snap2.docs.forEach(d => {
    const data = d.data();
    console.log(' -', d.id, '| status:', data.status);
  });

  // Check classRegistrations
  const reg = await db.collection('classRegistrations').where('clientId', '==', 'jason_hargis').get();
  console.log('\nclassRegistrations for jason_hargis:', reg.size);
  reg.docs.forEach(d => {
    const data = d.data();
    console.log(' -', d.id);
    console.log('  ', JSON.stringify(data));
  });

  // Check if there's a different userId variation
  const usersSnap = await db.collection('users').where('firstName', '==', 'Jason').get();
  console.log('\nUsers named Jason:', usersSnap.size);
  usersSnap.docs.forEach(d => {
    const data = d.data();
    console.log(' - docId:', d.id, '| name:', data.firstName, data.lastName, '| orgId:', data.orgId);
  });

  // Check orgMembers for jason
  const orgMembers = await db.collection('orgMembers').where('userId', '==', 'jason_hargis').get();
  console.log('\norgMembers with userId=jason_hargis:', orgMembers.size);
  orgMembers.docs.forEach(d => {
    console.log(' -', d.id, JSON.stringify(d.data()));
  });

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
