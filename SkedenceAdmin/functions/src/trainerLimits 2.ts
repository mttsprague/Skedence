/**
 * Cloud Functions for enforcing trainer limits based on billing plans
 */

import * as admin from "firebase-admin";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";

const db = admin.firestore();

/**
 * Get trainer limit for a given plan
 * @param {string} plan - The billing plan name
 * @return {number} Maximum number of trainers allowed
 */
function getTrainerLimit(plan: string): number {
  switch (plan.toLowerCase()) {
  case "free":
    return 2; // Owner + 1 trainer during trial
  case "starter":
    return 1;
  case "studio":
    return 5;
  case "academy":
    return 15;
  case "enterprise":
    return 999;
  default:
    return 2;
  }
}

/**
 * Triggered when an organization document is updated.
 * Enforces trainer limits when:
 * 1. Trial expires (status changes from "trialing" to "active")
 * 2. Plan is downgraded
 *
 * Keeps the owner's trainer profile and oldest trainers, removes newest ones.
 */
export const enforceTrainerLimits = onDocumentUpdated(
  "organizations/{orgId}",
  async (event) => {
    const orgId = event.params.orgId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.info("Missing before or after data, skipping");
      return;
    }

    const beforeStatus = beforeData.billing?.status || "unknown";
    const afterStatus = afterData.billing?.status || "unknown";
    const beforePlan = beforeData.billing?.plan || "free";
    const afterPlan = afterData.billing?.plan || "free";

    // Check if billing status or plan changed
    const statusChanged = beforeStatus !== afterStatus;
    const planChanged = beforePlan !== afterPlan;

    if (!statusChanged && !planChanged) {
      logger.info("No billing changes detected, skipping");
      return;
    }

    logger.info(`Organization ${orgId} billing updated:`, {
      statusChange: statusChanged ? `${beforeStatus} -> ${afterStatus}` : "none",
      planChange: planChanged ? `${beforePlan} -> ${afterPlan}` : "none",
    });

    // Get the trainer limit for the new plan
    const trainerLimit = getTrainerLimit(afterPlan);
    logger.info(`Trainer limit for plan ${afterPlan}: ${trainerLimit}`);

    // Get all trainers for this organization
    const trainersSnapshot = await db.collection("trainers")
      .where("orgId", "==", orgId)
      .orderBy("createdAt", "asc") // Keep oldest trainers
      .get();

    const trainers = trainersSnapshot.docs;
    logger.info(`Found ${trainers.length} trainers for org ${orgId}`);

    if (trainers.length <= trainerLimit) {
      logger.info("Trainer count within limit, no action needed");
      return;
    }

    // Find the owner's trainer profile (must keep this one)
    const ownerUserId = afterData.ownerUserId;
    const ownerTrainerIndex = trainers.findIndex(
      (t) => t.data().userId === ownerUserId
    );
    const ownerTrainer = ownerTrainerIndex >= 0 ? trainers[ownerTrainerIndex] : null;

    // Remove owner from the list temporarily
    const nonOwnerTrainers = trainers.filter(
      (t) => t.data().userId !== ownerUserId
    );

    // Calculate how many trainers to remove
    // -1 because owner always stays
    const maxNonOwnerTrainers = ownerTrainer ? trainerLimit - 1 : trainerLimit;
    const trainersToRemove = nonOwnerTrainers.slice(maxNonOwnerTrainers);

    if (trainersToRemove.length === 0) {
      logger.info("No trainers need to be removed");
      return;
    }

    logger.info(`Removing ${trainersToRemove.length} excess trainers`);

    // Remove excess trainers in batch
    const batch = db.batch();
    const removedTrainerIds: string[] = [];
    const removedUserIds: string[] = [];

    for (const trainerDoc of trainersToRemove) {
      const trainerId = trainerDoc.id;
      const trainerData = trainerDoc.data();
      const userId = trainerData.userId;

      removedTrainerIds.push(trainerId);
      if (userId) {
        removedUserIds.push(userId);
      }

      // Delete the trainer document
      batch.delete(trainerDoc.ref);
      logger.info(`Queued deletion of trainer ${trainerId} (user: ${userId})`);

      // Delete the orgMembers entry
      if (userId) {
        const membershipId = `${userId}_${orgId}`;
        const membershipRef = db.collection("orgMembers").doc(membershipId);
        batch.delete(membershipRef);
        logger.info(`Queued deletion of membership ${membershipId}`);
      }
    }

    // Commit the batch
    try {
      await batch.commit();
      logger.info(`Successfully removed ${trainersToRemove.length} trainers and their memberships`);

      // Send notification emails to removed trainers (optional)
      await notifyRemovedTrainers(orgId, afterData.name, removedUserIds);
    } catch (error) {
      logger.error("Error removing trainers:", error);
      throw error;
    }
  }
);

/**
 * Send notification emails to trainers who were removed due to plan limits
 * @param {string} orgId - The organization ID
 * @param {string} orgName - The organization name
 * @param {string[]} userIds - Array of user IDs to notify
 * @return {Promise<void>} Promise that resolves when emails are queued
 */
async function notifyRemovedTrainers(
  orgId: string,
  orgName: string,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;

  logger.info(`Sending removal notifications to ${userIds.length} users`);

  const emailPromises = userIds.map(async (userId) => {
    try {
      // Get user email
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.email) {
        logger.warn(`No email found for user ${userId}`);
        return;
      }

      // Create email in mail collection
      await db.collection("mail").add({
        to: userData.email,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: `Access Removed: ${orgName}`,
          html: generateRemovalEmailHTML(orgName),
        },
      });

      logger.info(`Queued removal email for ${userData.email}`);
    } catch (error) {
      logger.error(`Error sending email to user ${userId}:`, error);
    }
  });

  await Promise.all(emailPromises);
}

/**
 * Generate HTML email for trainer removal notification
 * @param {string} orgName - The organization name
 * @return {string} HTML email content
 */
function generateRemovalEmailHTML(orgName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .content {
          padding: 40px 30px;
        }
        .warning-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 16px;
          margin: 24px 0;
          border-radius: 4px;
        }
        .footer {
          padding: 30px;
          text-align: center;
          color: #666;
          font-size: 14px;
          background: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Access Update</h1>
        </div>
        
        <div class="content">
          <h2 style="margin-top: 0;">Your Trainer Access Has Changed</h2>
          
          <p>Hello,</p>
          
          <p>We're writing to let you know that your trainer access to <strong>${orgName}</strong> has been removed.</p>
          
          <div class="warning-box">
            <strong>Why did this happen?</strong><br>
            The organization's subscription plan changed, which affected the number of trainer accounts available. Your account was removed to comply with their new plan limits.
          </div>
          
          <p>If you believe this was done in error or would like to discuss this change, please contact the organization owner directly.</p>
          
          <p>Thank you for your understanding.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from Skedence.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
