/**
 * STEP 4: Add orgId to Existing Collections
 * 
 * This script adds the orgId field to all existing documents in your collections.
 * This is the key step that makes your data multi-tenant ready.
 * 
 * Collections to update:
 * - trainers
 * - users (clients)
 * - classes
 * - bookings
 * - trainers/{trainerId}/schedules (subcollection)
 * - users/{userId}/lessonPackages (subcollection)
 * 
 * Usage:
 *   node step4-add-orgid-to-collections.js
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

async function addOrgIdToCollections() {
  console.log('🚀 Starting Step 4: Add orgId to Existing Collections\n');
  console.log(`Organization ID: ${ORG_ID}\n`);

  const stats = {
    trainers: 0,
    users: 0,
    classes: 0,
    schedules: 0,
    packages: 0,
    bookings: 0,
    errors: 0
  };

  try {
    // Step 4.1: Update trainers collection
    console.log('📝 Updating trainers collection...');
    const trainersSnapshot = await db.collection('trainers').get();
    console.log(`   Found ${trainersSnapshot.size} trainers`);

    const trainerBatch = db.batch();
    trainersSnapshot.docs.forEach(doc => {
      trainerBatch.update(doc.ref, { orgId: ORG_ID });
      stats.trainers++;
    });
    await trainerBatch.commit();
    console.log(`   ✅ Updated ${stats.trainers} trainers\n`);

    // Step 4.2: Update users collection
    console.log('📝 Updating users collection...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`   Found ${usersSnapshot.size} users`);

    const userBatch = db.batch();
    usersSnapshot.docs.forEach(doc => {
      userBatch.update(doc.ref, { orgId: ORG_ID });
      stats.users++;
    });
    await userBatch.commit();
    console.log(`   ✅ Updated ${stats.users} users\n`);

    // Step 4.3: Update classes collection
    console.log('📝 Updating classes collection...');
    const classesSnapshot = await db.collection('classes').get();
    console.log(`   Found ${classesSnapshot.size} classes`);

    if (classesSnapshot.size > 0) {
      const classBatch = db.batch();
      classesSnapshot.docs.forEach(doc => {
        classBatch.update(doc.ref, { orgId: ORG_ID });
        stats.classes++;
      });
      await classBatch.commit();
      console.log(`   ✅ Updated ${stats.classes} classes\n`);
    } else {
      console.log(`   ℹ️  No classes to update\n`);
    }

    // Step 4.4: Update trainers/{trainerId}/schedules subcollection
    console.log('📝 Updating trainer schedules...');
    for (const trainerDoc of trainersSnapshot.docs) {
      const schedulesSnapshot = await db.collection('trainers').doc(trainerDoc.id)
        .collection('schedules').get();
      
      if (schedulesSnapshot.size > 0) {
        console.log(`   Found ${schedulesSnapshot.size} schedules for trainer ${trainerDoc.id}`);
        
        const scheduleBatch = db.batch();
        schedulesSnapshot.docs.forEach(scheduleDoc => {
          scheduleBatch.update(scheduleDoc.ref, { orgId: ORG_ID });
          stats.schedules++;
        });
        await scheduleBatch.commit();
        console.log(`   ✅ Updated ${schedulesSnapshot.size} schedules for trainer ${trainerDoc.id}`);
      }
    }
    console.log(`   ✅ Total schedules updated: ${stats.schedules}\n`);

    // Step 4.5: Update users/{userId}/lessonPackages subcollection
    console.log('📝 Updating lesson packages...');
    for (const userDoc of usersSnapshot.docs) {
      const packagesSnapshot = await db.collection('users').doc(userDoc.id)
        .collection('lessonPackages').get();
      
      if (packagesSnapshot.size > 0) {
        console.log(`   Found ${packagesSnapshot.size} packages for user ${userDoc.id}`);
        
        const packageBatch = db.batch();
        packagesSnapshot.docs.forEach(packageDoc => {
          packageBatch.update(packageDoc.ref, { orgId: ORG_ID });
          stats.packages++;
        });
        await packageBatch.commit();
        console.log(`   ✅ Updated ${packagesSnapshot.size} packages for user ${userDoc.id}`);
      }
    }
    console.log(`   ✅ Total packages updated: ${stats.packages}\n`);

    // Step 4.6: Update bookings collection
    console.log('📝 Updating bookings collection...');
    const bookingsSnapshot = await db.collection('bookings').get();
    console.log(`   Found ${bookingsSnapshot.size} bookings`);

    if (bookingsSnapshot.size > 0) {
      const bookingsBatch = db.batch();
      bookingsSnapshot.docs.forEach(doc => {
        bookingsBatch.update(doc.ref, { orgId: ORG_ID });
        stats.bookings++;
      });
      await bookingsBatch.commit();
      console.log(`   ✅ Updated ${stats.bookings} bookings\n`);
    } else {
      console.log(`   ℹ️  No bookings to update\n`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Step 4 Complete!\n');
    console.log('Summary:');
    console.log(`  👨‍🏫 Trainers updated: ${stats.trainers}`);
    console.log(`  👥 Users updated: ${stats.users}`);
    console.log(`  🏐 Classes updated: ${stats.classes}`);
    console.log(`  📅 Schedules updated: ${stats.schedules}`);
    console.log(`  🎫 Lesson packages updated: ${stats.packages}`);
    console.log(`  📆 Bookings updated: ${stats.bookings}`);
    console.log(`  📊 Total documents updated: ${stats.trainers + stats.users + stats.classes + stats.schedules + stats.packages + stats.bookings}`);
    console.log('='.repeat(60));

    console.log('\n✅ All collections now have orgId field!');
    console.log('\nNext steps:');
    console.log('  1. Verify orgId fields in Firestore Console');
    console.log('  2. Update your app queries to filter by orgId');
    console.log('  3. Update Firestore security rules to enforce org-scoped access');

  } catch (error) {
    console.error('❌ Error adding orgId to collections:', error);
    stats.errors++;
    throw error;
  }
}

// Run the migration
addOrgIdToCollections()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
