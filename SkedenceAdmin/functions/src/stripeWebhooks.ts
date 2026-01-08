import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const GRACE_PERIOD_DAYS = 3;

// Price ID to Plan mapping
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    "price_1SnO1V2XPese4Q6CGv0X0Td1": "starter",
    "price_1SnO4O2XPese4Q6Cxsz7EIsw": "studio",
    "price_1SnO5p2XPese4Q6C76TJaivf": "academy",
    "price_1SnO712XPese4Q6CZLdPS2VU": "enterprise",
  };
  return priceMap[priceId] || "unknown";
}

// Add-on price mapping
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapPriceIdToAddon(priceId: string): string {
  const addonMap: Record<string, string> = {
    "price_1SnO8C2XPese4Q6CgkCJm5dM": "trainer",
    "price_1SnO8z2XPese4Q6CB8ab3l89": "location",
    "price_1SnO9k2XPese4Q6Ca9FrwOHt": "domain",
  };
  return addonMap[priceId] || "unknown";
}

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log("Received event:", event.type);

  try {
    switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Webhook handler failed");
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organizationId;
  if (!orgId) {
    console.error("No organizationId in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Update organization with Stripe IDs
  await admin.firestore().collection("organizations").doc(orgId).update({
    "billing.stripeCustomerId": customerId,
    "billing.stripeSubscriptionId": subscriptionId,
    "billing.status": "active",
    "billing.isActive": true,
    "billing.isInGrace": false,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Checkout completed for org ${orgId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const orgId = await findOrgByStripeCustomer(subscription.customer as string);
  if (!orgId) {
    console.error("No org found for customer:", subscription.customer);
    return;
  }

  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  const updateData: any = {
    "billing.status": status,
    "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    "billing.isActive": ["active", "trialing"].includes(status),
    "billing.isInGrace": false,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  };

  if (trialEnd) {
    updateData["billing.trialEndsAt"] = admin.firestore.Timestamp.fromDate(trialEnd);
  }

  // Extract plan from subscription metadata or price
  if (subscription.items.data[0]) {
    const priceId = subscription.items.data[0].price.id;
    const planTier = mapPriceIdToPlan(priceId);
    if (planTier) {
      updateData["billing.plan"] = planTier;
    }
  }

  await admin.firestore().collection("organizations").doc(orgId).update(updateData);

  console.log(`Subscription updated for org ${orgId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = await findOrgByStripeCustomer(subscription.customer as string);
  if (!orgId) return;

  await admin.firestore().collection("organizations").doc(orgId).update({
    "billing.status": "canceled",
    "billing.isActive": false,
    "billing.isInGrace": false,
    "billing.stripeSubscriptionId": null,
    "billing.graceEndsAt": null,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Subscription canceled for org ${orgId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const orgId = await findOrgByStripeCustomer(invoice.customer as string);
  if (!orgId) return;

  const graceEndsAt = new Date();
  graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

  await admin.firestore().collection("organizations").doc(orgId).update({
    "billing.status": "past_due",
    "billing.isActive": true, // Keep active during grace
    "billing.isInGrace": true,
    "billing.graceEndsAt": admin.firestore.Timestamp.fromDate(graceEndsAt),
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send warning email to owner
  await sendPaymentFailedEmail(orgId);

  console.log(`Payment failed for org ${orgId}, grace period until ${graceEndsAt}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const orgId = await findOrgByStripeCustomer(invoice.customer as string);
  if (!orgId) return;

  // Clear grace period
  await admin.firestore().collection("organizations").doc(orgId).update({
    "billing.status": "active",
    "billing.isActive": true,
    "billing.isInGrace": false,
    "billing.graceEndsAt": null,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Payment succeeded for org ${orgId}`);
}

async function findOrgByStripeCustomer(customerId: string): Promise<string | null> {
  const snapshot = await admin.firestore()
    .collection("organizations")
    .where("billing.stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].id;
}

async function sendPaymentFailedEmail(orgId: string) {
  const org = await admin.firestore().collection("organizations").doc(orgId).get();
  const orgData = org.data();

  if (!orgData) return;

  // Get owner email
  const ownerIds = orgData.adminIds || [];
  if (ownerIds.length === 0) return;

  const ownerDoc = await admin.firestore().collection("users").doc(ownerIds[0]).get();
  const ownerEmail = ownerDoc.data()?.email;

  if (!ownerEmail) return;

  await admin.firestore().collection("mail").add({
    to: ownerEmail,
    template: {
      name: "payment-failed",
      data: {
        organizationName: orgData.name,
        graceEndsDays: GRACE_PERIOD_DAYS,
      },
    },
  });
}

// Daily job to expire grace periods
// TODO: Re-enable after fixing pubsub API version
/*
export const expireGracePeriods = functions.pubsub
  .schedule("0 0 * * *") // Daily at midnight
  .timeZone("America/Los_Angeles")
  .onRun(async (_context) => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await admin.firestore()
      .collection("organizations")
      .where("billing.isInGrace", "==", true)
      .where("billing.graceEndsAt", "<=", now)
      .get();

    const updates = snapshot.docs.map((doc) => {
      return doc.ref.update({
        "billing.status": "canceled",
        "billing.isActive": false,
        "billing.isInGrace": false,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(updates);

    console.log(`Expired ${updates.length} grace periods`);
    return null;
  });
*/
