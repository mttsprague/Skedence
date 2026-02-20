/**
 * ID Generator Utility
 * Generates human-readable document IDs for Firestore
 */

import { Firestore, getFirestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

// Sanitize a name for use in a document ID
export function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase();
}

// Check if a document exists in a collection
async function documentExists(
  db: Firestore,
  collection: string,
  documentId: string
): Promise<boolean> {
  const docRef = doc(db, collection, documentId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

// Generate a unique ID for a given collection
async function generateUniqueId(
  db: Firestore,
  baseName: string,
  collection: string
): Promise<string> {
  const sanitized = sanitizeName(baseName);
  let id = sanitized;
  let counter = 2;

  // Check if ID exists, append number if needed
  while (await documentExists(db, collection, id)) {
    id = `${sanitized}_${counter}`;
    counter++;
  }

  return id;
}

// Generate a unique user ID based on first and last name
// Format: firstName_lastName or firstName_lastName_2 if collision
export async function generateUserId(
  db: Firestore,
  firstName: string,
  lastName: string
): Promise<string> {
  const baseName = `${firstName}_${lastName}`;
  return generateUniqueId(db, baseName, 'users');
}

// Generate a unique trainer ID based on first and last name
// Format: firstName_lastName or firstName_lastName_2 if collision
export async function generateTrainerId(
  db: Firestore,
  firstName: string,
  lastName: string
): Promise<string> {
  const baseName = `${firstName}_${lastName}`;
  return generateUniqueId(db, baseName, 'trainers');
}

// Generate a unique organization ID based on organization name
// Format: organizationName or organizationName_2 if collision
export async function generateOrganizationId(
  db: Firestore,
  name: string
): Promise<string> {
  return generateUniqueId(db, name, 'organizations');
}
