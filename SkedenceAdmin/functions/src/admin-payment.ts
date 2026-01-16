import * as functions from "firebase-functions";
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
export const adminProcessPayment = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<AdminProcessPaymentData>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to process payments"
      );
    }

    const {orgId, userId, amount, description, saveCard = false} = request.data;

    if (!orgId || !userId || !amount || !description) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: orgId, userId, amount, description"
      );
    }

    if (amount < 50) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Amount must be at least $0.50"
      );
    }

    try {
      // Verify admin access
      const adminUserDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(request.auth.uid)
        .get();

      const adminUserData = adminUserDoc.data();
      if (!adminUserData || (adminUserData.role !== "owner" && adminUserData.role !== "admin")) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only owners and admins can process payments"
        );
      }

      // Get organization's Stripe keys
      const stripeDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("stripe")
        .doc("config")
        .get();

      const stripeData = stripeDoc.data();
      if (!stripeData || !stripeData.secretKey) {
        throw new functions.https.HttpsError(
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
        throw new functions.https.HttpsError(
          "not-found",
          "Client not found"
        );
      }

      let customerId = userData.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData.email || undefined,
          name: `${userData.firstName} ${userData.lastName}`,
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
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amount,
        currency: "usd",
        customer: customerId,
        description: description,
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

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
