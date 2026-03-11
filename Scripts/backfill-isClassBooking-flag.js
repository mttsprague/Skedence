/**
 * Backfill isClassBooking Flag for Existing Class Bookings
 * 
 * This script updates existing booking documents that have a classId
 * but are missing the isClassBooking flag, which causes them to show
 * as blue lessons instead of orange classes on the schedule.
 * 
 * Background:
 * - Older class bookings may not have the isClassBooking flag
 * - The schedule grid filters bookings with isClassBooking=true to avoid duplicates
 * - Without the flag, class bookings show as blue lessons
 * 
 * Usage:
 * node backfill-isClassBooking-flag.js
 * 
 * Add --dry-run to preview changes without applying them:
 * node backfill-isClassBooking-flag.js --dry-run
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
const isDryRun = process.argv.includes('--dry-run');

async function backfillIsClassBookingFlag() {
  console.log('\n🚀 Starting isClassBooking flag backfill...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  let stats = {
    totalBookings: 0,
    classBookingsFound: 0,
    bookingsUpdated: 0,
    bookingsAlreadyCorrect: 0,
    errors: 0
  };

  try {
    // Get all bookings
    const bookingsSnapshot = await db.collection('bookings').get();
    stats.totalBookings = bookingsSnapshot.size;
    console.log(`📊 Found ${stats.totalBookings} total bookings\n`);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingData = bookingDoc.data();
      const bookingId = bookingDoc.id;
      const classId = bookingData.classId;
      const isClassBooking = bookingData.isClassBooking;

      // Check if this booking is for a class (has classId)
      if (classId) {
        stats.classBookingsFound++;
        
        console.log(`\n📝 Class Booking: ${bookingId}`);
        console.log(`   Class ID: ${classId}`);
        console.log(`   Client: ${bookingData.clientUID || bookingData.clientId}`);
        console.log(`   Trainer: ${bookingData.trainerName || bookingData.trainerId}`);
        console.log(`   Status: ${bookingData.status}`);
        console.log(`   Start: ${bookingData.startTime?.toDate?.() || bookingData.startTime}`);

        // Check if isClassBooking flag is missing or false
        if (!isClassBooking) {
          console.log(`   ⚠️  Missing isClassBooking flag - needs update`);
          
          if (!isDryRun) {
            batch.update(bookingDoc.ref, {
              isClassBooking: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batchCount++;
            stats.bookingsUpdated++;
            console.log(`   ✅ Queued for update`);

            // Commit batch if we hit the limit
            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              console.log(`\n💾 Committed batch of ${batchCount} updates`);
              batchCount = 0;
            }
          } else {
            stats.bookingsUpdated++;
            console.log(`   📋 Would update (dry run)`);
          }
        } else {
          stats.bookingsAlreadyCorrect++;
          console.log(`   ✓ Already has isClassBooking=true`);
        }
      }
    }

    // Commit any remaining updates
    if (!isDryRun && batchCount > 0) {
      await batch.commit();
      console.log(`\n💾 Committed final batch of ${batchCount} updates`);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total bookings scanned:       ${stats.totalBookings}`);
    console.log(`Class bookings found:         ${stats.classBookingsFound}`);
    console.log(`Bookings ${isDryRun ? 'to update' : 'updated'}:          ${stats.bookingsUpdated}`);
    console.log(`Bookings already correct:     ${stats.bookingsAlreadyCorrect}`);
    console.log(`Errors encountered:           ${stats.errors}`);
    console.log('='.repeat(60));
    
    if (isDryRun) {
      console.log('\n📝 This was a dry run. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Backfill complete!');
      console.log('Classes should now display correctly as orange on the schedule.');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillIsClassBookingFlag()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
