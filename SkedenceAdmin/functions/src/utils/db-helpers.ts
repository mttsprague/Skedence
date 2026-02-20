/**
 * Database Helper Utilities
 * Provides functions to query users/trainers that support both old and new ID patterns
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Get a user document by ID (supports both direct ID and authUserId lookup)
 * @param userId - Either a name-based ID (firstName_lastName) or Firebase Auth UID
 * @returns User document snapshot or null
 */
export async function getUserById(
  userId: string
): Promise<admin.firestore.DocumentSnapshot | null> {
  // Try direct document access first (for name-based IDs)
  const directDoc = await db.collection("users").doc(userId).get();
  if (directDoc.exists) {
    return directDoc;
  }

  // Fallback: Query by authUserId (for Firebase Auth UID)
  const querySnapshot = await db
    .collection("users")
    .where("authUserId", "==", userId)
    .limit(1)
    .get();

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0];
  }

  return null;
}

/**
 * Get a trainer document by ID (supports both direct ID and authUserId lookup)
 * @param trainerId - Either a name-based ID (firstName_lastName) or Firebase Auth UID
 * @returns Trainer document snapshot or null
 */
export async function getTrainerById(
  trainerId: string
): Promise<admin.firestore.DocumentSnapshot | null> {
  // Try direct document access first (for name-based IDs)
  const directDoc = await db.collection("trainers").doc(trainerId).get();
  if (directDoc.exists) {
    return directDoc;
  }

  // Fallback: Query by authUserId (for Firebase Auth UID)
  const querySnapshot = await db
    .collection("trainers")
    .where("authUserId", "==", trainerId)
    .limit(1)
    .get();

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0];
  }

  return null;
}

/**
 * Get organization by ID (supports both direct ID and name lookup)
 * @param orgId - Either a name-based ID or auto-generated ID
 * @returns Organization document snapshot or null
 */
export async function getOrganizationById(
  orgId: string
): Promise<admin.firestore.DocumentSnapshot | null> {
  const doc = await db.collection("organizations").doc(orgId).get();
  return doc.exists ? doc : null;
}

/**
 * Check if a user has an active membership in an organization
 * @param authUserId - Firebase Auth UID
 * @param orgId - Organization ID
 * @returns boolean
 */
export async function isActiveMember(
  authUserId: string,
  orgId: string
): Promise<boolean> {
  // Try auth-based document first (for security rules compatibility)
  const authDoc = await db
    .collection("orgMembers")
    .doc(`${authUserId}_${orgId}`)
    .get();

  if (authDoc.exists && authDoc.data()?.isActive) {
    return true;
  }

  // Fallback: Query by authUserId field
  const querySnapshot = await db
    .collection("orgMembers")
    .where("authUserId", "==", authUserId)
    .where("orgId", "==", orgId)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  return !querySnapshot.empty;
}

/**
 * Get user's role in an organization
 * @param authUserId - Firebase Auth UID
 * @param orgId - Organization ID
 * @returns User's role or null
 */
export async function getUserRole(
  authUserId: string,
  orgId: string
): Promise<string | null> {
  // Try auth-based document first
  const authDoc = await db
    .collection("orgMembers")
    .doc(`${authUserId}_${orgId}`)
    .get();

  if (authDoc.exists) {
    return (authDoc.data()?.role as string) || null;
  }

  // Fallback: Query by authUserId field
  const querySnapshot = await db
    .collection("orgMembers")
    .where("authUserId", "==", authUserId)
    .where("orgId", "==", orgId)
    .limit(1)
    .get();

  if (!querySnapshot.empty) {
    return (querySnapshot.docs[0].data().role as string) || null;
  }

  return null;
}
