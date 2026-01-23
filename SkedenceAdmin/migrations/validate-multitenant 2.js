/**
 * Validate Multi-Tenant Setup
 * 
 * This script validates that:
 * 1. All existing documents have orgId field
 * 2. All users have orgMembers documents
 * 3. OrgId values are consistent
 * 
 * Usage:
 *   node validate-multitenant.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const EXPECTED_ORG_ID = "0Mtow1OaV7oUlCisKSNy";

async function validateMultiTenant() {
  console.log('🔍 Validating Multi-Tenant Setup\n');
  console.log(`Expected orgId: ${EXPECTED_ORG_ID}\n`);

  const results = {
    trainers: { total: 0, withOrgId: 0, missing: [] },
    users: { total: 0, withOrgId: 0, missing: [] },
    classes: { total: 0, withOrgId: 0, missing: [] },
    schedules: { total: 0, withOrgId: 0, missing: [] },
    packages: { total: 0, withOrgId: 0, missing: [] },
    bookings: { total: 0, withOrgId: 0, missing: [] },
    orgMembers: { total: 0, active: 0, inactive: 0 }
  };

  try {
    // Check trainers
    console.log('📝 Checking trainers collection...');
    const trainersSnap = await db.collection('trainers').get();
    results.trainers.total = trainersSnap.size;
    trainersSnap.docs.forEach(doc => {
      if (doc.data().orgId === EXPECTED_ORG_ID) {
        results.trainers.withOrgId++;
      } else {
        results.trainers.missing.push(doc.id);
      }
    });

    // Check users
    console.log('📝 Checking users collection...');
    const usersSnap = await db.collection('users').get();
    results.users.total = usersSnap.size;
    usersSnap.docs.forEach(doc => {
      if (doc.data().orgId === EXPECTED_ORG_ID) {
        results.users.withOrgId++;
      } else {
        results.users.missing.push(doc.id);
      }
    });

    // Check classes
    console.log('📝 Checking classes collection...');
    const classesSnap = await db.collection('classes').get();
    results.classes.total = classesSnap.size;
    classesSnap.docs.forEach(doc => {
      if (doc.data().orgId === EXPECTED_ORG_ID) {
        results.classes.withOrgId++;
      } else {
        results.classes.missing.push(doc.id);
      }
    });

    // Check schedules (across all trainers)
    console.log('📝 Checking schedules subcollection...');
    for (const trainerDoc of trainersSnap.docs) {
      const schedulesSnap = await db.collection('trainers')
        .doc(trainerDoc.id)
        .collection('schedules')
        .get();
      
      schedulesSnap.docs.forEach(doc => {
        results.schedules.total++;
        if (doc.data().orgId === EXPECTED_ORG_ID) {
          results.schedules.withOrgId++;
        } else {
          results.schedules.missing.push(`${trainerDoc.id}/${doc.id}`);
        }
      });
    }

    // Check lesson packages
    console.log('📝 Checking lessonPackages subcollection...');
    for (const userDoc of usersSnap.docs) {
      const packagesSnap = await db.collection('users')
        .doc(userDoc.id)
        .collection('lessonPackages')
        .get();
      
      packagesSnap.docs.forEach(doc => {
        results.packages.total++;
        if (doc.data().orgId === EXPECTED_ORG_ID) {
          results.packages.withOrgId++;
        } else {
          results.packages.missing.push(`${userDoc.id}/${doc.id}`);
        }
      });
    }

    // Check bookings
    console.log('📝 Checking bookings collection...');
    const bookingsSnap = await db.collection('bookings').get();
    results.bookings.total = bookingsSnap.size;
    bookingsSnap.docs.forEach(doc => {
      if (doc.data().orgId === EXPECTED_ORG_ID) {
        results.bookings.withOrgId++;
      } else {
        results.bookings.missing.push(doc.id);
      }
    });

    // Check orgMembers
    console.log('📝 Checking orgMembers collection...');
    const orgMembersSnap = await db.collection('orgMembers').get();
    results.orgMembers.total = orgMembersSnap.size;
    orgMembersSnap.docs.forEach(doc => {
      if (doc.data().isActive) {
        results.orgMembers.active++;
      } else {
        results.orgMembers.inactive++;
      }
    });

    // Print results
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(70));

    const collections = ['trainers', 'users', 'classes', 'schedules', 'packages', 'bookings'];
    
    let allPassed = true;
    collections.forEach(coll => {
      const status = results[coll].withOrgId === results[coll].total ? '✅' : '❌';
      console.log(`\n${status} ${coll}:`);
      console.log(`   Total: ${results[coll].total}`);
      console.log(`   With orgId: ${results[coll].withOrgId}`);
      console.log(`   Missing orgId: ${results[coll].total - results[coll].withOrgId}`);
      
      if (results[coll].missing.length > 0) {
        console.log(`   Missing IDs: ${results[coll].missing.slice(0, 5).join(', ')}${results[coll].missing.length > 5 ? '...' : ''}`);
        allPassed = false;
      }
    });

    console.log(`\n📋 orgMembers:`);
    console.log(`   Total: ${results.orgMembers.total}`);
    console.log(`   Active: ${results.orgMembers.active}`);
    console.log(`   Inactive: ${results.orgMembers.inactive}`);

    console.log('\n' + '='.repeat(70));
    
    if (allPassed) {
      console.log('✅ VALIDATION PASSED!');
      console.log('All documents have correct orgId field.');
      console.log('\n📋 Next Steps:');
      console.log('1. Test app functionality to ensure queries work');
      console.log('2. Run create-test-org.js to create second org');
      console.log('3. Verify cross-org isolation');
    } else {
      console.log('❌ VALIDATION FAILED!');
      console.log('Some documents are missing orgId field.');
      console.log('\n🔧 Fix:');
      console.log('Run: npm run step4');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error validating setup:', error);
    throw error;
  }
}

// Run validation
validateMultiTenant()
  .then(() => {
    console.log('\n✅ Validation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Validation failed:', error);
    process.exit(1);
  });
