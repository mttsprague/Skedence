import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

const GRACE_PERIOD_DAYS = 3;

// Price ID to Plan mapping
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    "price_1SpKItFIh2MhEffNfsBy4HyT": "starter",
    "price_1SpKMkFIh2MhEffNgGdbgMr5": "studio",
    "price_1SpKNrFIh2MhEffNqZf64sPA": "academy",
    "price_1SpKOrFIh2MhEffNjU5v5X4P": "enterprise",
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      res.status(500).send("Webhook secret not configured");
      return;
    }

    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
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
    console.error("❌ No organizationId in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  console.log(`📦 Processing checkout for org ${orgId}`);
  console.log(`   Customer: ${customerId}`);
  console.log(`   Subscription: ${subscriptionId}`);

  // Fetch the subscription to get the plan details
  let planTier = "free";
  let status = "trialing";

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    status = subscription.status;

    if (subscription.items.data[0]) {
      const priceId = subscription.items.data[0].price.id;
      planTier = mapPriceIdToPlan(priceId);
      console.log(`   Detected plan: ${planTier} (from price ${priceId})`);
    }
  } catch (error) {
    console.error("Error fetching subscription:", error);
  }

  // Update organization with Stripe IDs and plan
  await admin.firestore().collection("organizations").doc(orgId).update({
    "billing.stripeCustomerId": customerId,
    "billing.stripeSubscriptionId": subscriptionId,
    "billing.plan": planTier,
    "billing.status": status,
    "billing.isActive": true,
    "billing.isInGrace": false,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Checkout completed for org ${orgId} - Plan: ${planTier}, Status: ${status}`);

  // Send confirmation email
  await sendSubscriptionEmail(orgId, status === "trialing");
}

async function sendSubscriptionEmail(orgId: string, isTrial: boolean) {
  try {
    const orgDoc = await admin.firestore().collection("organizations").doc(orgId).get();
    const org = orgDoc.data();
    if (!org) return;

    const ownerIds = org.adminIds || [];
    if (ownerIds.length === 0) return;

    const ownerDoc = await admin.firestore().collection("users").doc(ownerIds[0]).get();
    const owner = ownerDoc.data();
    if (!owner?.email && !owner?.emailAddress) return;

    const ownerEmail = owner.email || owner.emailAddress;
    const ownerName = `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || "there";
    const orgName = org.name || "Your Organization";
    const plan = org.billing?.plan || "free";

    const subjectText = isTrial ?
      "🎉 Free Trial Started - Welcome to " + orgName + "!" :
      "✅ Subscription Active - Welcome to " + orgName + "!";

    await admin.firestore().collection("mail").add({
      to: ownerEmail,
      from: "Skedence <no-reply@skedence.com>",
      replyTo: "matt.sprague@skedence.com",
      message: {
        subject: subjectText,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #35b3af;">${isTrial ? "Welcome to Your Free Trial!" : "Subscription Confirmed!"}</h2>
          <p>Hi ${ownerName},</p>
          <p>${isTrial ?
    "Your free trial has started! You now have full access to all Skedence features." :
    "Thank you for subscribing to Skedence. Your payment has been processed successfully."
}</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Subscription Details</h3>
            <p><strong>Organization:</strong> ${orgName}</p>
            <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
            <p><strong>Status:</strong> ${isTrial ? "Free Trial" : "Active"}</p>
            ${isTrial ? "<p><strong>Trial Period:</strong> 14 days</p>" : ""}
          </div>
          
          ${isTrial ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>💡 Reminder:</strong> Your trial will automatically convert to a paid subscription after 14 days. You can cancel anytime before then.</p>
            </div>
          ` : ""}
          
          <h3>What's Next?</h3>
          <ul>
            <li>Set up your schedule and availability</li>
            <li>Invite trainers to your organization</li>
            <li>Add your service locations</li>
            <li>Create lesson packages for clients</li>
          </ul>
          
          <p>Need help getting started? Reply to this email and we'll be happy to assist!</p>
          
          <p>Best,<br>The Skedence Team</p>
        </div>
      `,
      },
    });

    console.log(`✅ Subscription confirmation sent to ${ownerEmail}`);
  } catch (error) {
    console.error("Error sending subscription email:", error);
  }
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
    if (planTier && planTier !== "unknown") {
      updateData["billing.plan"] = planTier;
    }
  }

  await admin.firestore().collection("organizations").doc(orgId).update(updateData);

  console.log(`✅ Subscription updated for org ${orgId}: Plan=${updateData["billing.plan"] || "not changed"}, Status=${status}`);
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

  // Send subscription cancellation email
  const {sendSubscriptionCancellationEmail} = await import("./confirmationEmails");
  await sendSubscriptionCancellationEmail(orgId);
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

  // Get subscription to extract plan if needed
  const subscriptionId = invoice.subscription as string;
  const updateData: any = {
    "billing.status": "active",
    "billing.isActive": true,
    "billing.isInGrace": false,
    "billing.graceEndsAt": null,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  };

  // Fetch subscription to ensure plan is set correctly
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.items.data[0]) {
        const priceId = subscription.items.data[0].price.id;
        const planTier = mapPriceIdToPlan(priceId);
        if (planTier && planTier !== "unknown") {
          updateData["billing.plan"] = planTier;
        }
      }
    } catch (error) {
      console.error("Error fetching subscription on payment success:", error);
    }
  }

  // Clear grace period and activate subscription
  await admin.firestore().collection("organizations").doc(orgId).update(updateData);

  console.log(`✅ Payment succeeded for org ${orgId}, status set to active, plan: ${updateData["billing.plan"] || "not changed"}`);
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
    from: "Skedence <no-reply@skedence.com>",
    replyTo: "matt.sprague@skedence.com",
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
