import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ||
  functions.config().stripe?.secret_key || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

const db = admin.firestore();

/**
 * Stripe Connect Webhook Handler
 *
 * Handles events for connected Stripe accounts (organizations).
 * This is separate from the platform subscription webhook.
 *
 * Events handled:
 * - account.updated: When organization completes/updates onboarding
 * - account.application.deauthorized: When organization disconnects
 * - payment_intent.succeeded: When payment is received by organization (optional)
 */
export const stripeConnectWebhook = functions.https.onRequest(
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      console.error("❌ No stripe-signature header");
      res.status(400).send("No signature");
      return;
    }

    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
      functions.config().stripe?.connect_webhook_secret;

    if (!webhookSecret) {
      console.error("❌ No webhook secret configured");
      res.status(500).send("Webhook secret not configured");
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Webhook signature verification failed: ${message}`);
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    console.log(`✅ Stripe Connect webhook received: ${event.type}`);

    try {
      switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case "account.application.deauthorized": {
        // The account ID is in previous_attributes for this event
        const accountId = (event.account as string) || "";
        if (accountId) {
          await handleAccountDeauthorized(accountId);
        }
        break;
      }

      case "payment_intent.succeeded": {
        // Optional: Track successful payments to connected accounts
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 Payment succeeded for connected account: ${paymentIntent.id}`);
        // Add custom logic here if needed
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      res.json({received: true});
    } catch (error: unknown) {
      console.error("❌ Error processing webhook:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({error: message});
    }
  }
);

/**
 * Handle account.updated event
 * Updates organization's Stripe Connect status in Firestore
 * @param {Stripe.Account} account - The Stripe account object
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`🔄 Processing account.updated for ${account.id}`);

  // Find organization with this Stripe Connect account ID
  const orgsSnapshot = await db.collection("organizations")
    .where("stripe.connectAccountId", "==", account.id)
    .limit(1)
    .get();

  if (orgsSnapshot.empty) {
    console.warn(`⚠️ No organization found for account ${account.id}`);
    return;
  }

  const orgDoc = orgsSnapshot.docs[0];
  const orgId = orgDoc.id;

  // Check if account is fully onboarded
  const chargesEnabled = account.charges_enabled || false;
  const payoutsEnabled = account.payouts_enabled || false;
  const detailsSubmitted = account.details_submitted || false;

  const updateData = {
    "stripe.chargesEnabled": chargesEnabled,
    "stripe.payoutsEnabled": payoutsEnabled,
    "stripe.detailsSubmitted": detailsSubmitted,
    "stripe.onboardingComplete": chargesEnabled && payoutsEnabled && detailsSubmitted,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("organizations").doc(orgId).update(updateData);

  console.log(`✅ Updated org ${orgId} - Charges: ${chargesEnabled}, Payouts: ${payoutsEnabled}, Complete: ${updateData["stripe.onboardingComplete"]}`);
}

/**
 * Handle account.application.deauthorized event
 * Organization has disconnected their Stripe account
 * @param {string} accountId - The Stripe account ID
 */
async function handleAccountDeauthorized(accountId: string) {
  console.log(`🔌 Processing account.application.deauthorized for ${accountId}`);

  // Find organization with this Stripe Connect account ID
  const orgsSnapshot = await db.collection("organizations")
    .where("stripe.connectAccountId", "==", accountId)
    .limit(1)
    .get();

  if (orgsSnapshot.empty) {
    console.warn(`⚠️ No organization found for account ${accountId}`);
    return;
  }

  const orgDoc = orgsSnapshot.docs[0];
  const orgId = orgDoc.id;

  // Clear Stripe Connect data
  await db.collection("organizations").doc(orgId).update({
    "stripe.connectAccountId": admin.firestore.FieldValue.delete(),
    "stripe.chargesEnabled": false,
    "stripe.payoutsEnabled": false,
    "stripe.onboardingComplete": false,
    "stripe.detailsSubmitted": false,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Cleared Stripe Connect data for org ${orgId}`);
}
