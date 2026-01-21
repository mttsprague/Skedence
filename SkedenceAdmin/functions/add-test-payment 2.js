#!/usr/bin/env node

/**
 * Add test payment method and complete the incomplete subscription
 */

const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
});

async function addPaymentMethod() {
  try {
    const customerId = 'cus_Tn6Mxif9yXXc74';
    const subscriptionId = 'sub_1SpWsm2XPese4Q6CKQYVNkdx';
    
    console.log('💳 Creating test payment method...');
    
    // Create a test payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa', // Stripe test token for successful payment
      },
    });
    
    console.log(`✅ Created payment method: ${paymentMethod.id}`);
    
    // Attach to customer
    console.log('🔗 Attaching to customer...');
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });
    
    // Set as default
    console.log('⭐ Setting as default...');
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
    
    // Retry the subscription payment
    console.log('💰 Retrying subscription payment...');
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (subscription.latest_invoice) {
      const invoiceId = typeof subscription.latest_invoice === 'string' 
        ? subscription.latest_invoice 
        : subscription.latest_invoice.id;
      const invoice = await stripe.invoices.retrieve(invoiceId);
      
      if (invoice.payment_intent) {
        const piId = typeof invoice.payment_intent === 'string'
          ? invoice.payment_intent
          : invoice.payment_intent.id;
        await stripe.paymentIntents.confirm(piId, {
          payment_method: paymentMethod.id,
        });
      }
    }
    
    // Check final status
    const updatedSub = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`\n✅ Subscription status: ${updatedSub.status}`);
    console.log(`   Payment should now be complete!`);
    
    console.log('\n📊 Check Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/test/subscriptions/${subscriptionId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addPaymentMethod()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
