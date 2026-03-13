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
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
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
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
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
      // Query by authUserId field (orgMembers docs use trainerId_orgId format)
      const memberQuery = await db
        .collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", orgId)
        .limit(1)
        .get();

      if (memberQuery.empty) {
        throw new HttpsError(
          "permission-denied",
          "You are not a member of this organization"
        );
      }

      const memberDoc = memberQuery.docs[0];
      const memberData = memberDoc.data();


      if (memberData.role !== "owner" && memberData.role !== "admin") {
        logger.error(`❌ Permission denied - role: ${memberData?.role || "none"}`);
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
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
      });

      // Query user by authUserId field (dual-path query pattern)
      // First try organizations/{orgId}/users subcollection
      let usersQuery = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();
      
      let userDoc = usersQuery.docs[0];
      let userData = userDoc?.data();

      // Fallback to legacy root users collection if not found
      if (!userData) {
        usersQuery = await db
          .collection("users")
          .where("authUserId", "==", userId)
          .limit(1)
          .get();
        
        userDoc = usersQuery.docs[0];
        userData = userDoc?.data();
      }

      if (!userData || !userDoc) {
        throw new HttpsError("not-found", "User not found");
      }

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


        // Save customer ID using document reference from query
        await userDoc.ref.set({
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

          // Save new customer ID using document reference
          await userDoc.ref.set({
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
 * Create Stripe customer for a user (admin only)
 * Used when adding new payment methods
 */
export const createStripeCustomer = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {userId, orgId} = request.data;

    if (!userId || !orgId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing userId or orgId"
      );
    }

    try {
      // Verify admin/trainer permissions
      const memberQuery = await db.collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", orgId)
        .get();

      if (memberQuery.empty) {
        throw new HttpsError(
          "permission-denied",
          "Not a member of this organization"
        );
      }

      const memberData = memberQuery.docs[0].data();
      const role = memberData.role;

      if (!["owner", "admin", "trainer"].includes(role)) {
        throw new HttpsError(
          "permission-denied",
          "Must be owner, admin, or trainer"
        );
      }

      // Get Stripe config
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      if (!orgDoc.exists) {
        throw new HttpsError("not-found", "Organization not found");
      }

      const orgData = orgDoc.data();
      const stripeSecretKey = orgData?.stripe?.secretKey;

      if (!stripeSecretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Stripe not configured for this organization"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        // apiVersion: "2024-11-20" // Using SDK default
      });

      // Query user by userId
      let userDocRef = db.collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId);
      let userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        userDocRef = db.collection("users").doc(userId);
        userDoc = await userDocRef.get();
      }

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();

      // Check if customer already exists
      if (userData?.stripeCustomerId) {
        return {customerId: userData.stripeCustomerId};
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userData?.email || userData?.emailAddress,
        metadata: {
          userId: userId,
          orgId: orgId,
        },
      });

      // Update user document
      await userDocRef.update({
        stripeCustomerId: customer.id,
      });

      logger.info(`✅ Created Stripe customer for user ${userId}: ${customer.id}`);

      return {customerId: customer.id};
    } catch (error) {
      logger.error("❌ Error creating Stripe customer:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to create customer: ${error instanceof Error ? error.message : "Unknown error"}`
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
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
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
 * Detach/remove a payment method (admin only)
 * Used by admin portal card management
 */
export const adminDetachPaymentMethod = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {paymentMethodId, userId, orgId} = request.data;

    if (!paymentMethodId || !userId || !orgId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing paymentMethodId, userId, or orgId"
      );
    }

    try {
      // Verify admin/trainer permissions via orgMembers
      const memberQuery = await db.collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", orgId)
        .get();

      if (memberQuery.empty) {
        throw new HttpsError(
          "permission-denied",
          "Not a member of this organization"
        );
      }

      const memberDoc = memberQuery.docs[0];
      const memberData = memberDoc.data();
      const role = memberData.role;

      if (!["owner", "admin", "trainer"].includes(role)) {
        throw new HttpsError(
          "permission-denied",
          "Must be owner, admin, or trainer to manage client cards"
        );
      }

      // Get Stripe config
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      if (!orgDoc.exists) {
        throw new HttpsError("not-found", "Organization not found");
      }

      const orgData = orgDoc.data();
      const stripeSecretKey = orgData?.stripe?.secretKey;

      if (!stripeSecretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Stripe not configured for this organization"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        // apiVersion: "2024-11-20" // Using SDK default
      });

      // Detach payment method from customer
      await stripe.paymentMethods.detach(paymentMethodId);

      logger.info(`✅ Detached payment method ${paymentMethodId} for user ${userId}`);

      return {success: true};
    } catch (error) {
      logger.error("❌ Error detaching payment method:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to detach payment method: ${error instanceof Error ? error.message : "Unknown error"}`
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
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
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

/**
 * Admin charges client with saved card and creates pass
 * Used by admin portal passes page for paid pass assignment
 */
export const adminChargeClientWithSavedCard = onCall(
  async (request) => {
    // 1. Authentication check
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {
      userId,
      orgId,
      paymentMethodId,
      amount,
      packageType,
      packageTitle,
      quantity,
    } = request.data;

    // 2. Validate required fields
    if (!userId || !orgId || !paymentMethodId || !amount || !packageType || !packageTitle || !quantity) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // 3. Verify admin/trainer permissions via orgMembers
      const memberQuery = await db.collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", orgId)
        .get();

      if (memberQuery.empty) {
        throw new HttpsError(
          "permission-denied",
          "Not a member of this organization"
        );
      }

      const memberDoc = memberQuery.docs[0];
      const memberData = memberDoc.data();
      const role = memberData.role;

      if (!["owner", "admin", "trainer"].includes(role)) {
        throw new HttpsError(
          "permission-denied",
          "Must be owner, admin, or trainer to charge clients"
        );
      }

      // 4. Get organization Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      if (!orgDoc.exists) {
        throw new HttpsError("not-found", "Organization not found");
      }

      const orgData = orgDoc.data();
      const stripeSecretKey = orgData?.stripe?.secretKey;

      if (!stripeSecretKey) {
        throw new HttpsError(
          "failed-precondition",
          "Stripe not configured for this organization"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        // apiVersion: "2024-11-20" // Using SDK default
      });

      // 5. Query user by userId (which is authUserId)
      // Try organizations path first
      let userDocRef = db.collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId);
      let userDoc = await userDocRef.get();

      // Fallback to root users collection if not found
      if (!userDoc.exists) {
        userDocRef = db.collection("users").doc(userId);
        userDoc = await userDocRef.get();
      }

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      let stripeCustomerId = userData?.stripeCustomerId;

      // 6. Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: userData?.email || userData?.emailAddress,
          metadata: {
            userId: userId,
            orgId: orgId,
          },
        });
        stripeCustomerId = customer.id;

        // Update user document with customer ID
        await userDocRef.update({
          stripeCustomerId: stripeCustomerId,
        });

        logger.info(`✅ Created Stripe customer for user ${userId}: ${stripeCustomerId}`);
      }

      // 7. Create PaymentIntent with saved card
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        description: `${packageTitle} (${quantity}x) - Admin assigned`,
        confirm: true,
        off_session: true,
        metadata: {
          userId: userId,
          orgId: orgId,
          packageType: packageType,
          quantity: quantity.toString(),
          adminAssigned: "true",
        },
      });

      if (paymentIntent.status !== "succeeded") {
        throw new HttpsError(
          "internal",
          `Payment failed with status: ${paymentIntent.status}`
        );
      }

      logger.info(`✅ Payment succeeded: ${paymentIntent.id} for $${amount / 100}`);

      // 8. Create pass in standard path
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 6); // 6 months expiration

      const passData = {
        packageType: packageType,
        packageCategory: packageType.includes("athlete") ? packageType : "pass",
        packageName: packageTitle,
        totalLessons: quantity,
        lessonsUsed: 0,
        remainingLessons: quantity,
        purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
        transactionId: paymentIntent.id,
        amountPaid: amount,
        orgId: orgId,
      };

      const packageRef = await db.collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .collection("packages")
        .add(passData);

      logger.info(`✅ Created pass ${packageRef.id} for user ${userId}`);

      return {
        success: true,
        transactionId: paymentIntent.id,
        packageId: packageRef.id,
      };
    } catch (error) {
      logger.error("❌ Error in adminChargeClientWithSavedCard:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to charge client: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
