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
 * STEP 10: Platform Billing Functions
 *
 * Subscription tiers:
 * - Free: 0-50 bookings/month → $0
 * - Starter: 51-200 bookings/month → $29/month
 * - Professional: 201+ bookings/month → $79/month
 */

// Subscription price IDs (set these in Firebase config or environment)
const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
  professional: process.env.STRIPE_PRO_PRICE_ID || "price_professional",
};

const resolvePlanName = (priceId?: string | null) => {
  if (!priceId) return "starter";
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "enterprise";
  if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) return "academy";
  if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) return "studio";
  if (priceId === PRICE_IDS.professional) return "professional";
  if (priceId === PRICE_IDS.starter) return "starter";
  return "starter";
};

interface CreateSubscriptionData {
  orgId: string;
  priceId: string;
  paymentMethodId?: string;
}

/**
 * Create a subscription for an organization
 */
export const createSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateSubscriptionData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, priceId, paymentMethodId} = request.data;

    if (!orgId || !priceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId or priceId"
      );
    }

    try {
      // Verify user is org owner
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      // Get or create Stripe customer
      let customerId = orgData.billing?.customerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: request.auth.token.email || undefined,
          metadata: {
            orgId,
            firebaseUID: request.auth.uid,
          },
        });
        customerId = customer.id;

        // Save customer ID
        await db.collection("organizations").doc(orgId).update({
          "billing.customerId": customerId,
          "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Set as default
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{price: priceId}],
        metadata: {orgId},
        expand: ["latest_invoice.payment_intent"],
      });

      // Update organization with subscription info
      await db.collection("organizations").doc(orgId).update({
        "billing.plan": priceId === PRICE_IDS.professional ?
          "professional" : "starter",
        "billing.status": subscription.status,
        "billing.subscriptionId": subscription.id,
        "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
          new Date(subscription.current_period_end * 1000)
        ),
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
      };
    } catch (error: unknown) {
      console.error("Error creating subscription:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

interface SyncBillingData {
  orgId: string;
}

/**
 * Sync org billing from Stripe (owner only)
 * Ensures plan/status fields match Stripe subscription state
 */
export const syncBillingFromStripe = functions.https.onCall(
  async (request: functions.https.CallableRequest<SyncBillingData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;
    if (!orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    const orgDoc = await db.collection("organizations").doc(orgId).get();
    const orgData = orgDoc.data();
    if (!orgData || orgData.ownerUserId !== request.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You must be the organization owner"
      );
    }

    const billing = orgData.billing || {};
    const subscriptionId: string | undefined =
      billing.stripeSubscriptionId || billing.subscriptionId;
    const customerId: string | undefined =
      billing.stripeCustomerId || billing.customerId;

    let subscription: Stripe.Subscription | null = null;

    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } else if (customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
      });
      subscription = subs.data[0] || null;
    }

    if (!subscription) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No subscription found for this organization"
      );
    }

    const priceId = subscription.items.data[0]?.price.id;
    const planName = resolvePlanName(priceId);
    const trialEnd = subscription.trial_end ?
      admin.firestore.Timestamp.fromDate(
        new Date(subscription.trial_end * 1000)
      ) :
      null;

    await db.collection("organizations").doc(orgId).update({
      "billing.status": subscription.status,
      "billing.plan": planName,
      "billing.isActive": subscription.status === "active" ||
        subscription.status === "trialing",
      "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
        new Date(subscription.current_period_end * 1000)
      ),
      "billing.trialEndsAt": trialEnd,
      "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
      "billing.subscriptionId": subscription.id,
      "billing.customerId": subscription.customer as string,
      "billing.stripeSubscriptionId": subscription.id,
      "billing.stripeCustomerId": subscription.customer as string,
      "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      status: subscription.status,
      plan: planName,
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(
        new Date(subscription.current_period_end * 1000)
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }
);

interface CancelSubscriptionData {
  orgId: string;
}

/**
 * Cancel an organization's subscription
 */
export const cancelSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<CancelSubscriptionData>) => {
    console.log("🔴 cancelSubscription called on server");
    console.log("   request.auth:", request.auth ? "EXISTS" : "NULL");
    console.log("   request.auth.uid:", request.auth?.uid || "N/A");
    console.log("   request.data:", request.data);

    if (!request.auth) {
      console.log("❌ No auth context - throwing UNAUTHENTICATED");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      console.log(`✅ Authenticated as ${request.auth.uid}, checking org ${orgId}`);
      // Verify user is org owner
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        console.log(`❌ Permission denied: ownerUserId=${orgData?.ownerUserId}, requestUid=${request.auth.uid}`);
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      const subscriptionId = orgData.billing?.stripeSubscriptionId;
      console.log(`🔍 Found stripeSubscriptionId: ${subscriptionId || "null"}`);

      if (!subscriptionId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No active subscription found"
        );
      }

      // Cancel the subscription at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          canceledBy: request.auth.uid,
          canceledAt: new Date().toISOString(),
        },
      });

      // Update Firestore - KEEP plan active until period ends, just mark cancelAtPeriodEnd
      await db.collection("organizations").doc(orgId).update({
        "billing.cancelAtPeriodEnd": true,
        "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
          new Date(subscription.current_period_end * 1000)
        ),
        "billing.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Subscription scheduled for cancellation at period end, will remain active until then");

      return {
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
      };
    } catch (error: unknown) {
      console.error("Error canceling subscription:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

interface RestoreSubscriptionData {
  orgId: string;
}

/**
 * Restore a canceled subscription (un-cancel)
 */
export const restoreSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<RestoreSubscriptionData>) => {
    console.log("🔵 restoreSubscription called on server");
    console.log("   request.auth:", request.auth ? "EXISTS" : "NULL");
    console.log("   request.auth.uid:", request.auth?.uid || "N/A");
    console.log("   request.data:", request.data);

    if (!request.auth) {
      console.log("❌ No auth context - throwing UNAUTHENTICATED");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      console.log(`✅ Authenticated as ${request.auth.uid}, checking org ${orgId}`);
      // Verify user is org owner
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        console.log(`❌ Permission denied: ownerUserId=${orgData?.ownerUserId}, requestUid=${request.auth.uid}`);
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      const subscriptionId = orgData.billing?.stripeSubscriptionId;
      console.log(`🔍 Found stripeSubscriptionId: ${subscriptionId || "null"}`);

      if (!subscriptionId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No subscription found"
        );
      }

      // Restore the subscription by removing cancel_at_period_end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          restoredBy: request.auth.uid,
          restoredAt: new Date().toISOString(),
        },
      });

      // Update Firestore - remove cancelAtPeriodEnd flag
      await db.collection("organizations").doc(orgId).update({
        "billing.cancelAtPeriodEnd": false,
        "billing.status": subscription.status,
        "billing.isActive": true,
        "billing.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Subscription restored successfully");

      return {
        success: true,
        message: "Subscription has been restored",
      };
    } catch (error: unknown) {
      console.error("Error restoring subscription:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

interface UpdateSubscriptionData {
  orgId: string;
  newPriceId: string;
}

/**
 * Update subscription plan (upgrade/downgrade)
 */
export const updateSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<UpdateSubscriptionData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, newPriceId} = request.data;

    if (!orgId || !newPriceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId or newPriceId"
      );
    }

    try {
      // Verify user is org owner
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      const subscriptionId = orgData.billing?.subscriptionId;
      if (!subscriptionId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No active subscription found"
        );
      }

      // Get subscription
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription.items.data[0]) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Subscription has no items"
        );
      }

      // Update subscription item
      await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: "create_prorations",
      });

      // Update organization
      const newPlan = newPriceId === PRICE_IDS.professional ?
        "professional" : "starter";

      await db.collection("organizations").doc(orgId).update({
        "billing.plan": newPlan,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true, newPlan};
    } catch (error: unknown) {
      console.error("Error updating subscription:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

/**
 * Webhook handler for Stripe events
 */
export const stripeWebhook = functions.https.onRequest(
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      res.status(400).send("Missing signature");
      return;
    }

    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Webhook signature verification failed:", message);
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    try {
      switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const orgId = session.metadata?.orgId;

        if (orgId && subscriptionId) {
          // Fetch full subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;

          // IMPORTANT: Cancel any existing active subscriptions for this customer
          // This prevents duplicate subscriptions when upgrading/downgrading
          console.log(`🔍 Checking for existing subscriptions for customer ${customerId}`);
          const existingSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 100,
          });

          let canceledCount = 0;
          for (const existingSub of existingSubscriptions.data) {
            // Cancel any active/trialing subscription that's NOT the new one
            if (existingSub.id !== subscriptionId &&
                (existingSub.status === "active" || existingSub.status === "trialing")) {
              console.log(`❌ Canceling old subscription: ${existingSub.id} (${existingSub.status})`);
              await stripe.subscriptions.cancel(existingSub.id);
              canceledCount++;
            }
          }

          if (canceledCount > 0) {
            console.log(`✅ Canceled ${canceledCount} old subscription(s)`);
          }

          // Map price ID to plan name
          const priceId = subscription.items.data[0]?.price.id;
          let planName = "starter";
          if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) planName = "studio";
          else if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) planName = "academy";
          else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planName = "enterprise";

          const trialEnd = subscription.trial_end ?
            admin.firestore.Timestamp.fromDate(new Date(subscription.trial_end * 1000)) :
            null;

          await db.collection("organizations").doc(orgId).update({
            "billing.subscriptionId": subscriptionId,
            "billing.customerId": subscription.customer as string,
            "billing.stripeSubscriptionId": subscriptionId,
            "billing.stripeCustomerId": subscription.customer as string,
            "billing.status": subscription.status,
            "billing.plan": planName,
            "billing.isActive": subscription.status === "active" || subscription.status === "trialing",
            "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
              new Date(subscription.current_period_end * 1000)
            ),
            "billing.trialEndsAt": trialEnd,
            "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
            "billing.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
            "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ Subscription ${subscriptionId} activated for org ${orgId} - Plan: ${planName}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.orgId;

        if (orgId) {
          // Map price ID to plan name
          const priceId = subscription.items.data[0]?.price.id;
          let planName = "starter";
          if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) planName = "studio";
          else if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) planName = "academy";
          else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planName = "enterprise";

          const trialEnd = subscription.trial_end ?
            admin.firestore.Timestamp.fromDate(new Date(subscription.trial_end * 1000)) :
            null;

          await db.collection("organizations").doc(orgId).update({
            "billing.status": subscription.status,
            "billing.plan": planName,
            "billing.isActive": subscription.status === "active" || subscription.status === "trialing",
            "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
              new Date(subscription.current_period_end * 1000)
            ),
            "billing.trialEndsAt": trialEnd,
            "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
            "billing.subscriptionId": subscription.id,
            "billing.customerId": subscription.customer as string,
            "billing.stripeSubscriptionId": subscription.id,
            "billing.stripeCustomerId": subscription.customer as string,
            "billing.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
            "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ Subscription ${subscription.id} ${event.type} for org ${orgId} - Status: ${subscription.status}, Plan: ${planName}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find org by subscription ID
          const orgsSnapshot = await db.collection("organizations")
            .where("billing.subscriptionId", "==", subscriptionId)
            .limit(1)
            .get();

          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            if (orgDoc) {
              await orgDoc.ref.update({
                "billing.lastPaymentDate": admin.firestore.Timestamp.fromDate(
                  new Date(invoice.created * 1000)
                ),
                "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find org by subscription ID
          const orgsSnapshot = await db.collection("organizations")
            .where("billing.subscriptionId", "==", subscriptionId)
            .limit(1)
            .get();

          if (!orgsSnapshot.empty) {
            const orgDoc = orgsSnapshot.docs[0];
            if (orgDoc) {
              await orgDoc.ref.update({
                "billing.status": "past_due",
                "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
        break;
      }
      }

      res.json({received: true});
    } catch (error: unknown) {
      console.error("Error handling webhook:", error);
      res.status(500).send("Webhook handler failed");
    }
  }
);

interface GetBillingStatusData {
  orgId: string;
}

/**
 * Get current billing status and usage
 */
export const getBillingStatus = functions.https.onCall(
  async (request: functions.https.CallableRequest<GetBillingStatusData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      // Verify user is org member
      const memberDoc = await db.collection("orgMembers")
        .doc(`${request.auth.uid}_${orgId}`)
        .get();

      if (!memberDoc.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not a member of this organization"
        );
      }

      // Get organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Count bookings this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let bookingCount = 0;
      try {
        const bookingsSnapshot = await db.collection("bookings")
          .where("orgId", "==", orgId)
          .where("startTime", ">=", admin.firestore.Timestamp.fromDate(startOfMonth))
          .where("status", "==", "booked")
          .count()
          .get();

        bookingCount = bookingsSnapshot.data().count;
      } catch (bookingError) {
        // If booking count fails (e.g., missing index), log but continue
        console.warn("Failed to count bookings, defaulting to 0:", bookingError);
        bookingCount = 0;
      }

      // Determine recommended plan
      let recommendedPlan = "free";
      if (bookingCount > 200) {
        recommendedPlan = "academy"; // High volume → Academy
      } else if (bookingCount > 100) {
        recommendedPlan = "studio"; // Medium volume → Studio
      } else if (bookingCount > 50) {
        recommendedPlan = "starter"; // Low volume → Starter
      }

      return {
        currentPlan: orgData.billing?.plan || "free",
        status: orgData.billing?.status || "active",
        bookingsThisMonth: bookingCount,
        recommendedPlan,
        subscriptionId: orgData.billing?.subscriptionId || null,
        currentPeriodEnd: orgData.billing?.currentPeriodEnd || null,
        cancelAtPeriodEnd: orgData.billing?.cancelAtPeriodEnd || false,
      };
    } catch (error: unknown) {
      console.error("Error getting billing status:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

interface CreateCheckoutData {
  organizationId: string;
  userId: string;
  priceId: string;
}

/**
 * Create a Stripe Checkout session for subscription signup
 */
export const createStripeCheckout = functions.https.onRequest(
  async (req, res) => {
    // Set CORS headers - restrict to Firebase hosting domain only
    const allowedOrigins = [
      "https://polyface-ae6d3.firebaseapp.com",
      "https://polyface-ae6d3.web.app",
    ];
    const origin = req.get("origin");
    if (origin && allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const {organizationId, userId, priceId} = req.body as CreateCheckoutData;

      if (!organizationId || !userId || !priceId) {
        res.status(400).json({error: "Missing required fields"});
        return;
      }

      // Get organization data
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        res.status(404).json({error: "Organization not found"});
        return;
      }

      // Get or create Stripe customer
      let customerId = orgData.billing?.stripeCustomerId;

      // Verify customer exists in Stripe, create new one if not
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (error) {
          console.log(`Customer ${customerId} not found in Stripe, creating new one`);
          customerId = undefined; // Force creation of new customer
        }
      }

      if (!customerId) {
        // Get user email
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();

        const customer = await stripe.customers.create({
          email: userData?.email,
          metadata: {
            organizationId,
            userId,
          },
        });
        customerId = customer.id;

        // Save customer ID to organization
        await db.collection("organizations").doc(organizationId).update({
          "billing.stripeCustomerId": customerId,
          "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Check if customer has ever had a subscription (trial already used)
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      // Only offer trial if this is their first subscription ever
      const hasHadSubscription = existingSubscriptions.data.length > 0;

      // Build subscription data
      const subscriptionData: {
        metadata: { organizationId: string; userId: string };
        trial_period_days?: number;
      } = {
        metadata: {
          organizationId,
          userId,
        },
      };

      // Only add trial if they've never had a subscription
      if (!hasHadSubscription) {
        subscriptionData.trial_period_days = 14;
        console.log(`✅ Applying 14-day trial for new customer ${customerId}`);
      } else {
        console.log(`⏭️ Skipping trial for existing customer ${customerId} (upgrade/downgrade)`);
      }

      // Create Checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `skedenceadmin://subscription-success?session_id={CHECKOUT_SESSION_ID}&orgId=${organizationId}`,
        cancel_url: "skedenceadmin://subscription-cancel",
        metadata: {
          organizationId,
          userId,
        },
        subscription_data: subscriptionData,
      });

      console.log(`✅ Created checkout session ${session.id} for org ${organizationId}`);

      res.json({url: session.url});
    } catch (error: unknown) {
      console.error("Error creating checkout session:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({error: message});
    }
  }
);

/**
 * Create Setup Intent for in-app payment collection
 * This allows users to add/update payment method without leaving the app
 */
export const createSetupIntent = functions.https.onCall(
  async (request: functions.https.CallableRequest<{organizationId: string}>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId} = request.data;

    if (!organizationId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing organizationId"
      );
    }

    try {
      // Get organization data
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Get or create Stripe customer
      let customerId = orgData.billing?.stripeCustomerId;

      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (error) {
          console.log(`Customer ${customerId} not found in Stripe, creating new one`);
          customerId = undefined;
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: request.auth.token.email,
          metadata: {
            organizationId,
            userId: request.auth.uid,
          },
        });
        customerId = customer.id;

        await db.collection("organizations").doc(organizationId).update({
          "billing.stripeCustomerId": customerId,
          "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Create ephemeral key for customer
      const ephemeralKey = await stripe.ephemeralKeys.create(
        {customer: customerId},
        {apiVersion: "2024-11-20.acacia"}
      );

      // Create setup intent with usage parameter
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: {
          organizationId,
          userId: request.auth.uid,
        },
      });

      console.log(`✅ Created setup intent ${setupIntent.id} for customer ${customerId}`);

      return {
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
        ephemeralKey: ephemeralKey.secret,
      };
    } catch (error: unknown) {
      console.error("Error creating setup intent:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

/**
 * Get payment method info for organization
 */
export const getPaymentMethod = functions.https.onCall(
  async (request: functions.https.CallableRequest<{organizationId: string}>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId} = request.data;

    if (!organizationId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing organizationId"
      );
    }

    try {
      // Get organization
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const customerId = orgData.billing?.stripeCustomerId;

      if (!customerId) {
        return {
          hasPaymentMethod: false,
        };
      }

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });

      if (paymentMethods.data.length === 0) {
        return {
          hasPaymentMethod: false,
        };
      }

      const card = paymentMethods.data[0].card;

      return {
        hasPaymentMethod: true,
        last4: card?.last4,
        brand: card?.brand,
      };
    } catch (error: unknown) {
      console.error("Error getting payment method:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

/**
 * Create or update subscription with payment method (in-app)
 * This is called after the user adds their payment method in the app
 */
export const createInAppSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    organizationId: string;
    priceId: string;
    paymentMethodId: string;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId, priceId, paymentMethodId} = request.data;

    if (!organizationId || !priceId || !paymentMethodId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // Get organization data
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const customerId = orgData.billing?.stripeCustomerId;

      if (!customerId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No Stripe customer found"
        );
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      console.log(`✅ Attached payment method ${paymentMethodId} to customer ${customerId}`);

      // Cancel any existing active subscriptions
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });

      let canceledCount = 0;
      for (const existingSub of existingSubscriptions.data) {
        if (existingSub.status === "active" || existingSub.status === "trialing") {
          console.log(`❌ Canceling old subscription: ${existingSub.id} (${existingSub.status})`);
          await stripe.subscriptions.cancel(existingSub.id);
          canceledCount++;
        }
      }

      if (canceledCount > 0) {
        console.log(`✅ Canceled ${canceledCount} old subscription(s)`);
      }

      // Check if customer has ever had a subscription (trial already used)
      const hasHadSubscription = existingSubscriptions.data.length > 0;

      // Build subscription data
      const subscriptionData: {
        customer: string;
        items: Array<{price: string}>;
        default_payment_method: string;
        metadata: {organizationId: string; userId: string};
        trial_period_days?: number;
      } = {
        customer: customerId,
        items: [{price: priceId}],
        default_payment_method: paymentMethodId,
        metadata: {
          organizationId,
          userId: request.auth.uid,
        },
      };

      // Only add trial if they've never had a subscription
      if (!hasHadSubscription) {
        subscriptionData.trial_period_days = 14;
        console.log(`✅ Applying 14-day trial for new customer ${customerId}`);
      } else {
        console.log(`⏭️ Skipping trial for existing customer ${customerId} (upgrade/downgrade)`);
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create(subscriptionData);

      console.log(`✅ Created subscription ${subscription.id} for customer ${customerId}`);

      // Map price ID to plan name
      let planName = "starter";
      if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) planName = "studio";
      else if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) planName = "academy";
      else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planName = "enterprise";

      const trialEnd = subscription.trial_end ?
        admin.firestore.Timestamp.fromDate(new Date(subscription.trial_end * 1000)) :
        null;

      // Update Firebase immediately
      await db.collection("organizations").doc(organizationId).update({
        "billing.subscriptionId": subscription.id,
        "billing.customerId": subscription.customer as string,
        "billing.stripeSubscriptionId": subscription.id,
        "billing.stripeCustomerId": subscription.customer as string,
        "billing.status": subscription.status,
        "billing.plan": planName,
        "billing.isActive": subscription.status === "active" || subscription.status === "trialing",
        "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
          new Date(subscription.current_period_end * 1000)
        ),
        "billing.trialEndsAt": trialEnd,
        "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
        "billing.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Updated Firebase with new subscription - Plan: ${planName}, Status: ${subscription.status}`);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: planName,
      };
    } catch (error: unknown) {
      console.error("Error creating in-app subscription:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);
/**
 * Simplified upgrade/downgrade using existing payment method
 * User must already have a payment method on file
 */
export const upgradeSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    organizationId: string;
    priceId: string;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId, priceId} = request.data;

    if (!organizationId || !priceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // Get organization data
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const customerId = orgData.billing?.stripeCustomerId;

      if (!customerId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No Stripe customer found. Please add a payment method first."
        );
      }

      // Get customer and check for payment method
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

      // Try to get default payment method, or find any available one
      let paymentMethodId = customer.invoice_settings?.default_payment_method as string | undefined;

      if (!paymentMethodId) {
        // Look for any payment methods attached to customer
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
          limit: 1,
        });

        if (paymentMethods.data.length === 0) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "No payment method on file. Please add a payment method first."
          );
        }

        paymentMethodId = paymentMethods.data[0].id;

        // Set it as default for future use
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        console.log(`✅ Set payment method ${paymentMethodId} as default for customer ${customerId}`);
      }

      // Cancel any existing active subscriptions
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });

      let canceledCount = 0;
      for (const existingSub of existingSubscriptions.data) {
        if (existingSub.status === "active" || existingSub.status === "trialing") {
          console.log(`❌ Canceling old subscription: ${existingSub.id} (${existingSub.status})`);
          await stripe.subscriptions.cancel(existingSub.id);
          canceledCount++;
        }
      }

      if (canceledCount > 0) {
        console.log(`✅ Canceled ${canceledCount} old subscription(s)`);
      }

      // Check if customer has ever been charged for a subscription
      // Look at invoices to see if they've actually paid (not just trialed)
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100,
      });

      const hasEverPaid = invoices.data.some(
        (invoice) => invoice.status === "paid" && invoice.amount_paid > 0
      );

      console.log(`💰 Customer payment history: hasEverPaid=${hasEverPaid}`);

      // Build subscription data
      const subscriptionData: {
        customer: string;
        items: Array<{price: string}>;
        default_payment_method: string;
        metadata: {organizationId: string; userId: string};
        trial_period_days?: number;
      } = {
        customer: customerId,
        items: [{price: priceId}],
        default_payment_method: paymentMethodId,
        metadata: {
          organizationId,
          userId: request.auth.uid,
        },
      };

      // Only add trial if they've never been charged before
      if (!hasEverPaid) {
        subscriptionData.trial_period_days = 14;
        console.log(`✅ Applying 14-day trial for customer ${customerId} (never been charged)`);
      } else {
        console.log(`⏭️ Skipping trial for customer ${customerId} (has paid invoices)`);
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create(subscriptionData);

      console.log(`✅ Created subscription ${subscription.id} for customer ${customerId}`);

      // Map price ID to plan name
      let planName = "starter";
      if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) planName = "studio";
      else if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) planName = "academy";
      else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planName = "enterprise";

      const trialEnd = subscription.trial_end ?
        admin.firestore.Timestamp.fromDate(new Date(subscription.trial_end * 1000)) :
        null;

      // Update Firebase immediately
      await db.collection("organizations").doc(organizationId).update({
        "billing.subscriptionId": subscription.id,
        "billing.customerId": subscription.customer as string,
        "billing.stripeSubscriptionId": subscription.id,
        "billing.stripeCustomerId": subscription.customer as string,
        "billing.status": subscription.status,
        "billing.plan": planName,
        "billing.isActive": subscription.status === "active" || subscription.status === "trialing",
        "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
          new Date(subscription.current_period_end * 1000)
        ),
        "billing.trialEndsAt": trialEnd,
        "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
        "billing.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Updated Firebase with new subscription - Plan: ${planName}, Status: ${subscription.status}`);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: planName,
      };
    } catch (error: unknown) {
      console.error("Error upgrading subscription:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);
