/**
 * Script to update Stripe publishable key in all organizations
 * Run with: node update-stripe-publishable-key.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

// Your LIVE publishable key
const LIVE_PUBLISHABLE_KEY = 'pk_live_51SnNeOFIh2MhEffNF7SS0liDja5jF9tha3SnJVAO42OcVDkBVIiTralDrcZplXU7JO4E3lijrDIA31RwIrh2oq2r00HBWB8fTD';

async function updateStripePublishableKey() {
  try {
    console.log('🔄 Updating Stripe publishable key in all organizations...');
    
    // Get all organizations
    const orgsSnapshot = await db.collection('organizations').get();
    
    if (orgsSnapshot.empty) {
      console.log('⚠️  No organizations found');
      return;
    }
    
    console.log(`📋 Found ${orgsSnapshot.size} organization(s)`);
    
    // Update each organization
    const batch = db.batch();
    let updateCount = 0;
    
    orgsSnapshot.forEach((doc) => {
      const orgRef = db.collection('organizations').doc(doc.id);
      batch.update(orgRef, {
        'stripe.publishableKey': LIVE_PUBLISHABLE_KEY,
        'stripe.keysConfigured': true,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
      updateCount++;
      console.log(`  ✓ Queued update for organization: ${doc.id} (${doc.data().name || 'Unnamed'})`);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`✅ Successfully updated ${updateCount} organization(s) with live publishable key`);
    console.log(`🔑 Key used: ${LIVE_PUBLISHABLE_KEY.substring(0, 20)}...`);
    console.log('\n📱 Next steps:');
    console.log('1. Deploy functions: firebase deploy --only functions');
    console.log('2. Restart your iOS apps to pick up the new key');
    console.log('3. Test a payment to verify live mode is working');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating publishable key:', error);
    process.exit(1);
  }
}

// Run the update
updateStripePublishableKey();
