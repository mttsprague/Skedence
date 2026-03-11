const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({ projectId: 'polyface-ae6d3' });

const db = admin.firestore();

async function fixAdminAccount() {
  console.log('🔍 Checking admin@polyfacevolleyball.com account...\n');
  
  const email = 'admin@polyfacevolleyball.com';
  
  try {
    // Find the user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found with email:', email);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log('✅ Found user:', userId);
    console.log('   Role:', userData.role);
    console.log('   OrgId:', userData.orgId);
    
    // Get Firebase Auth UID
    let authUid;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      authUid = userRecord.uid;
      console.log('   Auth UID:', authUid);
    } catch (e) {
      console.log('❌ Could not find Firebase Auth user');
      return;
    }
    
    const orgId = userData.orgId;
    
    // Check for wrong-format document
    const wrongDocId = `${authUid}_${orgId}`;
    const wrongDoc = await db.collection('orgMembers').doc(wrongDocId).get();
    
    if (wrongDoc.exists) {
      console.log('\n❌ Found WRONG format document:', wrongDocId);
      await db.collection('orgMembers').doc(wrongDocId).delete();
      console.log('✅ Deleted wrong format document');
    } else {
      console.log('\n✅ No wrong-format document found');
    }
    
    // Check for correct-format document
    const correctDocId = `${userId}_${orgId}`;
    const correctDoc = await db.collection('orgMembers').doc(correctDocId).get();
    
    if (correctDoc.exists) {
      const data = correctDoc.data();
      console.log('\n✅ Correct format document exists:', correctDocId);
      
      // Update with authUserId if missing
      if (!data.authUserId) {
        await db.collection('orgMembers').doc(correctDocId).update({
          authUserId: authUid
        });
        console.log('✅ Added authUserId field');
      } else {
        console.log('✅ authUserId already set:', data.authUserId);
      }
    } else {
      console.log('\n⚠️  Correct format document does NOT exist, creating it...');
      await db.collection('orgMembers').doc(correctDocId).set({
        userId: userId,
        authUserId: authUid,
        orgId: orgId,
        role: userData.role,
        isActive: true,
        joinedAt: admin.firestore.Timestamp.now()
      });
      console.log('✅ Created correct format document');
    }
    
    // Verify
    const verifyDoc = await db.collection('orgMembers').doc(correctDocId).get();
    console.log('\n📊 Final verification:');
    console.log(JSON.stringify(verifyDoc.data(), null, 2));
    
    console.log('\n✅ Admin account fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminAccount();
