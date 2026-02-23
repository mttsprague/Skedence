/**
 * Find organizations with Stripe customers but no subscription info
 * 
 * This helps identify orgs affected by the webhook metadata bug
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

async function findBrokenSubscriptions() {
  try {
    console.log('🔍 Scanning organizations...\n');
    
    // Get all organizations
    const orgsSnapshot = await db.collection('organizations').get();
    
    console.log(`Found ${orgsSnapshot.size} organizations\n`);
    
    const brokenOrgs = [];
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data();
      const customerId = orgData.billing?.stripeCustomerId;
      const hasSubId = orgData.billing?.stripeSubscriptionId || orgData.stripeSubscriptionId;
      
      // Check if has Stripe customer but no subscription ID
      if (customerId && !hasSubId) {
        console.log(`📋 Checking ${orgData.name} (${orgDoc.id})...`);
        
        // Check if this customer has active subscriptions in Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 10,
        });
        
        const activeSubscriptions = subscriptions.data.filter(
          sub => sub.status === 'active' || sub.status === 'trialing'
        );
        
        if (activeSubscriptions.length > 0) {
          const sub = activeSubscriptions[0];
          console.log(`   ⚠️  HAS SUBSCRIPTION IN STRIPE BUT NOT IN FIRESTORE!`);
          console.log(`   Subscription ID: ${sub.id}`);
          console.log(`   Status: ${sub.status}`);
          console.log(`   Trial: ${sub.trial_end ? new Date(sub.trial_end * 1000).toLocaleDateString() : 'No'}`);
          console.log(`   Created: ${new Date(sub.created * 1000).toLocaleString()}`);
          
          brokenOrgs.push({
            id: orgDoc.id,
            name: orgData.name,
            customerId,
            subscriptionId: sub.id,
            status: sub.status,
          });
        } else {
          console.log(`   ✅ No active subscriptions in Stripe`);
        }
        console.log('');
      }
    }
    
    if (brokenOrgs.length > 0) {
      console.log('\n🚨 BROKEN SUBSCRIPTIONS FOUND:\n');
      console.log('These organizations have active Stripe subscriptions that are not reflected in Firestore:\n');
      
      brokenOrgs.forEach(org => {
        console.log(`${org.name} (${org.id})`);
        console.log(`  Customer: ${org.customerId}`);
        console.log(`  Subscription: ${org.subscriptionId}`);
        console.log(`  Status: ${org.status}`);
        console.log(`  Fix with: node Scripts/fix-subscription-status.js ${org.id}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No broken subscriptions found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

findBrokenSubscriptions().then(() => {
  console.log('✅ Done');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
