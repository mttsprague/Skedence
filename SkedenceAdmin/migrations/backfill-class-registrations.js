const admin = require('firebase-admin');

// Initialize Firebase Admin (uses application default credentials or environment)
// Make sure you've run: firebase login
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function backfillClassRegistrations() {
  console.log('🔄 Starting backfill of classRegistrations collection...\n');
  
  let totalParticipants = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // Get all classes
    const classesSnapshot = await db.collection('classes').get();
    console.log(`📚 Found ${classesSnapshot.size} classes to process\n`);

    for (const classDoc of classesSnapshot.docs) {
      const classId = classDoc.id;
      const classData = classDoc.data();
      const className = classData.title || 'Unnamed Class';
      
      console.log(`\n📖 Processing class: ${className} (${classId})`);

      // Get participants subcollection
      const participantsSnapshot = await db
        .collection(`classes/${classId}/participants`)
        .get();

      if (participantsSnapshot.empty) {
        console.log(`  ⏭️  No participants found`);
        continue;
      }

      console.log(`  👥 Found ${participantsSnapshot.size} participants`);
      totalParticipants += participantsSnapshot.size;

      // Process each participant
      for (const participantDoc of participantsSnapshot.docs) {
        const participantId = participantDoc.id;
        const participantData = participantDoc.data();
        
        const userId = participantData.userId;
        const athleteName = participantData.athleteName;
        const athleteCount = participantData.athleteCount || 1;
        const classPassPackageId = participantData.classPassPackageId;
        const registeredAt = participantData.registeredAt;

        if (!userId) {
          console.log(`  ⚠️  Skipping participant ${participantId}: missing userId`);
          totalSkipped++;
          continue;
        }

        // Create registrationId (same format as Cloud Function)
        const registrationId = `${userId}_${classId}`;

        // Check if registration already exists
        const existingReg = await db
          .collection('classRegistrations')
          .doc(registrationId)
          .get();

        if (existingReg.exists) {
          console.log(`  ✅ Registration already exists for ${athleteName || userId}`);
          totalSkipped++;
          continue;
        }

        // Get user data to find orgId
        let orgId = participantData.orgId || null;
        if (!orgId) {
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
              orgId = userDoc.data().orgId || null;
            }
          } catch (err) {
            console.log(`  ⚠️  Could not fetch user ${userId}: ${err.message}`);
          }
        }

        // Create classRegistrations document
        try {
          await db.collection('classRegistrations').doc(registrationId).set({
            userId: userId,
            clientId: userId, // For backward compatibility
            classId: classId,
            orgId: orgId,
            athleteName: athleteName || null,
            secondAthleteName: participantData.secondAthleteName || null,
            athleteCount: athleteCount,
            classPassPackageId: classPassPackageId || null,
            registeredAt: registeredAt || admin.firestore.FieldValue.serverTimestamp(),
            // Mark as backfilled for reference
            backfilled: true,
            backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`  ✨ Created registration for ${athleteName || userId} (orgId: ${orgId || 'unknown'})`);
          totalCreated++;
        } catch (err) {
          console.log(`  ❌ Error creating registration for ${userId}: ${err.message}`);
          totalErrors++;
        }
      }
    }

    console.log('\n\n========================================');
    console.log('✅ Backfill Complete!');
    console.log('========================================');
    console.log(`📊 Total participants found: ${totalParticipants}`);
    console.log(`✨ Registrations created: ${totalCreated}`);
    console.log(`⏭️  Registrations skipped (already exist): ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the migration
backfillClassRegistrations()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
