/**
 * migrate-packages-to-new-path.js
 * 
 * Migrates lesson packages from OLD path to STANDARD path:
 * FROM: users/{userId}/lessonPackages/{packageId}
 * TO:   organizations/{orgId}/users/{userId}/packages/{packageId}
 * 
 * This script:
 * 1. Queries all users with packages in the old path
 * 2. For each package, reads the orgId
 * 3. Copies the package to the new path (same document ID)
 * 4. Keeps the old data as backup (does NOT delete)
 * 5. Logs results for verification
 * 
 * Usage: node migrate-packages-to-new-path.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using application default credentials
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function migratePackages() {
  console.log('🚀 Starting package migration...\n');
  
  let totalUsers = 0;
  let totalPackagesMigrated = 0;
  let totalPackagesSkipped = 0;
  let errors = [];
  
  try {
    // Get all users
    console.log('📂 Querying all users...');
    const usersSnapshot = await db.collection('users').get();
    totalUsers = usersSnapshot.size;
    console.log(`✅ Found ${totalUsers} users\n`);
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const orgId = userData.orgId || userData.organizationId;
      
      if (!orgId) {
        console.log(`⚠️  User ${userId} has no orgId, skipping...`);
        continue;
      }
      
      // Get packages from OLD path
      const oldPackagesSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('lessonPackages')
        .get();
      
      if (oldPackagesSnapshot.empty) {
        continue; // No packages to migrate for this user
      }
      
      console.log(`\n👤 User: ${userId} (${userData.firstName || ''} ${userData.lastName || ''})`);
      console.log(`   OrgId: ${orgId}`);
      console.log(`   Packages to migrate: ${oldPackagesSnapshot.size}`);
      
      // Migrate each package
      for (const packageDoc of oldPackagesSnapshot.docs) {
        const packageId = packageDoc.id;
        const packageData = packageDoc.data();
        
        try {
          // Check if package already exists in new path
          const newPackageRef = db
            .collection('organizations')
            .doc(orgId)
            .collection('users')
            .doc(userId)
            .collection('packages')
            .doc(packageId);
          
          const existingPackage = await newPackageRef.get();
          
          if (existingPackage.exists) {
            console.log(`   ⏭️  Package ${packageId} already exists in new path, skipping...`);
            totalPackagesSkipped++;
            continue;
          }
          
          // Copy package to new path
          await newPackageRef.set(packageData);
          
          console.log(`   ✅ Migrated package ${packageId} (${packageData.packageType || 'unknown'})`);
          totalPackagesMigrated++;
          
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
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${totalUsers}`);
    console.log(`Packages migrated: ${totalPackagesMigrated}`);
    console.log(`Packages skipped (already existed): ${totalPackagesSkipped}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`   User: ${err.userId}, Package: ${err.packageId}, Error: ${err.error}`);
      });
    }
    
    console.log('\n✅ Migration complete!');
    console.log('\n⚠️  NOTE: Old packages were NOT deleted and remain as backup.');
    console.log('   You can verify the migration in Firebase Console, then manually');
    console.log('   delete old packages if desired.');
    
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migratePackages()
  .then(() => {
    console.log('\n👋 Script finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
