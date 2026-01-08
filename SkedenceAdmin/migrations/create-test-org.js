/**
 * Create Second Test Organization
 * 
 * This script creates a second organization to test multi-tenant isolation.
 * Run this only if you want to verify that org A cannot access org B's data.
 * 
 * Usage:
 *   node create-test-org.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse existing service account)
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createTestOrganization() {
  console.log('🚀 Creating second test organization for isolation testing\n');

  try {
    // Create second organization
    const org2Ref = await db.collection('organizations').add({
      name: 'Test Academy 2',
      ownerUserId: 'test-user-2',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      branding: {
        primaryColor: '#FF5722',
        logoUrl: ''
      },
      stripe: {
        accountId: '',
        onboardingComplete: false
      },
      settings: {
        timezone: 'America/New_York',
        currency: 'USD'
      }
    });

    const org2Id = org2Ref.id;
    console.log(`✅ Created test organization: ${org2Id}\n`);

    // Create a test user for org 2
    const testUser2Ref = await db.collection('users').add({
      firstName: 'Test',
      lastName: 'User2',
      emailAddress: 'testuser2@example.com',
      phoneNumber: '555-0002',
      athleteFirstName: 'Athlete',
      athleteLastName: 'Two',
      athleteBirthday: '2010-01-01',
      athletePosition: 'Setter',
      active: true,
      orgId: org2Id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created test user: ${testUser2Ref.id}\n`);

    // Create orgMember for test user
    await db.collection('orgMembers').doc(`${testUser2Ref.id}_${org2Id}`).set({
      orgId: org2Id,
      userId: testUser2Ref.id,
      role: 'client',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created orgMember for test user\n`);

    // Create a test trainer for org 2
    const testTrainer2Ref = await db.collection('trainers').add({
      name: 'Test Trainer 2',
      email: 'testtrainer2@example.com',
      active: true,
      orgId: org2Id
    });

    console.log(`✅ Created test trainer: ${testTrainer2Ref.id}\n`);

    // Create orgMember for test trainer
    await db.collection('orgMembers').doc(`${testTrainer2Ref.id}_${org2Id}`).set({
      orgId: org2Id,
      userId: testTrainer2Ref.id,
      role: 'trainer',
      trainerId: testTrainer2Ref.id,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created orgMember for test trainer\n`);

    // Create a test class for org 2
    const testClass2Ref = await db.collection('classes').add({
      title: 'Test Class - Org 2',
      description: 'A test class for organization 2',
      startTime: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 90000000)),
      maxParticipants: 20,
      currentParticipants: 0,
      location: 'Test Facility 2',
      isOpenForRegistration: true,
      trainerId: testTrainer2Ref.id,
      trainerName: 'Test Trainer 2',
      orgId: org2Id,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created test class: ${testClass2Ref.id}\n`);

    console.log('='.repeat(60));
    console.log('✅ Test Organization Created Successfully!\n');
    console.log('Summary:');
    console.log(`  Organization ID: ${org2Id}`);
    console.log(`  User ID: ${testUser2Ref.id}`);
    console.log(`  Trainer ID: ${testTrainer2Ref.id}`);
    console.log(`  Class ID: ${testClass2Ref.id}`);
    console.log('='.repeat(60));

    console.log('\n📋 Next Steps:');
    console.log('1. Try to query org 2 data while signed in as org 1 user');
    console.log('2. Verify queries return empty or permission denied');
    console.log('3. Sign in as org 2 user and verify they can see their data');
    console.log('4. Confirm org 2 user cannot see org 1 data\n');

    console.log('🔍 Test Queries:');
    console.log(`
// As Org 1 User (should fail or return empty):
db.collection("trainers").where("orgId", "==", "${org2Id}").get()
db.collection("users").where("orgId", "==", "${org2Id}").get()
db.collection("classes").where("orgId", "==", "${org2Id}").get()

// As Org 2 User (should succeed):
db.collection("trainers").where("orgId", "==", "${org2Id}").get()
db.collection("users").where("orgId", "==", "${org2Id}").get()
db.collection("classes").where("orgId", "==", "${org2Id}").get()
    `);

  } catch (error) {
    console.error('❌ Error creating test organization:', error);
    throw error;
  }
}

// Run the script
createTestOrganization()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
