import * as admin from "firebase-admin";

const db = admin.firestore();

export interface QuotaLimits {
  maxBookingsPerDay: number;
  maxClassesPerDay: number;
  maxMessagesPerDay: number;
  maxFileUploadsPerDay: number;
  maxFileSizeMB: number;
  maxStorageGB: number;
}

export const PLAN_QUOTAS: Record<string, QuotaLimits> = {
  free: {
    maxBookingsPerDay: 10,
    maxClassesPerDay: 5,
    maxMessagesPerDay: 50,
    maxFileUploadsPerDay: 10,
    maxFileSizeMB: 5,
    maxStorageGB: 1,
  },
  starter: {
    maxBookingsPerDay: 100,
    maxClassesPerDay: 50,
    maxMessagesPerDay: 500,
    maxFileUploadsPerDay: 100,
    maxFileSizeMB: 10,
    maxStorageGB: 10,
  },
  professional: {
    maxBookingsPerDay: 500,
    maxClassesPerDay: 200,
    maxMessagesPerDay: 2000,
    maxFileUploadsPerDay: 500,
    maxFileSizeMB: 25,
    maxStorageGB: 50,
  },
  enterprise: {
    maxBookingsPerDay: -1, // unlimited
    maxClassesPerDay: -1,
    maxMessagesPerDay: -1,
    maxFileUploadsPerDay: -1,
    maxFileSizeMB: 100,
    maxStorageGB: 500,
  },
};

/**
 * Get quota limits for an organization based on their subscription plan
 */
export async function getOrgQuotas(organizationId: string): Promise<QuotaLimits> {
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  const orgData = orgDoc.data();
  
  const plan = orgData?.subscriptionPlan || "free";
  return PLAN_QUOTAS[plan] || PLAN_QUOTAS.free;
}

/**
 * Check if an organization has exceeded their quota for a specific action
 */
export async function checkQuota(
  organizationId: string,
  quotaType: "bookings" | "classes" | "messages" | "fileUploads"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const quotas = await getOrgQuotas(organizationId);
  
  let limit: number;
  switch (quotaType) {
    case "bookings":
      limit = quotas.maxBookingsPerDay;
      break;
    case "classes":
      limit = quotas.maxClassesPerDay;
      break;
    case "messages":
      limit = quotas.maxMessagesPerDay;
      break;
    case "fileUploads":
      limit = quotas.maxFileUploadsPerDay;
      break;
  }

  // If limit is -1, it's unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Get today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const usageDoc = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("usage")
    .doc(todayStr)
    .get();

  const current = usageDoc.data()?.[quotaType] || 0;
  const allowed = current < limit;

  return { allowed, current, limit };
}

/**
 * Increment usage counter for an organization
 */
export async function incrementUsage(
  organizationId: string,
  quotaType: "bookings" | "classes" | "messages" | "fileUploads"
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const usageRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("usage")
    .doc(todayStr);

  await usageRef.set(
    {
      [quotaType]: admin.firestore.FieldValue.increment(1),
      date: todayStr,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Rate limiting using Firestore
 * Returns true if action is allowed, false if rate limited
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const rateLimitRef = db.collection("rateLimits").doc(key);
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data();

      let requests: number[] = data?.requests || [];
      
      // Filter out old requests outside the window
      requests = requests.filter((timestamp) => timestamp > windowStart);

      if (requests.length >= maxRequests) {
        // Rate limited
        const oldestRequest = Math.min(...requests);
        const resetAt = new Date(oldestRequest + windowSeconds * 1000);
        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Add current request
      requests.push(now);

      transaction.set(
        rateLimitRef,
        {
          requests,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        allowed: true,
        remaining: maxRequests - requests.length,
        resetAt: new Date(now + windowSeconds * 1000),
      };
    });

    return result;
  } catch (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  }
}

/**
 * Clean up old rate limit documents (run as scheduled function)
 */
export async function cleanupRateLimits(): Promise<void> {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  const snapshot = await db
    .collection("rateLimits")
    .where("updatedAt", "<", new Date(oneDayAgo))
    .limit(500)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Cleaned up ${snapshot.size} old rate limit documents`);
}

/**
 * Check if organization is disabled or subscription expired
 */
export async function checkOrgAccess(organizationId: string): Promise<{
  allowed: boolean;
  reason?: string;
  isReadOnly: boolean;
}> {
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  
  if (!orgDoc.exists) {
    return { allowed: false, reason: "Organization not found", isReadOnly: false };
  }

  const orgData = orgDoc.data();

  // Check if org is disabled
  if (orgData?.disabled === true) {
    return { allowed: false, reason: "Organization is disabled", isReadOnly: false };
  }

  // Check subscription status
  const subscriptionStatus = orgData?.subscriptionStatus;
  
  if (!subscriptionStatus || subscriptionStatus === "canceled" || subscriptionStatus === "incomplete") {
    return {
      allowed: true,
      reason: "Subscription expired - read-only mode",
      isReadOnly: true,
    };
  }

  if (subscriptionStatus === "past_due") {
    return {
      allowed: true,
      reason: "Payment past due - read-only mode",
      isReadOnly: true,
    };
  }

  return { allowed: true, isReadOnly: false };
}
