const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkMembership() {
  const userId = 'c4ZOM2wcd2Yq9ayyKNcFUkJ7ISm2';
  const orgId = 'WzKHgatuBSc6t6RQ3YlD';
  const membershipId = `${userId}_${orgId}`;
  
  console.log(`\n🔍 Checking membership document: orgMembers/${membershipId}\n`);
  
  try {
    const doc = await db.collection('orgMembers').doc(membershipId).get();
    
    if (!doc.exists) {
      console.log('❌ Document does not exist!');
      console.log('\n📋 Listing all orgMembers documents for this user:\n');
      const userDocs = await db.collection('orgMembers').where('userId', '==', userId).get();
      userDocs.forEach(d => {
        console.log(`  - ${d.id}:`, d.data());
      });
    } else {
      console.log('✅ Document exists!');
      console.log('\nDocument data:');
      console.log(JSON.stringify(doc.data(), null, 2));
      
      const data = doc.data();
      console.log('\n🔍 Checking required fields:');
      console.log(`  - userId: ${data.userId} (expected: ${userId}) ${data.userId === userId ? '✅' : '❌'}`);
      console.log(`  - orgId: ${data.orgId} (expected: ${orgId}) ${data.orgId === orgId ? '✅' : '❌'}`);
      console.log(`  - isActive: ${data.isActive} (expected: true) ${data.isActive === true ? '✅' : '❌'}`);
      console.log(`  - role: ${data.role}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkMembership();
