/**
 * Web Registration Cloud Function
 * 
 * Handles business registration from the web admin portal.
 * This bypasses client-side security rules which don't work with Next.js static exports.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from 'firebase-admin';

interface CreateOrgData {
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
 */
export const createOrganizationFromWeb = onCall(
  { enforceAppCheck: false }, // Temporarily disable AppCheck for testing
  async (request) => {
    const db = admin.firestore();
    
    // Verify the user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to create an organization'
      );
    }
    
    const authUserId = request.auth.uid;
    
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
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
