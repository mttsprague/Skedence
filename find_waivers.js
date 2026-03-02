const admin = require('./SkedenceAdmin/functions/node_modules/firebase-admin');
const serviceAccount = require('./SkedenceAdmin/functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findWaivers() {
  const orgId = 'aLxHq5mFam5ohsLM1okb';
  
  console.log('\n=== Finding All Waivers in Organization ===\n');
  
  // Get all users in the org
  const members = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .get();
  
  console.log(`Found ${members.size} org members\n`);
  
  for (const memberDoc of members.docs) {
    const memberData = memberDoc.data();
    const userId = memberData.userId;
    const role = memberData.role;
    
    // Get user details
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userId;
    
    console.log(`\n👤 ${name} (${role})`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Doc exists: ${userDoc.exists}`);
    
    // Check /documents subcollection
    const docs = await db.collection('users').doc(userId).collection('documents').get();
    if (docs.size > 0) {
      console.log(`   📁 /documents: ${docs.size} documents`);
      docs.forEach(doc => {
        const d = doc.data();
        console.log(`      - ${d.displayName || d.name} (type: ${d.type})`);
      });
    }
    
    // Check /waivers subcollection
    const waivers = await db.collection('users').doc(userId).collection('waivers').get();
    if (waivers.size > 0) {
      console.log(`   📄 /waivers: ${waivers.size} waivers`);
      waivers.forEach(doc => {
        const d = doc.data();
        console.log(`      - ${d.displayName || d.name || doc.id}`);
      });
    }
    
    if (docs.size === 0 && waivers.size === 0) {
      console.log(`   ❌ No documents or waivers found`);
    }
  }
  
  console.log('\n=== Done ===\n');
  process.exit(0);
}

findWaivers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
