import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

const db = admin.firestore();

/**
 * Validate Apple receipt and sync subscription status to Firestore
 * Called from iOS app after successful purchase
 */
export const validateAppleReceipt = onCall(
  {enforceAppCheck: true },
  async (request) => {
    const {receipt, productID, transactionID, organizationId, isTrialPeriod, expiresAt} = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!receipt || !productID || !transactionID) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: receipt, productID, transactionID"
      );
    }

    try {
      // If we have StoreKit 2 data (isTrialPeriod and expiresAt), use it directly
      // This is more reliable than parsing legacy verifyReceipt responses
      let expiresDate: Date;
      let isTrial: boolean;

      if (expiresAt && isTrialPeriod !== undefined) {
        // Use StoreKit 2 data directly
        expiresDate = new Date(expiresAt);
        isTrial = isTrialPeriod;
        console.log(`✅ Using StoreKit 2 data - Product: ${productID}, Trial: ${isTrial}, Expires: ${expiresDate.toISOString()}`);
      } else {
        // Fall back to verifyReceipt API (legacy)
        const receiptData = await validateReceiptWithApple(receipt);

        const latestReceiptInfo = receiptData.latest_receipt_info?.find(
          (info: any) => info.product_id === productID
        );

        if (!latestReceiptInfo) {
          console.error("❌ No receipt info found. Receipt data:", JSON.stringify(receiptData, null, 2));
          throw new HttpsError(
            "not-found",
            "No receipt info found for product"
          );
        }

        expiresDate = new Date(parseInt(latestReceiptInfo.expires_date_ms));
        isTrial = latestReceiptInfo.is_trial_period === "true";

        console.log(`📝 Using verifyReceipt data - Product: ${productID}, Trial: ${isTrial}, Expires: ${expiresDate.toISOString()}`);
      }
      // Map product ID to plan name
      const planName = mapProductIDToPlan(productID);

      // Get organization ID - use provided one or look it up
      let orgId = organizationId;
      if (!orgId) {
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();
        orgId = userData?.organizations?.[0];
      }

      if (!orgId) {
        throw new HttpsError(
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
            trialEndsAt: isTrial ? admin.firestore.Timestamp.fromDate(expiresDate) : null,
            cancelAtPeriodEnd: false,
            appleTransactionId: transactionID,
            appleProductId: productID,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      console.log(`✅ Synced Apple subscription for org ${orgId}: ${planName} (trial: ${isTrial})`);

      return {
        success: true,
        plan: planName,
        status: "active",
        expiresAt: expiresDate.toISOString(),
        isTrialPeriod: isTrial,
      };
    } catch (error: any) {
      console.error("❌ Failed to validate Apple receipt:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to validate receipt"
      );
    }
  }
);

/**
 * Validate receipt with Apple's verifyReceipt endpoint
 * @param {string} receiptData - Base64 encoded receipt data from iOS
 * @return {Promise<any>} Validated receipt data from Apple
 */
async function validateReceiptWithApple(receiptData: string): Promise<any> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET || "46a188678e0748aba17e3720b314c9d3";

  // Try production endpoint first
  let response = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      "receipt-data": receiptData,
      "password": sharedSecret,
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
        "password": sharedSecret,
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
 * @param {string} productID - Apple product identifier
 * @return {string} Plan name (starter, studio, academy, enterprise, or free)
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
export const appleWebhook = onRequest(async (req, res) => {
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
    case "DID_CHANGE_RENEWAL_STATUS": {
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
    }
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
