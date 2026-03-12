const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function debugAdminEmails() {
  try {
    const orgId = 'skedence_gym';
    
    console.log(`\n🔍 Debugging admin email lookup for org: ${orgId}\n`);
    
    // Step 1: Query orgMembers for admins/owners
    console.log('Step 1: Query orgMembers for admins/owners...');
    const adminMembers = await db.collection('orgMembers')
      .where('orgId', '==', orgId)
      .where('role', 'in', ['admin', 'owner'])
      .where('isActive', '==', true)
      .get();
    
    console.log(`   Found ${adminMembers.size} admin/owner members`);
    
    if (adminMembers.empty) {
      console.log('   ❌ No admin members found in orgMembers!');
      console.log('   This is why emails are not being sent.\n');
      
      // Show what IS in orgMembers for this org
      console.log('Step 1.5: Check what members exist for this org...');
      const allMembers = await db.collection('orgMembers')
        .where('orgId', '==', orgId)
        .get();
      
      console.log(`   Found ${allMembers.size} total members for org`);
      allMembers.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: role=${data.role}, isActive=${data.isActive}, authUserId=${data.authUserId}`);
      });
    } else {
      console.log('   ✅ Admin members found:');
      adminMembers.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: role=${data.role}, authUserId=${data.authUserId}`);
      });
      
      // Step 2: Get authUserIds
      console.log('\nStep 2: Extract authUserIds...');
      const adminAuthIds = adminMembers.docs
        .map(doc => doc.data().authUserId)
        .filter(id => id);
      
      console.log(`   Found ${adminAuthIds.length} authUserIds:`, adminAuthIds);
      
      if (adminAuthIds.length === 0) {
        console.log('   ❌ No authUserId fields found!');
      } else {
        // Step 3: Look up users by authUserId FIELD (not document ID)
        console.log('\nStep 3: Query users by authUserId field...');
        for (const authUserId of adminAuthIds) {
          const userQuery = await db.collection('users')
            .where('authUserId', '==', authUserId)
            .limit(1)
            .get();
          
          if (userQuery.empty) {
            console.log(`   ❌ User not found with authUserId: ${authUserId}`);
          } else {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            console.log(`   ✅ User found: ${userDoc.id} (document ID)`);
            console.log(`      authUserId: ${authUserId}`);
            console.log(`      Email: ${userData.email || userData.emailAddress || 'NO EMAIL'}`);
            console.log(`      Name: ${userData.firstName} ${userData.lastName}`);
          }
        }
      }
    }
    
    // Step 4: Check fallback adminEmail
    console.log('\nStep 4: Check fallback org.adminEmail...');
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    const orgData = orgDoc.data();
    
    if (orgData.adminEmail) {
      console.log(`   ✅ Fallback email exists: ${orgData.adminEmail}`);
    } else {
      console.log('   ❌ No adminEmail field on organization document');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugAdminEmails().then(() => process.exit(0));
