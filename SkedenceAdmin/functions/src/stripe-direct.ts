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

      // Create payment intent
      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        description: `Skedence: ${customerName}`,
        setup_future_usage: "off_session", // Save payment method for future use
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
      const validPackages: { [key: string]: {price: number; lessons: number} } = {};

      if (orgData.pricingStructure?.tiers) {
        for (const tier of orgData.pricingStructure.tiers) {
          for (const pkg of tier.packages) {
            validPackages[pkg.packageType] = {
              price: pkg.priceInCents,
              lessons: pkg.lessonCount || 1,
            };
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
          validPackages[data.packageType] = {
            price: data.priceInCents,
            lessons: data.lessonCount || 1,
          };
        });
      }

      if (!validPackages[packageType]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid package type: ${packageType}`
        );
      }

      if (amount !== validPackages[packageType].price) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount mismatch. Expected ${validPackages[packageType].price}, got ${amount}`
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
      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        return_url: "https://skedence.app/payment-complete",
        description: `Skedence: ${customerName}`,
        metadata: {
          orgId: orgId,
          trainerId: trainerId,
          userId: userId,
          packageType: packageType,
        },
      });

      if (paymentIntent.status === "succeeded") {
        // Get lesson count from package definition
        const totalLessons = validPackages[packageType].lessons;

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
            remainingLessons: totalLessons,
            totalLessons: totalLessons,
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

/**
 * Confirm an existing payment intent and create lesson package
 * Used after Payment Sheet completes a payment created with createPaymentIntentDirect
 */
export const confirmPaymentAndCreatePackageDirect = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{paymentIntentId: string; userId: string}>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {paymentIntentId, userId} = request.data;

    if (!paymentIntentId || !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing paymentIntentId or userId"
      );
    }

    if (request.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {
      // First, get the payment intent metadata to find the orgId
      // We need to try different orgs to find which one created this payment intent
      const orgsSnapshot = await db.collection("organizations").get();

      let stripe: Stripe | null = null;
      let paymentIntent: Stripe.PaymentIntent | null = null;
      let orgId: string | null = null;

      // Try to retrieve the payment intent from each organization's Stripe account
      for (const orgDoc of orgsSnapshot.docs) {
        try {
          const stripeDoc = await db
            .collection("organizations")
            .doc(orgDoc.id)
            .collection("stripe")
            .doc("config")
            .get();

          const stripeData = stripeDoc.data();
          if (!stripeData?.secretKey) continue;

          const orgStripe = new Stripe(stripeData.secretKey, {
            apiVersion: "2025-02-24.acacia",
          });

          const pi = await orgStripe.paymentIntents.retrieve(paymentIntentId);

          // Found it!
          stripe = orgStripe;
          paymentIntent = pi;
          orgId = orgDoc.id;
          break;
        } catch (err) {
          // Payment intent not in this org's Stripe account, continue
          continue;
        }
      }

      if (!stripe || !paymentIntent || !orgId) {
        throw new functions.https.HttpsError(
          "not-found",
          "Payment intent not found in any organization"
        );
      }

      if (paymentIntent.status !== "succeeded") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Payment has not succeeded. Status: ${paymentIntent.status}`
        );
      }

      const packageType = paymentIntent.metadata.packageType;
      const trainerId = paymentIntent.metadata.trainerId;

      console.log(`🔍 Payment metadata - packageType: ${packageType}, trainerId: ${trainerId}`);

      if (!packageType || !trainerId) {
        throw new functions.https.HttpsError(
          "internal",
          "Payment intent is missing required metadata"
        );
      }

      // Fetch organization's package definition to get lesson count
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      let totalLessons = 1; // Default fallback

      console.log(`🔍 Checking pricing structure for package: ${packageType}`);

      if (orgData?.pricingStructure?.tiers) {
        console.log(`📋 Found ${orgData.pricingStructure.tiers.length} pricing tiers`);

        // Look for the package in pricing structure
        for (const tier of orgData.pricingStructure.tiers) {
          console.log(`📋 Tier "${tier.name}" has ${tier.packages?.length || 0} packages`);

          const pkg = tier.packages.find((p: any) => p.packageType === packageType);
          if (pkg) {
            totalLessons = pkg.lessonCount || 1;
            console.log(`✅ Found matching package! lessonCount: ${totalLessons}`);
            break;
          }
        }

        if (totalLessons === 1) {
          console.log("⚠️ No matching package found in pricing structure, using default: 1");
        }
      } else {
        console.log("⚠️ No pricing structure found, checking packages subcollection");

        // Fallback: check packages subcollection
        const packagesSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("packages")
          .where("packageType", "==", packageType)
          .limit(1)
          .get();

        if (!packagesSnapshot.empty) {
          const pkgData = packagesSnapshot.docs[0].data();
          totalLessons = pkgData.lessonCount || 1;
          console.log("✅ Found package in subcollection! lessonCount: ${totalLessons}");
        } else {
          console.log("⚠️ No package found in subcollection either, using default: 1");
        }
      }

      // Create the lesson package
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 12);

      // Store package in users/{userId}/lessonPackages to match existing structure
      await db
        .collection("users")
        .doc(userId)
        .collection("lessonPackages")
        .add({
          packageType: packageType,
          trainerId: trainerId,
          totalLessons: totalLessons,
          lessonsUsed: 0,
          orgId: orgId,
          purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
          transactionId: paymentIntent.id,
          amountPaid: paymentIntent.amount,
          status: "active",
        });

      console.log(
        `✅ Package created for payment: ${paymentIntent.id} for ${paymentIntent.amount / 100} USD at users/${userId}/lessonPackages`
      );

      return {success: true, packageId: paymentIntent.id};
    } catch (error: unknown) {
      console.error("❌ Error confirming payment:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to confirm payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
