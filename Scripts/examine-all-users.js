const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  console.log('🔍 Examining all user documents in skedence_gym...\n');
  
  const orgId = 'skedence_gym';
  
  // Get ALL users in the org (no role filter)
  const usersSnap = await db.collection('users')
    .where('orgId', '==', orgId)
    .get();
  
  console.log(`📋 Found ${usersSnap.size} total users in organization:\n`);
  
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const data = userDoc.data();
    
    console.log(`👤 User ID: ${userId}`);
    console.log(`   Raw data:`);
    console.log(JSON.stringify(data, null, 2));
    
    // Check orgMembers
    const expectedDocId = `${userId}_${orgId}`;
    const omDoc = await db.collection('orgMembers').doc(expectedDocId).get();
    
    if (omDoc.exists) {
      console.log(`   ✅ Has orgMembers: ${expectedDocId}`);
      console.log(`      Role in orgMembers: ${omDoc.data().role}`);
    } else {
      console.log(`   ❌ Missing orgMembers doc`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  process.exit(0);
})();
