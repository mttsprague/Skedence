const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function createNotificationSettings() {
  try {
    const orgId = 'skedence_gym';
    
    const settings = {
      sendAppointmentNotifications: true,  // ✅ Enable admin appointment emails
      sendSummaryEmails: false,           // Weekly/daily summaries (not implemented yet)
      summaryFrequency: 'weekly',
      summaryTime: '19:00',
      timezone: 'America/Chicago'
    };
    
    console.log(`\n📝 Creating notification settings for org: ${orgId}`);
    console.log('Settings to save:', JSON.stringify(settings, null, 2));
    
    await db.collection('organizations')
      .doc(orgId)
      .collection('settings')
      .doc('bookingAlerts')
      .set(settings);
    
    console.log('\n✅ Settings saved successfully!');
    console.log('   Admin will now receive booking notification emails\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createNotificationSettings().then(() => process.exit(0));
