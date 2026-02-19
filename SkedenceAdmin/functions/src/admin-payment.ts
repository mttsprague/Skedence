import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const db = admin.firestore();

interface AdminProcessPaymentData {
  orgId: string;
  userId: string; // Client being charged
  amount: number; // Amount in cents
  description: string;
  saveCard?: boolean; // Whether to save the payment method
}

/**
 * Admin-initiated payment processing
 * Allows admins to process payments on behalf of clients using the organization's Stripe account
 */
export const adminProcessPayment = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to process payments"
      );
    }

    const {orgId, userId, amount, description, saveCard = false} = request.data;

    if (!orgId || !userId || !amount || !description) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: orgId, userId, amount, description"
      );
    }

    if (amount < 50) {
      throw new HttpsError(
        "invalid-argument",
        "Amount must be at least $0.50"
      );
    }

    try {
      // Verify admin access - check orgMembers collection (source of truth)
      // Note: orgMembers uses flat structure with composite key: {uid}_{orgId}
      const membershipId = `${request.auth.uid}_${orgId}`;
      const memberDoc = await db
        .collection("orgMembers")
        .doc(membershipId)
        .get();

      const memberData = memberDoc.data();
      console.log(`🔍 Checking permissions for user ${request.auth.uid} in org ${orgId}:`, {
        membershipId: membershipId,
        exists: memberDoc.exists,
        role: memberData?.role,
        email: memberData?.email,
      });

      if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
        console.log(`❌ Permission denied - role: ${memberData?.role || "none"}`);
        throw new HttpsError(
          "permission-denied",
          "Only owners and admins can process payments"
        );
      }

      console.log(`✅ Permission granted - user is ${memberData.role}`);

      // Get organization's Stripe keys
      const stripeDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("stripe")
        .doc("config")
        .get();

      const stripeData = stripeDoc.data();
      if (!stripeData || !stripeData.secretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(stripeData.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Get or create Stripe customer
      const userDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .get();

      const userData = userDoc.data();

      if (!userData) {
        throw new HttpsError(
          "not-found",
          "Client not found"
        );
      }

      let customerId = userData.stripeCustomerId;

      if (!customerId) {
        const customerName = `${userData.firstName} ${userData.lastName}`;
        const customer = await stripe.customers.create({
          email: userData.email || undefined,
          name: `Skedence: ${customerName} (${userId.slice(-4)})`,
          description: `Customer ID: ${userId}`,
          metadata: {
            userId: userId,
            orgId: orgId,
          },
        });

        customerId = customer.id;

        // Save customer ID
        await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userId)
          .update({
            stripeCustomerId: customerId,
          });
      }

      // Create payment intent
      const customerName = `${userData.firstName} ${userData.lastName}`;
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amount,
        currency: "usd",
        customer: customerId,
        description: `Skedence: ${customerName} - ${description}`,
        statement_descriptor_suffix: "Skedence", // Appears on bank statements (22 chars max)
        receipt_email: userData.email || userData.emailAddress || undefined, // Send receipt
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orgId: orgId,
          userId: userId,
          processedBy: request.auth.uid,
          adminInitiated: "true",
        },
      };

      // If saveCard is true, set up for future payments
      if (saveCard) {
        paymentIntentParams.setup_future_usage = "off_session";
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      console.log(
        `✅ Admin payment intent created: ${paymentIntent.id} for ${amount / 100} USD (Client: ${userId})`
      );

      return {
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeData.publishableKey,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: unknown) {
      console.error("❌ Error creating admin payment intent:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

interface AdminChargeWithSavedCardData {
  orgId: string;
  userId: string; // Client being charged
  paymentMethodId: string; // Saved payment method ID
  amount: number; // Amount in cents
  description: string;
}

/**
 * Admin-initiated payment with saved card
 * Allows admins to charge clients using their saved payment methods
 */
export const adminChargeWithSavedCard = onCall(
  { enforceAppCheck: true },
  async (request) => {
    console.log("🔵 adminChargeWithSavedCard called");
    console.log("🔵 request.auth:", request.auth ? "present" : "MISSING");
    if (request.auth) {
      console.log("🔵 request.auth.uid:", request.auth.uid);
    }

    if (!request.auth) {
      console.log("❌ No auth in request - throwing unauthenticated error");
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to process payments"
      );
    }

    const {orgId, userId, paymentMethodId, amount, description} = request.data;

    if (!orgId || !userId || !paymentMethodId || !amount || !description) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: orgId, userId, paymentMethodId, amount, description"
      );
    }

    if (amount < 50) {
      throw new HttpsError(
        "invalid-argument",
        "Amount must be at least $0.50"
      );
    }

    try {
      // Verify admin access
      // Note: orgMembers uses flat structure with composite key: {uid}_{orgId}
      const membershipId = `${request.auth.uid}_${orgId}`;
      const memberDoc = await db
        .collection("orgMembers")
        .doc(membershipId)
        .get();

      const memberData = memberDoc.data();
      console.log(`🔍 Checking permissions for user ${request.auth.uid} in org ${orgId}:`, {
        membershipId: membershipId,
        exists: memberDoc.exists,
        role: memberData?.role,
      });

      if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
        console.log(`❌ Permission denied - role: ${memberData?.role || "none"}`);
        throw new HttpsError(
          "permission-denied",
          "Only owners and admins can process payments"
        );
      }

      console.log(`✅ Permission granted - user is ${memberData.role}`);

      // Get organization's Stripe keys
      const stripeDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("stripe")
        .doc("config")
        .get();

      const stripeData = stripeDoc.data();
      if (!stripeData || !stripeData.secretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(stripeData.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Get user data
      const userDoc = await db
        .collection("users")
        .doc(userId)
        .get();

      const userData = userDoc.data();

      if (!userData) {
        throw new HttpsError(
          "not-found",
          "Client not found"
        );
      }

      const customerId = userData.stripeCustomerId;

      if (!customerId) {
        throw new HttpsError(
          "failed-precondition",
          "Client has no Stripe customer ID"
        );
      }

      // Create and confirm payment intent with saved card
      const customerName = `${userData.firstName} ${userData.lastName}`;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        return_url: "https://skedence.app/payment-complete",
        description: `Skedence: ${customerName} - ${description}`,
        statement_descriptor_suffix: "Skedence", // Appears on bank statements (22 chars max)
        receipt_email: userData.email || userData.emailAddress || undefined, // Send receipt
        metadata: {
          orgId: orgId,
          userId: userId,
          processedBy: request.auth.uid,
          adminInitiated: "true",
        },
      });

      if (paymentIntent.status === "succeeded") {
        console.log(
          `✅ Admin payment with saved card succeeded: ${paymentIntent.id} for ${amount / 100} USD (Client: ${userId})`
        );

        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        };
      } else {
        throw new HttpsError(
          "aborted",
          `Payment not completed. Status: ${paymentIntent.status}`
        );
      }
    } catch (error: unknown) {
      console.error("❌ Error charging with saved card:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to charge card: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
