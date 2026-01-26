const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPackages() {
  const orgId = 'aLxHq5mFam5ohsLM1okb';
  
  const members = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('role', '==', 'client')
    .get();
  
  console.log('\n=== Checking Client Packages ===\n');
  
  for (const memberDoc of members.docs) {
    const userId = memberDoc.data().userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    
    console.log(`Client: ${name} (${userId})`);
    
    // Check NEW path
    const newPkgs = await db.collection('organizations').doc(orgId)
      .collection('users').doc(userId)
      .collection('packages')
      .get();
    
    console.log(`  NEW path (${newPkgs.size} packages):`);
    newPkgs.forEach(doc => {
      const d = doc.data();
      const rem = (d.totalLessons || 0) - (d.lessonsUsed || 0);
      console.log(`    ${d.packageType} | cat:${d.packageCategory} | name:${d.packageName || 'null'} | ${rem}/${d.totalLessons}`);
    });
    
    // Check OLD path
    const oldPkgs = await db.collection('users').doc(userId)
      .collection('lessonPackages')
      .get();
    
    console.log(`  OLD path (${oldPkgs.size} packages):`);
    oldPkgs.forEach(doc => {
      const d = doc.data();
      const rem = (d.totalLessons || 0) - (d.lessonsUsed || 0);
      console.log(`    ${d.packageType} | cat:${d.packageCategory} | name:${d.packageName || 'null'} | ${rem}/${d.totalLessons}`);
    });
    
    console.log('');
  }
  
  process.exit(0);
}

checkPackages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
