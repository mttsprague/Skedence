import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const stripe = new Stripe(stripeSecretKey);

const db = admin.firestore();

/**
 * Helper function to check if user is an admin of the organization
 * Checks orgMembers collection for admin role
 */
async function isUserAdmin(userId: string, orgId: string): Promise<boolean> {
  try {
    // Query by authUserId field (orgMembers docs use trainerId_orgId format)
    const memberQuery = await db.collection('orgMembers')
      .where('authUserId', '==', userId)
      .where('orgId', '==', orgId)
      .limit(1)
      .get();
    
    if (memberQuery.empty) {
      return false;
    }
    
    const memberData = memberQuery.docs[0].data();
    return memberData?.role === 'admin' && memberData?.isActive === true;
  } catch (error) {
    logger.error(`Error checking admin status for user ${userId} in org ${orgId}:`, error);
    return false;
  }
}

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
export const createConnectAccount = onCall(
  { enforceAppCheck: false }, // Temporarily disabled to match createOrganizationFromWeb
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId, email, businessName} = request.data;

    const missingConnectFields = [];
    if (!orgId) missingConnectFields.push("orgId");
    if (!email) missingConnectFields.push("email");
    if (!businessName) missingConnectFields.push("businessName");
    if (missingConnectFields.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        `Missing required fields: ${missingConnectFields.join(", ")}`
      );
    }

    try {
      // Verify user is admin of this organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Check if user is an admin via orgMembers
      const userIsAdmin = await isUserAdmin(request.auth.uid, orgId);
      if (!userIsAdmin) {
        throw new HttpsError(
          "permission-denied",
          "You must be an admin of this organization"
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
      // Also save platform publishable key for client-side payments
      const platformPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      const updateData: any = {
        "stripe.connectAccountId": account.id,
        "stripe.onboardingComplete": false,
        "stripe.chargesEnabled": false,
        "stripe.payoutsEnabled": false,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      };

      if (platformPublishableKey) {
        updateData["stripe.publishableKey"] = platformPublishableKey;
      } else {
        console.warn("⚠️ STRIPE_PUBLISHABLE_KEY not set in environment");
      }

      await db.collection("organizations").doc(orgId).update(updateData);

      return {
        success: true,
        accountId: account.id,
      };
    } catch (error: unknown) {
      console.error("Error creating Connect account:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
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
export const createConnectAccountLink = onCall(
  { enforceAppCheck: false }, // Temporarily disabled to match createOrganizationFromWeb
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      // Get organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Check if user is an admin via orgMembers
      const userIsAdmin = await isUserAdmin(request.auth.uid, orgId);
      if (!userIsAdmin) {
        throw new HttpsError(
          "permission-denied",
          "You must be an admin of this organization"
        );
      }

      const connectAccountId = orgData.stripe?.connectAccountId;
      if (!connectAccountId) {
        throw new HttpsError(
          "failed-precondition",
          "No Connect account exists for this organization"
        );
      }

      // Create account link for onboarding
      // After completing onboarding, Stripe redirects to our hosted page
      // which then redirects to the deep link to return to the app
      const redirectUrl = `https://skedence.com/stripe-redirect?orgId=${orgId}`;
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
      throw new HttpsError("internal", message);
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
export const refreshConnectAccountStatus = onCall(
  { enforceAppCheck: false }, // Temporarily disabled to match createOrganizationFromWeb
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {orgId} = request.data;

    if (!orgId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing orgId"
      );
    }

    try {
      // Get organization
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      // Check if user is an admin via orgMembers
      const userIsAdmin = await isUserAdmin(request.auth.uid, orgId);
      if (!userIsAdmin) {
        throw new HttpsError(
          "permission-denied",
          "You must be an admin of this organization"
        );
      }

      const connectAccountId = orgData.stripe?.connectAccountId;
      if (!connectAccountId) {
        throw new HttpsError(
          "failed-precondition",
          "No Connect account exists for this organization"
        );
      }

      // Fetch account from Stripe
      const account = await stripe.accounts.retrieve(connectAccountId);

      // Get platform publishable key from environment
      const platformPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      if (!platformPublishableKey) {
        console.warn("⚠️ STRIPE_PUBLISHABLE_KEY not set in environment");
      }

      // Update organization with latest status
      const updateData: any = {
        "stripe.chargesEnabled": account.charges_enabled,
        "stripe.payoutsEnabled": account.payouts_enabled,
        "stripe.onboardingComplete": account.details_submitted,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add publishable key if available (platform key used for all Connect payments)
      if (platformPublishableKey) {
        updateData["stripe.publishableKey"] = platformPublishableKey;
      }

      await db.collection("organizations").doc(orgId).update(updateData);

      return {
        success: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.details_submitted,
      };
    } catch (error: unknown) {
      console.error("Error refreshing account status:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
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
  pricingTierId?: string; // NEW: Tier ID for trainer-specific pricing
  pricingTierName?: string; // NEW: Tier name for display
  pricePerLesson?: number; // Price per lesson in cents (converted to dollars for display)
  lessonCount?: number; // Number of lessons in the package
  expirationDays?: number; // Days until package expires
  packageCategory?: string; // e.g. "oneAthlete", "classPass"
  packageName?: string; // Display name of the package
}

/**
 * Create payment intent with Stripe Connect
 * Routes payment to business's connected account
 * Platform takes application fee
 */
export const createPaymentIntentConnect = onCall(
  { enforceAppCheck: false }, // Temporarily disabled until AppCheck is configured for production
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    const {orgId, packageType, amount, trainerId, userId, pricingTierId, pricingTierName, pricePerLesson, lessonCount, expirationDays, packageCategory, packageName} = request.data;

    const missingFields = [];
    if (!orgId) missingFields.push("orgId");
    if (!packageType) missingFields.push("packageType");
    if (!amount) missingFields.push("amount");
    if (!userId) missingFields.push("userId");
    // trainerId is optional (web purchases don't require trainer selection)

    if (missingFields.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    try {
      // Get organization's Stripe Connect account
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      const connectAccountId = orgData.stripe?.connectAccountId;
      if (!connectAccountId) {
        throw new HttpsError(
          "failed-precondition",
          "Organization has not connected Stripe account"
        );
      }

      if (!orgData.stripe?.chargesEnabled) {
        throw new HttpsError(
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
        throw new HttpsError(
          "invalid-argument",
          `Invalid package type or amount. Expected ${validPackages[packageType]} for ${packageType}, got ${amount}`
        );
      }

      // Calculate platform application fee (3% of payment)
      const applicationFeeAmount = Math.round(amount * 0.03);

      // Check if user has a Stripe customer ID
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      // Verify the authenticated user owns this user document
      if (!userData || userData.authUserId !== request.auth.uid) {
        throw new HttpsError(
          "permission-denied",
          "User ID does not match authenticated user"
        );
      }

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
          // NEW: Tier pricing fields
          pricing_tier_id: pricingTierId || "",
          pricing_tier_name: pricingTierName || "",
          price_per_lesson: pricePerLesson ? (pricePerLesson / 100).toFixed(2) : "",
          // Package fulfillment fields (used by confirmConnectPayment to create the package)
          lesson_count: (lessonCount ?? 1).toString(),
          expiration_days: (expirationDays ?? 365).toString(),
          package_category: packageCategory || "",
          package_display_name: packageName || packageDisplayName,
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
      if (error instanceof HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", message);
    }
  }
);

/**
 * Confirm a completed Stripe Connect payment and create the lesson package in Firestore.
 * Called by the web client after stripe.confirmCardPayment succeeds.
 */
export const confirmConnectPayment = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in");
    }

    const { paymentIntentId, userId } = request.data as { paymentIntentId: string; userId: string };

    if (!paymentIntentId || !userId) {
      throw new HttpsError("invalid-argument", "Missing paymentIntentId or userId");
    }

    // Verify payment intent succeeded on Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      throw new HttpsError("failed-precondition", `Payment not yet succeeded (status: ${paymentIntent.status})`);
    }

    const meta = paymentIntent.metadata;
    const orgId = meta.org_id;
    const packageType = meta.package_type;

    if (!orgId || !packageType) {
      throw new HttpsError("internal", "Payment intent missing required metadata");
    }

    // Check this payment hasn't already been fulfilled (idempotency)
    const existing = await db
      .collection("organizations").doc(orgId)
      .collection("users").doc(userId)
      .collection("packages")
      .where("transactionId", "==", paymentIntentId)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`⚠️ Package already created for paymentIntentId ${paymentIntentId} — returning existing`);
      return { success: true, packageId: existing.docs[0].id };
    }

    // Verify requester owns this user doc
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData || userData.authUserId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "User ID does not match authenticated user");
    }

    const lessonCount = parseInt(meta.lesson_count || "1", 10);
    const expirationDays = parseInt(meta.expiration_days || "365", 10);
    const now = admin.firestore.Timestamp.now();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);

    const packageData: Record<string, unknown> = {
      packageType,
      packageCategory: meta.package_category || "",
      packageName: meta.package_display_name || meta.package_name || packageType,
      totalLessons: lessonCount,
      lessonsUsed: 0,
      remainingLessons: lessonCount,
      amountPaid: paymentIntent.amount,
      purchaseDate: now,
      expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
      transactionId: paymentIntentId,
      orgId,
      source: "web",
    };

    const ref = await db
      .collection("organizations").doc(orgId)
      .collection("users").doc(userId)
      .collection("packages")
      .add(packageData);

    console.log(`✅ Package created at organizations/${orgId}/users/${userId}/packages/${ref.id}`);
    return { success: true, packageId: ref.id };
  }
);
