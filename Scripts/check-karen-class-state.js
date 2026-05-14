const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function check() {
  const classId = 'attacking_class1778954400';
  const userId = 'karen_knisely';

  console.log('=== ATTACKING CLASS participants subcollection ===');
  const partsSnap = await db.collection('classes').doc(classId).collection('participants').get();
  console.log('Count:', partsSnap.size);
  partsSnap.docs.forEach(d => {
    const p = d.data();
    console.log(`  [${d.id}] ${p.firstName} ${p.lastName} athlete:${p.athleteName} userId:${p.userId} classPassPackageId:${p.classPassPackageId}`);
  });

  console.log('\n=== CLASS document ===');
  const classDoc = await db.collection('classes').doc(classId).get();
  const cd = classDoc.data();
  console.log('  currentParticipants:', cd.currentParticipants);
  console.log('  participantIds:', cd.participantIds);

  console.log('\n=== KAREN classRegistrations ===');
  const regSnap = await db.collection('classRegistrations').where('clientId', '==', userId).get();
  console.log('Count:', regSnap.size);
  regSnap.docs.forEach(d => console.log('  ', d.id, d.data()));

  console.log('\n=== KAREN packages ===');
  const orgId = 'polyface_volleyball_academy_';
  const pkgSnap = await db.collection('organizations').doc(orgId).collection('users').doc(userId).collection('packages').get();
  console.log('Count:', pkgSnap.size);
  pkgSnap.docs.forEach(d => {
    const p = d.data();
    console.log(`  [${d.id}] type:${p.packageType} cat:${p.packageCategory} total:${p.totalLessons} used:${p.lessonsUsed} remaining:${p.totalLessons-(p.lessonsUsed||0)}`);
  });
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
