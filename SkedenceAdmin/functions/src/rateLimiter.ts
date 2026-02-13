/**
 * Rate Limiter for Cloud Functions
 * 
 * Implements token bucket algorithm using Firestore for distributed rate limiting.
 * Prevents abuse by limiting the number of requests per user/IP per time window.
 */

import * as admin from 'firebase-admin';

// Use lazy initialization - don't access db at module load time
function getDb() {
  return admin.firestore();
}

/**
 * Check if a request should be allowed based on rate limiting rules
 * 
 * @param key - Unique identifier for the rate limit (e.g., "payment_userId123")
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns true if request is allowed, false if rate limit exceeded
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const db = getDb();
  const rateLimitRef = db.collection('rateLimits').doc(key);
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      
      // First request - create new rate limit record
      if (!doc.exists) {
        transaction.set(rateLimitRef, {
          requests: [now],
          lastCleanup: now,
          expiresAt: new Date(now + (windowSeconds * 2000)) // Auto-cleanup after 2x window
        });
        return true;
      }

      const data = doc.data();
      if (!data) {
        return true; // Fail open if data is corrupted
      }

      // Filter out requests outside the current window
      const recentRequests = (data.requests as number[]).filter(
        (timestamp: number) => timestamp > windowStart
      );

      // Rate limit exceeded
      if (recentRequests.length >= maxRequests) {
        return false;
      }

      // Add current request to the list
      transaction.update(rateLimitRef, {
        requests: [...recentRequests, now],
        lastCleanup: now,
        expiresAt: new Date(now + (windowSeconds * 2000))
      });
      
      return true;
    });

    return result;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow the request if rate limiting system is down
    // This prevents legitimate users from being blocked due to system issues
    return true;
  }
}

/**
 * Get the remaining requests for a given key
 * 
 * @param key - Rate limit key
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window
 * @returns Number of requests remaining in current window
 */
export async function getRemainingRequests(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<number> {
  const db = getDb();
  const rateLimitRef = db.collection('rateLimits').doc(key);
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  try {
    const doc = await rateLimitRef.get();
    
    if (!doc.exists) {
      return maxRequests;
    }

    const data = doc.data();
    if (!data) {
      return maxRequests;
    }

    const recentRequests = (data.requests as number[]).filter(
      (timestamp: number) => timestamp > windowStart
    );

    return Math.max(0, maxRequests - recentRequests.length);
  } catch (error) {
    console.error('Failed to get remaining requests:', error);
    return maxRequests; // Fail open
  }
}

/**
 * Reset rate limit for a specific key (admin function)
 * 
 * @param key - Rate limit key to reset
 */
export async function resetRateLimit(key: string): Promise<void> {
  const db = getDb();
  const rateLimitRef = db.collection('rateLimits').doc(key);
  await rateLimitRef.delete();
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // Payment operations - strict limits
  PAYMENT: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  
  // Authentication - moderate limits
  LOGIN: { maxRequests: 5, windowSeconds: 300 }, // 5 per 5 minutes
  SIGNUP: { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour
  PASSWORD_RESET: { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour
  
  // Booking operations - reasonable limits
  BOOK_LESSON: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
  CANCEL_LESSON: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  
  // Data queries - generous limits
  READ_SCHEDULE: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
  READ_CLIENT_DATA: { maxRequests: 50, windowSeconds: 60 }, // 50 per minute
  
  // Admin operations - moderate limits
  CREATE_PACKAGE: { maxRequests: 30, windowSeconds: 60 }, // 30 per minute
  UPDATE_SETTINGS: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
} as const;
