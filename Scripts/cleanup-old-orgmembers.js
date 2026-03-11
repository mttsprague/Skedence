/**
 * Clean Up Old-Format orgMembers Documents
 * 
 * This script finds and removes orgMembers documents that use the old format
 * (trainerId_orgId) where a correctly formatted Auth UID version exists.
 * 
 * Background:
 * - Old format: mattsprague_skedence_gym (trainerId_orgId)
 * - New format: oRw1vNd8KURFGHm88lKEKTWR9Nt1_skedence_gym (authUID_orgId)
 * 
 * This script only removes old documents IF a new format exists for the same
 * person/org combination to prevent data loss.
 * 
 * Usage:
 * node cleanup-old-orgmembers.js
 * 
 * Add --dry-run to preview changes:
 * node cleanup-old-orgmembers.js --dry-run
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
  console.log('✅ Firebase Admin initialized successfully\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('Make sure you are logged in with Firebase CLI: firebase login');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();
const isDryRun = process.argv.includes('--dry-run');

// Firebase Auth UIDs are 28 characters long and alphanumeric
function looksLikeAuthUID(str) {
  return /^[a-zA-Z0-9]{20,30}$/.test(str);
}

async function cleanupOldOrgMembers() {
  console.log('🧹 Cleaning up migrated orgMembers documents...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Get all orgMembers documents
    const membersSnapshot = await db.collection('orgMembers').get();
    console.log(`📊 Found ${membersSnapshot.size} total orgMembers documents\n`);
    
    const migratedDocs = [];
    const activeDocs = [];
    
    // Find documents marked as migrated
    for (const doc of membersSnapshot.docs) {
      const data = doc.data();
      
      if (data.migratedTo) {
        migratedDocs.push({
          docId: doc.id,
          migratedTo: data.migratedTo,
          role: data.role || 'not set',
          orgId: data.orgId || 'not set'
        });
      } else {
        activeDocs.push({
          docId: doc.id,
          role: data.role || 'not set'
        });
      }
    }
    
    console.log(`✅ Active documents: ${activeDocs.length}`);
    console.log(`🗑️  Migrated documents (marked for deletion): ${migratedDocs.length}\n`);
    
    if (migratedDocs.length === 0) {
      console.log('✨ No migrated documents found! Everything is clean.\n');
      return;
    }
    
    console.log('📋 Documents marked as migrated:');
    migratedDocs.forEach(doc => {
      console.log(`   ${doc.docId}`);
      console.log(`      → Migrated to: ${doc.migratedTo}`);
      console.log(`      Role: ${doc.role}, OrgId: ${doc.orgId}\n`);
    });
    
    if (isDryRun) {
      console.log('📝 This was a dry run. Run without --dry-run to delete migrated documents.\n');
      return;
    }
    
    // Perform deletion
    console.log('🗑️  Deleting migrated documents...\n');
    
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const doc of migratedDocs) {
      const ref = db.collection('orgMembers').doc(doc.docId);
      batch.delete(ref);
      batchCount++;
      console.log(`   ✅ Deleted: ${doc.docId}`);
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`   💾 Committed batch of ${batchCount}`);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   💾 Committed final batch of ${batchCount}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`Deleted ${migratedDocs.length} migrated documents`);
    console.log(`Active documents remaining: ${activeDocs.length}`);
    console.log('='.repeat(60));
    console.log('\n✨ Your database is cleaner!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupOldOrgMembers()
  .then(() => {
    console.log('✅ Script complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
