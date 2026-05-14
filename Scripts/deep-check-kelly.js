// deep-check-kelly.js
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

const ORG_ID = 'polyface_volleyball_academy_';

async function run() {
  // Check bookings with clientId field
  const snap1 = await db.collection('bookings').where('clientId', '==', 'kelly_hailey').get();
  console.log('bookings by clientId:', snap1.size);
  snap1.forEach(d => {
    const data = d.data();
    console.log(' ', d.id, 'classId:', data.classId, 'isClassBooking:', data.isClassBooking, 'status:', data.status);
  });

  // Check classRegistrations with clientId
  const snap2 = await db.collection('classRegistrations').where('clientId', '==', 'kelly_hailey').get();
  console.log('\nclassRegistrations by clientId:', snap2.size);
  snap2.forEach(d => console.log(' ', d.data().classId));

  // Also try userId field
  const snap2b = await db.collection('classRegistrations').where('userId', '==', 'kelly_hailey').get();
  console.log('classRegistrations by userId:', snap2b.size);

  // Find upcoming classes for rest of this week
  const now = new Date();
  const weekOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const snap3 = await db.collection('classes').where('orgId', '==', ORG_ID).get();
  console.log('\nAll org classes:', snap3.size);

  for (const d of snap3.docs) {
    const data = d.data();
    const st = data.startTime ? data.startTime.toDate() : null;
    if (!st || st < now || st > weekOut) continue;
    console.log('\nUpcoming class:', data.className || data.title || d.id);
    console.log('  id:', d.id);
    console.log('  startTime:', st.toLocaleString());
    console.log('  currentParticipants:', data.currentParticipants);
    const pSnap = await db.collection('classes').doc(d.id).collection('participants').get();
    console.log('  participant docs in subcollection:', pSnap.size);
    pSnap.forEach(p => {
      const pd = p.data();
      console.log('    -', pd.firstName, pd.lastName, '| userId:', pd.userId, '| registeredAt:', pd.registeredAt ? 'exists' : 'null');
    });
  }

  // Activities
  const actSnap = await db.collection('activities').where('actorId', '==', 'kelly_hailey').get();
  console.log('\nactivities for kelly_hailey:', actSnap.size);
  actSnap.forEach(d => console.log(' ', d.data().type, '|', d.data().description, '| orgId:', d.data().orgId));

  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
