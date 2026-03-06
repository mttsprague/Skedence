const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function check() {
  const userId = 'lenora_brown';
  console.log(`\n🔍 Complete check for: ${userId}\n`);
  
  // Check user document
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    console.log('❌ User document not found!\n');
    return;
  }
  
  const userData = userDoc.data();
  console.log('📋 User Info:');
  console.log(`  First Name: ${userData.firstName || 'N/A'}`);
  console.log(`  Last Name: ${userData.lastName || 'N/A'}`);
  console.log(`  Email: ${userData.email || userData.emailAddress || 'N/A'}`);
  console.log(`  Auth UID: ${userData.authUserId || 'N/A'}\n`);
  
  // Check NEW path
  console.log(`📂 Checking NEW path: users/${userId}/documents/`);
  const newDocs = await db.collection('users').doc(userId).collection('documents').get();
  console.log(`   Found: ${newDocs.size} documents\n`);
  
  if (newDocs.size > 0) {
    newDocs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.type}: ${data.athleteName || 'N/A'}`);
    });
    console.log();
  }
  
  // Check OLD path if authUserId exists
  if (userData.authUserId) {
    console.log(`📂 Checking OLD path: users/${userData.authUserId}/documents/`);
    const oldDocs = await db.collection('users').doc(userData.authUserId).collection('documents').get();
    console.log(`   Found: ${oldDocs.size} documents\n`);
    
    if (oldDocs.size > 0) {
      console.log('   ⚠️  WAIVERS IN OLD PATH:');
      oldDocs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.type}: ${data.athleteName || 'N/A'} (${data.uploadedAt?.toDate()})`);
      });
      console.log('\n   ❗ These need to be migrated to new path!\n');
    }
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
