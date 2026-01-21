/**
 * Check what subscription data is actually in Firestore
 * Usage: node check-firestore-subscription.js <orgId>
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function checkSubscription(orgId) {
  try {
    console.log(`\n🔍 Checking subscription for org: ${orgId}\n`);
    
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      console.error('❌ Organization not found');
      return;
    }
    
    const data = orgDoc.data();
    
    console.log('📄 Full organization document:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n💳 Billing data specifically:');
    if (data.billing) {
      console.log('  subscriptionId:', data.billing.subscriptionId || 'NOT SET');
      console.log('  customerId:', data.billing.customerId || 'NOT SET');
      console.log('  status:', data.billing.status || 'NOT SET');
      console.log('  plan:', data.billing.plan || 'NOT SET');
      console.log('  isActive:', data.billing.isActive !== undefined ? data.billing.isActive : 'NOT SET');
      console.log('  currentPeriodEnd:', data.billing.currentPeriodEnd ? 
        new Date(data.billing.currentPeriodEnd._seconds * 1000).toISOString() : 'NOT SET');
      console.log('  cancelAtPeriodEnd:', data.billing.cancelAtPeriodEnd || false);
    } else {
      console.log('  ❌ No billing object found');
    }
    
    console.log('\n✅ Check complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

// Get org ID from command line
const orgId = process.argv[2];

if (!orgId) {
  console.error('Usage: node check-firestore-subscription.js <orgId>');
  process.exit(1);
}

checkSubscription(orgId);
