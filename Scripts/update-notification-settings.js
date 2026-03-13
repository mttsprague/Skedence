/**
 * Update existing notification settings to include new individual toggles
 * Run this to add the new notification fields to existing organizations
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function updateNotificationSettings() {
  console.log('🔍 Finding organizations with notification settings...\n');

  try {
    // Get all organizations
    const orgsSnapshot = await db.collection('organizations').get();
    
    console.log(`Found ${orgsSnapshot.size} organizations\n`);

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      console.log(`\n📋 Organization: ${orgData.name} (${orgId})`);

      // Check if bookingAlerts settings exist
      const settingsDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc('bookingAlerts')
        .get();

      if (!settingsDoc.exists) {
        console.log('   ⚠️  No bookingAlerts settings found - skipping');
        continue;
      }

      const currentSettings = settingsDoc.data();
      console.log('   Current settings:', JSON.stringify(currentSettings, null, 2));

      // Check if new fields already exist
      if (currentSettings.sendLessonBookingNotifications !== undefined) {
        console.log('   ✅ Already has new notification fields - no update needed');
        continue;
      }

      // Add new fields (default all to true if master toggle is on)
      const masterToggle = currentSettings.sendAppointmentNotifications === true;
      
      const updatedSettings = {
        ...currentSettings,
        sendLessonBookingNotifications: masterToggle,
        sendLessonCancellationNotifications: masterToggle,
        sendPackagePurchaseNotifications: masterToggle,
        sendClassRegistrationNotifications: masterToggle,
        sendClassCancellationNotifications: masterToggle
      };

      // Update Firestore
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc('bookingAlerts')
        .set(updatedSettings, { merge: true });

      console.log('   ✅ Updated with new notification fields:');
      console.log('      - sendLessonBookingNotifications:', masterToggle);
      console.log('      - sendLessonCancellationNotifications:', masterToggle);
      console.log('      - sendPackagePurchaseNotifications:', masterToggle);
      console.log('      - sendClassRegistrationNotifications:', masterToggle);
      console.log('      - sendClassCancellationNotifications:', masterToggle);
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error updating notification settings:', error);
    process.exit(1);
  }
}

updateNotificationSettings();
