/**
 * Check and Clean Old Waiver Paths
 * 
 * This script checks for waiver documents in the old Auth UID path
 * and optionally deletes them (they should have been migrated already).
 * 
 * Usage:
 * node check-old-waivers.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using default credentials (from Firebase CLI)
try {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('Make sure you are logged in with Firebase CLI: firebase login');
  process.exit(1);
}

const db = admin.firestore();

async function checkOldWaivers() {
  console.log('\n🔍 Checking for waivers in old Auth UID paths...\n');
  
  let stats = {
    totalUsers: 0,
    usersWithAuthId: 0,
    oldWaiversFound: 0,
    oldWaiversDeleted: 0,
    errors: 0
  };

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    stats.totalUsers = usersSnapshot.size;
    console.log(`📊 Found ${stats.totalUsers} total users\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userDocId = userDoc.id; // firstName_lastName
      const authUserId = userData.authUserId;

      // Skip users without authUserId
      if (!authUserId) {
        continue;
      }

      stats.usersWithAuthId++;

      // Check for documents in the OLD path (authUID)
      const oldDocumentsRef = db.collection('users').doc(authUserId).collection('documents');
      const oldDocumentsSnapshot = await oldDocumentsRef.get();

      if (oldDocumentsSnapshot.empty) {
        continue;
      }

      // Filter for waivers
      const waiverDocs = oldDocumentsSnapshot.docs.filter(doc => {
        const docData = doc.data();
        return docData.type === 'waiver' || docData.type === 'waiver_agreement';
      });

      if (waiverDocs.length === 0) {
        continue;
      }

      stats.oldWaiversFound += waiverDocs.length;
      console.log(`\n👤 User: ${userDocId} (Auth UID: ${authUserId})`);
      console.log(`   ⚠️  Found ${waiverDocs.length} waiver(s) in old path`);

      // List the waivers
      for (const waiverDoc of waiverDocs) {
        const waiverData = waiverDoc.data();
        console.log(`   📄 Waiver: ${waiverDoc.id}`);
        console.log(`      Athlete: ${waiverData.athleteName || 'N/A'}`);
        console.log(`      Uploaded: ${waiverData.uploadedAt?.toDate?.() || 'N/A'}`);

        // Check if this waiver exists in new path
        const newPathDoc = await db.collection('users')
          .doc(userDocId)
          .collection('documents')
          .doc(waiverDoc.id)
          .get();

        if (newPathDoc.exists) {
          console.log(`      ✓ Already migrated to new path`);
          console.log(`      🗑️  Deleting old waiver...`);
          await waiverDoc.ref.delete();
          stats.oldWaiversDeleted++;
          console.log(`      ✅ Deleted`);
        } else {
          console.log(`      ⚠️  NOT found in new path - skipping deletion`);
          console.log(`      💡 This waiver should have been migrated. Consider re-running migration.`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 OLD WAIVER CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users:                  ${stats.totalUsers}`);
    console.log(`Users with authUserId:        ${stats.usersWithAuthId}`);
    console.log(`Old waivers found:            ${stats.oldWaiversFound}`);
    console.log(`Old waivers deleted:          ${stats.oldWaiversDeleted}`);
    console.log(`Errors encountered:           ${stats.errors}`);
    console.log('='.repeat(60));
    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during check:', error);
    process.exit(1);
  }
}

// Run the check
checkOldWaivers()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
