const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const TEST_PUBLISHABLE_KEY = 'pk_test_51SnNeW2XPese4Q6CcCP3PEEmGNoXZgMOz3yt25sbxvpkBi2btKDK2tPPVTayk17SyMfKNko8Te7Fn9TU3C42Vxbj0014EWKxlS';

async function updateToTestMode() {
  try {
    console.log('🔄 Updating organizations to TEST mode...\n');
    
    const orgsSnapshot = await db.collection('organizations').get();
    
    for (const doc of orgsSnapshot.docs) {
      await doc.ref.update({
        'stripe.publishableKey': TEST_PUBLISHABLE_KEY,
        'stripe.mode': 'test',
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Updated ${doc.id} (${doc.data().name || 'Unnamed'})`);
    }
    
    console.log(`\n✅ Successfully updated ${orgsSnapshot.size} organizations to TEST mode`);
    console.log('📝 Test publishable key: ' + TEST_PUBLISHABLE_KEY);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

updateToTestMode();
