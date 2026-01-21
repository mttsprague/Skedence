#!/usr/bin/env node

/**
 * Cancel existing subscription and create a new one WITHOUT trial
 * This allows immediate testing of payment and Stripe Connect verification
 * 
 * Usage: node recreate-subscription-no-trial.js <orgId> <priceId>
 * Example: node recreate-subscription-no-trial.js 7SK6oRrCUjbbvqOgdgIX price_1SnO4O2XPese4Q6Cxsz7EIsw
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

const planMap = {
  'price_1SnO1V2XPese4Q6CGv0X0Td1': { name: 'starter', amount: 29 },
  'price_1SnO4O2XPese4Q6Cxsz7EIsw': { name: 'studio', amount: 99 },
  'price_1SnO5p2XPese4Q6C76TJaivf': { name: 'academy', amount: 249 },
  'price_1SnO712XPese4Q6CZLdPS2VU': { name: 'enterprise', amount: 499 },
};

async function recreateSubscription(orgId, priceId) {
  try {
    console.log(`🔍 Processing organization: ${orgId}`);
    console.log(`📋 Price ID: ${priceId}`);
    
    const plan = planMap[priceId];
    if (!plan) {
      console.error('❌ Invalid price ID. Must be one of:');
      console.error('  - price_1SnO1V2XPese4Q6CGv0X0Td1 (Starter $29)');
      console.error('  - price_1SnO4O2XPese4Q6Cxsz7EIsw (Studio $99)');
      console.error('  - price_1SnO5p2XPese4Q6C76TJaivf (Academy $249)');
      console.error('  - price_1SnO712XPese4Q6CZLdPS2VU (Enterprise $499)');
      process.exit(1);
    }
    
    console.log(`📊 Plan: ${plan.name} ($${plan.amount}/month)`);
    console.log('');
    
    // Get organization from Firestore
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      console.error('❌ Organization not found');
      process.exit(1);
    }
    
    const orgData = orgDoc.data();
    const customerId = orgData.billing?.stripeCustomerId;
    const currentSubId = orgData.billing?.stripeSubscriptionId;
    
    if (!customerId) {
      console.error('❌ No Stripe customer ID found');
      process.exit(1);
    }
    
    console.log(`✅ Customer ID: ${customerId}`);
    
    // Cancel existing subscription if any
    if (currentSubId) {
      console.log(`\n🗑️  Canceling existing subscription: ${currentSubId}`);
      await stripe.subscriptions.cancel(currentSubId);
      console.log('✅ Canceled');
    }
    
    // Create new subscription WITHOUT trial
    console.log(`\n💳 Creating new subscription (NO TRIAL)...`);
    console.log('⚠️  This will immediately charge the test card!');
    
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      // NO trial_period_days - immediate charge!
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        orgId,
        immediate_test: 'true',
      },
    });
    
    console.log(`✅ Created subscription: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Current period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
    
    // Update Firestore
    console.log(`\n📝 Updating Firestore...`);
    await db.collection('organizations').doc(orgId).update({
      'billing.plan': plan.name,
      'billing.status': subscription.status,
      'billing.stripeSubscriptionId': subscription.id,
      'billing.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
        new Date(subscription.current_period_end * 1000)
      ),
      'billing.isActive': true,
    });
    
    console.log('✅ Updated Firestore');
    
    console.log(`\n✅ Done! Subscription recreated without trial.`);
    console.log(`\n💰 Next steps:`);
    console.log(`   1. Refresh your app - should show ${plan.name} plan`);
    console.log(`   2. Check Stripe dashboard for immediate payment`);
    console.log(`   3. Test Stripe Connect onboarding flow`);
    console.log(`   4. Verify webhook events are processed`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.type === 'StripeCardError') {
      console.error('Card was declined. Make sure payment method is attached.');
    }
    process.exit(1);
  }
}

// Get arguments
const orgId = process.argv[2];
const priceId = process.argv[3];

if (!orgId || !priceId) {
  console.error('Usage: node recreate-subscription-no-trial.js <orgId> <priceId>');
  console.error('');
  console.error('Example:');
  console.error('  node recreate-subscription-no-trial.js 7SK6oRrCUjbbvqOgdgIX price_1SnO4O2XPese4Q6Cxsz7EIsw');
  console.error('');
  console.error('Available price IDs:');
  console.error('  price_1SnO1V2XPese4Q6CGv0X0Td1 - Starter ($29/month)');
  console.error('  price_1SnO4O2XPese4Q6Cxsz7EIsw - Studio ($99/month)');
  console.error('  price_1SnO5p2XPese4Q6C76TJaivf - Academy ($249/month)');
  console.error('  price_1SnO712XPese4Q6CZLdPS2VU - Enterprise ($499/month)');
  process.exit(1);
}

recreateSubscription(orgId, priceId)
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
