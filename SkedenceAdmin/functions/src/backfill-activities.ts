/**
 * Backfill Activities Cloud Function
 * 
 * Deploy this as a Cloud Function and call it via HTTP to backfill activities.
 * 
 * Deploy: firebase deploy --only functions:backfillActivities
 * Call: curl https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillActivities
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const backfillActivities = functions.https.onRequest(async (req, res) => {
  const orgId = 'KFdD3OPexhMLQ4LlSZVF'; // Your org ID
  let activityCount = 0;
  const results: any = {};
  
  try {
    const db = admin.firestore();
    
    // 1. Backfill trainer creations
    console.log('Processing trainers...');
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
    results.trainers = trainersSnap.size;
    
    // 2. Backfill lesson bookings
    console.log('Processing bookings...');
    const bookingsSnap = await db.collection('bookings')
      .where('orgId', '==', orgId)
      .get();
    
    for (const doc of bookingsSnap.docs) {
      const booking = doc.data();
      const bookedAt = booking.bookedAt?.toDate() || booking.createdAt?.toDate() || new Date();
      
      if (booking.status === 'canceled') {
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
    results.bookings = bookingsSnap.size;
    
    // 3. Backfill class creations
    console.log('Processing classes...');
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
    results.classes = classesSnap.size;
    
    // 4. Backfill pass purchases
    console.log('Processing lesson packages...');
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
    results.packages = packagesSnap.size;
    
    // 5. Backfill locations
    console.log('Processing locations...');
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
    results.locations = locationsSnap.size;
    
    res.json({
      success: true,
      message: `Backfill complete! Created ${activityCount} activity log entries.`,
      results
    });
    
  } catch (error: any) {
    console.error('Error during backfill:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
