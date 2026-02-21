const admin = require('firebase-admin');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS env var or gcloud auth)
admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function checkUserPermissions() {
  const authUserId = 'erGcrxrOyneNNsWOtvgVQ9Apdzp2';
  
  console.log('\n=== DIAGNOSTIC: User Permissions Check ===\n');
  console.log(`Checking for Auth UID: ${authUserId}\n`);
  
  // 1. Check orgMembers collection
  console.log('1. Checking orgMembers collection...');
  const orgMembersSnapshot = await db.collection('orgMembers')
    .where('authUserId', '==', authUserId)
    .get();
  
  if (orgMembersSnapshot.empty) {
    console.log('❌ NO orgMembers found for this authUserId');
    console.log('\nSearching all orgMembers to see what exists...');
    const allOrgMembers = await db.collection('orgMembers').limit(5).get();
    allOrgMembers.forEach(doc => {
      console.log(`  - Document ID: ${doc.id}`);
      console.log(`    authUserId: ${doc.data().authUserId}`);
      console.log(`    userId: ${doc.data().userId}`);
      console.log(`    role: ${doc.data().role}`);
      console.log(`    orgId: ${doc.data().orgId}`);
      console.log('');
    });
  } else {
    console.log(`✅ Found ${orgMembersSnapshot.size} orgMember document(s):`);
    orgMembersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - Document ID: ${doc.id}`);
      console.log(`    authUserId: ${data.authUserId}`);
      console.log(`    userId: ${data.userId}`);
      console.log(`    role: ${data.role}`);
      console.log(`    orgId: ${data.orgId}`);
      console.log(`    isActive: ${data.isActive}`);
      console.log('');
    });
  }
  
  // 2. Check users collection
  console.log('\n2. Checking users collection...');
  const usersSnapshot = await db.collection('users')
    .where('authUserId', '==', authUserId)
    .get();
  
  if (usersSnapshot.empty) {
    console.log('❌ NO users found for this authUserId');
    console.log('\nSearching all users to see what exists...');
    const allUsers = await db.collection('users').limit(5).get();
    allUsers.forEach(doc => {
      console.log(`  - Document ID: ${doc.id}`);
      console.log(`    authUserId: ${doc.data().authUserId || 'MISSING'}`);
      console.log(`    emailAddress: ${doc.data().emailAddress || doc.data().email}`);
      console.log(`    orgId: ${doc.data().orgId}`);
      console.log('');
    });
  } else {
    console.log(`✅ Found ${usersSnapshot.size} user document(s):`);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - Document ID: ${doc.id}`);
      console.log(`    authUserId: ${data.authUserId}`);
      console.log(`    emailAddress: ${data.emailAddress || data.email}`);
      console.log(`    firstName: ${data.firstName}`);
      console.log(`    lastName: ${data.lastName}`);
      console.log(`    orgId: ${data.orgId}`);
      console.log(`    active: ${data.active}`);
      console.log('');
    });
  }
  
  // 3. Check Firebase Auth
  console.log('\n3. Checking Firebase Authentication...');
  try {
    const userRecord = await admin.auth().getUser(authUserId);
    console.log(`✅ Firebase Auth user exists:`);
    console.log(`  - UID: ${userRecord.uid}`);
    console.log(`  - Email: ${userRecord.email}`);
    console.log(`  - Email Verified: ${userRecord.emailVerified}`);
    console.log(`  - Disabled: ${userRecord.disabled}`);
    console.log('');
  } catch (error) {
    console.log(`❌ Firebase Auth user NOT found: ${error.message}`);
  }
  
  console.log('\n=== END DIAGNOSTIC ===\n');
}

checkUserPermissions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
