const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function checkUsers() {
  try {
    const orgId = 'skedence_gym';
    const authUid = 'oRw1vNd8KURFGHm88lKEKTWR9Nt1';
    
    console.log(`\n🔍 Looking for user with authUserId: ${authUid}\n`);
    
    // Query by authUserId field
    console.log('Method 1: Query by authUserId field...');
    const queryByAuthUserId = await db.collection('users')
      .where('authUserId', '==', authUid)
      .get();
    
    console.log(`   Found ${queryByAuthUserId.size} users`);
    
    // Query by orgId to see all users in this org
    console.log('\nMethod 2: Query all users in this org...');
    const usersInOrg = await db.collection('users')
      .where('orgId', '==', orgId)
      .get();
    
    console.log(`   Found ${usersInOrg.size} users in org`);
    console.log('\n   User documents:');
    
    usersInOrg.forEach(doc => {
      const data = doc.data();
      console.log(`\n   📄 Document ID: ${doc.id}`);
      console.log(`      firstName: ${data.firstName}`);
      console.log(`      lastName: ${data.lastName}`);
      console.log(`      email: ${data.email || data.emailAddress || 'NO EMAIL'}`);
      console.log(`      role: ${data.role}`);
      console.log(`      authUserId: ${data.authUserId || 'NO authUserId FIELD'}`);
      console.log(`      orgId: ${data.orgId}`);
    });
    
    console.log('\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers().then(() => process.exit(0));
