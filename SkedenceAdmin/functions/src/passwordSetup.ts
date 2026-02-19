import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";

interface SetupPasswordData {
  email: string;
  password: string;
  token: string;
  trainerId: string;
}

/**
 * Cloud Function to set/reset trainer password during setup
 * Uses Admin SDK to create or update Firebase Auth account
 */
export const setupTrainerPassword = onCall(
  { enforceAppCheck: true },
  async (request) => {
  const data = request.data as SetupPasswordData;
  const {email, password, token, trainerId} = data;

  // Validate input
  if (!email || !password || !token || !trainerId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required parameters"
    );
  }

  try {
    // Verify token is valid and not expired
    const trainerRef = admin.firestore().collection("trainers").doc(trainerId);
    const trainerDoc = await trainerRef.get();

    if (!trainerDoc.exists) {
      throw new HttpsError("not-found", "Trainer not found");
    }

    const trainerData = trainerDoc.data();

    if (!trainerData?.setupToken || trainerData.setupToken !== token) {
      throw new HttpsError(
        "permission-denied",
        "Invalid setup token"
      );
    }

    if (
      trainerData.setupTokenExpiry &&
      trainerData.setupTokenExpiry.toDate() < new Date()
    ) {
      throw new HttpsError(
        "permission-denied",
        "Setup token has expired. Please request a new invitation."
      );
    }

    // Check if Firebase Auth user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      // User exists - update their password
      await admin.auth().updateUser(userRecord.uid, {
        password: password,
        emailVerified: true,
      });
      console.log(`Updated password for existing user: ${email}`);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // User doesn't exist - create new account
        userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: true,
        });
        console.log(`Created new Firebase Auth user: ${email}`);
      } else {
        throw error;
      }
    }

    const orgId = trainerData.orgId;
    const userId = userRecord.uid;

    // Create or update orgMembers document (junction table)
    const orgMemberId = `${userId}_${orgId}`;
    const orgMemberRef = admin.firestore().collection("orgMembers").doc(orgMemberId);

    await orgMemberRef.set({
      userId: userId,
      orgId: orgId,
      role: "trainer",
      isActive: true,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    console.log(`Created orgMembers document: ${orgMemberId}`);

    // Update trainer document to remove setup token and mark as active
    await trainerRef.update({
      setupToken: null,
      setupTokenExpiry: null,
      isActive: true,
      passwordSetupCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Password set successfully",
    };
  } catch (error: any) {
    console.error("Password setup error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      "An error occurred during password setup"
    );
  }
});
