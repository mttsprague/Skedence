// check-kelly-participants.js
// Diagnostic: find Kelly Hailey's class registrations and check participant docs
// Run with: node Scripts/check-kelly-participants.js

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

const ORG_ID = 'polyface_volleyball_academy_';

async function run() {
  console.log('\n🔍 Looking up Kelly Hailey user doc...\n');

  // Find Kelly by name in users collection
  const usersSnap = await db.collection('users')
    .where('orgId', '==', ORG_ID)
    .get();

  let kellyDoc = null;
  for (const d of usersSnap.docs) {
    const data = d.data();
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
    if (fullName.includes('kelly') || fullName.includes('hailey')) {
      kellyDoc = { id: d.id, ...data };
      console.log(`✅ Found user: ${d.id}`);
      console.log(`   Name: ${data.firstName} ${data.lastName}`);
      console.log(`   orgId: ${data.orgId}`);
      console.log(`   organizationId: ${data.organizationId}`);
      console.log(`   authUserId: ${data.authUserId}`);
    }
  }

  if (!kellyDoc) {
    // Also try legacy organizationId field
    const snap2 = await db.collection('users').where('organizationId', '==', ORG_ID).get();
    for (const d of snap2.docs) {
      const data = d.data();
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
      if (fullName.includes('kelly') || fullName.includes('hailey')) {
        kellyDoc = { id: d.id, ...data };
        console.log(`✅ Found user (via organizationId): ${d.id}`);
        console.log(`   Name: ${data.firstName} ${data.lastName}`);
        console.log(`   orgId: ${data.orgId}`);
        console.log(`   organizationId: ${data.organizationId}`);
      }
    }
  }

  if (!kellyDoc) {
    console.log('❌ Could not find Kelly Hailey in users collection');
    process.exit(1);
  }

  const kellyUserId = kellyDoc.id;

  // Find recent bookings for Kelly
  console.log('\n📅 Recent class bookings for Kelly...\n');
  const bookingsSnap = await db.collection('bookings')
    .where('clientUID', '==', kellyUserId)
    .where('isClassBooking', '==', true)
    .get();

  console.log(`Found ${bookingsSnap.size} class booking(s)`);
  const classIds = new Set();
  for (const d of bookingsSnap.docs) {
    const data = d.data();
    const startTime = data.startTime?.toDate?.()?.toLocaleString() || 'unknown';
    console.log(`  Booking: ${d.id}`);
    console.log(`    classId: ${data.classId}`);
    console.log(`    startTime: ${startTime}`);
    console.log(`    status: ${data.status}`);
    if (data.classId) classIds.add(data.classId);
  }

  if (classIds.size === 0) {
    console.log('❌ No class bookings found. Checking classRegistrations...');
    const regSnap = await db.collection('classRegistrations')
      .where('userId', '==', kellyUserId)
      .get();
    console.log(`Found ${regSnap.size} classRegistration(s)`);
    for (const d of regSnap.docs) {
      const data = d.data();
      console.log(`  Registration: ${d.id}  classId=${data.classId}`);
      if (data.classId) classIds.add(data.classId);
    }
  }

  // Check participant docs in each class
  console.log('\n👥 Checking participants subcollections...\n');
  for (const classId of classIds) {
    const classDoc = await db.collection('classes').doc(classId).get();
    const classData = classDoc.data() || {};
    const className = classData.className || classData.title || classId;
    const startTime = classData.startTime?.toDate?.()?.toLocaleString() || 'unknown';
    console.log(`Class: ${className} (${startTime})`);
    console.log(`  doc ID: ${classId}`);
    console.log(`  currentParticipants: ${classData.currentParticipants}`);

    const participantsSnap = await db.collection('classes').doc(classId).collection('participants').get();
    console.log(`  participants subcollection count: ${participantsSnap.size}`);
    for (const p of participantsSnap.docs) {
      const pd = p.data();
      const regTime = pd.registeredAt?.toDate?.()?.toLocaleString() || 'pending server timestamp';
      console.log(`    - ${p.id}`);
      console.log(`      firstName: ${pd.firstName}  lastName: ${pd.lastName}`);
      console.log(`      athleteName: ${pd.athleteName}`);
      console.log(`      userId: ${pd.userId}`);
      console.log(`      registeredAt: ${regTime}`);
    }
    console.log('');
  }

  // Check activities
  console.log('\n📋 Activity log entries for Kelly...\n');
  const actSnap = await db.collection('activities')
    .where('actorId', '==', kellyUserId)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();
  console.log(`Found ${actSnap.size} activity docs with actorId=${kellyUserId}`);
  for (const d of actSnap.docs) {
    const data = d.data();
    console.log(`  ${d.id}: type=${data.type}  orgId=${data.orgId}`);
    console.log(`    desc: ${data.description}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
