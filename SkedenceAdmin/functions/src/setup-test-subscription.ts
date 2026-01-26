/**
 * One-time script to set up $0 test subscription for testing cancellation flow
 * Run with: STRIPE_SECRET_KEY=sk_... npx ts-node src/setup-test-subscription.ts
 */

import * as admin from "firebase-admin";
import Stripe from "stripe";

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var or default credentials)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "polyface-ae6d3",
  });
}

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY environment variable not set");
  console.error("Usage: STRIPE_SECRET_KEY=sk_... npx ts-node src/setup-test-subscription.ts");
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia" as any,
});

const ORG_ID = "aLxHq5mFam5ohsLM1okb";
const PRICE_ID = "price_1StvUCFIh2MhEffNZjLoGiB0"; // $0 Enterprise Test
const TEST_EMAIL = "matt@skedence.com"; // Organization owner email

async function setupTestSubscription() {
  try {
    console.log("🚀 Setting up test subscription...");

    // 1. Create Stripe Customer
    console.log("📝 Creating Stripe customer...");
    const customer = await stripe.customers.create({
      email: TEST_EMAIL,
      metadata: {
        firebaseOrgId: ORG_ID,
        testAccount: "true",
      },
      description: "Skedence Volleyball - Test Subscription",
    });
    console.log("✅ Customer created:", customer.id);

    // 2. Create Subscription
    console.log("📝 Creating $0 subscription...");
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{price: PRICE_ID}],
      metadata: {
        firebaseOrgId: ORG_ID,
        plan: "enterprise-test",
      },
    });
    console.log("✅ Subscription created:", subscription.id);
    console.log("   Status:", subscription.status);
    console.log("   Current period end:", new Date(subscription.current_period_end * 1000));

    // 3. Update Firestore (organizations/{orgId} document's billing field)
    console.log("📝 Updating Firestore...");
    const orgRef = admin.firestore()
      .collection("organizations")
      .doc(ORG_ID);

    await orgRef.update({
      "billing.stripeCustomerId": customer.id,
      "billing.stripeSubscriptionId": subscription.id,
      "billing.plan": "enterprise-test",
      "billing.status": subscription.status,
      "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
        new Date(subscription.current_period_end * 1000)
      ),
      "billing.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Firestore updated");

    console.log("\n🎉 Test subscription setup complete!");
    console.log("   Customer ID:", customer.id);
    console.log("   Subscription ID:", subscription.id);
    console.log("\nYou can now test the cancellation flow in the admin app.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up subscription:", error);
    process.exit(1);
  }
}

setupTestSubscription();
