const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

const ORG_ID = 'polyface_volleyball_academy_';

async function run() {
  console.log('=== Checking Ashley Schexnaildre ===\n');

  // 1. Check all user docs by name
  console.log('--- User docs (by name) ---');
  const byFirst = await db.collection('users')
    .where('firstName', '==', 'Ashley')
    .where('lastName', '==', 'Schexnaildre')
    .get();
  console.log('Users with firstName=Ashley lastName=Schexnaildre:', byFirst.size);
  byFirst.forEach(d => {
    const data = d.data();
    console.log(`  Doc ID: ${d.id}`);
    console.log(`    authUserId: ${data.authUserId}`);
    console.log(`    email/emailAddress: ${data.email || data.emailAddress}`);
    console.log(`    isActive: ${data.isActive}`);
    console.log(`    orgId: ${data.orgId}`);
    console.log(`    createdAt: ${data.createdAt?.toDate?.()}`);
  });

  // 2. Check by email
  console.log('\n--- User docs (by email) ---');
  const byEmail1 = await db.collection('users').where('email', '==', 'ashleyschex@yahoo.com').get();
  const byEmail2 = await db.collection('users').where('emailAddress', '==', 'ashleyschex@yahoo.com').get();
  const allByEmail = [...byEmail1.docs, ...byEmail2.docs];
  const emailDocIds = new Set();
  allByEmail.forEach(d => {
    if (emailDocIds.has(d.id)) return;
    emailDocIds.add(d.id);
    const data = d.data();
    console.log(`  Doc ID: ${d.id}`);
    console.log(`    authUserId: ${data.authUserId}`);
    console.log(`    firstName: ${data.firstName} ${data.lastName}`);
    console.log(`    isActive: ${data.isActive}`);
    console.log(`    createdAt: ${data.createdAt?.toDate?.()}`);
  });
  if (allByEmail.length === 0) console.log('  None found');

  // 3. Check specific known doc IDs
  const candidateIds = ['ashley_schexnaildre', 'ashley_schexnaildre_2', 'ashley_schexnaildre_3'];
  console.log('\n--- Checking specific doc IDs ---');
  for (const docId of candidateIds) {
    const doc = await db.collection('users').doc(docId).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`  FOUND: users/${docId}`);
      console.log(`    authUserId: ${data.authUserId}`);
      console.log(`    email: ${data.email || data.emailAddress}`);
      console.log(`    isActive: ${data.isActive}`);
      console.log(`    orgId: ${data.orgId}`);
      console.log(`    createdAt: ${data.createdAt?.toDate?.()}`);
    } else {
      console.log(`  NOT found: users/${docId}`);
    }
  }

  // 4. Check orgMembers by email pattern
  console.log('\n--- OrgMembers (authUserId lookup for all found docs) ---');
  const allUserDocs = new Map();
  [...byFirst.docs, ...allByEmail].forEach(d => allUserDocs.set(d.id, d.data()));
  for (const docId of candidateIds) {
    const doc = await db.collection('users').doc(docId).get();
    if (doc.exists) allUserDocs.set(docId, doc.data());
  }

  for (const [docId, data] of allUserDocs) {
    // Check orgMembers by userId field
    const byUserId = await db.collection('orgMembers').where('userId', '==', docId).get();
    console.log(`  OrgMembers where userId='${docId}': ${byUserId.size}`);
    byUserId.forEach(d => {
      console.log(`    Doc: ${d.id} | isActive: ${d.data().isActive} | role: ${d.data().role} | authUserId: ${d.data().authUserId}`);
    });

    // Check orgMembers by authUserId field
    if (data.authUserId) {
      const byAuthId = await db.collection('orgMembers').where('authUserId', '==', data.authUserId).get();
      console.log(`  OrgMembers where authUserId='${data.authUserId}': ${byAuthId.size}`);
      byAuthId.forEach(d => {
        console.log(`    Doc: ${d.id} | isActive: ${d.data().isActive} | userId: ${d.data().userId}`);
      });
    }
  }

  // 5. Check packages for all candidate doc IDs
  console.log('\n--- Packages under org path ---');
  for (const docId of [...allUserDocs.keys()]) {
    const pkgs = await db.collection('organizations').doc(ORG_ID)
      .collection('users').doc(docId).collection('packages').get();
    console.log(`  organizations/${ORG_ID}/users/${docId}/packages: ${pkgs.size} packages`);
    pkgs.forEach(p => {
      const d = p.data();
      console.log(`    ${p.id}: ${d.packageType || d.packageCategory} | total=${d.totalLessons} used=${d.lessonsUsed} | purchaseDate=${d.purchaseDate?.toDate?.()}`);
    });
  }

  // 6. Check old lessonPackages path
  console.log('\n--- Legacy lessonPackages path ---');
  for (const docId of [...allUserDocs.keys()]) {
    const legacy = await db.collection('users').doc(docId).collection('lessonPackages').get();
    console.log(`  users/${docId}/lessonPackages: ${legacy.size}`);
  }

  console.log('\n=== Done ===');
}

run().catch(console.error);
