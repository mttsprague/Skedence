const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function fix() {
  const orgId = 'polyface_volleyball_academy_';
  const userId = 'jason_hargis';
  const passId = 'lvbkTakYmMT5U57Cosjg'; // 2nd pass purchased at 6:33:58pm

  const passRef = db.collection('organizations').doc(orgId).collection('users').doc(userId).collection('packages').doc(passId);
  const before = (await passRef.get()).data();
  console.log('Before:', { lessonsUsed: before.lessonsUsed, totalLessons: before.totalLessons, remaining: before.totalLessons - before.lessonsUsed });

  await passRef.update({ lessonsUsed: 0 });

  const after = (await passRef.get()).data();
  console.log('After:', { lessonsUsed: after.lessonsUsed, totalLessons: after.totalLessons, remaining: after.totalLessons - after.lessonsUsed });
  console.log('Done — Jason now has 1 remaining class pass.');
}
fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
