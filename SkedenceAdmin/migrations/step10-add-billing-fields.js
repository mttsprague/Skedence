#!/usr/bin/env node
/**
 * STEP 10: Add billing fields to organizations collection
 *
 * Adds:
 * - billing.plan (free, starter, professional)
 * - billing.status (active, past_due, canceled)
 * - billing.subscriptionId (Stripe subscription ID)
 * - billing.customerId (Stripe customer ID)
 * - billing.currentPeriodEnd (when subscription renews)
 * - billing.cancelAtPeriodEnd (if user canceled)
 * - billing.lastPaymentDate (last successful payment)
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addBillingFields() {
  console.log("🔧 STEP 10: Adding billing fields to organizations...\n");

  try {
    // Get all organizations
    const orgsSnapshot = await db.collection("organizations").get();
    console.log(`Found ${orgsSnapshot.size} organization(s)\n`);

    for (const doc of orgsSnapshot.docs) {
      const orgId = doc.id;
      const orgData = doc.data();

      console.log(`📋 Organization: ${orgData.name} (${orgId})`);
      console.log(`   Current billing field:`, orgData.billing || "none");

      // Add billing fields (existing orgs start on free plan)
      const billingData = {
        plan: "free",
        status: "active",
        subscriptionId: null,
        customerId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        lastPaymentDate: null,
      };

      await doc.ref.update({
        billing: billingData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`   ✅ Updated with billing fields (plan: free)\n`);
    }

    console.log("✅ Successfully added billing fields to all organizations");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

addBillingFields();
