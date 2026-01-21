#!/usr/bin/env node

/**
 * Check subscription status from Stripe and update Firestore
 * Usage: node check-subscription.js <orgId>
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Get Stripe key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY environment variable not set');
  console.log('Run: export STRIPE_SECRET_KEY="sk_test_..."');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
});

async function checkSubscription(orgId) {
  try {
    console.log(`🔍 Checking subscription for org: ${orgId}`);
    
    // Get organization from Firestore
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      console.error('❌ Organization not found');
      process.exit(1);
    }
    
    const orgData = orgDoc.data();
    const customerId = orgData.billing?.stripeCustomerId;
    
    if (!customerId) {
      console.error('❌ No Stripe customer ID found');
      process.exit(1);
    }
    
    console.log(`✅ Customer ID: ${customerId}`);
    
    // Get subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    
    console.log(`\n📊 Found ${subscriptions.data.length} subscriptions:`);
    
    if (subscriptions.data.length === 0) {
      console.log('❌ No subscriptions found for this customer');
      return;
    }
    
    // Show all subscriptions
    for (const sub of subscriptions.data) {
      console.log(`\n  Subscription: ${sub.id}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Plan: ${sub.items.data[0]?.price.id}`);
      console.log(`  Current period end: ${new Date(sub.current_period_end * 1000).toISOString()}`);
      
      // Map price ID to plan name
      const priceId = sub.items.data[0]?.price.id;
      const planMap = {
        'price_1SnO1V2XPese4Q6CGv0X0Td1': 'starter',
        'price_1SnO4O2XPese4Q6Cxsz7EIsw': 'studio',
        'price_1SnO5p2XPese4Q6C76TJaivf': 'academy',
        'price_1SnO712XPese4Q6CZLdPS2VU': 'enterprise',
      };
      
      const planName = planMap[priceId] || 'unknown';
      console.log(`  Mapped plan: ${planName}`);
      
      // Update Firestore if subscription is active
      if (sub.status === 'active' || sub.status === 'trialing') {
        console.log(`\n📝 Updating Firestore...`);
        
        await db.collection('organizations').doc(orgId).update({
          'billing.plan': planName,
          'billing.status': sub.status,
          'billing.stripeSubscriptionId': sub.id,
          'billing.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
            new Date(sub.current_period_end * 1000)
          ),
          'billing.isActive': true,
        });
        
        console.log(`✅ Updated organization to ${planName} plan`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('Check your STRIPE_SECRET_KEY');
    }
    process.exit(1);
  }
}

// Get orgId from command line
const orgId = process.argv[2];
if (!orgId) {
  console.error('Usage: node check-subscription.js <orgId>');
  console.error('Example: node check-subscription.js 7SK6oRrCUjbbvqOgdgIX');
  process.exit(1);
}

checkSubscription(orgId)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
