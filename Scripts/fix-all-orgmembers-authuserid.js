const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  console.log('🔧 Fixing all orgMembers without authUserId...\n');
  
  // Get all orgMembers
  const membersSnap = await db.collection('orgMembers').get();
  
  let fixed = 0;
  let skipped = 0;
  
  for (const memberDoc of membersSnap.docs) {
    const data = memberDoc.data();
    const docId = memberDoc.id;
    
    // Skip if already has authUserId
    if (data.authUserId) {
      skipped++;
      continue;
    }
    
    console.log(`\n⚙️  Processing ${docId}...`);
    console.log(`   userId: ${data.userId}`);
    console.log(`   role: ${data.role}`);
    
    // Try to find the email
    let email;
    
    if (data.role === 'client') {
      // Look in users collection
      const userDoc = await db.collection('users').doc(data.userId).get();
      if (userDoc.exists) {
        email = userDoc.data().email || userDoc.data().emailAddress;
      }
    } else {
      // Look in trainers collection
      const trainerDoc = await db.collection('trainers').doc(data.userId).get();
      if (trainerDoc.exists) {
        email = trainerDoc.data().email;
      }
    }
    
    if (!email) {
      console.log('   ❌ Could not find email, skipping');
      continue;
    }
    
    console.log(`   email: ${email}`);
    
    // Get Firebase Auth UID
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      const authUid = userRecord.uid;
      console.log(`   authUid: ${authUid}`);
      
      // Update document with authUserId
      await db.collection('orgMembers').doc(docId).update({
        authUserId: authUid,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      console.log('   ✅ Updated with authUserId');
      fixed++;
      
    } catch (e) {
      console.log(`   ❌ No Firebase Auth account found: ${e.message}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ⏭️  Skipped (already set): ${skipped}`);
  console.log(`   📝 Total: ${membersSnap.size}`);
  
  process.exit(0);
})();
