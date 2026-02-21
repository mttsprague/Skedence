#!/usr/bin/env node

/**
 * Migrate location from random ID to name-based ID
 * 
 * This script:
 * 1. Finds the existing location
 * 2. Creates a sanitized ID from the location name
 * 3. Creates a new document with the name-based ID
 * 4. Copies all data to the new document
 * 5. Deletes the old document
 */

const admin = require('firebase-admin');
const serviceAccount = require('../SkedenceAdmin/polyface-ae6d3-firebase-adminsdk-jtxlf-ca5bf9b04a.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper function to sanitize location name for use as document ID
function sanitizeLocationName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/-+/g, '_')           // Replace hyphens with underscores
    .replace(/_+/g, '_')           // Replace multiple underscores with single
    .replace(/^_|_$/g, '');        // Remove leading/trailing underscores
}

async function migrateLocation() {
  console.log('🚀 Starting location ID migration...\n');
  
  try {
    // Get all active locations
    const locationsSnapshot = await db.collection('locations')
      .where('isActive', '==', true)
      .get();
    
    if (locationsSnapshot.empty) {
      console.log('❌ No active locations found!');
      return;
    }
    
    console.log(`📋 Found ${locationsSnapshot.size} active location(s)\n`);
    
    for (const locationDoc of locationsSnapshot.docs) {
      const oldId = locationDoc.id;
      const locationData = locationDoc.data();
      const locationName = locationData.name;
      const orgId = locationData.orgId;
      
      console.log(`📍 Location: "${locationName}"`);
      console.log(`   Old ID: ${oldId}`);
      
      // Generate new ID from name
      const newId = sanitizeLocationName(locationName);
      console.log(`   New ID: ${newId}`);
      
      // Check if already using name-based ID (skip if so)
      if (oldId === newId) {
        console.log(`   ✓ Already using name-based ID, skipping...\n`);
        continue;
      }
      
      // Check if new ID already exists
      const newLocationRef = db.collection('locations').doc(newId);
      const newLocationDoc = await newLocationRef.get();
      
      if (newLocationDoc.exists) {
        console.log(`   ⚠️  WARNING: Document with ID "${newId}" already exists!`);
        console.log(`   Skipping to avoid overwriting...\n`);
        continue;
      }
      
      // Create new document with name-based ID
      console.log(`   📝 Creating new document with ID: ${newId}...`);
      await newLocationRef.set(locationData);
      console.log(`   ✅ Created new document`);
      
      // Delete old document
      console.log(`   🗑️  Deleting old document with ID: ${oldId}...`);
      await locationDoc.ref.delete();
      console.log(`   ✅ Deleted old document`);
      
      console.log(`   ✨ Migration complete for "${locationName}"!\n`);
      
      // Note: We don't need to update references because:
      // - Bookings store location as a string name (not ID)
      // - Classes store location as a string name (not ID)
      // - Schedules store location as a string name (not ID)
      console.log(`   ℹ️  Note: No references need updating (locations stored by name, not ID)\n`);
    }
    
    console.log('✅ Location migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
migrateLocation()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
