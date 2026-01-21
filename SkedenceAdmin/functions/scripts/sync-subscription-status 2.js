/**
 * Script to manually sync subscription status from Stripe to Firestore
 * Use this when webhook didn't fire or you need to manually update subscription status
 * 
 * Usage: node sync-subscription-status.js <orgId>
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function syncSubscriptionStatus(orgId) {
  console.log(`\n🔄 Syncing subscription status for org: ${orgId}\n`);

  try {
    // Get organization data
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      console.error('❌ Organization not found');
      return;
    }

    const orgData = orgDoc.data();
    const customerId = orgData.billing?.stripeCustomerId || orgData.billing?.customerId;

    if (!customerId) {
      console.error('❌ No Stripe customer ID found for this organization');
      return;
    }

    console.log(`📋 Customer ID: ${customerId}`);

    // List all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      console.log('❌ No subscriptions found for this customer');
      return;
    }

    console.log(`\n📊 Found ${subscriptions.data.length} subscription(s):\n`);

    // Find the active or most recent subscription
    let targetSubscription = null;
    
    for (const sub of subscriptions.data) {
      console.log(`  Subscription: ${sub.id}`);
      console.log(`    Status: ${sub.status}`);
      console.log(`    Created: ${new Date(sub.created * 1000).toLocaleString()}`);
      console.log(`    Current Period End: ${new Date(sub.current_period_end * 1000).toLocaleString()}`);
      
      if (sub.items.data[0]) {
        console.log(`    Price ID: ${sub.items.data[0].price.id}`);
        console.log(`    Amount: $${sub.items.data[0].price.unit_amount / 100}/month`);
      }
      console.log('');

      // Prefer active or trialing subscriptions
      if (sub.status === 'active' || sub.status === 'trialing') {
        targetSubscription = sub;
      } else if (!targetSubscription) {
        // If no active subscription, use the most recent one
        targetSubscription = sub;
      }
    }

    if (!targetSubscription) {
      console.error('❌ Could not determine target subscription');
      return;
    }

    console.log(`✅ Using subscription: ${targetSubscription.id} (${targetSubscription.status})\n`);

    // Map price ID to plan name
    const priceId = targetSubscription.items.data[0]?.price.id;
    let planName = 'starter';
    
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) planName = 'starter';
    else if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) planName = 'studio';
    else if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) planName = 'academy';
    else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planName = 'enterprise';

    console.log(`📝 Mapped plan: ${planName}`);

    // Update Firestore
    const updateData = {
      'billing.subscriptionId': targetSubscription.id,
      'billing.customerId': customerId,
      'billing.status': targetSubscription.status,
      'billing.plan': planName,
      'billing.isActive': targetSubscription.status === 'active' || targetSubscription.status === 'trialing',
      'billing.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
        new Date(targetSubscription.current_period_end * 1000)
      ),
      'billing.cancelAtPeriodEnd': targetSubscription.cancel_at_period_end || false,
      'updatedAt': admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('organizations').doc(orgId).update(updateData);

    console.log('\n✅ Successfully updated Firestore:');
    console.log(JSON.stringify({
      subscriptionId: targetSubscription.id,
      status: targetSubscription.status,
      plan: planName,
      isActive: targetSubscription.status === 'active' || targetSubscription.status === 'trialing',
      currentPeriodEnd: new Date(targetSubscription.current_period_end * 1000).toLocaleString(),
      cancelAtPeriodEnd: targetSubscription.cancel_at_period_end || false
    }, null, 2));

    console.log('\n✨ Subscription status synced successfully!\n');

  } catch (error) {
    console.error('\n❌ Error syncing subscription:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Get orgId from command line arguments
const orgId = process.argv[2];

if (!orgId) {
  console.error('\n❌ Usage: node sync-subscription-status.js <orgId>\n');
  process.exit(1);
}

syncSubscriptionStatus(orgId);
