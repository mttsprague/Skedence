const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  console.log('🔍 Investigating client orgMembers...\n');
  
  const orgId = 'skedence_gym';
  
  // Get all clients (users with role=client)
  const clientsSnap = await db.collection('users')
    .where('orgId', '==', orgId)
    .where('role', '==', 'client')
    .get();
  
  console.log(`📋 Found ${clientsSnap.size} clients in users collection:\n`);
  
  for (const clientDoc of clientsSnap.docs) {
    const clientId = clientDoc.id;
    const clientData = clientDoc.data();
    
    console.log(`👤 Client: ${clientId}`);
    console.log(`   Email: ${clientData.email || clientData.emailAddress || 'NO EMAIL'}`);
    console.log(`   First: ${clientData.firstName || 'undefined'}`);
    console.log(`   Last: ${clientData.lastName || 'undefined'}`);
    console.log(`   Role: ${clientData.role || 'undefined'}`);
    
    // Check for corresponding orgMembers document
    const expectedDocId = `${clientId}_${orgId}`;
    const orgMemberDoc = await db.collection('orgMembers').doc(expectedDocId).get();
    
    if (orgMemberDoc.exists) {
      const omData = orgMemberDoc.data();
      console.log(`   ✅ OrgMembers doc exists: ${expectedDocId}`);
      console.log(`      - userId matches: ${omData.userId === clientId ? 'YES' : 'NO - MISMATCH!'}`);
      console.log(`      - authUserId: ${omData.authUserId || 'NOT SET'}`);
      console.log(`      - role: ${omData.role}`);
    } else {
      console.log(`   ❌ OrgMembers doc MISSING: ${expectedDocId}`);
    }
    
    // Check if there's a Firebase Auth account
    try {
      const email = clientData.email || clientData.emailAddress;
      if (email) {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`   🔐 Firebase Auth UID: ${userRecord.uid}`);
      }
    } catch (e) {
      console.log(`   ⚠️  No Firebase Auth account`);
    }
    
    console.log('');
  }
  
  // Now check for any orgMembers with role=client that might not match users
  console.log('\n📋 Checking all client orgMembers documents:\n');
  
  const clientOrgMembers = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('role', '==', 'client')
    .get();
  
  for (const omDoc of clientOrgMembers.docs) {
    const docId = omDoc.id;
    const omData = omDoc.data();
    const userId = omData.userId;
    
    console.log(`📄 OrgMember doc: ${docId}`);
    console.log(`   userId: ${userId}`);
    console.log(`   authUserId: ${omData.authUserId || 'NOT SET'}`);
    
    // Check if user document exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      console.log(`   ✅ User doc exists`);
    } else {
      console.log(`   ❌ User doc MISSING - orphaned orgMembers!`);
    }
    
    console.log('');
  }
  
  process.exit(0);
})();
