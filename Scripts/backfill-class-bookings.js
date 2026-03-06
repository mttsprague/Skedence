/**
 * Backfill Booking Documents for Class Registrations
 * 
 * This script creates booking documents for existing class registrations
 * so they appear in the client's schedule/bookings view.
 * 
 * Background:
 * - Class registrations were only creating classRegistrations documents
 * - But fetchClientBookings queries the bookings collection
 * - This script creates the missing booking documents
 * 
 * Usage:
 * node backfill-class-bookings.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using default credentials (from Firebase CLI)
try {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('Make sure you are logged in with Firebase CLI: firebase login');
  process.exit(1);
}

const db = admin.firestore();

async function backfillClassBookings() {
  console.log('\n🚀 Starting class booking backfill...\n');
  
  let stats = {
    totalRegistrations: 0,
    bookingsCreated: 0,
    bookingsAlreadyExist: 0,
    classesNotFound: 0,
    errors: 0
  };

  try {
    // Get all class registrations
    const registrationsSnapshot = await db.collection('classRegistrations').get();
    stats.totalRegistrations = registrationsSnapshot.size;
    console.log(`📊 Found ${stats.totalRegistrations} class registrations\n`);

    for (const registrationDoc of registrationsSnapshot.docs) {
      const registrationData = registrationDoc.data();
      const registrationId = registrationDoc.id;
      const userId = registrationData.userId || registrationData.clientId;
      const classId = registrationData.classId;
      const orgId = registrationData.orgId;
      const athleteName = registrationData.athleteName;
      const secondAthleteName = registrationData.secondAthleteName;
      const classPassPackageId = registrationData.classPassPackageId;

      console.log(`\n📝 Processing registration: ${registrationId}`);
      console.log(`   User: ${userId}, Class: ${classId}`);

      // Skip manual entries (no userId)
      if (!userId) {
        console.log(`   ⏭️  Skipping manual entry (no userId)`);
        continue;
      }

      try {
        // Get class data
        const classDoc = await db.collection('classes').doc(classId).get();
        if (!classDoc.exists) {
          console.log(`   ⚠️  Class not found: ${classId}`);
          stats.classesNotFound++;
          continue;
        }

        const classData = classDoc.data();

        // Check if booking already exists for this user + class combination
        const existingBookingQuery = await db.collection('bookings')
          .where('clientUID', '==', userId)
          .where('classId', '==', classId)
          .where('isClassBooking', '==', true)
          .limit(1)
          .get();

        if (!existingBookingQuery.empty) {
          console.log(`   ✓ Booking already exists`);
          stats.bookingsAlreadyExist++;
          continue;
        }

        // Create booking document
        const athleteNames = secondAthleteName 
          ? [athleteName, secondAthleteName] 
          : athleteName ? [athleteName] : [];

        const bookingData = {
          clientUID: userId,
          trainerId: classData.trainerId || '',
          trainerName: classData.trainerName || 'Unknown Trainer',
          orgId: orgId || '',
          startTime: classData.startTime,
          endTime: classData.endTime,
          status: 'booked',
          isClassBooking: true,
          classId: classId,
          packageId: classPassPackageId || '',
          lessonPackageId: classPassPackageId || '', // For backward compatibility
          athleteName: athleteName || null,
          secondAthleteName: secondAthleteName || null,
          athleteNames: athleteNames,
          location: classData.location || '',
          bookedAt: registrationData.registeredAt || admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('bookings').add(bookingData);
        stats.bookingsCreated++;
        console.log(`   ✅ Created booking document`);

      } catch (error) {
        console.error(`   ❌ Error processing registration ${registrationId}:`, error.message);
        stats.errors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total registrations:          ${stats.totalRegistrations}`);
    console.log(`Bookings created:             ${stats.bookingsCreated}`);
    console.log(`Bookings already exist:       ${stats.bookingsAlreadyExist}`);
    console.log(`Classes not found:            ${stats.classesNotFound}`);
    console.log(`Errors encountered:           ${stats.errors}`);
    console.log('='.repeat(60));
    console.log('\n✅ Backfill complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillClassBookings()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
