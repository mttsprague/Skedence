const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function fixAdminEmail() {
  try {
    const orgId = 'skedence_gym';
    const adminEmail = 'mttsprague@gmail.com'; // Your admin email
    
    console.log(`\n🔧 Adding adminEmail field to organization: ${orgId}`);
    console.log(`   Email to add: ${adminEmail}\n`);
    
    await db.collection('organizations')
      .doc(orgId)
      .update({
        'adminEmail': adminEmail,
        'ownerEmail': adminEmail  // Also add as ownerEmail for clarity
      });
    
    console.log('   ✅ Admin email added to organization document\n');
    console.log('   This will be used as fallback when user lookup fails.\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdminEmail().then(() => process.exit(0));
