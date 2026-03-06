#!/usr/bin/env node

/**
 * Check the most recent trainer and their invitation email status
 */

const admin = require('firebase-admin');
const serviceAccount = require('../SkedenceAdmin/functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkRecentTrainerInvitation() {
  try {
    console.log('\n🔍 Checking recent trainer invitations...\n');

    // Get the most recent trainer with needsPasswordSetup
    const trainersSnapshot = await db.collection('trainers')
      .where('needsPasswordSetup', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (trainersSnapshot.empty) {
      console.log('❌ No trainers found with needsPasswordSetup=true');
      return;
    }

    const trainerDoc = trainersSnapshot.docs[0];
    const trainerData = trainerDoc.data();
    const trainerId = trainerDoc.id;

    console.log('📋 Trainer Info:');
    console.log(`   ID: ${trainerId}`);
    console.log(`   Name: ${trainerData.firstName} ${trainerData.lastName}`);
    console.log(`   Email: ${trainerData.emailAddress || trainerData.email}`);
    console.log(`   OrgID: ${trainerData.orgId}`);
    console.log(`   Created: ${trainerData.createdAt?.toDate()}`);
    console.log(`   Setup Token: ${trainerData.setupToken}`);
    console.log(`   Needs Setup: ${trainerData.needsPasswordSetup}`);

    // Check if an email was queued for this trainer
    const emailAddress = trainerData.emailAddress || trainerData.email;
    const mailSnapshot = await db.collection('mail')
      .where('to', '==', emailAddress)
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    console.log(`\n📧 Email Queue Status (last 3 emails to ${emailAddress}):`);
    if (mailSnapshot.empty) {
      console.log('   ❌ No emails found in queue for this trainer');
      console.log('   This means the Cloud Function may not have triggered!');
    } else {
      mailSnapshot.forEach((doc, index) => {
        const mailData = doc.data();
        console.log(`\n   Email #${index + 1}:`);
        console.log(`   Subject: ${mailData.message?.subject}`);
        console.log(`   Created: ${mailData.createdAt?.toDate()}`);
        console.log(`   Delivery State: ${mailData.delivery?.state || 'PENDING'}`);
        if (mailData.delivery?.error) {
          console.log(`   ❌ Error: ${JSON.stringify(mailData.delivery.error)}`);
        } else if (mailData.delivery?.state === 'SUCCESS') {
          console.log(`   ✅ Sent at: ${mailData.delivery.endTime?.toDate()}`);
        } else if (mailData.delivery?.state === 'PROCESSING') {
          console.log(`   ⏳ Currently sending...`);
        }
      });
    }

    // Provide manual resend option
    console.log('\n💡 To manually resend the invitation:');
    console.log(`   1. Go to Firestore Console`);
    console.log(`   2. Find trainers/${trainerId}`);
    console.log(`   3. Toggle needsPasswordSetup to false, then back to true`);
    console.log(`   OR run: node Scripts/resend-trainer-invitation.js ${trainerId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 9) {
      console.log('\n💡 Firestore index may be needed. Error details:', error.details);
    }
  }
}

checkRecentTrainerInvitation().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
