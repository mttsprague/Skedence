import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ||
  functions.config().stripe?.secret_key || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

const db = admin.firestore();

/**
 * STEP 8: Stripe Connect Functions
 *
 * These functions enable multi-tenant payment routing:
 * - Each business has their own Stripe Connect account
 * - Platform takes application fees
 * - Payments go directly to business owners
 */

// ============================================================================
// STRIPE CONNECT ONBOARDING
// ============================================================================

interface CreateConnectAccountData {
  orgId: string;
  email: string;
  businessName: string;
}

/**
 * Create a Stripe Connect account for a business
 * Called during organization onboarding
 */
export const createConnectAccount = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateConnectAccountData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, email, businessName} = request.data;

    if (!orgId || !email || !businessName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // Verify user is owner of this organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      // Create Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        email,
        business_type: "individual",
        metadata: {
          orgId,
          firebaseUID: request.auth.uid,
          businessName,
        },
        capabilities: {
          card_payments: {requested: true},
          transfers: {requested: true},
        },
      });

      // Update organization with Connect account ID
      await db.collection("organizations").doc(orgId).update({
        "stripe.connectAccountId": account.id,
        "stripe.onboardingComplete": false,
        "stripe.chargesEnabled": false,
        "stripe.payoutsEnabled": false,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        accountId: account.id,
      };
    } catch (error: unknown) {
      console.error("Error creating Connect account:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

interface CreateAccountLinkData {
  orgId: string;
}

/**
 * Generate onboarding link for Stripe Connect account
 * Returns URL for business owner to complete Stripe setup
 */
export const createConnectAccountLink = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateAccountLinkData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      // Get organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      const connectAccountId = orgData.stripe?.connectAccountId;
      if (!connectAccountId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No Connect account exists for this organization"
        );
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: connectAccountId,
        refresh_url: `https://your-app.com/onboarding/refresh?orgId=${orgId}`,
        return_url: `https://your-app.com/onboarding/complete?orgId=${orgId}`,
        type: "account_onboarding",
      });

      return {
        url: accountLink.url,
      };
    } catch (error: unknown) {
      console.error("Error creating account link:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

interface RefreshConnectAccountData {
  orgId: string;
}

/**
 * Refresh Connect account status from Stripe
 * Updates charges_enabled, payouts_enabled, onboarding_complete
 */
export const refreshConnectAccountStatus = functions.https.onCall(
  async (request: functions.https.CallableRequest<RefreshConnectAccountData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      // Get organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData || orgData.ownerUserId !== request.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You must be the organization owner"
        );
      }

      const connectAccountId = orgData.stripe?.connectAccountId;
      if (!connectAccountId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No Connect account exists for this organization"
        );
      }

      // Fetch account from Stripe
      const account = await stripe.accounts.retrieve(connectAccountId);

      // Update organization with latest status
      await db.collection("organizations").doc(orgId).update({
        "stripe.chargesEnabled": account.charges_enabled,
        "stripe.payoutsEnabled": account.payouts_enabled,
        "stripe.onboardingComplete": account.details_submitted,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.details_submitted,
      };
    } catch (error: unknown) {
      console.error("Error refreshing account status:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);

// ============================================================================
// PAYMENT PROCESSING WITH CONNECT
// ============================================================================

interface CreatePaymentIntentConnectData {
  orgId: string; // NEW: Organization receiving payment
  packageType: string;
  amount: number;
  trainerId: string;
  userId: string;
}

/**
 * Create payment intent with Stripe Connect
 * Routes payment to business's connected account
 * Platform takes application fee
 */
export const createPaymentIntentConnect = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<CreatePaymentIntentConnectData>
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
      // Get organization's Stripe Connect account
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const connectAccountId = orgData.stripe?.connectAccountId;
      if (!connectAccountId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization has not connected Stripe account"
        );
      }

      if (!orgData.stripe?.chargesEnabled) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Organization's Stripe account is not ready to accept payments"
        );
      }

      // Validate package amount
      const validPackages: { [key: string]: number } = {
        single: 8000, // $80
        five_pack: 37500, // $375
        ten_pack: 70000, // $700
        two_athlete: 14000, // $140
        three_athlete: 18000, // $180
        class_pass: 4500, // $45
      };

      if (!validPackages[packageType] || validPackages[packageType] !== amount) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid package type or amount"
        );
      }

      // Calculate platform application fee (5% of payment)
      const applicationFeeAmount = Math.round(amount * 0.05);

      // Check if user has a Stripe customer ID
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: "usd",
        metadata: {
          userId,
          orgId,
          packageType,
          trainerId,
          applicationFeeAmount: applicationFeeAmount.toString(),
        },
        description: `${packageType.replace("_", " ")} lesson package`,
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectAccountId,
        },
      };

      // If user has a customer ID, attach it
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
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);
