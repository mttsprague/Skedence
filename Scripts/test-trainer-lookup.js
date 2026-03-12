const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function testTrainerLookup() {
  try {
    const orgId = 'skedence_gym';
    const authUid = 'oRw1vNd8KURFGHm88lKEKTWR9Nt1';
    
    console.log(`\n🔍 Testing trainer email lookup for authUserId: ${authUid}\n`);
    
    // Step 1: Try users collection
    console.log('Step 1: Query users collection by authUserId field...');
    const userQuery = await db.collection('users')
      .where('authUserId', '==', authUid)
      .limit(1)
      .get();
    
    if (!userQuery.empty) {
      const userData = userQuery.docs[0].data();
      console.log(`   ✅ Found in users: ${userData.email || userData.emailAddress}`);
    } else {
      console.log('   ❌ Not found in users collection');
      
      // Step 2: Try trainers collection
      console.log('\nStep 2: Query trainers collection by authUserId field...');
      const trainerQuery = await db.collection('trainers')
        .where('authUserId', '==', authUid)
        .where('orgId', '==', orgId)
        .limit(1)
        .get();
      
      if (!trainerQuery.empty) {
        const trainerData = trainerQuery.docs[0].data();
        console.log(`   ✅ Found in trainers: ${trainerData.email}`);
        console.log(`   Name: ${trainerData.firstName} ${trainerData.lastName}`);
        console.log(`   Document ID: ${trainerQuery.docs[0].id}`);
      } else {
        console.log('   ❌ Not found in trainers collection either');
      }
    }
    
    console.log('\n✅ This is the lookup flow the Cloud Functions will use!\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testTrainerLookup().then(() => process.exit(0));
