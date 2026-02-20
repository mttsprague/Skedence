/**
 * Web Registration Cloud Function
 * 
 * Handles business registration from the web admin portal.
 * This bypasses client-side security rules which don't work with Next.js static exports.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from 'firebase-admin';

// Characters for invite code generation (excludes confusing characters like O, I, 0, 1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a unique 6-character invite code
 */
async function generateUniqueInviteCode(db: admin.firestore.Firestore): Promise<string> {
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 6-character code
    code = Array.from({ length: 6 }, () => 
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join('');

    // Check if code already exists
    const snapshot = await db.collection('organizations')
      .where('inviteCode', '==', code)
      .limit(1)
      .get();

    isUnique = snapshot.empty;
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique invite code after ' + maxAttempts + ' attempts');
  }

  return code!;
}

interface CreateOrgData {
  idToken: string; // NEW: Pass ID token explicitly for static export compatibility
  orgId: string;
  trainerId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone?: string;
  currency?: string;
}

/**
 * Create a new organization and owner account
 * Called after Firebase Auth user is created on the client
 * 
 * NOTE: Accepts idToken explicitly to work with Next.js static export
 */
export const createOrganizationFromWeb = onCall(
  { enforceAppCheck: false }, // Temporarily disable AppCheck for testing
  async (request) => {
    const db = admin.firestore();
    
    const { idToken } = request.data as CreateOrgData;
    
    // Verify ID token manually (for Next.js static export compatibility)
    let authUserId: string;
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      authUserId = decodedToken.uid;
      logger.info(`✅ Token verified for user: ${authUserId}`);
    } catch (error) {
      logger.error('❌ Token verification failed:', error);
      throw new HttpsError(
        'unauthenticated',
        'Invalid authentication token'
      );
    }
    
    // Validate required fields
    const { 
      orgId, 
      trainerId, 
      businessName, 
      firstName, 
      lastName, 
      email, 
      phone, 
      timezone, 
      currency 
    } = request.data as CreateOrgData;
    
    if (!orgId || !trainerId || !businessName || !firstName || !lastName || !email || !phone) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: orgId, trainerId, businessName, firstName, lastName, email, phone'
      );
    }
    
    logger.info(`Creating organization: ${orgId} for user: ${authUserId}`);
    
    try {
      // Generate unique 6-character invite code
      const inviteCode = await generateUniqueInviteCode(db);
      logger.info(`✅ Generated invite code: ${inviteCode}`);
      
      // Use a transaction to ensure all documents are created atomically
      await db.runTransaction(async (transaction) => {
        // 1. Create organization document
        const orgRef = db.collection('organizations').doc(orgId);
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        
        const orgData: any = {
          name: businessName,
          ownerUserId: authUserId,
          contactPhone: phone,
          inviteCode: inviteCode,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          onboardingCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
          branding: {
            primaryColor: '#33B2AE',
            logoUrl: ''
          },
          stripe: {
            connectAccountId: null,
            publishableKey: null,
            onboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            onboardingUrl: null
          },
          billing: {
            plan: 'free',
            status: 'trialing',
            isActive: true,
            isInGrace: false,
            trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndsAt)
          },
          settings: {
            timezone: timezone || 'America/New_York',
            currency: currency || 'USD'
          }
        };
        
        transaction.set(orgRef, orgData);
        logger.info(`✅ Created organization: ${orgId}`);
        
        // 2. Create trainer document
        const trainerRef = db.collection('trainers').doc(trainerId);
        const trainerData = {
          orgId: orgId,
          authUserId: authUserId,
          firstName: firstName,
          lastName: lastName,
          email: email,
          active: true,
          isAdmin: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        transaction.set(trainerRef, trainerData);
        logger.info(`✅ Created trainer: ${trainerId}`);
        
        // 3. Create dual-path orgMembers
        const memberData = {
          orgId: orgId,
          userId: trainerId,
          authUserId: authUserId,
          role: 'owner',
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Name-based ID: {trainerId}_{orgId}
        const memberRef1 = db.collection('orgMembers').doc(`${trainerId}_${orgId}`);
        transaction.set(memberRef1, memberData);
        logger.info(`✅ Created orgMembers: ${trainerId}_${orgId}`);
        
        // Auth UID-based ID: {authUserId}_{orgId}
        const memberRef2 = db.collection('orgMembers').doc(`${authUserId}_${orgId}`);
        transaction.set(memberRef2, memberData);
        logger.info(`✅ Created orgMembers: ${authUserId}_${orgId}`);
      });
      
      logger.info(`✅ Successfully created organization ${orgId} for user ${authUserId}`);
      
      return {
        success: true,
        orgId: orgId,
        trainerId: trainerId,
        inviteCode: inviteCode,
        message: 'Organization created successfully'
      };
      
    } catch (error: any) {
      logger.error('Error creating organization:', error);
      throw new HttpsError(
        'internal',
        `Failed to create organization: ${error.message}`
      );
    }
  }
);
