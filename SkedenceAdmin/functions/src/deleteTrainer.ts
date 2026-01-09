/**
 * Cloud Function to delete a trainer and all associated data
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface DeleteTrainerData {
  trainerId: string;
}

/**
 * Delete a trainer and all their associated data
 * - Trainer profile
 * - orgMembers entry
 * - User document (if they have no other org memberships)
 * - All schedules and availability
 * - All bookings (mark as cancelled)
 */
export const deleteTrainer = functions.https.onCall(
  async (request: functions.https.CallableRequest<DeleteTrainerData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in"
      );
    }

    const {trainerId} = request.data;

    if (!trainerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing trainerId"
      );
    }

    try {
      // Get trainer document
      const trainerDoc = await db.collection("trainers").doc(trainerId).get();

      if (!trainerDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Trainer not found"
        );
      }

      const trainerData = trainerDoc.data();
      if (!trainerData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Trainer data not found"
        );
      }

      const userId = trainerData.userId;
      const orgId = trainerData.orgId;

      // Verify the caller is an admin of the organization
      const callerMembershipId = `${request.auth.uid}_${orgId}`;
      const callerMemberDoc = await db.collection("orgMembers")
        .doc(callerMembershipId)
        .get();

      if (!callerMemberDoc.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not a member of this organization"
        );
      }

      const callerRole = callerMemberDoc.data()?.role;
      if (callerRole !== "owner" && callerRole !== "admin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only owners and admins can delete trainers"
        );
      }

      // Start batch operations
      const batch = db.batch();

      // 1. Delete trainer document
      batch.delete(trainerDoc.ref);
      console.log(`Queued deletion of trainer: ${trainerId}`);

      // 2. Delete orgMembers entry
      if (userId) {
        const membershipId = `${userId}_${orgId}`;
        const membershipRef = db.collection("orgMembers").doc(membershipId);
        batch.delete(membershipRef);
        console.log(`Queued deletion of membership: ${membershipId}`);
      }

      // Commit the batch
      await batch.commit();
      console.log("Batch committed successfully");

      // 3. Delete trainer's schedules (in separate batches due to potential size)
      const schedulesSnapshot = await db.collection("trainers")
        .doc(trainerId)
        .collection("schedules")
        .get();

      if (!schedulesSnapshot.empty) {
        const scheduleBatch = db.batch();
        schedulesSnapshot.docs.forEach((doc) => {
          scheduleBatch.delete(doc.ref);
        });
        await scheduleBatch.commit();
        console.log(`Deleted ${schedulesSnapshot.size} schedule documents`);
      }

      // 4. Cancel all bookings for this trainer
      const bookingsSnapshot = await db.collection("bookings")
        .where("trainerId", "==", trainerId)
        .where("status", "==", "booked")
        .get();

      if (!bookingsSnapshot.empty) {
        const bookingBatch = db.batch();
        bookingsSnapshot.docs.forEach((doc) => {
          bookingBatch.update(doc.ref, {
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: "system",
            cancelReason: "Trainer removed from organization",
          });
        });
        await bookingBatch.commit();
        console.log(`Cancelled ${bookingsSnapshot.size} bookings`);
      }

      // 5. Check if user has other org memberships
      if (userId) {
        const otherMembershipsSnapshot = await db.collection("orgMembers")
          .where("userId", "==", userId)
          .get();

        // If no other memberships, delete the user document
        if (otherMembershipsSnapshot.empty) {
          await db.collection("users").doc(userId).delete();
          console.log(`Deleted user document: ${userId} (no other org memberships)`);
        } else {
          console.log(`User ${userId} has other org memberships, keeping user document`);
        }
      }

      return {
        success: true,
        message: "Trainer deleted successfully",
        trainerId,
        bookingsCancelled: bookingsSnapshot.size,
        schedulesDeleted: schedulesSnapshot.size,
      };
    } catch (error: unknown) {
      console.error("Error deleting trainer:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new functions.https.HttpsError("internal", message);
    }
  }
);
