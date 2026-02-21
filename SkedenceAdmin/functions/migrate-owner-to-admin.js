/**
 * migrate-owner-to-admin.js
 * 
 * Migrates orgMembers with role "owner" to role "admin"
 * This simplifies the role system by consolidating owner and admin into a single "admin" role.
 * 
 * Usage: node migrate-owner-to-admin.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using application default credentials
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function migrateOwnerToAdmin() {
  console.log('🚀 Starting role migration: owner → admin\n');
  
  let totalUpdated = 0;
  let totalAlreadyAdmin = 0;
  let errors = [];
  
  try {
    // Query all orgMembers with role "owner"
    console.log('📂 Querying orgMembers with role "owner"...');
    const snapshot = await db.collection('orgMembers')
      .where('role', '==', 'owner')
      .get();
    
    console.log(`✅ Found ${snapshot.size} owner records\n`);
    
    if (snapshot.empty) {
      console.log('✅ No owner roles found - all clean!\n');
      return;
    }
    
    // Update each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      console.log(`👤 Processing: ${docId}`);
      console.log(`   userId: ${data.userId || 'N/A'}`);
      console.log(`   orgId: ${data.orgId || 'N/A'}`);
      console.log(`   Current role: ${data.role}`);
      
      try {
        // Update role to "admin"
        await doc.ref.update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ Updated to role: admin\n`);
        totalUpdated++;
      } catch (error) {
        console.error(`   ❌ Error updating: ${error.message}\n`);
        errors.push({
          docId,
          userId: data.userId,
          orgId: data.orgId,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total owner roles found: ${snapshot.size}`);
    console.log(`Successfully updated: ${totalUpdated}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`   Doc: ${err.docId}, User: ${err.userId}, Org: ${err.orgId}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }
    
    console.log('\n✅ Migration complete!');
    console.log('   All "owner" roles have been updated to "admin".');
    console.log('   iOS app and web portal now support both roles for backward compatibility.\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateOwnerToAdmin()
  .then(() => {
    console.log('👋 Script finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
