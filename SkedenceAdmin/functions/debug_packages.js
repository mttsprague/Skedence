const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();
const ORG_ID = 'skedence_gym';

async function debugPackages() {
  console.log('🔍 Debug: Check all packages in skedence_gym');
  console.log('═'.repeat(80));

  try {
    const membersSnap = await db.collection('orgMembers')
      .where('orgId', '==', ORG_ID)
      .get();
    
    const userIds = membersSnap.docs.map(doc => doc.data().userId);
    console.log(`📋 Found ${userIds.length} members: ${userIds.join(', ')}\n`);

    for (const userId of userIds) {
      // Get user name
      let userName = 'Unknown';
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
      } catch (err) {}

      console.log(`\n👤 ${userName} (${userId}):`);

      // Check NEW path
      const newPathSnap = await db.collection('organizations')
        .doc(ORG_ID)
        .collection('users')
        .doc(userId)
        .collection('packages')
        .get();

      console.log(`   NEW PATH (organizations/${ORG_ID}/users/${userId}/packages): ${newPathSnap.size} packages`);
      newPathSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`     - ${data.packageName || data.packageType}: amountPaid=${data.amountPaid}, transactionId=${data.transactionId || 'N/A'}`);
      });

      // Check OLD path
      const oldPathSnap = await db.collection('users')
        .doc(userId)
        .collection('lessonPackages')
        .get();

      console.log(`   OLD PATH (users/${userId}/lessonPackages): ${oldPathSnap.size} packages`);
      oldPathSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`     - ${data.packageName || data.packageType}: amountPaid=${data.amountPaid}, transactionId=${data.transactionId || 'N/A'}`);
      });
    }

    console.log('\n✅ Debug complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugPackages();
