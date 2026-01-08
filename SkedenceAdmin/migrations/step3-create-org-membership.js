/**
 * STEP 3: Create Organization Membership
 * 
 * This script creates the orgMembers collection that links users to organizations.
 * It will create membership records for all existing trainers.
 * 
 * Usage:
 *   node step3-create-org-membership.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuration
const ORG_ID = "0Mtow1OaV7oUlCisKSNy";
const OWNER_USER_ID = "ly5wJgGJZAT7wLyepLiZWcPRKTv2";

async function createOrgMembership() {
  console.log('🚀 Starting Step 3: Create Organization Membership\n');
  console.log(`Organization ID: ${ORG_ID}`);
  console.log(`Owner User ID: ${OWNER_USER_ID}\n`);

  try {
    const stats = {
      ownersCreated: 0,
      trainersCreated: 0,
      clientsCreated: 0,
      errors: 0
    };

    // Step 3.1: Create membership for the owner
    console.log('📝 Creating owner membership...');
    const ownerMembershipData = {
      orgId: ORG_ID,
      userId: OWNER_USER_ID,
      role: "owner",
      trainerId: OWNER_USER_ID, // Owner is also a trainer
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    await db.collection('orgMembers').add(ownerMembershipData);
    stats.ownersCreated++;
    console.log('✅ Owner membership created\n');

    // Step 3.2: Get all trainers from the trainers collection
    console.log('📝 Fetching all trainers...');
    const trainersSnapshot = await db.collection('trainers').get();
    console.log(`Found ${trainersSnapshot.size} trainers\n`);

    // Step 3.3: Create membership for each trainer (skip owner if already in trainers)
    console.log('📝 Creating trainer memberships...');
    const batch = db.batch();
    let batchCount = 0;

    for (const trainerDoc of trainersSnapshot.docs) {
      const trainerId = trainerDoc.id;
      
      // Skip if this is the owner (already created)
      if (trainerId === OWNER_USER_ID) {
        console.log(`   ⏭️  Skipping ${trainerId} (already created as owner)`);
        continue;
      }

      const trainerData = trainerDoc.data();
      const membershipData = {
        orgId: ORG_ID,
        userId: trainerId,
        role: trainerData.isAdmin ? "admin" : "trainer",
        trainerId: trainerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: trainerData.active !== false // Default to true if not specified
      };

      const membershipRef = db.collection('orgMembers').doc();
      batch.set(membershipRef, membershipData);
      batchCount++;
      
      console.log(`   ✅ Queued membership for trainer: ${trainerId} (${membershipData.role})`);

      // Commit batch every 500 operations (Firestore limit)
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`   💾 Committed batch of ${batchCount} memberships`);
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   💾 Committed final batch of ${batchCount} memberships`);
    }

    stats.trainersCreated = trainersSnapshot.size - (trainersSnapshot.docs.some(d => d.id === OWNER_USER_ID) ? 1 : 0);

    // Step 3.4: Get all users/clients from the users collection
    console.log('\n📝 Fetching all clients from users collection...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    console.log('📝 Creating client memberships...');
    const clientBatch = db.batch();
    let clientBatchCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Skip if this user is already a trainer/owner
      const isTrainer = trainersSnapshot.docs.some(d => d.id === userId);
      if (isTrainer) {
        console.log(`   ⏭️  Skipping ${userId} (already a trainer)`);
        continue;
      }

      const membershipData = {
        orgId: ORG_ID,
        userId: userId,
        role: "client",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      };

      const membershipRef = db.collection('orgMembers').doc();
      clientBatch.set(membershipRef, membershipData);
      clientBatchCount++;
      
      console.log(`   ✅ Queued membership for client: ${userId}`);

      // Commit batch every 500 operations
      if (clientBatchCount >= 500) {
        await clientBatch.commit();
        console.log(`   💾 Committed batch of ${clientBatchCount} memberships`);
        clientBatchCount = 0;
      }
    }

    // Commit remaining batch
    if (clientBatchCount > 0) {
      await clientBatch.commit();
      console.log(`   💾 Committed final batch of ${clientBatchCount} memberships`);
    }

    stats.clientsCreated = clientBatchCount;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Step 3 Complete!\n');
    console.log('Summary:');
    console.log(`  👑 Owners created: ${stats.ownersCreated}`);
    console.log(`  👨‍🏫 Trainers created: ${stats.trainersCreated}`);
    console.log(`  👥 Clients created: ${stats.clientsCreated}`);
    console.log(`  📊 Total memberships: ${stats.ownersCreated + stats.trainersCreated + stats.clientsCreated}`);
    console.log('='.repeat(60));

    console.log('\nNext steps:');
    console.log('  1. Verify memberships in Firestore Console');
    console.log('  2. Run step4-add-orgid-to-collections.js');

  } catch (error) {
    console.error('❌ Error creating organization membership:', error);
    throw error;
  }
}

// Run the migration
createOrgMembership()
  .then(() => {
    console.log('\n🎉 Organization membership created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
