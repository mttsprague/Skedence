import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Cloud Function to delete all lesson packages purchased from a specific pricing package
 * Called when an owner deletes a pricing package from the pricing structure
 */
interface DeletePricingPackageData {
  orgId: string;
  packageType: string; // The packageType of the pricing package being deleted (used to match purchased passes)
}

export const deletePricingPackageLessons = functions.https.onCall(
  { enforceAppCheck: true },
  async (
    request: functions.https.CallableRequest<DeletePricingPackageData>
  ) => {
    // Verify authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to delete pricing packages"
      );
    }

    const {orgId, packageType} = request.data;

    if (!orgId || !packageType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing orgId or packageType"
      );
    }

    try {
      // Verify user is owner or admin of the organization
      // Query by authUserId field (orgMembers docs use trainerId_orgId format)
      const memberQuery = await db
        .collection("orgMembers")
        .where("authUserId", "==", request.auth.uid)
        .where("orgId", "==", orgId)
        .limit(1)
        .get();

      if (memberQuery.empty) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User is not a member of this organization"
        );
      }

      const memberDoc = memberQuery.docs[0];
      const memberData = memberDoc.data();
      const role = memberData?.role;

      if (role !== "owner" && role !== "admin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only owners and admins can delete pricing packages"
        );
      }

      // Get all users in the organization
      const orgMembersSnapshot = await db
        .collection("orgMembers")
        .where("orgId", "==", orgId)
        .get();

      let deletedCount = 0;
      const batch = db.batch();

      // For each user, find and delete their lesson packages that match this pricing package
      for (const memberDoc of orgMembersSnapshot.docs) {
        const userId = memberDoc.data().userId;
        if (!userId) continue;

        // Query STANDARD PATH: organizations/{orgId}/users/{userId}/packages
        // Lesson packages store the pricing package ID in the packageType field
        const standardPathPackagesSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userId)
          .collection("packages")
          .where("packageType", "==", packageType)
          .get();

        // Delete each matching package from standard path
        standardPathPackagesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedCount++;
          functions.logger.info(
            `Deleting lesson package (standard path) ${doc.id} for user ${userId} (packageType: ${packageType})`
          );
        });

        // LEGACY PATH: users/{userId}/lessonPackages (for backward compatibility)
        const legacyPathPackagesSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .where("orgId", "==", orgId)
          .where("packageType", "==", packageType)
          .get();

        // Delete each matching package from legacy path
        legacyPathPackagesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedCount++;
          functions.logger.info(
            `Deleting lesson package (legacy path) ${doc.id} for user ${userId} (packageType: ${packageType})`
          );
        });
      }

      // Commit all deletions
      await batch.commit();

      functions.logger.info(
        `Successfully deleted ${deletedCount} lesson packages for pricing package ${packageType} in org ${orgId}`
      );

      return {
        success: true,
        deletedCount: deletedCount,
        message: `Deleted ${deletedCount} purchased ${deletedCount === 1 ? "pass" : "passes"}`,
      };
    } catch (error) {
      functions.logger.error("Error deleting pricing package lessons:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to delete pricing package lessons: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
