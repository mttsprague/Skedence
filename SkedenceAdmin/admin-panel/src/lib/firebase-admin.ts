import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;
let db: Firestore;
let auth: Auth;

/**
 * Initialize Firebase Admin SDK
 * This should be called once per server instance
 */
export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Try to use service account key from environment variable
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccount) {
        const serviceAccountJson = JSON.parse(serviceAccount);
        adminApp = initializeApp({
          credential: cert(serviceAccountJson),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        // Fallback to default credentials (useful for local development)
        adminApp = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }

      db = getFirestore(adminApp);
      auth = getAuth(adminApp);
      
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  } else {
    adminApp = getApps()[0];
    db = getFirestore(adminApp);
    auth = getAuth(adminApp);
  }

  return { adminApp, db, auth };
}

/**
 * Get Firestore instance
 */
export function getFirestoreAdmin(): Firestore {
  if (!db) {
    const initialized = initializeFirebaseAdmin();
    db = initialized.db;
  }
  return db;
}

/**
 * Get Auth instance
 */
export function getAuthAdmin(): Auth {
  if (!auth) {
    const initialized = initializeFirebaseAdmin();
    auth = initialized.auth;
  }
  return auth;
}
