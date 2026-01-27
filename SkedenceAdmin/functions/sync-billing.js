const admin = require('firebase-admin');

// Initialize with default credentials (gcloud or environment)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function syncBilling() {
  const orgId = 'aLxHq5mFam5ohsLM1okb';
  
  console.log('📊 Checking current billing status...');
  const orgDoc = await db.collection('organizations').doc(orgId).get();
  
  if (!orgDoc.exists) {
    console.log('❌ Organization not found');
    process.exit(1);
  }
  
  const orgData = orgDoc.data();
  
  console.log('\nCurrent billing data:');
  console.log(JSON.stringify(orgData.billing, null, 2));
  
  const subscriptionId = orgData.billing?.stripeSubscriptionId || orgData.billing?.subscriptionId;
  const customerId = orgData.billing?.stripeCustomerId || orgData.billing?.customerId;
  
  console.log('\n🔍 Subscription ID:', subscriptionId || 'NOT FOUND');
  console.log('🔍 Customer ID:', customerId || 'NOT FOUND');
  
  if (!subscriptionId && !customerId) {
    console.log('\n❌ No subscription or customer ID found. Cannot sync.');
    return;
  }
  
  // Get owner user ID
  const ownerUserId = orgData.ownerUserId;
  console.log('👤 Owner User ID:', ownerUserId);
  
  // Call the sync function
  console.log('\n🔄 Calling syncBillingFromStripe...');
  
  const functions = require('firebase-functions-test')();
  const billing = require('./lib/billing');
  
  const result = await billing.syncBillingFromStripe.run({
    auth: { uid: ownerUserId },
    data: { orgId }
  });
  
  console.log('\n✅ Sync result:', JSON.stringify(result, null, 2));
  
  // Check updated billing status
  const updatedOrgDoc = await db.collection('organizations').doc(orgId).get();
  const updatedOrgData = updatedOrgDoc.data();
  
  console.log('\n📊 Updated billing data:');
  console.log(JSON.stringify(updatedOrgData.billing, null, 2));
  
  process.exit(0);
}

syncBilling().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
