/* eslint-disable quotes */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type {
  CollectionReference,
  DocumentReference,
  QuerySnapshot,
} from "firebase-admin/firestore";

interface DeleteUserAccountData {
  userId: string;
  deleteOwnedOrganizations?: boolean;
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

    const {userId, deleteOwnedOrganizations} = request.data;
    const requestingUserId = request.auth.uid;

    // Verify the user is deleting their own account
    if (userId !== requestingUserId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only delete your own account"
      );
    }

    const db = admin.firestore();
    const shouldDeleteOwnedOrgs = deleteOwnedOrganizations ?? true;

    const recursiveDelete = async (
      ref: DocumentReference | CollectionReference
    ) => {
      // Uses Admin SDK recursive delete to remove subcollections
      await admin.firestore().recursiveDelete(ref);
    };

    const deleteQueryDocs = async (snapshot: QuerySnapshot) => {
      for (const doc of snapshot.docs) {
        await recursiveDelete(doc.ref);
      }
    };

    try {
      console.log(`Starting account deletion for user: ${userId}`);

      // 1. Delete user document and subcollections
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // Delete lessonPackages subcollection and user doc
        await recursiveDelete(userRef);
      }

      // 2. Delete orgMember documents (and org-scoped user packages)
      const orgMembersSnapshot = await db
        .collection("orgMembers")
        .where("userId", "==", userId)
        .get();
      console.log(
        `Deleting ${orgMembersSnapshot.size} org memberships for user ${userId}`
      );
      for (const doc of orgMembersSnapshot.docs) {
        const orgId = doc.data().orgId as string | undefined;
        if (orgId) {
          const orgUserRef = db
            .collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId);
          await recursiveDelete(orgUserRef);
        }
        await doc.ref.delete();
      }

      // 3. Delete bookings where user is the client
      const bookingsSnapshot = await db
        .collection("bookings")
        .where("clientId", "==", userId)
        .get();
      console.log(
        `Deleting ${bookingsSnapshot.size} bookings for user ${userId}`
      );
      await deleteQueryDocs(bookingsSnapshot);

      const bookingsByUidSnapshot = await db
        .collection("bookings")
        .where("clientUID", "==", userId)
        .get();
      if (!bookingsByUidSnapshot.empty) {
        console.log(
          `Deleting ${bookingsByUidSnapshot.size} bookings (clientUID) for user ${userId}`
        );
        await deleteQueryDocs(bookingsByUidSnapshot);
      }

      // 4. Remove user from class participants
      const classesSnapshot = await db
        .collection("classes")
        .where("participantIds", "array-contains", userId)
        .get();
      console.log(
        `Removing user from ${classesSnapshot.size} classes`
      );
      for (const doc of classesSnapshot.docs) {
        const participants = doc.data().participantIds || [];
        const updatedParticipants = participants.filter(
          (id: string) => id !== userId
        );
        await doc.ref.update({
          participantIds: updatedParticipants,
          currentParticipants: updatedParticipants.length,
        });
      }

      // 5. Handle organizations owned by this user (owner/admin)
      const ownedOrgsByOwnerId = await db
        .collection("organizations")
        .where("ownerId", "==", userId)
        .get();
      const ownedOrgsByOwnerUserId = await db
        .collection("organizations")
        .where("ownerUserId", "==", userId)
        .get();

      const ownedOrgIds = new Set<string>();
      ownedOrgsByOwnerId.docs.forEach((doc) => ownedOrgIds.add(doc.id));
      ownedOrgsByOwnerUserId.docs.forEach((doc) => ownedOrgIds.add(doc.id));

      if (ownedOrgIds.size > 0) {
        console.log(`User ${userId} owns ${ownedOrgIds.size} organizations`);
        if (!shouldDeleteOwnedOrgs) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Cannot delete account while owning organizations. Please transfer ownership or delete organizations first."
          );
        }

        for (const orgId of ownedOrgIds) {
          console.log(`Deleting organization ${orgId}`);

          // Delete orgMembers for this org
          const orgMembers = await db
            .collection("orgMembers")
            .where("orgId", "==", orgId)
            .get();
          await deleteQueryDocs(orgMembers);

          // Delete bookings for this org
          const orgBookings = await db
            .collection("bookings")
            .where("orgId", "==", orgId)
            .get();
          await deleteQueryDocs(orgBookings);

          // Delete classes for this org
          const orgClasses = await db
            .collection("classes")
            .where("orgId", "==", orgId)
            .get();
          await deleteQueryDocs(orgClasses);

          // Delete locations for this org
          const orgLocations = await db
            .collection("locations")
            .where("orgId", "==", orgId)
            .get();
          await deleteQueryDocs(orgLocations);

          // Delete trainers for this org (includes schedules subcollection)
          const orgTrainers = await db
            .collection("trainers")
            .where("orgId", "==", orgId)
            .get();
          await deleteQueryDocs(orgTrainers);

          // Delete org document and subcollections
          const orgRef = db.collection("organizations").doc(orgId);
          await recursiveDelete(orgRef);
        }
      }

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
