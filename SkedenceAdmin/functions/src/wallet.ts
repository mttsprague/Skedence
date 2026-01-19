import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const db = admin.firestore();

/**
 * Create a setup intent to add payment method without immediate charge
 * Used for "Add Card to Wallet" functionality
 */
export const createSetupIntentDirect = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{
      orgId: string;
      userId: string;
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, userId} = request.data;

    if (!orgId || !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId or userId"
      );
    }

    if (request.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {
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
      let customerId = userData?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData?.email || undefined,
          name: userData?.firstName && userData?.lastName ?
            `${userData.firstName} ${userData.lastName}` :
            undefined,
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
          .set({
            stripeCustomerId: customerId,
          }, {merge: true});
      }

      // Create setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: {
          orgId: orgId,
          userId: userId,
        },
      });

      console.log(
        `✅ Setup intent created: ${setupIntent.id} for user ${userId}`
      );

      return {
        clientSecret: setupIntent.client_secret,
        publishableKey: stripeData.publishableKey,
      };
    } catch (error: unknown) {
      console.error("❌ Error creating setup intent:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to create setup intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Get payment methods for a customer using organization's Stripe account
 */
export const getPaymentMethodsDirect = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{orgId: string; userId: string}>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, userId} = request.data;

    if (!orgId || !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId or userId"
      );
    }

    if (request.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {
      // Get organization's Stripe keys
      const stripeDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("stripe")
        .doc("config")
        .get();

      const stripeData = stripeDoc.data();

      if (!stripeData?.secretKey || !stripeData?.publishableKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured"
        );
      }

      // Initialize Stripe with organization's key
      const stripe = new Stripe(stripeData.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Get or create customer
      const usersSnapshot = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "==", userId)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = usersSnapshot.docs[0].data();
      let customerId = userData.stripeCustomerId;

      // If no customer ID, create one
      if (!customerId) {
        const email = userData.email || request.auth.token.email;
        const name = userData.name || userData.firstName || "Customer";

        const customer = await stripe.customers.create({
          email: email,
          name: name,
          metadata: {orgId, userId},
        });

        customerId = customer.id;

        // Save customer ID
        await db.collection("users").doc(userId).update({
          stripeCustomerId: customerId,
        });
      }

      // Get payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      console.log(
        `✅ Found ${paymentMethods.data.length} payment methods for customer ${customerId}`
      );

      // Format payment methods for response
      const formattedMethods = paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand || "unknown",
        last4: pm.card?.last4 || "0000",
        expMonth: pm.card?.exp_month || 0,
        expYear: pm.card?.exp_year || 0,
      }));

      return {paymentMethods: formattedMethods};
    } catch (error: unknown) {
      console.error("❌ Error getting payment methods:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to get payment methods: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
