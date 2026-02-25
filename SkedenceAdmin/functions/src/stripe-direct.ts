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
}

/**
 * Create payment intent using organization's direct Stripe keys
 * Payment goes directly to business's Stripe account
 * No platform fees or Connect involved
 */
export const createPaymentIntentDirect = onCall(
  { enforceAppCheck: false }, // Temporarily disabled until App Check is properly configured in both apps
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

    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User ID does not match authenticated user"
      );
    }

    console.log(`👉 createPaymentIntentDirect called:`, {
      userId,
      orgId,
      packageType,
      amount: `$${amount / 100}`,
    });

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
      console.log(`🔍 Step 1: Fetching organization document for orgId: ${orgId}`);
      // Get organization data and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      
      if (!orgDoc.exists) {
        console.error(`❌ Organization document does not exist: ${orgId}`);
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }
      
      const orgData = orgDoc.data();
      console.log(`✅ Organization found:`, {
        orgId,
        hasStripeConfig: !!orgData?.stripe,
        hasSecretKey: !!orgData?.stripe?.secretKey,
        hasPublishableKey: !!orgData?.stripe?.publishableKey,
      });

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      if (!orgData.stripe?.secretKey) {
        console.error(`❌ Stripe keys not configured for org: ${orgId}`);
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      console.log(`🔑 Step 2: Initializing Stripe with organization's key`);
      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });
      console.log(`✅ Stripe initialized successfully`);

      console.log(`💰 Step 3: Validating pricing for package: ${packageType}`);
      // Validate amount against organization's pricing
      const validPackages: { [key: string]: number } = {};

      if (orgData.pricingStructure?.tiers) {
        for (const tier of orgData.pricingStructure.tiers) {
          for (const pkg of tier.packages) {
            validPackages[pkg.packageType] = pkg.priceInCents;
          }
        }
        console.log(`✅ Loaded ${Object.keys(validPackages).length} packages from pricing structure`);
      } else {
        console.log(`⚠️ No pricing structure, checking packages collection`);
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
        console.log(`✅ Loaded ${Object.keys(validPackages).length} packages from collection`);
      }

      console.log(`📋 Valid packages:`, validPackages);

      if (!validPackages[packageType]) {
        console.error(`❌ Invalid package type: ${packageType}. Available: ${Object.keys(validPackages).join(", ")}`);
        throw new HttpsError(
          "invalid-argument",
          `Invalid package type: ${packageType}`
        );
      }

      if (amount !== validPackages[packageType]) {
        console.error(`❌ Amount mismatch. Expected ${validPackages[packageType]}, got ${amount}`);
        throw new HttpsError(
          "invalid-argument",
          `Amount mismatch. Expected ${validPackages[packageType]}, got ${amount}`
        );
      }
      
      console.log(`✅ Price validation passed: $${amount / 100}`);

      console.log(`👤 Step 4: Getting/creating Stripe customer for user: ${userId}`);
      // Get or create Stripe customer - check both new and legacy paths
      let userDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .get();

      let userData = userDoc.data();
      let userPath = `organizations/${orgId}/users/${userId}`;

      // Fallback to legacy path if not found in new path
      if (!userData) {
        console.log(`⚠️ User not found in org subcollection, checking root users collection`);
        userDoc = await db.collection("users").doc(userId).get();
        userData = userDoc.data();
        userPath = `users/${userId}`;
        
        if (userData) {
          console.log(`✅ Found user in legacy path: ${userPath}`);
        }
      }

      let customerId = userData?.stripeCustomerId;
      console.log(`📋 User data:`, {
        userId,
        userPath,
        hasData: !!userData,
        existingCustomerId: customerId || "none",
        email: userData?.email || userData?.emailAddress,
      });

      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      if (!customerId) {
        console.log(`🆕 Creating new Stripe customer: ${customerName}`);
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
        console.log(`✅ Created Stripe customer: ${customerId}`);

        // Save customer ID to whichever path the user exists in
        console.log(`💾 Saving customer ID to: ${userPath}`);
        if (userPath.startsWith("organizations/")) {
          await db
            .collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .set({
              stripeCustomerId: customerId,
            }, {merge: true});
        } else {
          await db.collection("users").doc(userId).set({
            stripeCustomerId: customerId,
          }, {merge: true});
        }
        console.log(`✅ Saved customer ID to user document`);
      } else {
        console.log(`✅ Using existing Stripe customer: ${customerId}`);
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

      console.log(`💳 Step 5: Creating payment intent`, {
        amount: `$${amount / 100}`,
        customerId,
        packageDisplayName,
        transactionId,
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
        },
      });

      console.log(
        `✅ Payment intent created: ${paymentIntent.id} for ${amount / 100} USD`
      );

      console.log(`🔑 Step 6: Returning client secret and publishable key`);
      return {
        clientSecret: paymentIntent.client_secret,
        publishableKey: orgData.stripe.publishableKey,
      };
    } catch (error: unknown) {
      console.error("❌❌❌ Error in createPaymentIntentDirect:", {
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
  { enforceAppCheck: false }, // Temporarily disabled until App Check is properly configured in both apps
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment"
      );
    }

    const {orgId, packageType, amount, trainerId, userId, paymentMethodId} = request.data;

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

    console.log(`👉 createAndConfirmPaymentDirect called:`, {
      userId,
      orgId,
      packageType,
      amount: `$${amount / 100}`,
      paymentMethodId: paymentMethodId.slice(-4),
    });

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
      console.log(`🔍 Step 1: Fetching organization document for orgId: ${orgId}`);
      // Get organization data and Stripe keys
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      
      if (!orgDoc.exists) {
        console.error(`❌ Organization document does not exist: ${orgId}`);
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }
      
      const orgData = orgDoc.data();
      console.log(`✅ Organization found with Stripe keys configured`);

      if (!orgData) {
        throw new HttpsError(
          "not-found",
          "Organization not found"
        );
      }

      if (!orgData.stripe?.secretKey) {
        console.error(`❌ Stripe keys not configured for org: ${orgId}`);
        throw new HttpsError(
          "failed-precondition",
          "Organization has not configured Stripe keys"
        );
      }

      console.log(`🔑 Step 2: Initializing Stripe`);
      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(orgData.stripe.secretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      console.log(`💰 Step 3: Validating pricing`);

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

      // Get customer ID - check both new and legacy paths
      let userDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .get();

      let userData = userDoc.data();
      let userPath = `organizations/${orgId}/users/${userId}`;

      // Fallback to legacy path if not found in new path
      if (!userData) {
        console.log(`⚠️ User not found in org subcollection, checking root users collection`);
        userDoc = await db.collection("users").doc(userId).get();
        userData = userDoc.data();
        userPath = `users/${userId}`;
        
        if (userData) {
          console.log(`✅ Found user in legacy path: ${userPath}`);
        }
      }

      let customerId = userData?.stripeCustomerId;
      console.log(`📋 User customer ID: ${customerId || "none"} from ${userPath}`);

      // If no customer ID exists, or customer doesn't exist in this org's Stripe account, create one
      if (!customerId) {
        console.log("⚠️ No Stripe customer ID found, creating new customer");
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

        // Save customer ID to whichever path the user exists in
        console.log(`💾 Saving customer ID to: ${userPath}`);
        if (userPath.startsWith("organizations/")) {
          await db
            .collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .set({
              stripeCustomerId: customerId,
            }, {merge: true});
        } else {
          await db.collection("users").doc(userId).set({
            stripeCustomerId: customerId,
          }, {merge: true});
        }

        console.log(`✅ Created new Stripe customer: ${customerId}`);
      } else {
        // Verify customer exists in this org's Stripe account
        try {
          await stripe.customers.retrieve(customerId);
          console.log(`✅ Verified customer exists: ${customerId}`);
        } catch (error: any) {
          if (error.code === "resource_missing") {
            console.log(`⚠️ Customer ${customerId} not found in this Stripe account, creating new one`);
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

            // Update customer ID in user document
            await db
              .collection("users")
              .doc(userId)
              .set({
                stripeCustomerId: customerId,
              }, {merge: true});

            console.log(`✅ Created new Stripe customer: ${customerId}`);
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
              console.log(`📦 Package details: ${packageName}, category: ${packageCategory}, ${totalLessons} lessons, expires in ${expirationDays} days`);
              break;
            }
          }
        }

        // Create the lesson package in the STANDARD location: organizations/{orgId}/users/{userId}/packages
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);

        await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userId)
          .collection("packages")
          .add({
            packageType: packageType,
            packageName: packageName,
            packageCategory: packageCategory,
            totalLessons: totalLessons,
            lessonsUsed: 0,
            orgId: orgId,
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
            transactionId: paymentIntent.id,
          });

        console.log(
          `✅ Payment confirmed and package created at organizations/${orgId}/users/${userId}/packages: ${paymentIntent.id} for ${amount / 100} USD, ${totalLessons} lessons`
        );

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
      console.error("❌ Error creating payment with saved card:", error);

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

          console.log(`🗑️ Checking for old cards to remove. Found ${existingMethods.data.length} total card(s)`);

          // Remove all cards except the new one
          for (const method of existingMethods.data) {
            if (method.id !== newPaymentMethodId) {
              try {
                await stripe.paymentMethods.detach(method.id);
                console.log(`✅ Removed old payment method ${method.id}`);
              } catch (detachError) {
                console.error(`⚠️ Failed to detach payment method ${method.id}:`, detachError);
                // Continue removing others even if one fails
              }
            }
          }
        } catch (listError) {
          console.error("⚠️ Failed to list/remove old payment methods:", listError);
          // Continue with package creation even if card removal fails
        }
      }

      const packageType = paymentIntent.metadata.packageType;
      const trainerId = paymentIntent.metadata.trainerId;

      console.log(`🔍 Payment metadata - packageType: ${packageType}, trainerId: ${trainerId}`);

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

      console.log(`🔍 Checking pricing structure for package: ${packageType}`);

      // Get totalLessons and expirationDays from pricing structure
      let expirationDays = 365; // Default

      if (orgData?.pricingStructure?.tiers) {
        console.log(`📋 Found ${orgData.pricingStructure.tiers.length} pricing tiers`);

        // Look for the package in pricing structure
        for (const tier of orgData.pricingStructure.tiers) {
          console.log(`📋 Tier "${tier.name}" has ${tier.packages?.length || 0} packages`);

          const pkg = tier.packages.find((p: any) => p.packageType === packageType);
          if (pkg) {
            totalLessons = pkg.lessonCount || 1;
            expirationDays = pkg.expirationDays || 365;
            console.log(`✅ Found matching package! lessonCount: ${totalLessons}, expirationDays: ${expirationDays}`);
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
          expirationDays = pkgData.expirationDays || 365;
          console.log("✅ Found package in subcollection! lessonCount: ${totalLessons}");
        } else {
          console.log("⚠️ No package found in subcollection either, using default: 1");
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
            console.log(`📦 Package details: ${packageName}, category: ${packageCategory}, ${totalLessons} lessons`);
            break;
          }
        }
      }

      // Create the lesson package
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      // Store package in STANDARD location: organizations/{orgId}/users/{userId}/packages
      await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .doc(userId)
        .collection("packages")
        .add({
          packageType: packageType,
          packageName: packageName,
          packageCategory: packageCategory,
          totalLessons: totalLessons,
          lessonsUsed: 0,
          orgId: orgId,
          purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
          transactionId: paymentIntent.id,
        });

      console.log(
        `✅ Package created for payment: ${paymentIntent.id} for ${paymentIntent.amount / 100} USD at organizations/${orgId}/users/${userId}/packages`
      );

      return {success: true, packageId: paymentIntent.id};
    } catch (error: unknown) {
      console.error("❌ Error confirming payment:", error);

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
