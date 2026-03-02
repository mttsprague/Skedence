const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDocuments() {
  const orgId = 'aLxHq5mFam5ohsLM1okb';
  
  // Get all clients in the org
  const members = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('role', '==', 'client')
    .get();
  
  console.log('\n=== Checking Client Documents/Waivers ===\n');
  
  for (const memberDoc of members.docs) {
    const userId = memberDoc.data().userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    
    console.log(`\nClient: ${name} (${userId})`);
    
    // Check documents subcollection
    const docs = await db.collection('users').doc(userId)
      .collection('documents')
      .get();
    
    console.log(`  Documents subcollection: ${docs.size} documents`);
    if (docs.size > 0) {
      docs.forEach(doc => {
        const d = doc.data();
        console.log(`    ID: ${doc.id}`);
        console.log(`       Type: ${d.type || 'no type'}`);
        console.log(`       Name: ${d.name || d.displayName || 'no name'}`);
        console.log(`       URL: ${d.url ? 'Yes' : 'No'}`);
        console.log(`       UploadedAt: ${d.uploadedAt ? d.uploadedAt.toDate() : 'no date'}`);
        console.log(`       SignedBy: ${d.signedBy || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check if there's a waivers subcollection (old location?)
    const waivers = await db.collection('users').doc(userId)
      .collection('waivers')
      .get();
    
    if (waivers.size > 0) {
      console.log(`  Waivers subcollection: ${waivers.size} waivers`);
      waivers.forEach(doc => {
        const d = doc.data();
        console.log(`    ID: ${doc.id}`);
        console.log(`       ${JSON.stringify(d, null, 2)}`);
      });
    }
  }
  
  console.log('\n=== Done ===\n');
  process.exit(0);
}

checkDocuments().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
