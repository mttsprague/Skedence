import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

const db = admin.firestore();

/**
 * Validate Apple receipt and sync subscription status to Firestore
 * Called from iOS app after successful purchase
 */
export const validateAppleReceipt = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    receipt: string;
    productID: string;
    transactionID: string;
  }>) => {
    const {receipt, productID, transactionID} = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new functions.https.HttpsError("unauthenticated", "User not authenticated");
    }

    if (!receipt || !productID || !transactionID) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: receipt, productID, transactionID"
      );
    }

    try {
      // Validate receipt with Apple
      const receiptData = await validateReceiptWithApple(receipt);

      // Find the latest receipt info for this product
      const latestReceiptInfo = receiptData.latest_receipt_info?.find(
        (info: any) => info.product_id === productID
      );

      if (!latestReceiptInfo) {
        throw new functions.https.HttpsError(
          "not-found",
          "No receipt info found for product"
        );
      }

      // Parse dates (Apple returns milliseconds timestamps)
      const purchaseDate = new Date(parseInt(latestReceiptInfo.purchase_date_ms));
      const expiresDate = new Date(parseInt(latestReceiptInfo.expires_date_ms));
      const isTrialPeriod = latestReceiptInfo.is_trial_period === "true";

      // Map product ID to plan name
      const planName = mapProductIDToPlan(productID);

      // Find user's organization
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      const orgId = userData?.organizations?.[0];

      if (!orgId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "User has no organization"
        );
      }

      // Update organization billing document
      await db.collection("organizations").doc(orgId).set(
        {
          billing: {
            source: "apple",
            plan: planName,
            status: "active",
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiresDate),
            trialEndsAt: isTrialPeriod ? admin.firestore.Timestamp.fromDate(expiresDate) : null,
            cancelAtPeriodEnd: false,
            appleTransactionId: transactionID,
            appleProductId: productID,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      console.log(`✅ Synced Apple subscription for org ${orgId}: ${planName}`);

      return {
        success: true,
        plan: planName,
        status: "active",
        expiresAt: expiresDate.toISOString(),
        isTrialPeriod,
      };
    } catch (error: any) {
      console.error("❌ Failed to validate Apple receipt:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to validate receipt"
      );
    }
  }
);

/**
 * Validate receipt with Apple's verifyReceipt endpoint
 */
async function validateReceiptWithApple(receiptData: string): Promise<any> {
  // Try production endpoint first
  let response = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      "receipt-data": receiptData,
      "password": functions.config().apple?.shared_secret || process.env.APPLE_SHARED_SECRET,
      "exclude-old-transactions": true,
    }),
  });

  let data = await response.json();

  // If status is 21007, receipt is from sandbox, retry with sandbox endpoint
  if (data.status === 21007) {
    console.log("🔄 Receipt from sandbox, retrying with sandbox endpoint");
    response = await fetch("https://sandbox.itunes.apple.com/verifyReceipt", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        "receipt-data": receiptData,
        "password": functions.config().apple?.shared_secret || process.env.APPLE_SHARED_SECRET,
        "exclude-old-transactions": true,
      }),
    });
    data = await response.json();
  }

  // Check for success
  if (data.status !== 0) {
    throw new Error(`Apple receipt validation failed with status: ${data.status}`);
  }

  return data;
}

/**
 * Map Apple product ID to plan name
 */
function mapProductIDToPlan(productID: string): string {
  const planMap: {[key: string]: string} = {
    "skedence_starter_monthly": "starter",
    "skedence_studio_monthly": "studio",
    "skedence_academy_monthly": "academy",
    "skedence_enterprise_monthly": "enterprise",
  };

  return planMap[productID] || "free";
}

/**
 * Webhook handler for App Store Server Notifications (optional, for production)
 * This handles subscription renewals, cancellations, etc. automatically
 */
export const appleWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const notification = req.body;
    console.log("📱 Apple webhook received:", JSON.stringify(notification, null, 2));

    // TODO: Verify webhook signature with Apple's JWT

    const notificationType = notification.notification_type;
    const latestReceipt = notification.unified_receipt?.latest_receipt_info?.[0];

    if (!latestReceipt) {
      res.status(200).send("OK - No receipt info");
      return;
    }

    const productID = latestReceipt.product_id;
    const transactionID = latestReceipt.transaction_id;
    const expiresDate = new Date(parseInt(latestReceipt.expires_date_ms));

    // Find organization by Apple transaction ID
    const orgsSnapshot = await db.collection("organizations")
      .where("billing.appleTransactionId", "==", transactionID)
      .limit(1)
      .get();

    if (orgsSnapshot.empty) {
      console.log(`⚠️ No organization found for transaction ${transactionID}`);
      res.status(200).send("OK - No org found");
      return;
    }

    const orgDoc = orgsSnapshot.docs[0];
    const orgId = orgDoc.id;

    // Handle different notification types
    switch (notificationType) {
      case "INITIAL_BUY":
      case "DID_RENEW":
        await db.collection("organizations").doc(orgId).set(
          {
            billing: {
              status: "active",
              currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiresDate),
              cancelAtPeriodEnd: false,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );
        console.log(`✅ Renewed subscription for org ${orgId}`);
        break;

      case "DID_FAIL_TO_RENEW":
        await db.collection("organizations").doc(orgId).set(
          {
            billing: {
              status: "past_due",
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );
        console.log(`⚠️ Renewal failed for org ${orgId}`);
        break;

      case "CANCEL":
      case "DID_CHANGE_RENEWAL_STATUS":
        const autoRenewStatus = notification.auto_renew_status === "true";
        await db.collection("organizations").doc(orgId).set(
          {
            billing: {
              cancelAtPeriodEnd: !autoRenewStatus,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );
        console.log(`🔄 Updated renewal status for org ${orgId}: ${autoRenewStatus}`);
        break;

      case "REFUND":
        await db.collection("organizations").doc(orgId).set(
          {
            billing: {
              status: "canceled",
              plan: "free",
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );
        console.log(`💰 Refund processed for org ${orgId}`);
        break;

      default:
        console.log(`ℹ️ Unhandled notification type: ${notificationType}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Apple webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});
