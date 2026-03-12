const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function checkNotificationSettings() {
  try {
    const orgId = 'skedence_gym';
    
    console.log(`\n🔍 Checking notification settings for org: ${orgId}\n`);
    
    // Check if the settings document exists
    const settingsRef = db.collection('organizations').doc(orgId).collection('settings').doc('bookingAlerts');
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      console.log('❌ Document does NOT exist at:');
      console.log(`   organizations/${orgId}/settings/bookingAlerts`);
      console.log('\n💡 This is why notifications are disabled - no settings document found!');
      console.log('\n🔧 Fix: Toggle the settings in the admin portal to create the document.');
      return;
    }
    
    console.log('✅ Document EXISTS at:');
    console.log(`   organizations/${orgId}/settings/bookingAlerts`);
    
    const data = settingsDoc.data();
    console.log('\n📄 Document contents:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🔍 Checking sendAppointmentNotifications field:');
    const value = data?.sendAppointmentNotifications;
    console.log(`   Value: ${value}`);
    console.log(`   Type: ${typeof value}`);
    console.log(`   Strict equals true: ${value === true}`);
    
    if (value === true) {
      console.log('\n✅ Notifications are ENABLED');
    } else {
      console.log('\n❌ Notifications are DISABLED');
      console.log('   Function will NOT send admin emails');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkNotificationSettings().then(() => process.exit(0));
