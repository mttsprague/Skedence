const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixOrgMember() {
  const userId = 'c4ZOM2wcd2Yq9ayyKNcFUkJ7ISm2';
  const orgId = 'WzKHgatuBSc6t6RQ3YlD';
  const correctId = `${userId}_${orgId}`;
  
  console.log(`\n🔍 Looking for orgMember with userId: ${userId} and orgId: ${orgId}\n`);
  
  // Find the document by querying
  const snapshot = await db.collection('orgMembers')
    .where('userId', '==', userId)
    .where('orgId', '==', orgId)
    .get();
  
  if (snapshot.empty) {
    console.log('❌ No matching document found!');
    process.exit(1);
  }
  
  const oldDoc = snapshot.docs[0];
  const oldId = oldDoc.id;
  const data = oldDoc.data();
  
  console.log(`📄 Found document:`);
  console.log(`   Current ID: ${oldId}`);
  console.log(`   Correct ID: ${correctId}`);
  console.log(`   Data:`, JSON.stringify(data, null, 2));
  
  if (oldId === correctId) {
    console.log('\n✅ Document ID is already correct!');
    process.exit(0);
  }
  
  // Create new document with correct ID
  console.log(`\n🔄 Creating new document with ID: ${correctId}`);
  await db.collection('orgMembers').doc(correctId).set(data);
  console.log('✅ Created new document');
  
  // Delete old document
  console.log(`\n🗑️  Deleting old document: ${oldId}`);
  await oldDoc.ref.delete();
  console.log('✅ Deleted old document');
  
  console.log('\n✅ Migration complete!');
  process.exit(0);
}

fixOrgMember().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
