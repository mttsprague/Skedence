const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  const classId = 'attacking_class1778954400';
  const userId = 'jason_hargis';
  const orgId = 'polyface_volleyball_academy_';

  // Check there's still no booking
  const existing = await db.collection('bookings').where('clientUID', '==', userId).where('classId', '==', classId).get();
  if (!existing.empty) {
    console.log('Booking already exists:', existing.docs[0].id);
    process.exit(0);
  }

  const classDoc = await db.collection('classes').doc(classId).get();
  const classData = classDoc.data();

  const bookingRef = await db.collection('bookings').add({
    clientUID: userId,
    trainerId: classData.trainerId || '',
    trainerName: classData.trainerName || '',
    orgId: orgId,
    startTime: classData.startTime,
    endTime: classData.endTime,
    status: 'booked',
    isClassBooking: true,
    classId: classId,
    packageId: '',
    lessonPackageId: '',
    location: classData.location || '',
    seriesId: classData.seriesId || null,
    isPartOfSeries: !!classData.seriesId,
    bookedAt: admin.firestore.FieldValue.serverTimestamp(),
    backfillNote: 'backfilled - booking was missing due to bug in original registration',
  });

  console.log('Created booking:', bookingRef.id);
  console.log('Done!');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
