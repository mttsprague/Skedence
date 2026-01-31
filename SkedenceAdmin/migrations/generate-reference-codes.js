#!/usr/bin/env node

/**
 * Migration Script: Generate Reference Codes for Existing Records
 * 
 * This script adds human-readable reference codes to existing users and trainers
 * in the Firestore database that don't already have one.
 * 
 * Usage:
 *   node generate-reference-codes.js
 * 
 * Requirements:
 *   - Firebase Admin SDK initialized
 *   - Firestore access
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (adjust path to your service account key)
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Generate user reference code: LASTNAME-F-### (e.g., SMITH-J-001)
 */
async function generateUserCode(firstName, lastName) {
  const lastInitial = lastName.substring(0, 5).toUpperCase()
    .replace(/[^A-Z]/g, '');
  const firstInitial = firstName.substring(0, 1).toUpperCase();
  
  const baseCode = `${lastInitial}-${firstInitial}`;
  
  // Find highest existing number for this base
  const snapshot = await db.collection('users')
    .where('referenceCode', '>=', baseCode)
    .where('referenceCode', '<', baseCode + '~')
    .get();
  
  let highestNumber = 0;
  snapshot.forEach(doc => {
    const code = doc.data().referenceCode;
    if (code) {
      const parts = code.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num)) {
          highestNumber = Math.max(highestNumber, num);
        }
      }
    }
  });
  
  const nextNumber = highestNumber + 1;
  return `${baseCode}-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Generate trainer reference code: TR-FIRSTNAME-### (e.g., TR-MIKE-001)
 */
async function generateTrainerCode(firstName, lastName) {
  const nameCode = firstName.substring(0, 8).toUpperCase()
    .replace(/[^A-Z]/g, '');
  
  const baseCode = `TR-${nameCode}`;
  
  // Find highest existing number for this base
  const snapshot = await db.collection('trainers')
    .where('referenceCode', '>=', baseCode)
    .where('referenceCode', '<', baseCode + '~')
    .get();
  
  let highestNumber = 0;
  snapshot.forEach(doc => {
    const code = doc.data().referenceCode;
    if (code) {
      const parts = code.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num)) {
          highestNumber = Math.max(highestNumber, num);
        }
      }
    }
  });
  
  const nextNumber = highestNumber + 1;
  return `${baseCode}-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Migrate users collection
 */
async function migrateUsers() {
  console.log('\n🔄 Migrating users...');
  
  const usersSnapshot = await db.collection('users').get();
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    
    // Skip if already has a reference code
    if (data.referenceCode) {
      skipped++;
      continue;
    }
    
    // Skip if missing required fields
    if (!data.firstName || !data.lastName) {
      console.log(`⚠️  Skipping user ${doc.id} - missing name fields`);
      skipped++;
      continue;
    }
    
    try {
      const referenceCode = await generateUserCode(data.firstName, data.lastName);
      await doc.ref.update({ referenceCode });
      console.log(`✅ Updated user ${doc.id} → ${referenceCode} (${data.firstName} ${data.lastName})`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating user ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Users: ${updated} updated, ${skipped} skipped, ${errors} errors`);
}

/**
 * Migrate trainers collection
 */
async function migrateTrainers() {
  console.log('\n🔄 Migrating trainers...');
  
  const trainersSnapshot = await db.collection('trainers').get();
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const doc of trainersSnapshot.docs) {
    const data = doc.data();
    
    // Skip if already has a reference code
    if (data.referenceCode) {
      skipped++;
      continue;
    }
    
    // Skip if missing required fields
    if (!data.firstName || !data.lastName) {
      console.log(`⚠️  Skipping trainer ${doc.id} - missing name fields`);
      skipped++;
      continue;
    }
    
    try {
      const referenceCode = await generateTrainerCode(data.firstName, data.lastName);
      await doc.ref.update({ referenceCode });
      console.log(`✅ Updated trainer ${doc.id} → ${referenceCode} (${data.firstName} ${data.lastName})`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating trainer ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Trainers: ${updated} updated, ${skipped} skipped, ${errors} errors`);
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting reference code migration...');
  console.log('This will add reference codes to existing users and trainers.\n');
  
  try {
    await migrateUsers();
    await migrateTrainers();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the reference codes in your Firestore console');
    console.log('2. Test the admin UI to ensure codes display correctly');
    console.log('3. New users/trainers will automatically get codes on creation');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
runMigration();
