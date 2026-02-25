import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const db = admin.firestore();

/**
 * Create a setup intent to add payment method without immediate charge
 * Used for "Add Card to Wallet" functionality
 */
export const createSetupIntentDirect = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, userId} = request.data;

    if (!orgId || !userId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing orgId or userId"
      );
    }

    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {
      // Get organization and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      if (!orgData.stripe?.secretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });


      // Get user data from correct location
      const userDoc = await db
        .collection("users")
        .doc(userId)
        .get();

      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;


      // Get or create Stripe customer
      if (!customerId) {
        const customerName = userData?.firstName && userData?.lastName ?
          `${userData.firstName} ${userData.lastName}` :
          "Customer";
        const customer = await stripe.customers.create({
          email: userData?.email || undefined,
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
          .collection("users")
          .doc(userId)
          .update({
            stripeCustomerId: customerId,
          });
      } else {
        // Verify customer exists in this Stripe account
        try {
          await stripe.customers.retrieve(customerId);
        } catch (error: any) {
          if (error.code === "resource_missing") {
            const customerName = userData?.firstName && userData?.lastName ?
              `${userData.firstName} ${userData.lastName}` :
              (userData?.firstName || "Customer");
            const customer = await stripe.customers.create({
              email: userData?.email || undefined,
              name: `Skedence: ${customerName} (${userId.slice(-4)})`,
              description: `Customer ID: ${userId}`,
              metadata: {
                userId: userId,
                orgId: orgId,
              },
            });

            customerId = customer.id;

            // Update with new customer ID
            await db
              .collection("users")
              .doc(userId)
              .update({
                stripeCustomerId: customerId,
              });
          } else {
            throw error;
          }
        }
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


      return {
        clientSecret: setupIntent.client_secret,
        publishableKey: orgData.stripe.publishableKey,
      };
    } catch (error: unknown) {
      logger.error("❌ Error creating setup intent:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to create setup intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Get payment methods for a customer using organization's Stripe account
 */
export const getPaymentMethodsDirect = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, userId} = request.data;

    if (!orgId || !userId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing orgId or userId"
      );
    }

    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    try {

      // Get organization and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();

      if (!orgDoc.exists) {
        logger.error(`❌ No organization found for ${orgId}`);
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const orgData = orgDoc.data();

      if (!orgData?.stripe?.secretKey || !orgData?.stripe?.publishableKey) {
        logger.error(`❌ Stripe keys missing: secretKey=${!!orgData?.stripe?.secretKey}, publishableKey=${!!orgData?.stripe?.publishableKey}`);
        throw new HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured - please configure in admin app"
        );
      }


      // Initialize Stripe with organization's key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Get or create customer
      // Query by authUserId field (not document ID, which is name-based)
      const usersSnapshot = await db
        .collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = usersSnapshot.docs[0].data();
      const userDocRef = usersSnapshot.docs[0].ref; // Store document reference
      let customerId = userData.stripeCustomerId;


      // If no customer ID, create one
      if (!customerId) {
        const email = userData.email || request.auth.token.email;
        const name = userData.name || userData.firstName || "Customer";


        const customer = await stripe.customers.create({
          email: email,
          name: `Skedence: ${name} (${userId.slice(-4)})`,
          description: `Customer ID: ${userId}`,
          metadata: {orgId, userId},
        });

        customerId = customer.id;


        // Save customer ID using the document reference from query
        await userDocRef.update({
          stripeCustomerId: customerId,
        });

      }

      // Get payment methods - handle case where customer doesn't exist
      let paymentMethods;
      try {
        paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });
      } catch (error: any) {
        // If customer doesn't exist in this Stripe account, create a new one
        if (error.code === "resource_missing" && customerId) {

          const email = userData.email || request.auth.token.email;
          const name = userData.name || userData.firstName || "Customer";

          const customer = await stripe.customers.create({
            email: email,
            name: `Skedence: ${name} (${userId.slice(-4)})`,
            description: `Customer ID: ${userId}`,
            metadata: {orgId, userId},
          });

          customerId = customer.id;

          // Save new customer ID
          await db.collection("users").doc(userId).update({
            stripeCustomerId: customerId,
          });


          // Try listing payment methods again with new customer
          paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });
        } else {
          throw error;
        }
      }


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
      logger.error("❌ Error getting payment methods:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to get payment methods: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Get payment methods for any user (admin only)
 * Allows admins to view client payment methods for processing payments
 */
export const getPaymentMethodsDirectAdmin = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, userId} = request.data;

    if (!orgId || !userId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing orgId or userId"
      );
    }

    try {
      // Verify admin access
      // Note: orgMembers uses a flat structure with composite key: {uid}_{orgId}
      const membershipId = `${request.auth.uid}_${orgId}`;

      const memberDoc = await db
        .collection("orgMembers")
        .doc(membershipId)
        .get();

      const memberData = memberDoc.data();


      if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
        logger.error(`❌ Permission denied - exists: ${memberDoc.exists}, role: ${memberData?.role || "none"}`);
        throw new HttpsError(
          "permission-denied",
          "Only owners and admins can view client payment methods"
        );
      }


      // Get organization and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();

      if (!orgDoc.exists) {
        logger.error(`❌ No organization found for ${orgId}`);
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const orgData = orgDoc.data();

      if (!orgData?.stripe?.secretKey || !orgData?.stripe?.publishableKey) {
        logger.error(`❌ Stripe keys missing: secretKey=${!!orgData?.stripe?.secretKey}, publishableKey=${!!orgData?.stripe?.publishableKey}`);
        throw new HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured - please configure in admin app"
        );
      }


      // Initialize Stripe with organization's key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Get user data from root users collection
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;


      // If no customer ID, create one
      if (!customerId) {
        const email = userData?.email;
        const name = userData?.firstName && userData?.lastName ?
          `${userData.firstName} ${userData.lastName}` :
          userData?.firstName || "Customer";


        const customer = await stripe.customers.create({
          email: email || undefined,
          name: `Skedence: ${name} (${userId.slice(-4)})`,
          description: `Customer ID: ${userId}`,
          metadata: {orgId, userId},
        });

        customerId = customer.id;


        // Save customer ID
        await db.collection("users").doc(userId).set({
          stripeCustomerId: customerId,
        }, {merge: true});

      }

      // Get payment methods - handle case where customer doesn't exist
      let paymentMethods;
      try {
        paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });
      } catch (error: any) {
        // If customer doesn't exist in this Stripe account, create a new one
        if (error.code === "resource_missing" && customerId) {

          const email = userData?.email;
          const name = userData?.firstName && userData?.lastName ?
            `${userData.firstName} ${userData.lastName}` :
            userData?.firstName || "Customer";

          const customer = await stripe.customers.create({
            email: email || undefined,
            name: `Skedence: ${name} (${userId.slice(-4)})`,
            description: `Customer ID: ${userId}`,
            metadata: {orgId, userId},
          });

          customerId = customer.id;

          // Save new customer ID
          await db.collection("users").doc(userId).set({
            stripeCustomerId: customerId,
          }, {merge: true});


          // Try listing payment methods again with new customer
          paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });
        } else {
          throw error;
        }
      }


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
      logger.error("❌ Error getting payment methods (admin):", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to get payment methods: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Attach a payment method to a customer
 */
export const attachPaymentMethod = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {paymentMethodId, customerId, orgId} = request.data;

    if (!paymentMethodId || !customerId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing paymentMethodId or customerId"
      );
    }

    try {
      // Get Stripe config
      let stripeSecretKey: string;

      if (orgId) {
        const orgDoc = await db.collection("organizations").doc(orgId).get();
        const orgData = orgDoc.data();
        stripeSecretKey = orgData?.stripe?.secretKey;
      } else {
        // Legacy single-tenant
        const configDoc = await db.collection("stripeConfig").doc("keys").get();
        stripeSecretKey = configDoc.data()?.secretKey;
      }

      if (!stripeSecretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Stripe not configured"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });


      return {success: true};
    } catch (error) {
      logger.error("❌ Error attaching payment method:", error);
      throw new HttpsError(
        "internal",
        `Failed to attach payment method: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Charge a customer using a saved payment method
 */
export const chargeWithSavedMethod = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {clientId, paymentMethodId, amount, description, orgId} = request.data;

    if (!clientId || !paymentMethodId || !amount) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    if (request.auth.uid !== clientId) {
      throw new HttpsError(
        "permission-denied",
        "Can only charge your own card"
      );
    }

    try {
      // Get user and Stripe customer ID
      const userDoc = await db.collection("users").doc(clientId).get();
      const stripeCustomerId = userDoc.data()?.stripeCustomerId;

      if (!stripeCustomerId) {
        throw new HttpsError(
          "failed-precondition",
          "No Stripe customer found"
        );
      }

      // Get Stripe config
      let stripeSecretKey: string;

      if (orgId) {
        const orgDoc = await db.collection("organizations").doc(orgId).get();
        const orgData = orgDoc.data();
        stripeSecretKey = orgData?.stripe?.secretKey;
      } else {
        const configDoc = await db.collection("stripeConfig").doc("keys").get();
        stripeSecretKey = configDoc.data()?.secretKey;
      }

      if (!stripeSecretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Stripe not configured"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        description,
        confirm: true,
        off_session: true,
      });


      // Record transaction
      await db.collection("transactions").add({
        userId: clientId,
        amount,
        description,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        orgId: orgId || null,
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error("❌ Error charging with saved method:", error);
      throw new HttpsError(
        "internal",
        `Failed to charge payment method: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
