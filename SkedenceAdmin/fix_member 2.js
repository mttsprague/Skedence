const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixMembership() {
  const userId = 'c4ZOM2wcd2Yq9ayyKNcFUkJ7ISm2';
  const orgId = 'WzKHgatuBSc6t6RQ3YlD';
  const membershipId = `${userId}_${orgId}`;
  
  console.log(`\n🔍 Checking membership: orgMembers/${membershipId}\n`);
  
  try {
    const doc = await db.collection('orgMembers').doc(membershipId).get();
    
    if (!doc.exists) {
      console.log('❌ Document does not exist! Creating it...');
      await db.collection('orgMembers').doc(membershipId).set({
        userId: userId,
        orgId: orgId,
        role: 'client',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Created membership document');
    } else {
      const data = doc.data();
      console.log('Current data:', JSON.stringify(data, null, 2));
      
      const updates = {};
      let needsUpdate = false;
      
      // Check required fields
      if (data.userId !== userId) {
        updates.userId = userId;
        needsUpdate = true;
        console.log(`⚠️  userId mismatch: ${data.userId} → ${userId}`);
      }
      
      if (data.orgId !== orgId) {
        updates.orgId = orgId;
        needsUpdate = true;
        console.log(`⚠️  orgId mismatch: ${data.orgId} → ${orgId}`);
      }
      
      if (data.isActive !== true) {
        updates.isActive = true;
        needsUpdate = true;
        console.log(`⚠️  isActive not true: ${data.isActive} → true`);
      }
      
      if (!data.role) {
        updates.role = 'client';
        needsUpdate = true;
        console.log(`⚠️  role missing, setting to: client`);
      }
      
      if (needsUpdate) {
        await db.collection('orgMembers').doc(membershipId).update(updates);
        console.log('\n✅ Updated membership document with:', updates);
      } else {
        console.log('\n✅ Document is correct, no updates needed');
      }
    }
    
    // Verify the fix
    const verifyDoc = await db.collection('orgMembers').doc(membershipId).get();
    console.log('\n📋 Final document state:');
    console.log(JSON.stringify(verifyDoc.data(), null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixMembership();
