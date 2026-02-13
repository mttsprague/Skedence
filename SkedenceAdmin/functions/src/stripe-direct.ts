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

      const customerName = userData?.firstName && userData?.lastName ?
        `${userData.firstName} ${userData.lastName}` :
        "Customer";

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData?.email || userData?.emailAddress || undefined,
          name: `Skedence: ${customerName} (${userId.slice(-4)})`,
          description: `Customer ID: ${userId}`,
          metadata: {
            userId: userId,
            orgId: orgId,
            source: "Skedence",
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

      // Get customer ID from root users collection
      const userDoc = await db
        .collection("users")
        .doc(userId)
        .get();

      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;

      // If no customer ID exists, or customer doesn't exist in this org's Stripe account, create one
      if (!customerId) {
        console.log("⚠️ No Stripe customer ID found, creating new customer");
        const customerName = userData?.firstName && userData?.lastName ?
          `${userData.firstName} ${userData.lastName}` :
          "Customer";
        const customer = await stripe.customers.create({
          email: userData?.email || userData?.emailAddress || undefined,
          name: `Skedence: ${customerName} (${userId.slice(-4)})`,
          description: `Customer ID: ${userId}`,
          metadata: {
            userId: userId,
            orgId: orgId,
            source: "Skedence",
            client_name: customerName,
          },
        });
        customerId = customer.id;

        // Save customer ID to user document
        await db
          .collection("users")
          .doc(userId)
          .set({
            stripeCustomerId: customerId,
          }, {merge: true});

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
              name: `Skedence: ${customerName} (${userId.slice(-4)})`,
              description: `Customer ID: ${userId}`,
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
        let packageCategory = "pass"; // Default to "pass" (private lessons)
        
        if (orgData?.pricingStructure?.tiers) {
          for (const tier of orgData.pricingStructure.tiers) {
            const pkg = tier.packages.find((p: any) => p.packageType === packageType);
            if (pkg) {
              expirationDays = pkg.expirationDays || 365;
              packageName = pkg.title || packageDisplayName;
              // Map packageCategory enum to simple "pass" or "class" string
              packageCategory = pkg.packageCategory === "class" || pkg.packageCategory === "classPass" ? "class" : "pass";
              console.log(`📦 Package details: ${packageName}, category: ${packageCategory}, ${totalLessons} lessons, expires in ${expirationDays} days`);
              break;
            }
          }
        }

        // Create the lesson package in the correct location: users/{userId}/lessonPackages
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);

        await db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
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
          `✅ Payment confirmed and package created at users/${userId}/lessonPackages: ${paymentIntent.id} for ${amount / 100} USD, ${totalLessons} lessons`
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
      let packageCategory = "pass"; // Default to "pass" (private lessons)
      
      if (orgData?.pricingStructure?.tiers) {
        for (const tier of orgData.pricingStructure.tiers) {
          const pkg = tier.packages.find((p: any) => p.packageType === packageType);
          if (pkg) {
            packageName = pkg.title || packageName;
            // Map packageCategory enum to simple "pass" or "class" string
            packageCategory = pkg.packageCategory === "class" || pkg.packageCategory === "classPass" ? "class" : "pass";
            console.log(`📦 Package details: ${packageName}, category: ${packageCategory}, ${totalLessons} lessons`);
            break;
          }
        }
      }

      // Create the lesson package
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      // Store package in users/{userId}/lessonPackages to match existing structure
      await db
        .collection("users")
        .doc(userId)
        .collection("lessonPackages")
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
