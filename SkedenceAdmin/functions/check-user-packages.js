#!/usr/bin/env node

/**
 * Check the structure of packages for a specific user
 */

const admin = require('firebase-admin');

// Initialize with default credentials
admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function checkUserPackages() {
  console.log('🔍 Checking packages for user: mike_parent\n');
  
  try {
    // Check standard path
    const standardPath = db.collection('organizations')
      .doc('skedence_gym')
      .collection('users')
      .doc('mike_parent')
      .collection('packages');
    
    const packagesSnapshot = await standardPath.get();
    
    console.log(`📦 Found ${packagesSnapshot.size} packages in standard path\n`);
    
    packagesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Package ${index + 1}: ${doc.id}`);
      console.log('  packageType:', data.packageType);
      console.log('  packageCategory:', data.packageCategory);
      console.log('  totalLessons:', data.totalLessons);
      console.log('  lessonsUsed:', data.lessonsUsed);
      console.log('  lessonsRemaining:', (data.totalLessons || 0) - (data.lessonsUsed || 0));
      console.log('  purchaseDate:', data.purchaseDate?.toDate());
      console.log('  expirationDate:', data.expirationDate?.toDate());
      console.log('  orgId:', data.orgId);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserPackages()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
