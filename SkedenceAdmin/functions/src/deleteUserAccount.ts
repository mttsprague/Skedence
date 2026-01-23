/* eslint-disable quotes */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface DeleteUserAccountData {
  userId: string;
}

/**
 * Cloud Function to delete a user account and all associated data
 * This is a destructive operation that permanently removes:
 * - User document
 * - User subcollections (lessonPackages, bookings, etc.)
 * - OrgMember documents
 * - Bookings where user is the client
 * - Firebase Auth account
 */
export const deleteUserAccount = functions.https.onCall(
  async (request: functions.https.CallableRequest<DeleteUserAccountData>) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to delete account"
      );
    }

    const {userId} = request.data;
    const requestingUserId = request.auth.uid;

    // Verify the user is deleting their own account
    if (userId !== requestingUserId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only delete your own account"
      );
    }

    const db = admin.firestore();
    const batch = db.batch();

    try {
      console.log(`Starting account deletion for user: ${userId}`);

      // 1. Delete user document and subcollections
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // Delete lessonPackages subcollection
        const packagesSnapshot = await userRef
          .collection("lessonPackages")
          .get();
        console.log(
          `Deleting ${packagesSnapshot.size} lesson packages for user ${userId}`
        );
        packagesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Delete user document
        batch.delete(userRef);
      }

      // 2. Delete orgMember documents
      const orgMembersSnapshot = await db
        .collection("orgMembers")
        .where("userId", "==", userId)
        .get();
      console.log(
        `Deleting ${orgMembersSnapshot.size} org memberships for user ${userId}`
      );
      orgMembersSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Delete bookings where user is the client
      const bookingsSnapshot = await db
        .collection("bookings")
        .where("clientId", "==", userId)
        .get();
      console.log(
        `Deleting ${bookingsSnapshot.size} bookings for user ${userId}`
      );
      bookingsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Remove user from class participants
      const classesSnapshot = await db
        .collection("classes")
        .where("participantIds", "array-contains", userId)
        .get();
      console.log(
        `Removing user from ${classesSnapshot.size} classes`
      );
      classesSnapshot.docs.forEach((doc) => {
        const participants = doc.data().participantIds || [];
        const updatedParticipants = participants.filter(
          (id: string) => id !== userId
        );
        batch.update(doc.ref, {
          participantIds: updatedParticipants,
          currentParticipants: updatedParticipants.length,
        });
      });

      // 5. Check if user has any pending organizations (as owner)
      const orgsSnapshot = await db
        .collection("organizations")
        .where("ownerId", "==", userId)
        .get();

      if (!orgsSnapshot.empty) {
        console.log(
          `User ${userId} owns ${orgsSnapshot.size} organizations - cannot delete`
        );
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Cannot delete account while owning organizations. Please transfer ownership or delete organizations first."
        );
      }

      // Commit all Firestore deletions
      await batch.commit();
      console.log(`Firestore data deleted for user ${userId}`);

      // 6. Delete Firebase Auth account (must be done after Firestore)
      await admin.auth().deleteUser(userId);
      console.log(`Firebase Auth account deleted for user ${userId}`);

      return {
        success: true,
        message: "Account successfully deleted",
      };
    } catch (error) {
      console.error(`Error deleting account for user ${userId}:`, error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        `Failed to delete account: ${error}`
      );
    }
  }
);
