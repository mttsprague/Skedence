const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function run() {
  const userId = 'jason_hargis';
  const orgId = 'polyface_volleyball_academy_';

  // 1. User document
  const userDoc = await db.collection('users').doc(userId).get();
  console.log('=== USER DOCUMENT ===');
  const u = userDoc.data();
  console.log(JSON.stringify(u, null, 2));

  // 2. Packages - standard path
  console.log('\n=== PACKAGES (standard: organizations/orgId/users/jason_hargis/packages) ===');
  const stdSnap = await db.collection('organizations').doc(orgId).collection('users').doc(userId).collection('packages').get();
  console.log('Count:', stdSnap.size);
  stdSnap.docs.forEach(d => {
    const p = d.data();
    console.log(`  [${d.id}]`);
    console.log(`    packageType: ${p.packageType}`);
    console.log(`    packageCategory: ${p.packageCategory}`);
    console.log(`    packageName: ${p.packageName}`);
    console.log(`    totalLessons: ${p.totalLessons}, lessonsUsed: ${p.lessonsUsed}, remaining: ${p.totalLessons - (p.lessonsUsed||0)}`);
    console.log(`    amountPaid: $${(p.amountPaid/100).toFixed(2)}`);
    console.log(`    purchaseDate: ${p.purchaseDate?.toDate?.()}`);
    console.log(`    expirationDate: ${p.expirationDate?.toDate?.()}`);
    console.log(`    transactionId: ${p.transactionId}`);
  });

  // 3. Packages - legacy path
  console.log('\n=== PACKAGES (legacy: users/jason_hargis/lessonPackages) ===');
  const legSnap = await db.collection('users').doc(userId).collection('lessonPackages').get();
  console.log('Count:', legSnap.size);
  legSnap.docs.forEach(d => {
    const p = d.data();
    console.log(`  [${d.id}] packageType:${p.packageType} total:${p.totalLessons} used:${p.lessonsUsed} paid:$${(p.amountPaid/100).toFixed(2)}`);
  });

  // 4. Bookings
  console.log('\n=== BOOKINGS (as client) ===');
  const bookSnap = await db.collection('bookings').where('clientId', '==', userId).get();
  console.log('Count:', bookSnap.size);
  bookSnap.docs.forEach(d => {
    const b = d.data();
    console.log(`  [${d.id}]`);
    console.log(`    isClassBooking: ${b.isClassBooking || false}`);
    console.log(`    status: ${b.status}`);
    console.log(`    startTime: ${b.startTime?.toDate?.()}`);
    console.log(`    trainerId: ${b.trainerUID || b.trainerId}`);
    console.log(`    packageId: ${b.lessonPackageId || b.packageId}`);
    console.log(`    athleteName: ${b.athleteName}`);
  });

  // 5. Class registrations
  console.log('\n=== CLASS REGISTRATIONS ===');
  const regSnap = await db.collection('classRegistrations').where('clientId', '==', userId).get();
  console.log('Count:', regSnap.size);
  regSnap.docs.forEach(d => {
    const r = d.data();
    console.log(`  [${d.id}] classId:${r.classId} registeredAt:${r.registeredAt?.toDate?.()}`);
  });

  // 6. All classes where jason is a participant
  console.log('\n=== CLASSES (participant subcollections) ===');
  const classesSnap = await db.collection('classes').where('orgId', '==', orgId).get();
  for (const cls of classesSnap.docs) {
    const partDoc = await db.collection('classes').doc(cls.id).collection('participants').doc(userId + '_Josephine_Hargis').get();
    // Try all docs in participants
    const allParts = await db.collection('classes').doc(cls.id).collection('participants').where('userId', '==', userId).get();
    if (!allParts.empty) {
      const clsData = cls.data();
      console.log(`  Class [${cls.id}] title:"${clsData.title}" date:${clsData.startTime?.toDate?.()}`);
      allParts.docs.forEach(p => {
        const pd = p.data();
        console.log(`    participant doc [${p.id}]: ${pd.firstName} ${pd.lastName} athlete:${pd.athleteName || 'N/A'} registeredAt:${pd.registeredAt?.toDate?.()}`);
      });
    }
  }

  // 7. Activity feed
  console.log('\n=== ACTIVITY (related to jason_hargis) ===');
  const actSnap = await db.collection('activities')
    .where('orgId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const jasonActivity = actSnap.docs.filter(d => {
    const data = d.data();
    const str = JSON.stringify(data).toLowerCase();
    return str.includes('jason') || str.includes('jason_hargis');
  });
  console.log('Jason-related activity count:', jasonActivity.length);
  jasonActivity.forEach(d => {
    const a = d.data();
    console.log(`  [${d.id}] type:${a.type || a.action} message:${a.message || a.description} at:${a.createdAt?.toDate?.()}`);
  });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
