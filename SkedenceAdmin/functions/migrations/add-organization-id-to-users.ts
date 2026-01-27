/**
 * Migration script to add organizationId field to user documents
 * Run with: npx ts-node migrations/add-organization-id-to-users.ts
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var or default credentials)
admin.initializeApp({
  projectId: "polyface-ae6d3",
});

const db = admin.firestore();

async function migrateUserOrganizationIds() {
  console.log("Starting migration: adding organizationId to user documents...\n");

  try {
    // Get all orgMembers from the ROOT collection
    const orgMembersSnapshot = await db.collection("orgMembers").get();
    console.log(`Found ${orgMembersSnapshot.size} orgMembers\n`);

    let totalUsers = 0;
    let updatedUsers = 0;
    let skippedUsers = 0;
    let errors = 0;

    for (const memberDoc of orgMembersSnapshot.docs) {
      const memberData = memberDoc.data();
      const userId = memberData.userId;
      const orgId = memberData.orgId;

      if (!userId || !orgId) {
        console.log(`⚠️  Skipping member ${memberDoc.id} - missing userId or orgId`);
        continue;
      }

      totalUsers++;

      try {
        // Get the user document
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          console.log(`⚠️  User ${userId} not found in users collection`);
          skippedUsers++;
          continue;
        }

        const userData = userDoc.data();

        // Check if organizationId is already set
        if (userData?.organizationId) {
          if (userData.organizationId === orgId) {
            console.log(`✓ User ${userId} already has correct organizationId`);
            skippedUsers++;
          } else {
            console.log(`⚠️  User ${userId} has different organizationId: ${userData.organizationId} (orgMembers says: ${orgId})`);
            skippedUsers++;
          }
          continue;
        }

        // Update the user document with organizationId
        await userRef.update({
          organizationId: orgId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Updated user ${userId} with organizationId: ${orgId}`);
        updatedUsers++;
      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error);
        errors++;
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total users processed: ${totalUsers}`);
    console.log(`Users updated: ${updatedUsers}`);
    console.log(`Users skipped: ${skippedUsers}`);
    console.log(`Errors: ${errors}`);
    console.log("\nMigration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateUserOrganizationIds();
