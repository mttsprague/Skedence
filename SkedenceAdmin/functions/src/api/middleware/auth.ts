import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Extended Express Request with orgId and tier
 */
export interface AuthenticatedRequest extends Request {
  orgId?: string;
  subscriptionTier?: string;
}

/**
 * Middleware to validate API key and attach orgId to request
 */
export const validateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Include it in the X-API-Key header.',
      });
      return;
    }

    // Hash the provided API key to compare with stored hash
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find organization with matching API key hash
    const orgsSnapshot = await admin.firestore()
      .collection('organizations')
      .where('apiKeyHash', '==', hashedKey)
      .where('apiEnabled', '==', true)
      .limit(1)
      .get();

    if (orgsSnapshot.empty) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid or inactive API key.',
      });
      return;
    }

    const orgDoc = orgsSnapshot.docs[0];
    const orgData = orgDoc.data();

    // Check subscription tier - prefer billing.plan (from Stripe), fallback to subscriptionTier
    const tier = orgData.billing?.plan || orgData.subscriptionTier || 'starter';

    // Verify tier allows API access (Academy or Enterprise)
    const allowedTiers = ['academy', 'enterprise'];
    if (!allowedTiers.includes(tier.toLowerCase())) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'API access requires Academy or Enterprise tier subscription.',
      });
      return;
    }

    // Attach orgId and tier to request
    req.orgId = orgDoc.id;
    req.subscriptionTier = tier;

    // Update last API usage timestamp (non-blocking)
    admin.firestore()
      .collection('organizations')
      .doc(orgDoc.id)
      .update({
        lastApiUsage: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => console.error('Failed to update API usage timestamp:', err));

    next();
  } catch (error) {
    console.error('API authentication error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed.',
    });
  }
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, consider Redis or Firestore-based rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const orgId = req.orgId;
  if (!orgId) {
    next();
    return;
  }

  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const limits = {
    academy: 1000, // 1000 requests per hour
    enterprise: 10000, // 10000 requests per hour
  };

  const limit = limits[req.subscriptionTier as keyof typeof limits] || 1000;

  const record = requestCounts.get(orgId);

  if (!record || now > record.resetTime) {
    // New window
    requestCounts.set(orgId, {
      count: 1,
      resetTime: now + windowMs,
    });
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - 1);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    next();
    return;
  }

  if (record.count >= limit) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${limit} requests per hour.`,
      retryAfter: new Date(record.resetTime).toISOString(),
    });
    return;
  }

  record.count++;
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', limit - record.count);
  res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
  next();
};
