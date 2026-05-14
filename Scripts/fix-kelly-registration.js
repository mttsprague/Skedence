// fix-kelly-registration.js
// Diagnose and fix Kelly Hailey's missing participant/booking/activity docs
// Run: node Scripts/fix-kelly-registration.js

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}

const db = admin.firestore();

const KELLY_USER_ID = 'kelly_hailey';
const ORG_ID = 'polyface_volleyball_academy_';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no writes) ===' : '=== LIVE RUN (will write to Firestore) ===');
  console.log('');

  // 1. Get Kelly's full user doc
  const kellyDoc = await db.collection('users').doc(KELLY_USER_ID).get();
  if (!kellyDoc.exists) {
    console.error('❌ Kelly user doc not found!');
    return;
  }
  const kellyData = kellyDoc.data();
  console.log('✅ Kelly user doc:', {
    firstName: kellyData.firstName,
    lastName: kellyData.lastName,
    orgId: kellyData.orgId,
    authUserId: kellyData.authUserId
  });

  // 2. Show ALL classRegistrations for Kelly (both clientId and userId fields)
  const regsByClientId = await db.collection('classRegistrations')
    .where('clientId', '==', KELLY_USER_ID).get();
  const regsByUserId = await db.collection('classRegistrations')
    .where('userId', '==', KELLY_USER_ID).get();

  console.log(`\nclassRegistrations by clientId: ${regsByClientId.size}`);
  for (const doc of regsByClientId.docs) {
    console.log(`  Doc ID: ${doc.id}`);
    console.log(`  Data:`, JSON.stringify(doc.data(), null, 4));
  }

  console.log(`\nclassRegistrations by userId: ${regsByUserId.size}`);
  for (const doc of regsByUserId.docs) {
    console.log(`  Doc ID: ${doc.id}`);
    console.log(`  Data:`, JSON.stringify(doc.data(), null, 4));
  }

  // Combine unique classRegistrations
  const allRegDocs = new Map();
  for (const doc of [...regsByClientId.docs, ...regsByUserId.docs]) {
    allRegDocs.set(doc.id, doc.data());
  }

  if (allRegDocs.size === 0) {
    console.log('\n❌ No classRegistrations found for Kelly — nothing to fix.');
    return;
  }

  // 3. For each registration, check the class and participant subcollection
  console.log('\n=== Checking participant subcollections ===');

  const classesToFix = [];

  for (const [docId, regData] of allRegDocs.entries()) {
    // classId might be stored in the regData or might be the doc ID
    const classId = regData.classId || docId;
    console.log(`\nChecking class: ${classId} (regDoc: ${docId})`);

    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) {
      console.log(`  ⚠️  Class doc not found!`);
      continue;
    }
    const classData = classDoc.data();
    console.log(`  Class title: "${classData.title || '?'}"`);
    console.log(`  currentParticipants: ${classData.currentParticipants}`);
    
    const now = new Date();
    const classDate = classData.startTime ? classData.startTime.toDate() : null;
    if (classDate) {
      console.log(`  Class date: ${classDate.toLocaleString()}`);
    }

    // Check if Kelly already has a participant doc (any format)
    const participantsSnap = await db.collection('classes').doc(classId)
      .collection('participants').get();
    console.log(`  Participant docs (${participantsSnap.size}):`);
    let kellyParticipantExists = false;
    for (const pDoc of participantsSnap.docs) {
      const pData = pDoc.data();
      console.log(`    ${pDoc.id}: userId=${pData.userId}, athleteName=${pData.athleteName}`);
      if (pData.userId === KELLY_USER_ID || pDoc.id.startsWith(KELLY_USER_ID)) {
        kellyParticipantExists = true;
        console.log(`    ^ KELLY IS ALREADY HERE`);
      }
    }

    if (!kellyParticipantExists) {
      console.log(`  ⚠️  Kelly is NOT in participants subcollection!`);
      classesToFix.push({ classId, classData, regData, regDocId: docId });
    } else {
      console.log(`  ✅ Kelly already in participants subcollection, skipping.`);
    }
  }

  // 4. Check existing bookings for Kelly
  console.log('\n=== Checking existing bookings ===');
  const bookingsSnap = await db.collection('bookings')
    .where('clientUID', '==', KELLY_USER_ID).get();
  const bookingsByClientId = await db.collection('bookings')
    .where('clientId', '==', KELLY_USER_ID).get();
  console.log(`Bookings by clientUID: ${bookingsSnap.size}`);
  console.log(`Bookings by clientId: ${bookingsByClientId.size}`);
  
  const existingClassBookings = new Set();
  for (const doc of [...bookingsSnap.docs, ...bookingsByClientId.docs]) {
    const d = doc.data();
    if (d.isClassBooking && d.classId) {
      existingClassBookings.add(d.classId);
      console.log(`  Existing class booking: ${d.classId}`);
    }
  }

  // 5. Perform the fix
  if (classesToFix.length === 0) {
    console.log('\n✅ No fixes needed — Kelly is already in all participant subcollections.');
    return;
  }

  console.log(`\n=== FIXES NEEDED: ${classesToFix.length} classes ===`);

  const kellyFullName = `${kellyData.firstName || 'Kelly'} ${kellyData.lastName || 'Hailey'}`.trim();
  const kellyOrgId = kellyData.orgId || ORG_ID;

  for (const fix of classesToFix) {
    const { classId, classData, regData } = fix;
    // Use athlete name from classRegistration, fall back to account holder's name
    const athleteName = (regData.athleteName || kellyFullName).trim();
    console.log(`\nFixing class: ${classId} ("${classData.title}") for athlete: "${athleteName}"`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would write:`);
      console.log(`    - classes/${classId}/participants/kelly_hailey_${athleteName.replace(/\s+/g, '_')}`);
      if (!existingClassBookings.has(classId)) {
        console.log(`    - bookings/{new doc} (isClassBooking: true, classId: ${classId})`);
      }
      console.log(`    - activities/{new doc} (type: class_registered, athlete: ${athleteName})`);
      continue;
    }

    const batch = db.batch();

    // Write participant doc
    const participantId = `${KELLY_USER_ID}_${athleteName.replace(/\s+/g, '_')}`;
    const participantRef = db.collection('classes').doc(classId)
      .collection('participants').doc(participantId);
    batch.set(participantRef, {
      userId: KELLY_USER_ID,
      authUserId: kellyData.authUserId || '',
      firstName: kellyData.firstName || 'Kelly',
      lastName: kellyData.lastName || 'Hailey',
      athleteName: athleteName,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      classPassPackageId: regData.classPassPackageId || null,
      fixedAt: admin.firestore.FieldValue.serverTimestamp(),
      fixNote: 'Backfilled by fix-kelly-registration.js',
    });

    // Write booking doc (if not already exists)
    if (!existingClassBookings.has(classId)) {
      const bookingRef = db.collection('bookings').doc();
      batch.set(bookingRef, {
        clientUID: KELLY_USER_ID,
        clientId: KELLY_USER_ID,
        trainerId: classData.trainerId || '',
        trainerName: classData.trainerName || '',
        orgId: kellyOrgId,
        startTime: classData.startTime,
        endTime: classData.endTime,
        status: 'booked',
        isClassBooking: true,
        classId: classId,
        packageId: regData.classPassPackageId || null,
        lessonPackageId: regData.classPassPackageId || null,
        athleteName: athleteName,
        athleteNames: [athleteName],
        location: classData.location || '',
        seriesId: regData.seriesId || null,
        isPartOfSeries: !!regData.seriesId,
        bookedAt: admin.firestore.FieldValue.serverTimestamp(),
        fixNote: 'Backfilled by fix-kelly-registration.js',
      });
    } else {
      console.log(`  Booking already exists for ${classId}, skipping.`);
    }

    // Write activity doc
    const activityTimestamp = Math.floor(Date.now() / 1000);
    const activityId = `${KELLY_USER_ID}_class_registered_${classId}_${activityTimestamp}`;
    const activityRef = db.collection('activities').doc(activityId);
    batch.set(activityRef, {
      type: 'class_registered',
      actorId: KELLY_USER_ID,
      actorName: kellyFullName,
      actorRole: 'client',
      targetId: classId,
      targetName: classData.title || 'Unknown Class',
      targetType: 'class',
      description: `${kellyFullName} registered ${athleteName} for ${classData.title || 'class'}`,
      metadata: {
        classId: classId,
        classPassPackageId: regData.classPassPackageId || null,
        athleteName: athleteName,
        startTime: classData.startTime || null,
        endTime: classData.endTime || null,
        location: classData.location || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        fixNote: 'Backfilled by fix-kelly-registration.js',
      },
      orgId: kellyOrgId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    console.log(`  ✅ Fixed! Wrote participant doc, booking (if needed), and activity.`);
  }

  console.log('\n=== Done ===');
  if (!DRY_RUN) {
    console.log('Kelly should now appear in participant lists!');
    console.log('NOTE: currentParticipants count was NOT adjusted (was already incremented previously).');
  }
}

main().catch(console.error).finally(() => process.exit());
