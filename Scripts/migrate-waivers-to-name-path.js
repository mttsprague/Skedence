/**
 * Waiver Migration Script
 * 
 * This script migrates waiver documents from the old authUID path to the new firstName_lastName path.
 * 
 * OLD PATH: users/{firebaseAuthUID}/documents/{waiverId}
 * NEW PATH: users/{firstName_lastName}/documents/{waiverId}
 * 
 * Process:
 * 1. For each user document in the users collection
 * 2. Check if they have an authUserId field (Firebase Auth UID)
 * 3. Look for documents in users/{authUserId}/documents/
 * 4. Check if those documents already exist in users/{firstName_lastName}/documents/
 * 5. If not, copy them to the firstName_lastName path
 * 6. Delete the documents from the authUID path
 * 
 * Usage:
 * node migrate-waivers-to-name-path.js
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

async function migrateWaivers() {
  console.log('\n🚀 Starting waiver migration...\n');
  
  let stats = {
    totalUsers: 0,
    usersWithAuthId: 0,
    usersWithDocuments: 0,
    documentsCopied: 0,
    documentsDeleted: 0,
    documentsAlreadyExist: 0,
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
      console.log(`\n👤 Processing user: ${userDocId}`);
      console.log(`   Auth UID: ${authUserId}`);

      // Check for documents in the OLD path (authUID)
      const oldDocumentsRef = db.collection('users').doc(authUserId).collection('documents');
      const oldDocumentsSnapshot = await oldDocumentsRef.get();

      if (oldDocumentsSnapshot.empty) {
        console.log(`   ℹ️  No documents found in old path`);
        continue;
      }

      stats.usersWithDocuments++;
      console.log(`   📄 Found ${oldDocumentsSnapshot.size} document(s) in old path`);

      // Check for documents in the NEW path (firstName_lastName)
      const newDocumentsRef = db.collection('users').doc(userDocId).collection('documents');
      const newDocumentsSnapshot = await newDocumentsRef.get();
      const existingDocIds = new Set(newDocumentsSnapshot.docs.map(doc => doc.id));

      // Process each document from old path
      for (const oldDoc of oldDocumentsSnapshot.docs) {
        const docId = oldDoc.id;
        const docData = oldDoc.data();

        try {
          // Check if document already exists in new path
          if (existingDocIds.has(docId)) {
            console.log(`   ⚠️  Document ${docId} already exists in new path, skipping copy`);
            stats.documentsAlreadyExist++;
            
            // Still delete from old path
            await oldDoc.ref.delete();
            stats.documentsDeleted++;
            console.log(`   🗑️  Deleted ${docId} from old path`);
            continue;
          }

          // Copy document to new path
          await newDocumentsRef.doc(docId).set(docData);
          stats.documentsCopied++;
          console.log(`   ✅ Copied document ${docId} to new path`);

          // Delete from old path
          await oldDoc.ref.delete();
          stats.documentsDeleted++;
          console.log(`   🗑️  Deleted ${docId} from old path`);

        } catch (error) {
          console.error(`   ❌ Error processing document ${docId}:`, error.message);
          stats.errors++;
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users:                    ${stats.totalUsers}`);
    console.log(`Users with authUserId:          ${stats.usersWithAuthId}`);
    console.log(`Users with old documents:       ${stats.usersWithDocuments}`);
    console.log(`Documents copied:               ${stats.documentsCopied}`);
    console.log(`Documents deleted from old path:${stats.documentsDeleted}`);
    console.log(`Documents already in new path:  ${stats.documentsAlreadyExist}`);
    console.log(`Errors encountered:             ${stats.errors}`);
    console.log('='.repeat(60));
    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateWaivers()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
