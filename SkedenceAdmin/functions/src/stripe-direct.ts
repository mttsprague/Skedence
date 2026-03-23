import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { checkRateLimit, RATE_LIMITS } from "./rateLimiter";
import { validateInput, paymentSchemas } from "./validation";

const db = admin.firestore();

interface CreatePaymentIntentDirectData {
  orgId: string;
  packageType: string;
  amount: number;
  trainerId: string;
  userId: string;
  pricingTierId?: string;
  pricingTierName?: string;
  pricePerLesson?: number;
}

/**
 * Create payment intent using organization's direct Stripe keys
 * Payment goes directly to business's Stripe account
 * No platform fees or Connect involved
 */
export const createPaymentIntentDirect = onCall(
  { enforceAppCheck: false }, // Temporarily disabled until AppCheck is configured for production
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    // Validate and sanitize input
    const validatedData = validateInput<CreatePaymentIntentDirectData>(
      paymentSchemas.createPaymentIntent,
      request.data
    );

    const {orgId, packageType, amount, trainerId, userId} = validatedData;
    
    // Extract tier pricing fields (may not be in validation schema)
    const pricingTierId = request.data.pricingTierId as string | undefined;
    const pricingTierName = request.data.pricingTierName as string | undefined;
    const pricePerLesson = request.data.pricePerLesson as number | undefined;

    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    // Rate limiting: 10 payment attempts per minute per user
    const rateLimitKey = `payment_${request.auth.uid}`;
    const allowed = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.PAYMENT.maxRequests,
      RATE_LIMITS.PAYMENT.windowSeconds
    );

    if (!allowed) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many payment attempts. Please try again in a minute."
      );
    }

    try {
      // Get organization data and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      
      if (!orgDoc.exists) {
        logger.error("Organization not found", { orgId });
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }
      
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      if (!orgData.stripe?.secretKey) {
        logger.error(`❌ Stripe keys not configured for org: ${orgId}`);
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
      });

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
        logger.error(`❌ Invalid package type: ${packageType}. Available: ${Object.keys(validPackages).join(", ")}`);
        throw new HttpsError(
          "invalid-argument",
          `Invalid package type: ${packageType}`
        );
      }

      if (amount !== validPackages[packageType]) {
        logger.error(`❌ Amount mismatch. Expected ${validPackages[packageType]}, got ${amount}`);
        throw new HttpsError(
          "invalid-argument",
          `Amount mismatch. Expected ${validPackages[packageType]}, got ${amount}`
        );
      }
      

      // Get or create Stripe customer - query by authUserId field (document IDs are name-based)
      // Try org subcollection first
      let usersQuery = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      let userDoc = usersQuery.docs[0];
      let userData = userDoc?.data();
      let userPath = userDoc ? `organizations/${orgId}/users/${userDoc.id}` : "";

      // Fallback to legacy root users collection if not found in org subcollection
      if (!userData) {
        usersQuery = await db
          .collection("users")
          .where("authUserId", "==", userId)
          .limit(1)
          .get();
        
        userDoc = usersQuery.docs[0];
        userData = userDoc?.data();
        userPath = userDoc ? `users/${userDoc.id}` : "";
        
        if (userData) {
        }
      }

      let customerId = userData?.stripeCustomerId;

      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData?.email || userData?.emailAddress || undefined,
          name: customerName, // Just the customer name, not prefixed
          description: `Skedence Client - User ID: ${userId}`,
          metadata: {
            userId: userId,
            orgId: orgId,
            source: "Skedence",
            client_name: customerName,
          },
        });

        customerId = customer.id;

        // Save customer ID to whichever path the user exists in
        if (!userDoc) {
          throw new HttpsError("not-found", "User document not found");
        }
        
        // Use the document reference from the query result
        await userDoc.ref.set({
          stripeCustomerId: customerId,
        }, {merge: true});
        
      } else {
      }

      // Create human-readable package name
      const packageNames: { [key: string]: string } = {
        "private": "Private Session (1 Athlete)",
        "2_athlete": "Private Session (2 Athletes)",
        "3_athlete": "Private Session (3 Athletes)",
        "class_pass": "Class Pass",
        "class_10_pack": "Class 10-Pack",
      };

      const packageDisplayName = packageNames[packageType] || packageType.replace("_", " ");

      // Generate transaction ID similar to Acuity format (timestamp-based)
      const transactionId = Date.now().toString();
      const purchaseDate = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      // Create payment intent with enhanced metadata (Acuity-style)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        description: `${transactionId} - ${customerName} - ${packageDisplayName} - ${purchaseDate}`,
        statement_descriptor_suffix: "Skedence", // Appears on bank statements (22 chars max)
        receipt_email: userData?.email || userData?.emailAddress || undefined, // Send receipt
        setup_future_usage: "off_session", // Save payment method for future use
        automatic_payment_methods: {
          enabled: true,
        },
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
          pricing_tier_id: pricingTierId || "",
          pricing_tier_name: pricingTierName || "",
          price_per_lesson: pricePerLesson ? pricePerLesson.toString() : "",
        },
      });

      // Create ephemeral key for customer to enable saved payment methods
      const ephemeralKey = await stripe.ephemeralKeys.create(
        {customer: customerId},
        {apiVersion: "2025-02-24.acacia"}
      );

      return {
        clientSecret: paymentIntent.client_secret,
        publishableKey: orgData.stripe.publishableKey,
        customerId: customerId,
        ephemeralKeySecret: ephemeralKey.secret,
      };
    } catch (error: unknown) {
      logger.error("❌❌❌ Error in createPaymentIntentDirect:", {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        orgId,
        packageType,
        amount,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Create and confirm payment intent using saved payment method
 */
export const createAndConfirmPaymentDirect = onCall(
  { enforceAppCheck: false }, // Temporarily disabled until AppCheck is configured for production
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    const {orgId, packageType, amount, trainerId, userId, paymentMethodId, pricingTierId, pricingTierName, pricePerLesson} = request.data;

    if (!orgId || !packageType || !amount || !trainerId || !userId || !paymentMethodId) {
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

    // Rate limiting: 10 payment attempts per minute per user
    const rateLimitKey = `payment_${request.auth.uid}`;
    const allowed = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.PAYMENT.maxRequests,
      RATE_LIMITS.PAYMENT.windowSeconds
    );

    if (!allowed) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many payment attempts. Please try again in a minute."
      );
    }

    try {
      // Get organization data and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      
      if (!orgDoc.exists) {
        logger.error(`❌ Organization document does not exist: ${orgId}`);
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }
      
      const orgData = orgDoc.data();

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      if (!orgData.stripe?.secretKey) {
        logger.error(`❌ Stripe keys not configured for org: ${orgId}`);
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        // apiVersion: "2024-11-20" // Commented out - using SDK default,
      });


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
        throw new HttpsError(
          "invalid-argument",
          `Invalid package type: ${packageType}`
        );
      }

      if (amount !== validPackages[packageType].price) {
        throw new HttpsError(
          "invalid-argument",
          `Amount mismatch. Expected ${validPackages[packageType].price}, got ${amount}`
        );
      }

      // Get customer ID - query by authUserId field (document IDs are name-based)
      // Try org subcollection first
      let usersQuery = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      let userDoc = usersQuery.docs[0];
      let userData = userDoc?.data();
      let userPath = userDoc ? `organizations/${orgId}/users/${userDoc.id}` : "";

      // Fallback to legacy root users collection if not found in org subcollection
      if (!userData) {
        usersQuery = await db
          .collection("users")
          .where("authUserId", "==", userId)
          .limit(1)
          .get();
        
        userDoc = usersQuery.docs[0];
        userData = userDoc?.data();
        userPath = userDoc ? `users/${userDoc.id}` : "";
        
        if (userData) {
        }
      }

      let customerId = userData?.stripeCustomerId;

      // If no customer ID exists, or customer doesn't exist in this org's Stripe account, create one
      if (!customerId) {
        const customerName = userData?.firstName && userData?.lastName ?
          `${userData.firstName} ${userData.lastName}` :
          "Customer";
        const customer = await stripe.customers.create({
          email: userData?.email || userData?.emailAddress || undefined,
          name: customerName, // Just the customer name, not prefixed
          description: `Skedence Client - User ID: ${userId}`,
          metadata: {
            userId: userId,
            orgId: orgId,
            source: "Skedence",
            client_name: customerName,
          },
        });
        customerId = customer.id;

        // Save customer ID using the document reference from query
        if (!userDoc) {
          throw new HttpsError("not-found", "User document not found");
        }
        
        await userDoc.ref.set({
          stripeCustomerId: customerId,
        }, {merge: true});

      } else {
        // Verify customer exists in this org's Stripe account
        try {
          await stripe.customers.retrieve(customerId);
        } catch (error: any) {
          if (error.code === "resource_missing") {
            const customerName = userData?.firstName && userData?.lastName ?
              `${userData.firstName} ${userData.lastName}` :
              "Customer";
            const customer = await stripe.customers.create({
              email: userData?.email || userData?.emailAddress || undefined,
              name: customerName, // Just the customer name, not prefixed
              description: `Skedence Client - User ID: ${userId}`,
              metadata: {
                userId: userId,
                orgId: orgId,
                source: "Skedence",
                client_name: customerName,
              },
            });
            customerId = customer.id;

            // Update customer ID in user document using the document reference
            if (!userDoc) {
              throw new HttpsError("not-found", "User document not found");
            }
            await userDoc.ref.set({
              stripeCustomerId: customerId,
            }, {merge: true});

          } else {
            throw error;
          }
        }
      }

      // Create and confirm payment intent with saved payment method
      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      // Create human-readable package name
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

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        return_url: "https://skedence.app/payment-complete",
        description: `${transactionId} - ${customerName} - ${packageDisplayName} - ${purchaseDate}`,
        statement_descriptor_suffix: "Skedence", // Appears on bank statements (22 chars max)
        receipt_email: userData?.email || userData?.emailAddress || undefined, // Send receipt
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
          // NEW: Tier pricing fields
          pricing_tier_id: pricingTierId || "",
          pricing_tier_name: pricingTierName || "",
          price_per_lesson: pricePerLesson ? pricePerLesson.toString() : "",
        },
      });

      if (paymentIntent.status === "succeeded") {
        // Get lesson count and package details from package definition
        const totalLessons = validPackages[packageType].lessons;

        // Get full package details from pricing structure
        let expirationDays = 365;
        let packageName = packageDisplayName;
        let packageCategory = "oneAthlete"; // Default to "oneAthlete" (1 athlete private lessons)
        
        if (orgData?.pricingStructure?.tiers) {
          for (const tier of orgData.pricingStructure.tiers) {
            const pkg = tier.packages.find((p: any) => p.packageType === packageType);
            if (pkg) {
              expirationDays = pkg.expirationDays || 365;
              packageName = pkg.title || packageDisplayName;
              // Use packageCategory directly from pricing structure (oneAthlete, twoAthlete, threeAthlete, fourAthlete, class)
              packageCategory = pkg.packageCategory || "oneAthlete";
              break;
            }
          }
        }

        // Create the lesson package in the STANDARD location: organizations/{orgId}/users/{userId}/packages
        // Use the actual user document ID from the query result
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);

        if (!userDoc) {
          throw new HttpsError("not-found", "User document not found");
        }

        const packagePath = userPath.startsWith("organizations/") 
          ? `organizations/${orgId}/users/${userDoc.id}/packages`
          : `users/${userDoc.id}/packages`;

        const packageData: any = {
          packageType: packageType,
          packageName: packageName,
          packageCategory: packageCategory,
          totalLessons: totalLessons,
          lessonsUsed: 0,
          amountPaid: amount, // Store amount in cents for revenue tracking
          orgId: orgId,
          purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
          transactionId: paymentIntent.id,
        };
        
        // Add tier pricing fields if present
        if (pricingTierId) {
          packageData.pricingTierId = pricingTierId;
        }
        if (pricingTierName) {
          packageData.pricingTierName = pricingTierName;
        }
        if (pricePerLesson) {
          packageData.pricePerLesson = pricePerLesson;
        }

        await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userDoc.id) // Use actual document ID, not Auth UID
          .collection("packages")
          .add(packageData);

        return {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        };
      } else {
        throw new HttpsError(
          "aborted",
          `Payment not completed. Status: ${paymentIntent.status}`
        );
      }
    } catch (error: unknown) {
      logger.error("❌ Error creating payment with saved card:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
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
export const confirmPaymentAndCreatePackageDirect = onCall(
  { enforceAppCheck: false }, // Temporarily disabled until AppCheck is configured for production
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
      // First, get the payment intent metadata to find the orgId
      // We need to try different orgs to find which one created this payment intent
      const orgsSnapshot = await db.collection("organizations").get();

      let stripe: Stripe | null = null;
      let paymentIntent: Stripe.PaymentIntent | null = null;
      let orgId: string | null = null;

      // Try to retrieve the payment intent from each organization's Stripe account
      for (const orgDoc of orgsSnapshot.docs) {
        try {
          const orgData = orgDoc.data();
          if (!orgData?.stripe?.secretKey) continue;

          const orgStripe = new Stripe(orgData.stripe.secretKey, {
            // apiVersion: "2024-11-20" // Commented out - using SDK default,
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
        throw new HttpsError(
          "not-found",
          "Payment intent not found in any organization"
        );
      }

      if (paymentIntent.status !== "succeeded") {
        throw new HttpsError(
          "failed-precondition",
          `Payment has not succeeded. Status: ${paymentIntent.status}`
        );
      }

      // If payment method was saved (setup_future_usage was set), remove old cards
      if (paymentIntent.setup_future_usage && paymentIntent.payment_method && paymentIntent.customer) {
        const customerId = typeof paymentIntent.customer === "string" ?
          paymentIntent.customer :
          paymentIntent.customer.id;

        const newPaymentMethodId = typeof paymentIntent.payment_method === "string" ?
          paymentIntent.payment_method :
          paymentIntent.payment_method.id;

        try {
          // Get all existing payment methods for this customer
          const existingMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
          });


          // Remove all cards except the new one
          for (const method of existingMethods.data) {
            if (method.id !== newPaymentMethodId) {
              try {
                await stripe.paymentMethods.detach(method.id);
              } catch (detachError) {
                logger.error(`⚠️ Failed to detach payment method ${method.id}:`, detachError);
                // Continue removing others even if one fails
              }
            }
          }
        } catch (listError) {
          logger.error("⚠️ Failed to list/remove old payment methods:", listError);
          // Continue with package creation even if card removal fails
        }
      }

      // Read metadata with snake_case keys (as stored in createPaymentIntentDirect)
      const packageType = paymentIntent.metadata.package_type;
      const trainerId = paymentIntent.metadata.trainer_id;
      const pricingTierId = paymentIntent.metadata.pricing_tier_id || undefined;
      const pricingTierName = paymentIntent.metadata.pricing_tier_name || undefined;
      const pricePerLesson = paymentIntent.metadata.price_per_lesson ?
        parseInt(paymentIntent.metadata.price_per_lesson, 10) :
        undefined;

      if (!packageType || !trainerId) {
        throw new HttpsError(
          "internal",
          "Payment intent is missing required metadata"
        );
      }

      // Fetch organization's package definition to get lesson count
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const orgData = orgDoc.data();

      let totalLessons = 1; // Default fallback


      // Get totalLessons and expirationDays from pricing structure
      let expirationDays = 365; // Default

      if (orgData?.pricingStructure?.tiers) {

        // Look for the package in pricing structure
        for (const tier of orgData.pricingStructure.tiers) {

          const pkg = tier.packages.find((p: any) => p.packageType === packageType);
          if (pkg) {
            totalLessons = pkg.lessonCount || 1;
            expirationDays = pkg.expirationDays || 365;
            break;
          }
        }

        if (totalLessons === 1) {
        }
      } else {

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
          expirationDays = pkgData.expirationDays || 365;
        } else {
        }
      }

      // Get package details from pricing structure
      let packageName = packageType.replace("_", " ");
      let packageCategory = "oneAthlete"; // Default to "oneAthlete" (1 athlete private lessons)
      
      if (orgData?.pricingStructure?.tiers) {
        for (const tier of orgData.pricingStructure.tiers) {
          const pkg = tier.packages.find((p: any) => p.packageType === packageType);
          if (pkg) {
            packageName = pkg.title || packageName;
            // Use packageCategory directly from pricing structure (oneAthlete, twoAthlete, threeAthlete, fourAthlete, class)
            packageCategory = pkg.packageCategory || "oneAthlete";
            break;
          }
        }
      }

      // Query for user document by authUserId (document IDs are name-based)
      // Try org-scoped path first (standard multi-tenant)
      let userQuery = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .where("authUserId", "==", userId)
        .limit(1)
        .get();

      // Fall back to top-level users collection (for legacy/custom apps like PolyFace)
      if (userQuery.empty) {
        userQuery = await db
          .collection("users")
          .where("authUserId", "==", userId)
          .limit(1)
          .get();
      }

      if (userQuery.empty) {
        throw new HttpsError("not-found", `User not found for authUserId: ${userId}`);
      }

      const userDoc = userQuery.docs[0];
      const actualUserId = userDoc.id; // This is the name-based document ID

      // Create the lesson package
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      // Store package in STANDARD location: organizations/{orgId}/users/{actualUserId}/packages
      const packageData: any = {
        packageType: packageType,
        packageName: packageName,
        packageCategory: packageCategory,
        totalLessons: totalLessons,
        lessonsUsed: 0,
        amountPaid: paymentIntent.amount, // Store amount in cents for revenue tracking
        orgId: orgId,
        purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
        transactionId: paymentIntent.id,
      };
      
      // Add tier pricing fields if present
      if (pricingTierId) {
        packageData.pricingTierId = pricingTierId;
      }
      if (pricingTierName) {
        packageData.pricingTierName = pricingTierName;
      }
      if (pricePerLesson) {
        packageData.pricePerLesson = pricePerLesson;
      }
      
      await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(actualUserId)
        .collection("packages")
        .add(packageData);

      return {success: true, packageId: paymentIntent.id};
    } catch (error: unknown) {
      logger.error("❌ Error confirming payment:", error);

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
