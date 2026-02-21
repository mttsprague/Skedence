#!/usr/bin/env node

/**
 * Migrate ALL passes from old path to standard path
 * 
 * OLD PATH: users/{userId}/lessonPackages/{packageId}
 * NEW PATH: organizations/{orgId}/users/{userId}/packages/{packageId}
 * 
 * This script:
 * 1. Finds all users in the database
 * 2. For each user, finds their orgId
 * 3. Migrates packages from old path to new path
 * 4. Deletes packages from old path after successful migration
 */

const admin = require('firebase-admin');

// Initialize with default credentials (will use GOOGLE_APPLICATION_CREDENTIALS or gcloud auth)
admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function migrateAllPasses() {
  console.log('🚀 Starting pass migration from old path to standard path...\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📋 Found ${usersSnapshot.size} total users\n`);
    
    let totalMigrated = 0;
    let totalDeleted = 0;
    let usersProcessed = 0;
    let errors = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const orgId = userData.orgId || userData.organizationId;
      
      usersProcessed++;
      
      // Skip users without orgId
      if (!orgId) {
        console.log(`⚠️  User ${userId} has no orgId, skipping...`);
        continue;
      }
      
      console.log(`\n👤 Processing user: ${userId} (org: ${orgId})`);
      
      // Check old path for packages
      const oldPathRef = db.collection('users').doc(userId).collection('lessonPackages');
      const oldPackagesSnapshot = await oldPathRef.get();
      
      if (oldPackagesSnapshot.empty) {
        console.log(`   ✓ No packages in old path`);
        continue;
      }
      
      console.log(`   📦 Found ${oldPackagesSnapshot.size} packages in old path`);
      
      // Check new path
      const newPathRef = db.collection('organizations').doc(orgId)
        .collection('users').doc(userId).collection('packages');
      const newPackagesSnapshot = await newPathRef.get();
      
      console.log(`   📦 Found ${newPackagesSnapshot.size} packages in new path`);
      
      // Migrate each package
      for (const packageDoc of oldPackagesSnapshot.docs) {
        const packageId = packageDoc.id;
        const packageData = packageDoc.data();
        
        try {
          // Check if package already exists in new path
          const newPackageRef = newPathRef.doc(packageId);
          const newPackageDoc = await newPackageRef.get();
          
          if (newPackageDoc.exists) {
            console.log(`   ⏭️  Package ${packageId} already exists in new path, skipping...`);
            continue;
          }
          
          // Add orgId to package data if not present
          if (!packageData.orgId) {
            packageData.orgId = orgId;
          }
          
          // Write to new path
          await newPackageRef.set(packageData);
          console.log(`   ✅ Migrated package ${packageId} to new path`);
          totalMigrated++;
          
          // Delete from old path
          await packageDoc.ref.delete();
          console.log(`   🗑️  Deleted package ${packageId} from old path`);
          totalDeleted++;
          
        } catch (error) {
          console.error(`   ❌ Error migrating package ${packageId}:`, error.message);
          errors.push({
            userId,
            packageId,
            error: error.message
          });
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE\n');
    console.log(`📊 Summary:`);
    console.log(`   - Users processed: ${usersProcessed}`);
    console.log(`   - Packages migrated: ${totalMigrated}`);
    console.log(`   - Packages deleted from old path: ${totalDeleted}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} errors occurred:`);
      errors.forEach(err => {
        console.log(`   - User: ${err.userId}, Package: ${err.packageId}`);
        console.log(`     Error: ${err.error}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

migrateAllPasses()
  .then(() => {
    console.log('\n🎉 Migration script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
