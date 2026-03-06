const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function check() {
  console.log('\n🔍 Checking documents for: leanora_brown\n');
  
  // Check NEW path
  console.log('📂 NEW path: users/leanora_brown/documents/');
  const newDocs = await db.collection('users').doc('leanora_brown').collection('documents').get();
  console.log(`   Found: ${newDocs.size} documents`);
  
  if (newDocs.size > 0) {
    console.log();
    newDocs.forEach(doc => {
      const data = doc.data();
      console.log(`   - Type: ${data.type}`);
      console.log(`     Athlete: ${data.athleteName || 'N/A'}`);
      console.log(`     Uploaded: ${data.uploadedAt?.toDate() || 'N/A'}\n`);
    });
  }
  
  // Check OLD path
  console.log('\n📂 OLD path: users/oHHnRBQehlZbudjdqDl9pPRLfLk2/documents/');
  const oldDocs = await db.collection('users').doc('oHHnRBQehlZbudjdqDl9pPRLfLk2').collection('documents').get();
  console.log(`   Found: ${oldDocs.size} documents`);
  
  if (oldDocs.size > 0) {
    console.log('\n   ⚠️  WAIVERS IN OLD PATH (Jeff cannot see these):');
    oldDocs.forEach(doc => {
      const data = doc.data();
      console.log(`   - Type: ${data.type}`);
      console.log(`     Athlete: ${data.athleteName || 'N/A'}`);
      console.log(`     Uploaded: ${data.uploadedAt?.toDate() || 'N/A'}\n`);
    });
  }
  
  console.log('\n✅ Check complete!\n');
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
