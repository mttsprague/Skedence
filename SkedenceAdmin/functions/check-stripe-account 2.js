#!/usr/bin/env node

const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY environment variable not set');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
});

(async () => {
  try {
    // Get account info
    const account = await stripe.accounts.retrieve();
    console.log('🔍 Stripe Account Info:');
    console.log('  Account ID:', account.id);
    console.log('  Email:', account.email || 'Not set');
    console.log('  Business Name:', account.business_profile?.name || 'Not set');
    console.log('  Country:', account.country);
    console.log('');
    
    // Get the subscription
    const sub = await stripe.subscriptions.retrieve('sub_1SpWUY2XPese4Q6CNZQzX8eN');
    console.log('💳 Subscription Found:');
    console.log('  ID:', sub.id);
    console.log('  Customer:', sub.customer);
    console.log('  Status:', sub.status);
    console.log('  Plan:', sub.items.data[0].price.id);
    console.log('');
    console.log('✅ View in dashboard:');
    console.log('  https://dashboard.stripe.com/test/subscriptions/' + sub.id);
    console.log('');
    console.log('⚠️ Make sure you are:');
    console.log('  1. Logged into Stripe account:', account.email || account.id);
    console.log('  2. In TEST MODE (toggle in top-right corner)');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
