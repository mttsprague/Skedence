import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

const db = admin.firestore();

interface CreatePaymentIntentData {
  packageType: string;
  amount: number;
  trainerId: string;
  userId: string;
}

interface ConfirmPaymentData {
  paymentIntentId: string;
  userId: string;
}

export const createPaymentIntent = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    const {packageType, amount, trainerId, userId} = request.data;

    if (!packageType || !amount || !trainerId || !userId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {
      // Get user's orgId to load pricing structure - query by authUserId field
      const usersQuery = await db.collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        throw new HttpsError("not-found", "User not found");
      }

      const userDoc = usersQuery.docs[0];
      const userData = userDoc.data();

      if (!userData?.orgId) {
        throw new HttpsError(
          "failed-precondition",
          "User does not have an organization"
        );
      }

      // Load organization's pricing structure
      const orgDoc = await db.collection("organizations").doc(userData.orgId).get();
      const orgData = orgDoc.data();

      // Build valid packages map from pricing structure
      const validPackages: { [key: string]: number } = {};

      if (orgData?.pricingStructure?.tiers) {
        // Load from dynamic pricing structure
        for (const tier of orgData.pricingStructure.tiers) {
          for (const pkg of tier.packages) {
            validPackages[pkg.packageType] = pkg.priceInCents;
          }
        }
        console.log(`✅ Loaded ${Object.keys(validPackages).length} packages from pricing structure`);
      } else {
        // Fallback to default pricing if no custom structure
        console.log("⚠️ No pricing structure found, using default pricing");
        validPackages.private = 8000; // $80
        validPackages["2_athlete"] = 12000; // $120
        validPackages["3_athlete"] = 16000; // $160
        validPackages.class_pass = 2000; // $20
      }

      if (!validPackages[packageType] || validPackages[packageType] !== amount) {
        throw new HttpsError(
          "invalid-argument",
          `Invalid package type or amount. Expected ${validPackages[packageType]} for ${packageType}, got ${amount}`
        );
      }

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: "usd",
        metadata: {userId, packageType, trainerId},
        description: `${packageType.replace("_", " ")} lesson package`,
      };

      // If user has a customer ID, attach it to enable saving cards
      if (userData?.stripeCustomerId) {
        paymentIntentData.customer = userData.stripeCustomerId;
        paymentIntentData.setup_future_usage = "off_session";
      }

      const paymentIntent = await stripe.paymentIntents.create(
        paymentIntentData
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: unknown) {
      console.error("Error creating payment intent:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

export const confirmPaymentAndCreatePackage = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {paymentIntentId, userId} = request.data;

    if (!paymentIntentId || !userId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing paymentIntentId or userId"
      );
    }

    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        throw new HttpsError(
          "failed-precondition",
          "Payment has not succeeded"
        );
      }

      const packageType = paymentIntent.metadata.packageType as string;

      const lessonCounts: { [key: string]: number } = {
        single: 1,
        five_pack: 5,
        ten_pack: 10,
        two_athlete: 1,
        three_athlete: 1,
        class_pass: 1, // Class pass creates 1 lesson package
        class_registration: 0, // Deprecated: old direct payment method
      };

      const totalLessons = lessonCounts[packageType];
      if (!totalLessons) {
        throw new HttpsError("internal", "Invalid package type");
      }

      const now = admin.firestore.Timestamp.now();
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 12);

      // Get orgId from payment intent metadata
      const orgId = paymentIntent.metadata.org_id as string;
      if (!orgId) {
        throw new HttpsError(
          "failed-precondition",
          "Payment intent missing organization ID"
        );
      }

      const packageData = {
        packageType,
        totalLessons,
        lessonsUsed: 0,
        amountPaid: paymentIntent.amount, // Store amount in cents for revenue tracking
        purchaseDate: now,
        expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
        transactionId: paymentIntentId,
        orgId: orgId,
      };

      // Write to STANDARD location: organizations/{orgId}/users/{userId}/packages
      await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .collection("packages")
        .add(packageData);

      console.log(`✅ Package created at organizations/${orgId}/users/${userId}/packages`);

      return {success: true, packageId: paymentIntentId};
    } catch (error: unknown) {
      console.error("Error confirming payment:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);
// Get or create Stripe Customer for user
export const getOrCreateCustomer = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {userId} = request.data;

    if (!userId || request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "Invalid user ID"
      );
    }

    try {
      // Query user by authUserId field (document IDs are name-based)
      const usersQuery = await db.collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        throw new HttpsError("not-found", "User not found");
      }

      const userDoc = usersQuery.docs[0];
      const userData = userDoc.data();

      // If customer ID already exists, return it
      if (userData?.stripeCustomerId) {
        return {customerId: userData.stripeCustomerId};
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        metadata: {firebaseUID: userId},
      });

      // Store customer ID in user document using the document reference
      await userDoc.ref.update({
        stripeCustomerId: customer.id,
      });

      return {customerId: customer.id};
    } catch (error: unknown) {
      console.error("Error getting/creating customer:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

// Get payment methods for a customer
export const getPaymentMethods = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {userId} = request.data;

    if (!userId || request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "Invalid user ID"
      );
    }

    try {
      // Query user by authUserId field (document IDs are name-based)
      const usersQuery = await db.collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        return {paymentMethods: []};
      }

      const userDoc = usersQuery.docs[0];
      const userData = userDoc.data();

      if (!userData?.stripeCustomerId) {
        return {paymentMethods: []};
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: userData.stripeCustomerId,
        type: "card",
      });

      return {
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        })),
      };
    } catch (error: unknown) {
      console.error("Error getting payment methods:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

// Get payment methods for any user (admin only)
export const getPaymentMethodsForUser = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {userId} = request.data;

    if (!userId) {
      throw new HttpsError(
        "invalid-argument",
        "User ID is required"
      );
    }

    try {
      // Check if caller is admin - query by authUserId field
      const callerQuery = await db.collection("users")
        .where("authUserId", "==", request.auth.uid)
        .limit(1)
        .get();

      if (callerQuery.empty) {
        throw new HttpsError("permission-denied", "Caller not found");
      }

      const callerData = callerQuery.docs[0].data();

      if (!callerData?.isAdmin && !callerData?.isOwner) {
        throw new HttpsError(
          "permission-denied",
          "Only admins can view other users' payment methods"
        );
      }

      // Query target user by authUserId field
      const userQuery = await db.collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      if (userQuery.empty) {
        return {paymentMethods: []};
      }

      const userData = userQuery.docs[0].data();

      if (!userData?.stripeCustomerId) {
        return {paymentMethods: []};
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: userData.stripeCustomerId,
        type: "card",
      });

      return {
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        })),
      };
    } catch (error: unknown) {
      console.error("Error getting payment methods for user:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

// Confirm admin payment and optionally save payment method
export const confirmAdminPayment = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, userId, paymentIntentId, saveCard} = request.data;

    if (!orgId || !userId || !paymentIntentId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // Verify admin access
      const memberDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("orgMembers")
        .doc(request.auth.uid)
        .get();

      const memberData = memberDoc.data();
      if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
        throw new HttpsError(
          "permission-denied",
          "Only owners and admins can confirm payments"
        );
      }

      // Get organization's Stripe key
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
      const orgStripe = new Stripe(stripeData.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Retrieve the payment intent
      const paymentIntent = await orgStripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        throw new HttpsError(
          "failed-precondition",
          `Payment has not succeeded. Status: ${paymentIntent.status}`
        );
      }

      // If saveCard is true and payment has a payment method, save it to user's wallet
      if (saveCard && paymentIntent.payment_method) {
        const paymentMethodId = typeof paymentIntent.payment_method === "string" ?
          paymentIntent.payment_method :
          paymentIntent.payment_method.id;

        // Check if user has stripeCustomerId
        const userDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userId)
          .get();

        const userData = userDoc.data();
        const customerId = userData?.stripeCustomerId;

        if (customerId) {
          // Remove all existing payment methods before adding the new one
          // This ensures only one card is kept on file per user
          try {
            const existingMethods = await orgStripe.paymentMethods.list({
              customer: customerId,
              type: "card",
            });

            console.log(`🗑️ Removing ${existingMethods.data.length} existing payment method(s) for customer ${customerId}`);

            for (const method of existingMethods.data) {
              try {
                await orgStripe.paymentMethods.detach(method.id);
                console.log(`✅ Detached payment method ${method.id}`);
              } catch (detachError) {
                console.error(`⚠️ Failed to detach payment method ${method.id}:`, detachError);
                // Continue removing others even if one fails
              }
            }
          } catch (listError) {
            console.error("⚠️ Failed to list existing payment methods:", listError);
            // Continue with attaching new card even if removal fails
          }

          // Attach new payment method to customer (this saves it to their wallet)
          await orgStripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
          });

          console.log(`✅ Payment method ${paymentMethodId} saved to customer ${customerId}`);
        } else {
          console.log(`⚠️ User ${userId} doesn't have a Stripe customer ID yet`);
        }
      }

      console.log(`✅ Admin payment confirmed: ${paymentIntentId}`);

      return {
        success: true,
        paymentIntentId: paymentIntentId,
      };
    } catch (error: unknown) {
      console.error("❌ Error confirming admin payment:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to confirm payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Detach (remove) a payment method
export const detachPaymentMethod = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {userId, paymentMethodId} = request.data;

    if (!userId || request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "Invalid user ID"
      );
    }

    try {
      await stripe.paymentMethods.detach(paymentMethodId);
      return {success: true};
    } catch (error: unknown) {
      console.error("Error detaching payment method:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

// ============================================================================
// ADMIN PAYMENT PROCESSING
// ============================================================================

interface AdminChargeData {
  clientId: string;
  amount: number; // in cents
  description?: string;
  saveCard?: boolean;
}

/**
 * Admin function to charge a client's card
 * Requires admin permissions
 */
export const adminChargeClient = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {clientId, amount, description, saveCard} = request.data;

    if (!clientId || !amount || amount < 50) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields or amount too small (minimum $0.50)"
      );
    }

    try {
      // Check if requesting user is admin
      const adminDoc = await db.collection("users").doc(request.auth.uid).get();
      const adminData = adminDoc.data();

      if (!adminData?.isAdmin) {
        throw new HttpsError(
          "permission-denied",
          "Admin access required"
        );
      }

      // Get client information
      const clientDoc = await db.collection("users").doc(clientId).get();
      if (!clientDoc.exists) {
        throw new HttpsError(
          "not-found",
          "Client not found"
        );
      }

      const clientData = clientDoc.data();
      if (!clientData) {
        throw new HttpsError(
          "not-found",
          "Client data not found"
        );
      }

      // Create or get Stripe customer
      let customerId = clientData.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: clientData.emailAddress || "",
          name: `${clientData.firstName || ""} ${clientData.lastName || ""}`,
          metadata: {
            userId: clientId,
            orgId: clientData.orgId || "",
          },
        });

        customerId = customer.id;

        // Save customer ID to Firestore
        await db.collection("users").doc(clientId).update({
          stripeCustomerId: customerId,
        });
      }

      // Create payment intent
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: "usd",
        customer: customerId,
        metadata: {
          clientId,
          adminId: request.auth.uid,
          adminCharge: "true",
          description: description || "Admin charge",
        },
        description: description || "Admin payment",
      };

      if (saveCard) {
        paymentIntentData.setup_future_usage = "off_session";
      }

      const paymentIntent = await stripe.paymentIntents.create(
        paymentIntentData
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId,
      };
    } catch (error: unknown) {
      console.error("Error creating admin charge:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

interface AdminConfirmChargeData {
  paymentIntentId: string;
  clientId: string;
  amount: number;
  description?: string;
}

/**
 * Confirm payment and create transaction record
 */
export const adminConfirmCharge = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {paymentIntentId, clientId, amount, description} = request.data;

    if (!paymentIntentId || !clientId || !amount) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // Check if requesting user is admin
      const adminDoc = await db.collection("users").doc(request.auth.uid).get();
      const adminData = adminDoc.data();

      if (!adminData?.isAdmin) {
        throw new HttpsError(
          "permission-denied",
          "Admin access required"
        );
      }

      // Retrieve payment intent to verify success
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        throw new HttpsError(
          "failed-precondition",
          "Payment has not succeeded"
        );
      }

      // Get client data for orgId
      const clientDoc = await db.collection("users").doc(clientId).get();
      const clientData = clientDoc.data();

      // Create transaction record
      const transactionData = {
        clientId,
        adminId: request.auth.uid,
        amount,
        currency: "usd",
        description: description || "Admin payment",
        stripePaymentIntentId: paymentIntentId,
        status: "succeeded",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        orgId: clientData?.orgId || "",
        type: "admin_charge",
      };

      const transactionRef = await db
        .collection("transactions")
        .add(transactionData);

      // If payment method was attached, save it to client's payment methods
      if (paymentIntent.payment_method) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method as string
        );

        if (paymentMethod.card) {
          await db
            .collection("users")
            .doc(clientId)
            .collection("paymentMethods")
            .doc(paymentMethod.id)
            .set({
              stripePaymentMethodId: paymentMethod.id,
              last4: paymentMethod.card.last4,
              brand: paymentMethod.card.brand,
              expiryMonth: paymentMethod.card.exp_month,
              expiryYear: paymentMethod.card.exp_year,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
      }

      return {
        success: true,
        transactionId: transactionRef.id,
      };
    } catch (error: unknown) {
      console.error("Error confirming admin charge:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);
