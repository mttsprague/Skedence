const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function fix() {
  const classId = 'attacking_class1778954400';
  const classRef = db.collection('classes').doc(classId);

  // Get actual subcollection participants
  const partsSnap = await classRef.collection('participants').get();
  const userIds = partsSnap.docs.map(d => d.data().userId).filter(Boolean);
  const count = partsSnap.size;

  console.log('Subcollection participant count:', count);
  console.log('Participant userIds:', userIds);

  await classRef.update({
    currentParticipants: count,
    participantIds: userIds,
  });

  console.log('Updated attacking_class1778954400: currentParticipants =', count, ', participantIds =', userIds);
}
fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
