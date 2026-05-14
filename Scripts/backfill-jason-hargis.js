const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('⚠️  DRY RUN MODE - no writes\n');

  // Jason's user data
  const userId = 'jason_hargis';
  const authUserId = '0b8wTfI5kEVBMYJUPRsYZrKAlMJ3';
  const classId = 'attacking_class1778954400';
  const athleteName = 'Josephine Hargis'; // from the classRegistrations docs

  // ------------------------------------------------------------------
  // 1. Deduplicate classRegistrations - there are 2 for the same class
  //    Keep the first (older), delete the second duplicate
  // ------------------------------------------------------------------
  const regSnap = await db.collection('classRegistrations')
    .where('clientId', '==', userId)
    .where('classId', '==', classId)
    .get();

  // Sort in memory to determine oldest (keep) vs duplicates (delete)
  const regDocs = regSnap.docs.sort((a, b) =>
    (a.data().registeredAt?._seconds || 0) - (b.data().registeredAt?._seconds || 0)
  );

  console.log(`classRegistrations for this class: ${regSnap.size}`);
  if (regDocs.length > 1) {
    const toDelete = regDocs.slice(1); // keep first (oldest), delete rest
    for (const d of toDelete) {
      console.log(`  Duplicate registration: ${d.id}`);
      if (!dryRun) {
        await d.ref.delete();
        console.log(`  Deleted duplicate: ${d.id}`);
      } else {
        console.log(`  Would delete duplicate: ${d.id}`);
      }
    }
  } else {
    console.log('  No duplicates to clean up');
  }

  // ------------------------------------------------------------------
  // 2. Backfill participants subcollection
  // ------------------------------------------------------------------
  const classDoc = await db.collection('classes').doc(classId).get();
  if (!classDoc.exists) {
    console.log(`\n❌ Class ${classId} not found`);
    return;
  }
  console.log(`\nClass: "${classDoc.data().title}" (${classId})`);

  const athleteDocId = `${userId}_${athleteName.replace(/\s+/g, '_')}`;
  const existingParticipant = await db.collection('classes').doc(classId)
    .collection('participants').doc(athleteDocId).get();

  if (existingParticipant.exists) {
    console.log(`\nJosephine Hargis already in participants subcollection - no backfill needed`);
  } else {
    const participantData = {
      userId,
      authUserId,
      firstName: 'Josephine',
      lastName: 'Hargis',
      athleteName,
      email: 'jasonhargis28@gmail.com',
      registeredAt: admin.firestore.Timestamp.fromMillis(1778456052 * 1000),
      classPassPackageId: null,
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
      backfillNote: 'backfilled - missing due to bug in manualRegisterForClass',
    };

    if (dryRun) {
      console.log(`\nWould write: classes/${classId}/participants/${athleteDocId}`);
      console.log(JSON.stringify(participantData, null, 2));
    } else {
      await db.collection('classes').doc(classId)
        .collection('participants').doc(athleteDocId)
        .set(participantData);
      console.log(`\nBackfilled participant: classes/${classId}/participants/${athleteDocId}`);
    }
  }

  // ------------------------------------------------------------------
  // 3. Check if a booking was created (shows in client's schedule)
  // ------------------------------------------------------------------
  const bookingsSnap = await db.collection('bookings')
    .where('clientUID', '==', userId)
    .where('classId', '==', classId)
    .get();

  console.log(`\nClass bookings (schedule entries): ${bookingsSnap.size}`);
  if (bookingsSnap.empty) {
    console.log('  No booking doc - class does NOT appear in Jason\'s iOS schedule');
    console.log('  Creating booking doc...');

    const classData = classDoc.data();
    const bookingData = {
      clientUID: userId,
      trainerId: classData.trainerId || '',
      trainerName: classData.trainerName || '',
      orgId: classData.orgId,
      startTime: classData.startTime,
      endTime: classData.endTime,
      status: 'booked',
      isClassBooking: true,
      classId,
      packageId: '',
      lessonPackageId: '',
      location: classData.location || '',
      bookedAt: admin.firestore.Timestamp.fromMillis(1778456052 * 1000),
      backfillNote: 'backfilled booking for class participant',
    };

    if (dryRun) {
      console.log('  Would create booking:');
      console.log(JSON.stringify(bookingData, null, 2));
    } else {
      const ref = await db.collection('bookings').add(bookingData);
      console.log(`  Created booking: ${ref.id}`);
    }
  } else {
    console.log('  Booking already exists - class shows in schedule');
    bookingsSnap.forEach(d => console.log(`    ${d.id}`));
  }

  console.log('\nDone.');
}

run().catch(e => { console.error(e); process.exit(1); });
