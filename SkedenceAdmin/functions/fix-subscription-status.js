/**
 * Fix Subscription Status
 * 
 * This script manually fetches the subscription from Stripe and updates
 * the organization document when the webhook didn't fire correctly.
 * 
 * Usage: node fix-subscription-status.js <orgId>
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable not set');
  console.log('The key should be set in .env file');
  process.exit(1);
}
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Price IDs
const PRICE_IDS = {
  starter: 'price_1SpKItFIh2MhEffNfsBy4HyT',
  studio: 'price_1SpKMkFIh2MhEffNgGdbgMr5',
  academy: 'price_1SpKNrFIh2MhEffNqZf64sPA',
  enterprise: 'price_1SpKOrFIh2MhEffNjU5v5X4P',
};

async function fixSubscriptionStatus(orgId) {
  try {
    console.log(`\n🔍 Fetching organization ${orgId}...`);
    
    // Get organization document
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      console.error('❌ Organization not found');
      return;
    }
    
    const orgData = orgDoc.data();
    console.log(`✅ Found organization: ${orgData.name}`);
    
    // Get Stripe customer ID
    const customerId = orgData.billing?.stripeCustomerId;
    
    if (!customerId) {
      console.error('❌ No Stripe customer ID found in organization');
      console.log('Check if organization has billing.stripeCustomerId field');
      return;
    }
    
    console.log(`\n💳 Fetching subscriptions for customer ${customerId}...`);
    
    // Fetch all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
    
    console.log(`Found ${subscriptions.data.length} subscription(s)`);
    
    if (subscriptions.data.length === 0) {
      console.error('❌ No subscriptions found for this customer');
      return;
    }
    
    // Find the active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (!activeSubscription) {
      console.error('❌ No active or trialing subscription found');
      console.log('All subscriptions:', subscriptions.data.map(s => ({
        id: s.id,
        status: s.status,
        created: new Date(s.created * 1000).toISOString(),
      })));
      return;
    }
    
    console.log(`\n✅ Found active subscription: ${activeSubscription.id}`);
    console.log(`   Status: ${activeSubscription.status}`);
    console.log(`   Trial End: ${activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : 'None'}`);
    console.log(`   Current Period End: ${new Date(activeSubscription.current_period_end * 1000).toISOString()}`);
    
    // Map price ID to plan name
    const priceId = activeSubscription.items.data[0]?.price.id;
    let planName = 'starter';
    
    if (priceId === PRICE_IDS.enterprise) planName = 'enterprise';
    else if (priceId === PRICE_IDS.academy) planName = 'academy';
    else if (priceId === PRICE_IDS.studio) planName = 'studio';
    else if (priceId === PRICE_IDS.starter) planName = 'starter';
    
    console.log(`   Plan: ${planName}`);
    
    // Prepare update data
    const trialEnd = activeSubscription.trial_end ?
      admin.firestore.Timestamp.fromDate(new Date(activeSubscription.trial_end * 1000)) :
      null;
    
    const updateData = {
      'billing.subscriptionId': activeSubscription.id,
      'billing.customerId': activeSubscription.customer,
      'billing.stripeSubscriptionId': activeSubscription.id,
      'billing.stripeCustomerId': activeSubscription.customer,
      'billing.status': activeSubscription.status,
      'billing.plan': planName,
      'billing.isActive': activeSubscription.status === 'active' || activeSubscription.status === 'trialing',
      'billing.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
        new Date(activeSubscription.current_period_end * 1000)
      ),
      'billing.trialEndsAt': trialEnd,
      'billing.cancelAtPeriodEnd': activeSubscription.cancel_at_period_end,
      'billing.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    };
    
    console.log(`\n📝 Updating organization document...`);
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    await db.collection('organizations').doc(orgId).update(updateData);
    
    console.log(`\n✅ SUCCESS! Organization subscription status updated`);
    console.log(`   Plan: ${planName}`);
    console.log(`   Status: ${activeSubscription.status}`);
    console.log(`   Trial: ${trialEnd ? 'Yes, ends ' + new Date(activeSubscription.trial_end * 1000).toLocaleDateString() : 'No'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Get orgId from command line argument
const orgId = process.argv[2];

if (!orgId) {
  console.error('Usage: node fix-subscription-status.js <orgId>');
  console.error('Example: node fix-subscription-status.js 0Mtow1OaV7oUlCisKSNy');
  process.exit(1);
}

fixSubscriptionStatus(orgId).then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
