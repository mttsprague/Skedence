import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const stripe = new Stripe(stripeSecretKey, {
  // apiVersion: "2024-11-20" // Commented out - using SDK default,
});

const db = admin.firestore();

// Subscription price IDs (from Stripe Dashboard - LIVE MODE)
const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || "price_1SpKItFIh2MhEffNfsBy4HyT",     // $29/month
  studio: process.env.STRIPE_STUDIO_PRICE_ID || "price_1SpKMkFIh2MhEffNgGdbgMr5",       // $99/month  
  academy: process.env.STRIPE_ACADEMY_PRICE_ID || "price_1SpKNrFIh2MhEffNqZf64sPA",     // $249/month
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_1SpKOrFIh2MhEffNjU5v5X4P", // $499/month
};

interface CreateWebCheckoutData {
  organizationId: string;
  priceId: string;
}

/**
 * Create Stripe Checkout Session for Web Portal
 * Returns checkout URL for redirecting user to Stripe payment page
 */
export const createWebCheckoutSession = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId, priceId} = request.data;

    if (!organizationId || !priceId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing organizationId or priceId"
      );
    }

    try {
      // Verify user is owner or admin
      const memberQuery = await db.collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", organizationId)
        .where("role", "in", ["owner", "admin"])
        .limit(1)
        .get();

      if (memberQuery.empty) {
        throw new HttpsError(
          "permission-denied",
          "Only organization owners and admins can manage subscriptions"
        );
      }

      // Get organization data
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Get or create Stripe customer
      let customerId = orgData.billing?.stripeCustomerId;

      // Verify customer exists in Stripe
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (error) {
          console.log(`Customer ${customerId} not found, creating new one`);
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

      // Check if customer has ever had a subscription (for trial eligibility)
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      const hasHadSubscription = existingSubscriptions.data.length > 0;

      // Build subscription data with trial for new customers
      const subscriptionData: {
        metadata: { organizationId: string; userId: string };
        trial_period_days?: number;
      } = {
        metadata: {
          organizationId,
          userId: request.auth.uid,
        },
      };

      if (!hasHadSubscription) {
        subscriptionData.trial_period_days = 14;
        console.log(`✅ Applying 14-day trial for customer ${customerId}`);
      }

      // Create Checkout session with web URLs
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
        success_url: `https://skedence.com/settings/subscription?success=true`,
        cancel_url: `https://skedence.com/settings/subscription?canceled=true`,
        metadata: {
          organizationId,
          userId: request.auth.uid,
        },
        subscription_data: subscriptionData,
      });

      console.log(`✅ Created web checkout session ${session.id} for org ${organizationId}`);
      console.log(`Session URL: ${session.url}`);

      if (!session.url) {
        throw new HttpsError(
          "internal",
          "Stripe did not return a checkout URL"
        );
      }

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error: unknown) {
      console.error("Error creating web checkout session:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

/**
 * Create Stripe Customer Portal Session
 * Returns portal URL for customer to manage their subscription, payment methods, billing history
 */
export const createCustomerPortalSession = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId} = request.data;

    if (!organizationId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing organizationId"
      );
    }

    try {
      // Verify user is owner or admin
      const memberQuery = await db.collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", organizationId)
        .where("role", "in", ["owner", "admin"])
        .limit(1)
        .get();

      if (memberQuery.empty) {
        throw new HttpsError(
          "permission-denied",
          "Only organization owners and admins can manage subscriptions"
        );
      }

      // Get organization
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const customerId = orgData.billing?.stripeCustomerId;

      if (!customerId) {
        throw new HttpsError(
          "failed-precondition",
          "No Stripe customer found. Please subscribe first."
        );
      }

      // Create Customer Portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: "https://skedence.com/settings/subscription",
      });

      console.log(`✅ Created customer portal session for customer ${customerId}`);

      return {
        url: session.url,
      };
    } catch (error: unknown) {
      console.error("Error creating customer portal session:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

/**
 * Get subscription status for web portal display
 */
export const getWebSubscriptionStatus = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {organizationId} = request.data;

    if (!organizationId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing organizationId"
      );
    }

    try {
      // Get organization
      const orgDoc = await db.collection("organizations").doc(organizationId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Check both top-level fields and billing object for backwards compatibility
      const billing = orgData.billing || {};
      
      // Check for Stripe subscription ID in either location
      const stripeSubId = orgData.stripeSubscriptionId || billing.stripeSubscriptionId;

      // If we have a Stripe subscription, fetch latest status
      if (stripeSubId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(stripeSubId);

          // Determine plan name from price ID
          let planName = "starter";
          if (subscription.items.data.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            if (priceId === PRICE_IDS.enterprise) planName = "enterprise";
            else if (priceId === PRICE_IDS.academy) planName = "academy";
            else if (priceId === PRICE_IDS.studio) planName = "studio";
            else if (priceId === PRICE_IDS.starter) planName = "starter";
          }

          return {
            hasSubscription: true,
            plan: planName,
            status: subscription.status,
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(
              new Date(subscription.current_period_end * 1000)
            ),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            trialEnd: subscription.trial_end ? 
              admin.firestore.Timestamp.fromDate(new Date(subscription.trial_end * 1000)) : 
              null,
          };
        } catch (error) {
          console.warn("Could not fetch subscription from Stripe:", error);
          // Fall back to Firestore data
        }
      }

      // Check for top-level subscription fields (CLAUDE.md schema)
      const status = orgData.subscriptionStatus || billing.status || "inactive";
      const plan = orgData.subscriptionTier || billing.plan || "free";
      
      // If organization is new (within 14 days) and has no subscription, set as trialing
      const createdAt = orgData.createdAt;
      const now = Date.now();
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      
      let trialEnd = billing.trialEnd || null;
      let finalStatus = status;
      
      // Auto-assign trial for organizations created within last 14 days with no subscription
      if (createdAt && !stripeSubId && status === "inactive") {
        const orgAgeMs = now - (createdAt.toDate ? createdAt.toDate().getTime() : createdAt);
        if (orgAgeMs < fourteenDaysMs) {
          finalStatus = "trialing";
          // Set trial end to 14 days from creation
          const trialEndDate = new Date((createdAt.toDate ? createdAt.toDate().getTime() : createdAt) + fourteenDaysMs);
          trialEnd = admin.firestore.Timestamp.fromDate(trialEndDate);
        }
      }

      // Return Firestore data as fallback
      return {
        hasSubscription: !!stripeSubId,
        plan,
        status: finalStatus,
        currentPeriodEnd: orgData.currentPeriodEnd || billing.currentPeriodEnd || null,
        cancelAtPeriodEnd: billing.cancelAtPeriodEnd || false,
        trialEnd,
      };
    } catch (error: unknown) {
      console.error("Error getting subscription status:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);
