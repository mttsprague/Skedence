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

interface CancelSubscriptionData {
  orgId: string;
}

/**
 * Cancel an organization's subscription
 */
export const cancelSubscription = functions.https.onCall(
  async (request: functions.https.CallableRequest<CancelSubscriptionData>) => {
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

      // Cancel at period end (don't charge them immediately)
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update organization
      await db.collection("organizations").doc(orgId).update({
        "billing.cancelAtPeriodEnd": true,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
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

          // Map price ID to plan name
          const priceId = subscription.items.data[0]?.price.id;
          let planName = "starter";
          if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) planName = "studio";
          else if (priceId === process.env.STRIPE_ACADEMY_PRICE_ID) planName = "academy";
          else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planName = "enterprise";

          await db.collection("organizations").doc(orgId).update({
            "billing.subscriptionId": subscriptionId,
            "billing.customerId": subscription.customer as string,
            "billing.status": subscription.status,
            "billing.plan": planName,
            "billing.isActive": subscription.status === "active" || subscription.status === "trialing",
            "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
              new Date(subscription.current_period_end * 1000)
            ),
            "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
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

          await db.collection("organizations").doc(orgId).update({
            "billing.status": subscription.status,
            "billing.plan": planName,
            "billing.isActive": subscription.status === "active" || subscription.status === "trialing",
            "billing.currentPeriodEnd": admin.firestore.Timestamp.fromDate(
              new Date(subscription.current_period_end * 1000)
            ),
            "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
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
        success_url: "https://skedence.com/checkout-success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://skedence.com/checkout-cancel",
        metadata: {
          organizationId,
          userId,
        },
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            organizationId,
            userId,
          },
        },
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
