const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  console.log('🔍 Listing all skedence_gym members...\n');
  
  const orgId = 'skedence_gym';
  
  // Get all users in org
  const usersSnap = await db.collection('users')
    .where('orgId', '==', orgId)
    .get();
  
  console.log('📋 Users in organization:');
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    console.log(`  - ${data.email} (${data.role}) [ID: ${doc.id}]`);
  }
  
  // Get all trainers in org
  const trainersSnap = await db.collection('trainers')
    .where('orgId', '==', orgId)
    .get();
  
  console.log('\n📋 Trainers in organization:');
  for (const doc of trainersSnap.docs) {
    const data = doc.data();
    console.log(`  - ${data.email} [ID: ${doc.id}]`);
  }
  
  // Get all orgMembers
  const membersSnap = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .get();
  
  console.log('\n📋 OrgMembers documents:');
  for (const doc of membersSnap.docs) {
    const data = doc.data();
    console.log(`  - ${doc.id}`);
    console.log(`    userId: ${data.userId}`);
    console.log(`    authUserId: ${data.authUserId || 'NOT SET'}`);
    console.log(`    role: ${data.role}`);
  }
  
  process.exit(0);
})();
