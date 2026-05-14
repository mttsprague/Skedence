const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function fix() {
  const classId = 'attacking_class1778954400';
  const userId = 'karen_knisely';

  // Pass was already manually reset to lessonsUsed:0 by admin — do NOT touch it again
  // Just clean up the stale participant + registration docs and fix class counters

  const classRef = db.collection('classes').doc(classId);
  const participantRef = classRef.collection('participants').doc('karen_knisely_Autumn_Atchley');
  const registrationRef = db.collection('classRegistrations').doc(`${userId}_${classId}`);

  const classSnap = await classRef.get();
  const currentIds = classSnap.data().participantIds || [];
  const newIds = currentIds.filter(id => id !== userId);

  await db.runTransaction(async tx => {
    tx.delete(participantRef);
    tx.delete(registrationRef);
    tx.update(classRef, {
      currentParticipants: admin.firestore.FieldValue.increment(-1),
      participantIds: newIds,
    });
  });

  console.log('Done:');
  console.log('  - Deleted participant doc karen_knisely_Autumn_Atchley');
  console.log('  - Deleted classRegistrations/karen_knisely_attacking_class1778954400');
  console.log('  - currentParticipants decremented (3 → 2)');
  console.log('  - participantIds:', newIds);
  console.log('  - Pass aaGaW0rRpeeLjnNDXloo untouched (already at lessonsUsed:0)');
}
fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
