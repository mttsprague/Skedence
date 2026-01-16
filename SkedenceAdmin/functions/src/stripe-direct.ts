import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const db = admin.firestore();

interface CreatePaymentIntentDirectData {
  orgId: string;
  packageType: string;
  amount: number;
  trainerId: string;
  userId: string;
}

/**
 * Create payment intent using organization's direct Stripe keys
 * Payment goes directly to business's Stripe account
 * No platform fees or Connect involved
 */
export const createPaymentIntentDirect = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<CreatePaymentIntentDirectData>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    const {orgId, packageType, amount, trainerId, userId} = request.data;

    if (!orgId || !packageType || !amount || !trainerId || !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
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

      // Get organization data for pricing
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Validate amount against organization's pricing
      const validPackages: { [key: string]: number } = {};

      if (orgData.pricingStructure?.tiers) {
        for (const tier of orgData.pricingStructure.tiers) {
          for (const pkg of tier.packages) {
            validPackages[pkg.packageType] = pkg.priceInCents;
          }
        }
      } else {
        // Fallback to default packages
        const packagesSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("packages")
          .get();

        packagesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          validPackages[data.packageType] = data.priceInCents;
        });
      }

      if (!validPackages[packageType]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid package type: ${packageType}`
        );
      }

      if (amount !== validPackages[packageType]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount mismatch. Expected ${validPackages[packageType]}, got ${amount}`
        );
      }

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

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orgId: orgId,
          trainerId: trainerId,
          userId: userId,
          packageType: packageType,
        },
      });

      console.log(
        `✅ Payment intent created: ${paymentIntent.id} for ${amount / 100} USD`
      );

      return {
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripeData.publishableKey,
      };
    } catch (error: unknown) {
      console.error("❌ Error creating payment intent:", error);

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

/**
 * Create and confirm payment intent using saved payment method
 */
export const createAndConfirmPaymentDirect = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<CreatePaymentIntentDirectData & {paymentMethodId: string}>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    const {orgId, packageType, amount, trainerId, userId, paymentMethodId} = request.data;

    if (!orgId || !packageType || !amount || !trainerId || !userId || !paymentMethodId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
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

      // Get organization data for pricing validation
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Validate amount against organization's pricing
      const validPackages: { [key: string]: number } = {};

      if (orgData.pricingStructure?.tiers) {
        for (const tier of orgData.pricingStructure.tiers) {
          for (const pkg of tier.packages) {
            validPackages[pkg.packageType] = pkg.priceInCents;
          }
        }
      } else {
        const packagesSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("packages")
          .get();

        packagesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          validPackages[data.packageType] = data.priceInCents;
        });
      }

      if (!validPackages[packageType]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid package type: ${packageType}`
        );
      }

      if (amount !== validPackages[packageType]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount mismatch. Expected ${validPackages[packageType]}, got ${amount}`
        );
      }

      // Get customer ID
      const userDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .get();

      const userData = userDoc.data();
      const customerId = userData?.stripeCustomerId;

      if (!customerId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No Stripe customer found for user"
        );
      }

      // Create and confirm payment intent with saved payment method
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        return_url: "https://skedence.app/payment-complete",
        metadata: {
          orgId: orgId,
          trainerId: trainerId,
          userId: userId,
          packageType: packageType,
        },
      });

      if (paymentIntent.status === "succeeded") {
        // Create the lesson package
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 12);

        await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userId)
          .collection("packages")
          .add({
            packageType: packageType,
            trainerId: trainerId,
            remainingLessons: 1,
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
            paymentIntentId: paymentIntent.id,
            amountPaid: amount,
            status: "active",
          });

        console.log(
          `✅ Payment confirmed and package created: ${paymentIntent.id} for ${amount / 100} USD`
        );

        return {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        };
      } else {
        throw new functions.https.HttpsError(
          "aborted",
          `Payment not completed. Status: ${paymentIntent.status}`
        );
      }
    } catch (error: unknown) {
      console.error("❌ Error creating payment with saved card:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to process payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
