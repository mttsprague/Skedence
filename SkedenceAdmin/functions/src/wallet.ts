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

      console.log(`🔍 Setting up payment method for user ${userId}`);

      // Get user data from correct location
      const userDoc = await db
        .collection("users")
        .doc(userId)
        .get();

      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;

      console.log(`📋 User data found, stripeCustomerId: ${customerId || "none"}`);

      // Get or create Stripe customer
      if (!customerId) {
        console.log("🆕 No customer ID, creating new customer");
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
        console.log(`✅ Created new Stripe customer: ${customerId}`);

        // Save customer ID
        await db
          .collection("users")
          .doc(userId)
          .update({
            stripeCustomerId: customerId,
          });
        console.log("✅ Saved new customer ID to user document");
      } else {
        // Verify customer exists in this Stripe account
        try {
          await stripe.customers.retrieve(customerId);
          console.log(`✅ Verified customer ${customerId} exists in Stripe account`);
        } catch (error: any) {
          if (error.code === "resource_missing") {
            console.log(`⚠️ Customer ${customerId} not found in this Stripe account, creating new one`);
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
            console.log(`✅ Created new Stripe customer: ${customerId}`);

            // Update with new customer ID
            await db
              .collection("users")
              .doc(userId)
              .update({
                stripeCustomerId: customerId,
              });
            console.log("✅ Updated customer ID in user document");
          } else {
            throw error;
          }
        }
      }

      // Create setup intent
      console.log(`🔧 Creating setup intent for customer ${customerId}`);
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
      console.log(`🔍 Getting payment methods for user ${userId} in org ${orgId}`);

      // Get organization's Stripe keys
      const stripeDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("stripe")
        .doc("config")
        .get();

      if (!stripeDoc.exists) {
        console.error(`❌ No Stripe config found for org ${orgId}`);
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured - please configure in admin app"
        );
      }

      const stripeData = stripeDoc.data();
      console.log(`✅ Found Stripe config for org ${orgId}`);

      if (!stripeData?.secretKey || !stripeData?.publishableKey) {
        console.error(`❌ Stripe keys missing: secretKey=${!!stripeData?.secretKey}, publishableKey=${!!stripeData?.publishableKey}`);
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured properly"
        );
      }

      console.log(`✅ Stripe keys valid for org ${orgId}`);

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

      console.log(`📋 User data found, stripeCustomerId: ${customerId || "none"}`);

      // If no customer ID, create one
      if (!customerId) {
        console.log(`🔧 Creating new Stripe customer for user ${userId}`);
        const email = userData.email || request.auth.token.email;
        const name = userData.name || userData.firstName || "Customer";

        console.log(`📧 Customer email: ${email}, name: ${name}`);

        const customer = await stripe.customers.create({
          email: email,
          name: name,
          metadata: {orgId, userId},
        });

        customerId = customer.id;

        console.log(`✅ Created Stripe customer: ${customerId}`);

        // Save customer ID
        await db.collection("users").doc(userId).update({
          stripeCustomerId: customerId,
        });

        console.log("✅ Saved customer ID to user document");
      }

      // Get payment methods - handle case where customer doesn't exist
      console.log(`🔍 Listing payment methods for customer: ${customerId}`);
      let paymentMethods;
      try {
        paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });
      } catch (error: any) {
        // If customer doesn't exist in this Stripe account, create a new one
        if (error.code === "resource_missing" && customerId) {
          console.log(`⚠️ Customer ${customerId} not found in this Stripe account, creating new one`);

          const email = userData.email || request.auth.token.email;
          const name = userData.name || userData.firstName || "Customer";

          const customer = await stripe.customers.create({
            email: email,
            name: name,
            metadata: {orgId, userId},
          });

          customerId = customer.id;
          console.log(`✅ Created new Stripe customer: ${customerId}`);

          // Save new customer ID
          await db.collection("users").doc(userId).update({
            stripeCustomerId: customerId,
          });

          console.log("✅ Saved new customer ID to user document");

          // Try listing payment methods again with new customer
          paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });
        } else {
          throw error;
        }
      }

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

/**
 * Get payment methods for any user (admin only)
 * Allows admins to view client payment methods for processing payments
 */
export const getPaymentMethodsDirectAdmin = functions.https.onCall(
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

    try {
      // Verify admin access
      console.log(`🔍 Checking admin permissions for ${request.auth.uid} in org ${orgId}`);

      const memberDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("orgMembers")
        .doc(request.auth.uid)
        .get();

      const memberData = memberDoc.data();

      console.log(`📋 Member doc exists: ${memberDoc.exists}`);
      console.log("📋 Member data:", memberData);
      console.log(`📋 Member role: ${memberData?.role}`);

      if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
        console.error(`❌ Permission denied - exists: ${memberDoc.exists}, role: ${memberData?.role || "none"}`);
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only owners and admins can view client payment methods"
        );
      }

      console.log(`✅ Admin ${request.auth.uid} (${memberData.role}) getting payment methods for user ${userId} in org ${orgId}`);

      // Get organization's Stripe keys
      const stripeDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("stripe")
        .doc("config")
        .get();

      if (!stripeDoc.exists) {
        console.error(`❌ No Stripe config found for org ${orgId}`);
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured - please configure in admin app"
        );
      }

      const stripeData = stripeDoc.data();
      console.log(`✅ Found Stripe config for org ${orgId}`);

      if (!stripeData?.secretKey || !stripeData?.publishableKey) {
        console.error(`❌ Stripe keys missing: secretKey=${!!stripeData?.secretKey}, publishableKey=${!!stripeData?.publishableKey}`);
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization Stripe keys not configured properly"
        );
      }

      console.log(`✅ Stripe keys valid for org ${orgId}`);

      // Initialize Stripe with organization's key
      const stripe = new Stripe(stripeData.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Get user data from root users collection
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;

      console.log(`📋 User data found, stripeCustomerId: ${customerId || "none"}`);

      // If no customer ID, create one
      if (!customerId) {
        console.log(`🔧 Creating new Stripe customer for user ${userId}`);
        const email = userData?.email;
        const name = userData?.firstName && userData?.lastName ?
          `${userData.firstName} ${userData.lastName}` :
          userData?.firstName || "Customer";

        console.log(`📧 Customer email: ${email}, name: ${name}`);

        const customer = await stripe.customers.create({
          email: email || undefined,
          name: name,
          metadata: {orgId, userId},
        });

        customerId = customer.id;

        console.log(`✅ Created Stripe customer: ${customerId}`);

        // Save customer ID
        await db.collection("users").doc(userId).set({
          stripeCustomerId: customerId,
        }, {merge: true});

        console.log("✅ Saved customer ID to user document");
      }

      // Get payment methods - handle case where customer doesn't exist
      console.log(`🔍 Listing payment methods for customer: ${customerId}`);
      let paymentMethods;
      try {
        paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });
      } catch (error: any) {
        // If customer doesn't exist in this Stripe account, create a new one
        if (error.code === "resource_missing" && customerId) {
          console.log(`⚠️ Customer ${customerId} not found in this Stripe account, creating new one`);

          const email = userData?.email;
          const name = userData?.firstName && userData?.lastName ?
            `${userData.firstName} ${userData.lastName}` :
            userData?.firstName || "Customer";

          const customer = await stripe.customers.create({
            email: email || undefined,
            name: name,
            metadata: {orgId, userId},
          });

          customerId = customer.id;
          console.log(`✅ Created new Stripe customer: ${customerId}`);

          // Save new customer ID
          await db.collection("users").doc(userId).set({
            stripeCustomerId: customerId,
          }, {merge: true});

          console.log("✅ Saved new customer ID to user document");

          // Try listing payment methods again with new customer
          paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });
        } else {
          throw error;
        }
      }

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
      console.error("❌ Error getting payment methods (admin):", error);

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
