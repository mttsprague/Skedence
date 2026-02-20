/**
 * Migration Script: Convert Auto-Generated IDs to Human-Readable IDs
 * 
 * This script:
 * 1. Migrates organizations to use name-based IDs
 * 2. Migrates users to use firstName_lastName IDs (with authUserId mapping)
 * 3. Migrates trainers to use firstName_lastName IDs
 * 4. Updates all references across collections
 * 5. Handles name collisions by appending numbers
 * 
 * Usage: node migrate-to-readable-ids.js [--dry-run]
 */

const admin = require('firebase-admin');
const serviceAccount = require('../SkedenceAdmin/skedence-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Utility to sanitize names for IDs
function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase();
}

// Track used IDs to handle collisions
const usedIds = new Set();

function generateUniqueId(baseName) {
  let id = sanitizeName(baseName);
  let counter = 2;
  
  while (usedIds.has(id)) {
    id = `${sanitizeName(baseName)}_${counter}`;
    counter++;
  }
  
  usedIds.add(id);
  return id;
}

// Track ID mappings for reference updates
const idMappings = {
  organizations: {}, // oldId → newId
  users: {},         // oldId → newId
  trainers: {}       // oldId → newId
};

async function migrateOrganizations(dryRun = false) {
  console.log('\n📋 Migrating Organizations...');
  const orgsSnapshot = await db.collection('organizations').get();
  
  for (const doc of orgsSnapshot.docs) {
    const data = doc.data();
    const oldId = doc.id;
    const newId = generateUniqueId(data.name);
    
    console.log(`  ${oldId} → ${newId} (${data.name})`);
    idMappings.organizations[oldId] = newId;
    
    if (!dryRun) {
      // Create new document
      await db.collection('organizations').doc(newId).set(data);
      
      // Delete old document (will do after updating references)
    }
  }
  
  console.log(`✅ Mapped ${Object.keys(idMappings.organizations).length} organizations`);
}

async function migrateUsers(dryRun = false) {
  console.log('\n👥 Migrating Users...');
  const usersSnapshot = await db.collection('users').get();
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const oldId = doc.id;
    const newId = generateUniqueId(`${data.firstName}_${data.lastName}`);
    
    console.log(`  ${oldId} → ${newId} (${data.firstName} ${data.lastName})`);
    idMappings.users[oldId] = newId;
    
    if (!dryRun) {
      // Add authUserId field to map to Firebase Auth UID
      const newData = {
        ...data,
        authUserId: oldId // Store original Firebase Auth UID
      };
      
      // Update orgId reference if organization was migrated
      if (data.orgId && idMappings.organizations[data.orgId]) {
        newData.orgId = idMappings.organizations[data.orgId];
      }
      if (data.organizationId && idMappings.organizations[data.organizationId]) {
        newData.organizationId = idMappings.organizations[data.organizationId];
      }
      
      // Create new document
      await db.collection('users').doc(newId).set(newData);
      
      // Migrate subcollections (lessonPackages)
      await migrateUserSubcollections(oldId, newId, dryRun);
    }
  }
  
  console.log(`✅ Mapped ${Object.keys(idMappings.users).length} users`);
}

async function migrateUserSubcollections(oldUserId, newUserId, dryRun) {
  // Migrate lessonPackages subcollection
  const packagesSnapshot = await db.collection('users').doc(oldUserId).collection('lessonPackages').get();
  
  for (const doc of packagesSnapshot.docs) {
    const data = doc.data();
    
    // Update orgId reference
    if (data.orgId && idMappings.organizations[data.orgId]) {
      data.orgId = idMappings.organizations[data.orgId];
    }
    
    if (!dryRun) {
      await db.collection('users').doc(newUserId).collection('lessonPackages').doc(doc.id).set(data);
    }
  }
}

async function migrateTrainers(dryRun = false) {
  console.log('\n👨‍🏫 Migrating Trainers...');
  const trainersSnapshot = await db.collection('trainers').get();
  
  for (const doc of trainersSnapshot.docs) {
    const data = doc.data();
    const oldId = doc.id;
    const newId = generateUniqueId(`${data.firstName}_${data.lastName}`);
    
    console.log(`  ${oldId} → ${newId} (${data.firstName} ${data.lastName})`);
    idMappings.trainers[oldId] = newId;
    
    if (!dryRun) {
      // Add authUserId field if they have a userId
      const newData = {
        ...data,
        authUserId: data.userId || null
      };
      
      // Update orgId reference
      if (data.orgId && idMappings.organizations[data.orgId]) {
        newData.orgId = idMappings.organizations[data.orgId];
      }
      
      // Create new document
      await db.collection('trainers').doc(newId).set(newData);
      
      // Migrate subcollections (schedules)
      await migrateTrainerSubcollections(oldId, newId, dryRun);
    }
  }
  
  console.log(`✅ Mapped ${Object.keys(idMappings.trainers).length} trainers`);
}

async function migrateTrainerSubcollections(oldTrainerId, newTrainerId, dryRun) {
  // Migrate schedules subcollection
  const schedulesSnapshot = await db.collection('trainers').doc(oldTrainerId).collection('schedules').get();
  
  for (const doc of schedulesSnapshot.docs) {
    const data = doc.data();
    
    if (!dryRun) {
      await db.collection('trainers').doc(newTrainerId).collection('schedules').doc(doc.id).set(data);
    }
  }
}

async function updateOrgMembers(dryRun = false) {
  console.log('\n🔗 Updating orgMembers references...');
  const orgMembersSnapshot = await db.collection('orgMembers').get();
  
  for (const doc of orgMembersSnapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const newData = { ...data };
    
    // Update orgId
    if (data.orgId && idMappings.organizations[data.orgId]) {
      newData.orgId = idMappings.organizations[data.orgId];
      needsUpdate = true;
    }
    
    // Update userId (name-based ID)
    if (data.userId && idMappings.users[data.userId]) {
      newData.userId = idMappings.users[data.userId];
      needsUpdate = true;
    } else if (data.userId && idMappings.trainers[data.userId]) {
      newData.userId = idMappings.trainers[data.userId];
      needsUpdate = true;
    }
    
    if (needsUpdate && !dryRun) {
      // CRITICAL: Create TWO documents for dual-path support
      
      // 1. Name-based document: {userId}_{orgId} - for application logic
      const nameBasedDocId = `${newData.userId}_${newData.orgId}`;
      await db.collection('orgMembers').doc(nameBasedDocId).set(newData);
      console.log(`  Created name-based: ${nameBasedDocId}`);
      
      // 2. Auth-based document: {authUserId}_{orgId} - for security rules
      if (newData.authUserId) {
        const authBasedDocId = `${newData.authUserId}_${newData.orgId}`;
        await db.collection('orgMembers').doc(authBasedDocId).set(newData);
        console.log(`  Created auth-based: ${authBasedDocId}`);
      }
      
      // Delete old document
      await db.collection('orgMembers').doc(doc.id).delete();
      console.log(`  Deleted old: ${doc.id}`);
    }
  }
  
  console.log('✅ Updated orgMembers (dual-path support)');
}

async function updateBookings(dryRun = false) {
  console.log('\n📅 Updating bookings references...');
  const bookingsSnapshot = await db.collection('bookings').get();
  
  for (const doc of bookingsSnapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates = {};
    
    // Update orgId
    if (data.orgId && idMappings.organizations[data.orgId]) {
      updates.orgId = idMappings.organizations[data.orgId];
      needsUpdate = true;
    }
    
    // Update clientId
    if (data.clientId && idMappings.users[data.clientId]) {
      updates.clientId = idMappings.users[data.clientId];
      needsUpdate = true;
    }
    
    // Update trainerId
    if (data.trainerId && idMappings.trainers[data.trainerId]) {
      updates.trainerId = idMappings.trainers[data.trainerId];
      needsUpdate = true;
    }
    
    if (needsUpdate && !dryRun) {
      await db.collection('bookings').doc(doc.id).update(updates);
    }
  }
  
  console.log('✅ Updated bookings');
}

async function updateClasses(dryRun = false) {
  console.log('\n🏫 Updating classes references...');
  const classesSnapshot = await db.collection('classes').get();
  
  for (const doc of classesSnapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates = {};
    
    // Update orgId
    if (data.orgId && idMappings.organizations[data.orgId]) {
      updates.orgId = idMappings.organizations[data.orgId];
      needsUpdate = true;
    }
    
    // Update trainerId
    if (data.trainerId && idMappings.trainers[data.trainerId]) {
      updates.trainerId = idMappings.trainers[data.trainerId];
      needsUpdate = true;
    }
    
    // Update participantIds array
    if (data.participantIds && Array.isArray(data.participantIds)) {
      const newParticipantIds = data.participantIds.map(id => 
        idMappings.users[id] || id
      );
      if (JSON.stringify(newParticipantIds) !== JSON.stringify(data.participantIds)) {
        updates.participantIds = newParticipantIds;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate && !dryRun) {
      await db.collection('bookings').doc(doc.id).update(updates);
    }
  }
  
  console.log('✅ Updated classes');
}

async function updateOrganizationSubcollections(dryRun = false) {
  console.log('\n🏢 Updating organization subcollections...');
  
  for (const [oldOrgId, newOrgId] of Object.entries(idMappings.organizations)) {
    // Migrate organizations/{orgId}/users/{userId}/packages
    const usersSnapshot = await db.collection('organizations').doc(oldOrgId).collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const oldUserId = userDoc.documentId;
      const newUserId = idMappings.users[oldUserId] || oldUserId;
      
      const packagesSnapshot = await db.collection('organizations').doc(oldOrgId).collection('users').doc(oldUserId).collection('packages').get();
      
      for (const packageDoc of packagesSnapshot.docs) {
        const data = packageDoc.data();
        
        // Update orgId in package data
        if (data.orgId) {
          data.orgId = newOrgId;
        }
        
        if (!dryRun) {
          await db.collection('organizations').doc(newOrgId).collection('users').doc(newUserId).collection('packages').doc(packageDoc.id).set(data);
        }
      }
    }
  }
  
  console.log('✅ Updated organization subcollections');
}

async function cleanupOldDocuments(dryRun = false) {
  console.log('\n🗑️  Cleaning up old documents...');
  
  if (dryRun) {
    console.log('  (Dry run - would delete old documents)');
    return;
  }
  
  // Delete old organization documents
  for (const oldId of Object.keys(idMappings.organizations)) {
    await db.collection('organizations').doc(oldId).delete();
    console.log(`  Deleted organizations/${oldId}`);
  }
  
  // Delete old user documents and subcollections
  for (const oldId of Object.keys(idMappings.users)) {
    // Delete subcollections first
    const packagesSnapshot = await db.collection('users').doc(oldId).collection('lessonPackages').get();
    for (const doc of packagesSnapshot.docs) {
      await doc.ref.delete();
    }
    
    await db.collection('users').doc(oldId).delete();
    console.log(`  Deleted users/${oldId}`);
  }
  
  // Delete old trainer documents and subcollections
  for (const oldId of Object.keys(idMappings.trainers)) {
    // Delete subcollections first
    const schedulesSnapshot = await db.collection('trainers').doc(oldId).collection('schedules').get();
    for (const doc of schedulesSnapshot.docs) {
      await doc.ref.delete();
    }
    
    await db.collection('trainers').doc(oldId).delete();
    console.log(`  Deleted trainers/${oldId}`);
  }
  
  console.log('✅ Cleanup complete');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('🚀 Starting ID Migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}`);
  
  if (!dryRun) {
    console.log('\n⚠️  WARNING: This will modify your production database!');
    console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  try {
    // Step 1: Migrate primary collections
    await migrateOrganizations(dryRun);
    await migrateUsers(dryRun);
    await migrateTrainers(dryRun);
    
    // Step 2: Update references in junction tables and related collections
    await updateOrgMembers(dryRun);
    await updateBookings(dryRun);
    await updateClasses(dryRun);
    await updateOrganizationSubcollections(dryRun);
    
    // Step 3: Cleanup old documents
    if (!dryRun) {
      await cleanupOldDocuments(dryRun);
    }
    
    console.log('\n✅ Migration Complete!');
    console.log('\n📊 Summary:');
    console.log(`  Organizations: ${Object.keys(idMappings.organizations).length} migrated`);
    console.log(`  Users: ${Object.keys(idMappings.users).length} migrated`);
    console.log(`  Trainers: ${Object.keys(idMappings.trainers).length} migrated`);
    
    if (dryRun) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
