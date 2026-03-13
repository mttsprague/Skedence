/**
 * Cleanup Script: Remove Class Registration Bookings
 * 
 * Context: Before the fix, class registrations created duplicate bookings 
 * with isClassBooking: true. These bookings are no longer needed since 
 * classes are displayed via the classes array, not the bookings array.
 * 
 * This script:
 * 1. Queries all bookings where isClassBooking === true
 * 2. Displays them for review
 * 3. Deletes them from Firestore
 * 
 * Usage: node cleanup-class-registration-bookings.js
 */

const admin = require('firebase-admin');

// Initialize with Application Default Credentials
// Make sure you're logged in with: firebase login
admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function cleanupClassRegistrationBookings() {
  try {
    console.log('🔍 Searching for class registration bookings...\n');

    // Query all bookings where isClassBooking is true
    const bookingsQuery = db.collection('bookings')
      .where('isClassBooking', '==', true);

    const snapshot = await bookingsQuery.get();

    if (snapshot.empty) {
      console.log('✅ No class registration bookings found. Database is clean!');
      return;
    }

    console.log(`📊 Found ${snapshot.size} class registration bookings to remove:\n`);

    // Display bookings for review
    const bookingsToDelete = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      bookingsToDelete.push({ id: doc.id, data });
      
      console.log(`Booking ID: ${doc.id}`);
      console.log(`  Client: ${data.clientId}`);
      console.log(`  Trainer: ${data.trainerId}`);
      console.log(`  Class ID: ${data.classId || 'N/A'}`);
      console.log(`  Start Time: ${data.startTime?.toDate?.()}`);
      console.log(`  Org: ${data.orgId}`);
      console.log('---');
    });

    // Confirm deletion
    console.log(`\n⚠️  About to delete ${bookingsToDelete.length} bookings...\n`);
    
    // If you want to add a confirmation prompt, uncomment this:
    // const readline = require('readline').createInterface({
    //   input: process.stdin,
    //   output: process.stdout
    // });
    // const answer = await new Promise(resolve => {
    //   readline.question('Proceed with deletion? (yes/no): ', resolve);
    // });
    // readline.close();
    // if (answer.toLowerCase() !== 'yes') {
    //   console.log('❌ Deletion cancelled.');
    //   return;
    // }

    // Delete bookings in batches
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < bookingsToDelete.length; i += batchSize) {
      const batch = db.batch();
      const batchItems = bookingsToDelete.slice(i, i + batchSize);

      batchItems.forEach(item => {
        const docRef = db.collection('bookings').doc(item.id);
        batch.delete(docRef);
      });

      await batch.commit();
      deletedCount += batchItems.length;
      console.log(`✅ Deleted ${deletedCount}/${bookingsToDelete.length} bookings...`);
    }

    console.log(`\n🎉 Successfully deleted ${deletedCount} class registration bookings!`);
    console.log('✅ Database cleanup complete.\n');

  } catch (error) {
    console.error('❌ Error cleaning up bookings:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupClassRegistrationBookings()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
