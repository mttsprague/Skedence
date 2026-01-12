// Migration script to fix orgMembers document IDs
// Old format: random ID with fields {userId, orgId}
// New format: document ID = {userId}_{orgId}

const admin = require('firebase-admin');

// Initialize with application default credentials (uses gcloud auth)
admin.initializeApp();

const db = admin.firestore();

async function migrateOrgMembers() {
  console.log('\n🔄 Starting orgMembers migration...\n');
  
  try {
    // Get all orgMembers documents
    const snapshot = await db.collection('orgMembers').get();
    
    console.log(`Found ${snapshot.size} orgMembers documents\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentId = doc.id;
      
      // Check if this document needs migration
      const expectedId = `${data.userId}_${data.orgId}`;
      
      if (currentId === expectedId) {
        console.log(`✅ ${currentId} - Already correct format, skipping`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n🔄 Migrating:`);
      console.log(`   Current ID: ${currentId}`);
      console.log(`   Expected ID: ${expectedId}`);
      console.log(`   User: ${data.userId}`);
      console.log(`   Org: ${data.orgId}`);
      console.log(`   Role: ${data.role}`);
      
      // Check if target document already exists
      const targetDoc = await db.collection('orgMembers').doc(expectedId).get();
      
      if (targetDoc.exists) {
        console.log(`   ⚠️  Target document already exists, deleting old document`);
        await doc.ref.delete();
      } else {
        // Create new document with correct ID
        await db.collection('orgMembers').doc(expectedId).set(data);
        console.log(`   ✅ Created new document: ${expectedId}`);
        
        // Delete old document
        await doc.ref.delete();
        console.log(`   ✅ Deleted old document: ${currentId}`);
      }
      
      migratedCount++;
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${snapshot.size}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrateOrgMembers();
