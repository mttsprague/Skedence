/**
 * STEP 2: Create Organization Layer
 * 
 * This script creates the initial organization structure for SaaS conversion.
 * Run this ONCE to set up the organization layer.
 * 
 * Usage:
 *   node step2-create-org-layer.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createOrganizationLayer() {
  console.log('🚀 Starting Step 2: Create Organization Layer\n');

  try {
    // Step 2.1: Create the initial organization
    const orgData = {
      name: "Polyface Volleyball Academy",
      ownerUserId: "ly5wJgGJZAT7wLyepLiZWcPRKTv2",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      branding: {
        logoUrl: "",
        primaryColor: "#007AFF", // Default iOS blue
        appDisplayName: "Polyface Volleyball Academy"
      },
      stripe: {
        connectAccountId: "", // Will be filled later with Stripe Connect
        chargesEnabled: false
      },
      settings: {
        timezone: "America/Chicago",
        bookingWindowDays: 30,
        cancellationHours: 24,
        allowReschedule: true
      }
    };

    // Create the organization document
    const orgRef = db.collection('organizations').doc();
    await orgRef.set(orgData);
    
    console.log('✅ Created organization document');
    console.log(`   Organization ID: ${orgRef.id}`);
    console.log(`   Name: ${orgData.name}`);
    console.log(`   Status: ${orgData.status}\n`);

    // Save the org ID for next steps
    console.log('📝 IMPORTANT: Save this Organization ID for Step 3 and beyond:');
    console.log(`   ORG_ID="${orgRef.id}"\n`);

    console.log('✅ Step 2 Complete!\n');
    console.log('Next steps:');
    console.log('  1. Update ownerUserId in the organization document');
    console.log('  2. Run step3-create-org-membership.js');
    
    return orgRef.id;

  } catch (error) {
    console.error('❌ Error creating organization layer:', error);
    throw error;
  }
}

// Run the migration
createOrganizationLayer()
  .then((orgId) => {
    console.log('\n🎉 Organization layer created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
