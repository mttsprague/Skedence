#!/usr/bin/env node

/**
 * Fix Admin App OrganizationMembers
 * 
 * This script ensures all trainers have proper orgMembers documents
 * with BOTH patterns for security rules to work:
 * 1. Name-based: {userId}_{orgId} (e.g., mattsprague_skedence_gym)
 * 2. Auth-based: {authUid}_{orgId} (e.g., oRw1vNd8KURFGHm88lKEKTWR9Nt1_skedence_gym)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function fixOrgMembers() {
  console.log('🔧 Starting orgMembers fix for admin app...\n');

  try {
    // 1. Get all trainers with userId (Firebase Auth UID)
    const trainersSnapshot = await db.collection('trainers').get();
    console.log(`📋 Found ${trainersSnapshot.size} trainers to process\n`);

    let fixed = 0;
    let skipped = 0;
    let created = 0;

    for (const trainerDoc of trainersSnapshot.docs) {
      const trainerId = trainerDoc.id; // e.g., "mattsprague"
      const trainerData = trainerDoc.data();
      
      console.log(`\n👤 Trainer: ${trainerId}`);
      console.log(`   Data:`, JSON.stringify(trainerData, null, 2));
      
      const authUid = trainerData.userId || trainerData.authUserId; // Firebase Auth UID
      const orgId = trainerData.orgId || trainerData.organizationId;

      if (!authUid || !orgId) {
        console.log(`⚠️  Skipping trainer ${trainerId} - missing userId/authUserId or orgId`);
        skipped++;
        continue;
      }

      console.log(`\n👤 Processing trainer: ${trainerId}`);
      console.log(`   Auth UID: ${authUid}`);
      console.log(`   Org ID: ${orgId}`);

      // Check for BOTH document patterns
      const nameBasedId = `${trainerId}_${orgId}`;
      const authBasedId = `${authUid}_${orgId}`;

      const nameBasedDoc = await db.collection('orgMembers').doc(nameBasedId).get();
      const authBasedDoc = await db.collection('orgMembers').doc(authBasedId).get();

      // Determine role (owner, admin, or trainer)
      let role = 'trainer';
      if (nameBasedDoc.exists) {
        role = nameBasedDoc.data().role || 'trainer';
      }

      const memberData = {
        userId: trainerId,  // Name-based ID
        authUserId: authUid, // Firebase Auth UID
        orgId: orgId,
        role: role,
        isActive: trainerData.active !== false,
        createdAt: trainerData.createdAt || admin.firestore.Timestamp.now()
      };

      // Create/update name-based document
      if (!nameBasedDoc.exists) {
        console.log(`   ✅ Creating name-based doc: ${nameBasedId}`);
        await db.collection('orgMembers').doc(nameBasedId).set(memberData);
        created++;
      } else {
        console.log(`   ✅ Name-based doc exists: ${nameBasedId}`);
      }

      // Create/update auth-based document
      if (!authBasedDoc.exists) {
        console.log(`   ✅ Creating auth-based doc: ${authBasedId}`);
        await db.collection('orgMembers').doc(authBasedId).set(memberData);
        created++;
      } else {
        console.log(`   ✅ Auth-based doc exists: ${authBasedId}`);
      }

      fixed++;
    }

    console.log(`\n✅ Fix complete!`);
    console.log(`   Trainers processed: ${fixed}`);
    console.log(`   Documents created: ${created}`);
    console.log(`   Skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Error fixing orgMembers:', error);
    process.exit(1);
  }
}

// Run the fix
fixOrgMembers()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
