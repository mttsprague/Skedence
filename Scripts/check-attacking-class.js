const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function check() {
  const classesSnap = await db.collection('classes')
    .where('orgId', '==', 'polyface_volleyball_academy_')
    .get();

  console.log('Total classes found:', classesSnap.size);
  for (const docSnap of classesSnap.docs) {
    const d = docSnap.data();
    console.log('  class:', docSnap.id, '| className:', d.className, '| title:', d.title);
    if (true) {
      console.log('Class doc ID:', docSnap.id);
      console.log('  className:', d.className);
      console.log('  currentParticipants:', d.currentParticipants);
      console.log('  maxParticipants:', d.maxParticipants);
      console.log('  participantIds:', JSON.stringify(d.participantIds));

      const partsSnap = await db.collection('classes').doc(docSnap.id).collection('participants').get();
      console.log('  participants subcollection count:', partsSnap.size);
      partsSnap.docs.forEach(p => {
        const pd = p.data();
        console.log(`    - docId:${p.id} | ${pd.firstName} ${pd.lastName} | athleteName:${pd.athleteName || 'N/A'} | userId:${pd.userId}`);
      });
    }
  }
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
