#!/usr/bin/env node
/**
 * STEP 8: Add Stripe Connect fields to organizations collection
 * 
 * Adds:
 * - stripe.connectAccountId (where payments go)
 * - stripe.publishableKey (for clients to pay)
 * - stripe.onboardingComplete (whether business is ready to accept payments)
 * - stripe.chargesEnabled, stripe.payoutsEnabled (from Stripe API)
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addStripeConnectFields() {
  console.log("🔧 STEP 8: Adding Stripe Connect fields to organizations...\n");

  try {
    // Get all organizations
    const orgsSnapshot = await db.collection("organizations").get();
    console.log(`Found ${orgsSnapshot.size} organization(s)\n`);

    for (const doc of orgsSnapshot.docs) {
      const orgId = doc.id;
      const orgData = doc.data();
      
      console.log(`📋 Organization: ${orgData.name} (${orgId})`);
      console.log(`   Current stripe field:`, orgData.stripe || "none");
      
      // Add Stripe Connect fields
      const updatedStripe = {
        accountId: orgData.stripe?.accountId || null, // Legacy field (keep for reference)
        connectAccountId: null, // NEW: Stripe Connect account ID (acct_xxx)
        publishableKey: null, // NEW: Organization's publishable key (pk_xxx)
        onboardingComplete: false, // NEW: Whether Stripe onboarding is done
        chargesEnabled: false, // NEW: From Stripe API
        payoutsEnabled: false, // NEW: From Stripe API
        onboardingUrl: null, // NEW: Link to complete Stripe Connect setup
      };

      await doc.ref.update({
        stripe: updatedStripe,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`   ✅ Updated with Stripe Connect fields\n`);
    }

    console.log("✅ Successfully added Stripe Connect fields to all organizations");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

addStripeConnectFields();
