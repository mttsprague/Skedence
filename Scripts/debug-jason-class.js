const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  // Get the class details
  const classDoc = await db.collection('classes').doc('attacking_class1778954400').get();
  if (!classDoc.exists) {
    console.log('Class not found!');
    process.exit(1);
  }
  const classData = classDoc.data();
  console.log('Class data:', JSON.stringify({
    id: classDoc.id,
    title: classData.title,
    startTime: classData.startTime && classData.startTime.toDate ? classData.startTime.toDate().toISOString() : classData.startTime,
    endTime: classData.endTime && classData.endTime.toDate ? classData.endTime.toDate().toISOString() : classData.endTime,
    trainerId: classData.trainerId,
    trainerName: classData.trainerName,
    location: classData.location,
    orgId: classData.orgId,
    seriesId: classData.seriesId,
  }, null, 2));

  // Check if there are any other classes in the same series
  if (classData.seriesId) {
    const seriesSnap = await db.collection('classes').where('seriesId', '==', classData.seriesId).get();
    console.log('\nClasses in series', classData.seriesId, ':', seriesSnap.size);
    seriesSnap.docs.forEach(d => {
      const d2 = d.data();
      console.log(' -', d.id, '| start:', d2.startTime && d2.startTime.toDate ? d2.startTime.toDate().toISOString() : d2.startTime);
    });
  }

  // Check the classRegistration for full data
  const regDoc = await db.collection('classRegistrations').doc('dC73I7VwJBmJ2dQkG9R2').get();
  console.log('\nRegistration doc:', JSON.stringify(regDoc.data(), null, 2));

  // Check what classPassPackageId was used
  const participants = await db.collection('classes').doc('attacking_class1778954400').collection('participants').get();
  console.log('\nParticipants in class:', participants.size);
  participants.docs.forEach(d => {
    console.log(' -', d.id, JSON.stringify(d.data()));
  });

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
