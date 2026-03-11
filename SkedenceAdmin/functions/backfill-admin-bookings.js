/**
 * Backfill Admin-Booked Lessons
 * 
 * This script fixes existing bookings where admin scheduled lessons for clients.
 * Problem: clientId/clientUID may be using random IDs instead of firstName_lastName format
 * Fix: Update clientId and clientUID to use the proper firstName_lastName document ID
 * 
 * Run: node backfill-admin-bookings.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using application default credentials
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function backfillAdminBookings() {
  console.log('🔄 Starting backfill of admin-booked lessons...\n');
  
  try {
    // Fetch ALL bookings
    const bookingsSnapshot = await db.collection('bookings').get();
    console.log(`📊 Found ${bookingsSnapshot.size} total bookings\n`);
    
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let alreadyCorrectCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    const batchLimit = 500; // Firestore batch limit
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      processedCount++;
      const bookingId = bookingDoc.id;
      const bookingData = bookingDoc.data();
      
      const currentClientId = bookingData.clientId || bookingData.clientUID;
      const currentClientAuthUID = bookingData.clientAuthUID;
      const orgId = bookingData.orgId;
      
      if (!currentClientId) {
        console.log(`⚠️  Booking ${bookingId}: Missing clientId/clientUID, skipping`);
        errorCount++;
        continue;
      }
      
      if (!orgId) {
        console.log(`⚠️  Booking ${bookingId}: Missing orgId, skipping`);
        errorCount++;
        continue;
      }
      
      try {
        // Try to find the user document - first by current clientId
        let userDoc = await db.collection('users').doc(currentClientId).get();
        let correctClientDocId = null;
        let correctAuthUserId = null;
        
        if (userDoc.exists) {
          // User doc found - this is the firstName_lastName ID
          correctClientDocId = userDoc.id;
          correctAuthUserId = userDoc.data().authUserId;
        } else {
          // User doc not found by clientId - try to find by authUserId or query
          // Maybe clientId is actually an Auth UID or random ID
          
          // Try finding user by authUserId field matching currentClientId
          let userQuery = await db.collection('users')
            .where('authUserId', '==', currentClientId)
            .where('orgId', '==', orgId)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            userDoc = userQuery.docs[0];
            correctClientDocId = userDoc.id; // This is firstName_lastName
            correctAuthUserId = userDoc.data().authUserId;
            console.log(`🔍 Found user by authUserId match: ${currentClientId} → ${correctClientDocId}`);
          } else {
            // Try by clientName field in booking (firstName lastName) → convert to firstName_lastName
            const clientName = bookingData.clientName;
            if (clientName) {
              const nameParts = clientName.trim().split(' ');
              if (nameParts.length >= 2) {
                const potentialDocId = `${nameParts[0]}_${nameParts.slice(1).join('_')}`.toLowerCase();
                userDoc = await db.collection('users').doc(potentialDocId).get();
                
                if (userDoc.exists && userDoc.data().orgId === orgId) {
                  correctClientDocId = userDoc.id;
                  correctAuthUserId = userDoc.data().authUserId;
                  console.log(`🔍 Found user by name conversion: "${clientName}" → ${correctClientDocId}`);
                } else {
                  // Last resort: query by name fields
                  userQuery = await db.collection('users')
                    .where('orgId', '==', orgId)
                    .where('firstName', '==', nameParts[0])
                    .where('lastName', '==', nameParts.slice(1).join(' '))
                    .limit(1)
                    .get();
                  
                  if (!userQuery.empty) {
                    userDoc = userQuery.docs[0];
                    correctClientDocId = userDoc.id;
                    correctAuthUserId = userDoc.data().authUserId;
                    console.log(`🔍 Found user by name query: "${clientName}" → ${correctClientDocId}`);
                  }
                }
              }
            }
          }
        }
        
        if (!correctClientDocId) {
          console.log(`⚠️  Booking ${bookingId}: Could not find user document for client "${currentClientId}" / "${bookingData.clientName}", skipping`);
          errorCount++;
          continue;
        }
        
        // Check if update is needed
        const needsClientIdUpdate = currentClientId !== correctClientDocId;
        const needsAuthUidUpdate = correctAuthUserId && currentClientAuthUID !== correctAuthUserId;
        
        if (!needsClientIdUpdate && !needsAuthUidUpdate) {
          // Already correct
          alreadyCorrectCount++;
          if (processedCount % 50 === 0) {
            console.log(`✓ Processing... ${processedCount}/${bookingsSnapshot.size} (${updatedCount} updated, ${alreadyCorrectCount} already correct)`);
          }
          continue;
        }
        
        // Needs update
        console.log(`📝 Booking ${bookingId}:`);
        console.log(`   Start Time: ${bookingData.startTime?.toDate?.()?.toISOString?.() || 'unknown'}`);
        
        const updates = {};
        
        if (needsClientIdUpdate) {
          console.log(`   OLD clientId: ${currentClientId}`);
          console.log(`   NEW clientId: ${correctClientDocId} (firstName_lastName format)`);
          updates.clientId = correctClientDocId;
          updates.clientUID = correctClientDocId;
        }
        
        if (needsAuthUidUpdate) {
          console.log(`   OLD clientAuthUID: ${currentClientAuthUID || 'null'}`);
          console.log(`   NEW clientAuthUID: ${correctAuthUserId}`);
          updates.clientAuthUID = correctAuthUserId;
        }
        
        updates.backfilledAt = admin.firestore.FieldValue.serverTimestamp();
        console.log('');
        
        // Add to batch
        batch.update(bookingDoc.ref, updates);
        
        updatedCount++;
        batchCount++;
        
        // Commit batch if we hit the limit
        if (batchCount >= batchLimit) {
          await batch.commit();
          console.log(`✅ Committed batch of ${batchCount} updates\n`);
          batchCount = 0;
        }
        
      } catch (error) {
        console.error(`❌ Error processing booking ${bookingId}:`, error.message);
        errorCount++;
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates\n`);
    }
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 BACKFILL SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Bookings:        ${bookingsSnapshot.size}`);
    console.log(`Processed:             ${processedCount}`);
    console.log(`✅ Updated:            ${updatedCount}`);
    console.log(`✓ Already Correct:     ${alreadyCorrectCount}`);
    console.log(`❌ Errors/Skipped:     ${errorCount}`);
    console.log('═══════════════════════════════════════\n');
    
    if (updatedCount > 0) {
      console.log('✅ Backfill complete! Admin-booked lessons should now appear in client schedules.');
      console.log('📝 All clientId/clientUID fields now use firstName_lastName format.');
    } else if (alreadyCorrectCount === processedCount) {
      console.log('✅ All bookings already have correct clientId format. No updates needed.');
    } else {
      console.log('⚠️  Some bookings could not be updated. Check errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Dry run mode - preview changes without committing
async function dryRunBackfill() {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  console.log('═══════════════════════════════════════\n');
  
  try {
    const bookingsSnapshot = await db.collection('bookings').get();
    console.log(`📊 Found ${bookingsSnapshot.size} total bookings\n`);
    
    let needsUpdateCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    const issues = [];
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingId = bookingDoc.id;
      const bookingData = bookingDoc.data();
      
      const currentClientId = bookingData.clientId || bookingData.clientUID;
      const currentClientAuthUID = bookingData.clientAuthUID;
      const orgId = bookingData.orgId;
      
      if (!currentClientId || !orgId) {
        errorCount++;
        continue;
      }
      
      try {
        // Try to find the user document
        let userDoc = await db.collection('users').doc(currentClientId).get();
        let correctClientDocId = null;
        let correctAuthUserId = null;
        
        if (userDoc.exists) {
          correctClientDocId = userDoc.id;
          correctAuthUserId = userDoc.data().authUserId;
        } else {
          // Try finding by authUserId
          let userQuery = await db.collection('users')
            .where('authUserId', '==', currentClientId)
            .where('orgId', '==', orgId)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            userDoc = userQuery.docs[0];
            correctClientDocId = userDoc.id;
            correctAuthUserId = userDoc.data().authUserId;
          } else {
            // Try by client name
            const clientName = bookingData.clientName;
            if (clientName) {
              const nameParts = clientName.trim().split(' ');
              if (nameParts.length >= 2) {
                const potentialDocId = `${nameParts[0]}_${nameParts.slice(1).join('_')}`.toLowerCase();
                userDoc = await db.collection('users').doc(potentialDocId).get();
                
                if (userDoc.exists && userDoc.data().orgId === orgId) {
                  correctClientDocId = userDoc.id;
                  correctAuthUserId = userDoc.data().authUserId;
                } else {
                  userQuery = await db.collection('users')
                    .where('orgId', '==', orgId)
                    .where('firstName', '==', nameParts[0])
                    .where('lastName', '==', nameParts.slice(1).join(' '))
                    .limit(1)
                    .get();
                  
                  if (!userQuery.empty) {
                    userDoc = userQuery.docs[0];
                    correctClientDocId = userDoc.id;
                    correctAuthUserId = userDoc.data().authUserId;
                  }
                }
              }
            }
          }
        }
        
        if (!correctClientDocId) {
          errorCount++;
          continue;
        }
        
        const needsClientIdUpdate = currentClientId !== correctClientDocId;
        const needsAuthUidUpdate = correctAuthUserId && currentClientAuthUID !== correctAuthUserId;
        
        if (!needsClientIdUpdate && !needsAuthUidUpdate) {
          alreadyCorrectCount++;
        } else {
          needsUpdateCount++;
          const issue = {
            bookingId,
            time: bookingData.startTime?.toDate?.()?.toISOString?.() || 'unknown',
            updates: []
          };
          
          if (needsClientIdUpdate) {
            issue.updates.push(`clientId: "${currentClientId}" → "${correctClientDocId}"`);
          }
          if (needsAuthUidUpdate) {
            issue.updates.push(`clientAuthUID: "${currentClientAuthUID || 'null'}" → "${correctAuthUserId}"`);
          }
          
          console.log(`📝 WOULD UPDATE: ${bookingId}`);
          console.log(`   Time: ${issue.time}`);
          console.log(`   Client: "${bookingData.clientName || 'unknown'}"`);
          issue.updates.forEach(update => console.log(`   ${update}`));
          console.log('');
          
          issues.push(issue);
        }
        
      } catch (error) {
        errorCount++;
      }
    }
    
    console.log('═══════════════════════════════════════');
    console.log('📊 DRY RUN SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Bookings:        ${bookingsSnapshot.size}`);
    console.log(`Would Update:          ${needsUpdateCount}`);
    console.log(`Already Correct:       ${alreadyCorrectCount}`);
    console.log(`Errors/Skip:           ${errorCount}`);
    console.log('═══════════════════════════════════════\n');
    
    if (needsUpdateCount > 0) {
      console.log(`✅ ${needsUpdateCount} bookings need updating to firstName_lastName format.`);
      console.log('📝 Run without --dry-run to apply changes: node backfill-admin-bookings.js');
    } else {
      console.log('✅ All bookings already use correct firstName_lastName format.');
    }
    
  } catch (error) {
    console.error('❌ Error during dry run:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Check command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

if (isDryRun) {
  dryRunBackfill();
} else {
  // Show warning and require confirmation
  console.log('⚠️  WARNING: This will modify booking documents in Firestore\n');
  console.log('📝 To preview changes first, run: node backfill-admin-bookings.js --dry-run\n');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  setTimeout(() => {
    backfillAdminBookings();
  }, 3000);
}
