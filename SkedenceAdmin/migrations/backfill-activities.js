/**
 * Backfill Activities Migration Script
 * 
 * This script creates activity log entries for historical data that was created
 * before the activity logging system was implemented.
 * 
 * Run with: node backfill-activities.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillActivities() {
  console.log('🚀 Starting activity backfill...\n');
  
  const orgId = 'KFdD3OPexhMLQ4LlSZVF'; // Your org ID
  let activityCount = 0;
  
  try {
    // 1. Backfill trainer creations
    console.log('📝 Processing trainers...');
    const trainersSnap = await db.collection('trainers')
      .where('orgId', '==', orgId)
      .get();
    
    for (const doc of trainersSnap.docs) {
      const trainer = doc.data();
      const createdAt = trainer.createdAt?.toDate() || new Date();
      
      await db.collection('activities').add({
        type: 'trainer_created',
        actorId: trainer.createdBy || orgId,
        actorName: 'System',
        actorRole: 'system',
        targetId: doc.id,
        targetName: `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim(),
        targetType: 'trainer',
        description: `Trainer ${trainer.firstName || ''} ${trainer.lastName || ''} was added to the system`,
        orgId: orgId,
        timestamp: admin.firestore.Timestamp.fromDate(createdAt),
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        metadata: {
          email: trainer.email,
          backfilled: true
        }
      });
      activityCount++;
    }
    console.log(`✅ Created ${trainersSnap.size} trainer activities\n`);
    
    // 2. Backfill lesson bookings
    console.log('📝 Processing bookings...');
    const bookingsSnap = await db.collection('bookings')
      .where('orgId', '==', orgId)
      .get();
    
    for (const doc of bookingsSnap.docs) {
      const booking = doc.data();
      const bookedAt = booking.bookedAt?.toDate() || booking.createdAt?.toDate() || new Date();
      
      if (booking.status === 'canceled') {
        // Create canceled activity
        await db.collection('activities').add({
          type: 'lesson_canceled',
          actorId: booking.clientUID || booking.clientId || 'unknown',
          actorName: booking.clientName || 'Unknown Client',
          actorRole: 'client',
          targetId: doc.id,
          targetName: `Lesson on ${booking.startTime?.toDate().toLocaleDateString()}`,
          targetType: 'lesson',
          description: `Lesson with ${booking.trainerName || 'trainer'} was canceled`,
          orgId: orgId,
          timestamp: admin.firestore.Timestamp.fromDate(bookedAt),
          createdAt: admin.firestore.Timestamp.fromDate(bookedAt),
          metadata: {
            trainerId: booking.trainerId,
            trainerName: booking.trainerName,
            startTime: booking.startTime,
            backfilled: true
          }
        });
      } else {
        // Create booked activity
        await db.collection('activities').add({
          type: 'lesson_booked',
          actorId: booking.clientUID || booking.clientId || 'unknown',
          actorName: booking.clientName || 'Unknown Client',
          actorRole: 'client',
          targetId: doc.id,
          targetName: `Lesson on ${booking.startTime?.toDate().toLocaleDateString()}`,
          targetType: 'lesson',
          description: `Lesson booked with ${booking.trainerName || 'trainer'}`,
          orgId: orgId,
          timestamp: admin.firestore.Timestamp.fromDate(bookedAt),
          createdAt: admin.firestore.Timestamp.fromDate(bookedAt),
          metadata: {
            trainerId: booking.trainerId,
            trainerName: booking.trainerName,
            startTime: booking.startTime,
            endTime: booking.endTime,
            location: booking.location,
            backfilled: true
          }
        });
      }
      activityCount++;
    }
    console.log(`✅ Created ${bookingsSnap.size} booking activities\n`);
    
    // 3. Backfill class creations
    console.log('📝 Processing classes...');
    const classesSnap = await db.collection('classes')
      .where('orgId', '==', orgId)
      .get();
    
    for (const doc of classesSnap.docs) {
      const classData = doc.data();
      const createdAt = classData.createdAt?.toDate() || new Date();
      
      await db.collection('activities').add({
        type: 'class_created',
        actorId: classData.createdBy || orgId,
        actorName: classData.trainerName || 'Admin',
        actorRole: 'admin',
        targetId: doc.id,
        targetName: classData.title,
        targetType: 'class',
        description: `Class "${classData.title}" was created with ${classData.trainerName || 'trainer'}`,
        orgId: orgId,
        timestamp: admin.firestore.Timestamp.fromDate(createdAt),
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        metadata: {
          trainerId: classData.trainerId,
          trainerName: classData.trainerName,
          startTime: classData.startTime,
          maxParticipants: classData.maxParticipants,
          location: classData.location,
          backfilled: true
        }
      });
      activityCount++;
    }
    console.log(`✅ Created ${classesSnap.size} class activities\n`);
    
    // 4. Backfill pass purchases
    console.log('📝 Processing lesson packages...');
    const packagesSnap = await db.collection('lessonPackages')
      .where('orgId', '==', orgId)
      .get();
    
    for (const doc of packagesSnap.docs) {
      const pkg = doc.data();
      const purchasedAt = pkg.purchaseDate?.toDate() || pkg.createdAt?.toDate() || new Date();
      
      await db.collection('activities').add({
        type: 'pass_purchased',
        actorId: pkg.userId || 'unknown',
        actorName: pkg.clientName || 'Client',
        actorRole: 'client',
        targetId: doc.id,
        targetName: pkg.packageName || pkg.packageType,
        targetType: 'pass',
        description: `${pkg.packageName || pkg.packageType} package purchased (${pkg.totalLessons} lessons)`,
        orgId: orgId,
        timestamp: admin.firestore.Timestamp.fromDate(purchasedAt),
        createdAt: admin.firestore.Timestamp.fromDate(purchasedAt),
        metadata: {
          packageType: pkg.packageType,
          totalLessons: pkg.totalLessons,
          priceInCents: pkg.priceInCents,
          transactionId: pkg.transactionId,
          backfilled: true
        }
      });
      activityCount++;
    }
    console.log(`✅ Created ${packagesSnap.size} pass purchase activities\n`);
    
    // 5. Backfill locations
    console.log('📝 Processing locations...');
    const locationsSnap = await db.collection('locations')
      .where('orgId', '==', orgId)
      .get();
    
    for (const doc of locationsSnap.docs) {
      const location = doc.data();
      const createdAt = location.createdAt?.toDate() || new Date();
      
      await db.collection('activities').add({
        type: 'location_created',
        actorId: orgId,
        actorName: 'Admin',
        actorRole: 'admin',
        targetId: doc.id,
        targetName: location.name,
        targetType: 'location',
        description: `Location "${location.name}" was added`,
        orgId: orgId,
        timestamp: admin.firestore.Timestamp.fromDate(createdAt),
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        metadata: {
          address: location.address,
          backfilled: true
        }
      });
      activityCount++;
    }
    console.log(`✅ Created ${locationsSnap.size} location activities\n`);
    
    console.log(`\n🎉 Backfill complete! Created ${activityCount} activity log entries.`);
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  }
}

// Run the migration
backfillActivities()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
