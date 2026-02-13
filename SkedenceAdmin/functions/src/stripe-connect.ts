import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

const db = admin.firestore();

/**
 * STEP 8: Stripe Connect Functions
 *
 * These functions enable multi-tenant payment routing in LIVE MODE:
 * - Each business connects their own Stripe account (existing or new)
 * - Owners can sign in to existing Stripe account OR create new account
 * - Payments from clients go directly to owner's bank account via their Stripe
 * - All payments are REAL - this is production, not test mode
 * - Platform can optionally take application fees
 *
 * IMPORTANT: Make sure you're using LIVE mode keys (sk_live_...)
 *
 * How it works:
 * 1. createConnectAccount: Creates Express Connect account
 * 2. createConnectAccountLink: Generates onboarding URL for owner
 * 3. Owner completes Stripe onboarding:
 *    - Signs in to existing Stripe account OR creates new account
 *    - Connects their bank account
 *    - Verifies identity
 * 4. refreshConnectAccountStatus: Verifies setup is complete
 * 5. Real payments are processed to owner's bank account
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

      // Create Stripe Connect Express account for LIVE payments
      // This creates a connected account that the owner can claim
      // During onboarding, owner can:
      // - Sign in to their existing Stripe account
      // - Create a brand new Stripe account
      // Either way, this account will be linked to their Stripe login
      // and payments will go to THEIR bank account
      const account = await stripe.accounts.create({
        type: "express", // Express allows owners to use existing Stripe accounts
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
      // After completing onboarding, Stripe redirects to our hosted page
      // which then redirects to the deep link to return to the app
      const redirectUrl = `https://polyface-ae6d3.web.app/stripe-redirect?orgId=${orgId}`;
      const accountLink = await stripe.accountLinks.create({
        account: connectAccountId,
        refresh_url: redirectUrl,
        return_url: redirectUrl,
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

      // Load organization's pricing structure
      const validPackages: { [key: string]: number } = {};

      if (orgData.pricingStructure?.tiers) {
        // Load from dynamic pricing structure
        for (const tier of orgData.pricingStructure.tiers) {
          for (const pkg of tier.packages) {
            validPackages[pkg.packageType] = pkg.priceInCents;
          }
        }
        console.log(`✅ Loaded ${Object.keys(validPackages).length} packages from pricing structure for org ${orgId}`);
      } else {
        // Fallback to default pricing if no custom structure
        console.log("⚠️ No pricing structure found for org, using default pricing");
        validPackages.private = 8000; // $80
        validPackages["2_athlete"] = 12000; // $120
        validPackages["3_athlete"] = 16000; // $160
        validPackages.class_pass = 2000; // $20
      }

      if (!validPackages[packageType] || validPackages[packageType] !== amount) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid package type or amount. Expected ${validPackages[packageType]} for ${packageType}, got ${amount}`
        );
      }

      // Calculate platform application fee (5% of payment)
      const applicationFeeAmount = Math.round(amount * 0.05);

      // Check if user has a Stripe customer ID
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      // Create human-readable descriptions
      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      const packageNames: { [key: string]: string } = {
        "private": "Private Session (1 Athlete)",
        "2_athlete": "Private Session (2 Athletes)",
        "3_athlete": "Private Session (3 Athletes)",
        "class_pass": "Class Pass",
        "class_10_pack": "Class 10-Pack",
      };

      const packageDisplayName = packageNames[packageType] || packageType.replace("_", " ");

      // Generate transaction ID similar to Acuity format
      const transactionId = Date.now().toString();
      const purchaseDate = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: "usd",
        metadata: {
          source: "Skedence",
          user_id: userId,
          client_name: customerName,
          package_name: packageDisplayName,
          package_type: packageType,
          trainer_id: trainerId,
          org_id: orgId,
          org_name: orgData.name || orgData.businessName || "Organization",
          transaction_id: transactionId,
          purchase_date: purchaseDate,
          application_fee_amount: applicationFeeAmount.toString(),
        },
        description: `${transactionId} - ${customerName} - ${packageDisplayName} - ${purchaseDate}`,
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
