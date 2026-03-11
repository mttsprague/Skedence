/**
 * Check Organization Membership for Cancel Booking Issue
 * 
 * This script checks if the user's authentication UID properly matches
 * their orgMembers document, which is required for canceling bookings.
 * 
 * Usage:
 * node check-org-membership.js YOUR_EMAIL
 * 
 * Example:
 * node check-org-membership.js matt@example.com
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
  console.log('✅ Firebase Admin initialized successfully\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('Make sure you are logged in with Firebase CLI: firebase login');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function checkOrgMembership(email) {
  console.log(`🔍 Checking organization membership for: ${email}\n`);
  
  try {
    // 1. Get user from Firebase Auth by email
    const userRecord = await auth.getUserByEmail(email);
    const authUid = userRecord.uid;
    console.log(`✅ Firebase Auth UID: ${authUid}\n`);
    
    // 2. Find user in trainers collection (you're an admin/trainer)
    const trainersSnapshot = await db.collection('trainers')
      .where('email', '==', email)
      .get();
    
    if (!trainersSnapshot.empty) {
      console.log('📋 Trainer Documents:');
      trainersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   Document ID: ${doc.id}`);
        console.log(`   Name: ${data.firstName} ${data.lastName}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   OrgId: ${data.orgId}`);
        console.log(`   Role: ${data.role || 'Not set'}`);
        console.log(`   AuthUserId: ${data.authUserId || data.userId || 'NOT SET'}`);
        console.log('');
      });
    }
    
    // 3. Check orgMembers collection for this auth UID
    const orgMembersSnapshot = await db.collection('orgMembers').get();
    
    const userMemberships = [];
    const allMemberships = [];
    
    orgMembersSnapshot.forEach(doc => {
      const data = doc.data();
      allMemberships.push({
        id: doc.id,
        userId: data.userId,
        orgId: data.orgId,
        role: data.role
      });
      
      if (doc.id.startsWith(authUid)) {
        userMemberships.push({
          id: doc.id,
          orgId: data.orgId,
          role: data.role,
          isActive: data.isActive
        });
      }
    });
    
    console.log('📊 Your orgMembers Documents:');
    if (userMemberships.length === 0) {
      console.log('   ❌ NO orgMembers documents found with your Auth UID!');
      console.log(`   Expected format: ${authUid}_ORGID\n`);
      
      // Check if there are old-format memberships
      console.log('🔍 Checking for legacy membership documents...');
      const legacyMemberships = allMemberships.filter(m => 
        m.userId === authUid || 
        trainersSnapshot.docs.some(doc => doc.id === m.userId)
      );
      
      if (legacyMemberships.length > 0) {
        console.log('   ⚠️  Found legacy membership documents:');
        legacyMemberships.forEach(m => {
          console.log(`      Document ID: ${m.id}`);
          console.log(`      OrgId: ${m.orgId}`);
          console.log(`      Role: ${m.role}`);
          console.log(`      UserId: ${m.userId}`);
          console.log('');
        });
        console.log('   ℹ️  These need to be migrated to new format: {authUid}_{orgId}\n');
      }
    } else {
      console.log('   ✅ Found membership documents:');
      userMemberships.forEach(m => {
        console.log(`      Document ID: ${m.id}`);
        console.log(`      OrgId: ${m.orgId}`);
        console.log(`      Role: ${m.role}`);
        console.log(`      Active: ${m.isActive}`);
        console.log('');
      });
    }
    
    // 4. Check organizations the user should have access to
    if (!trainersSnapshot.empty) {
      console.log('📁 Expected Organization Access:');
      trainersSnapshot.forEach(doc => {
        const data = doc.data();
        const expectedMembershipId = `${authUid}_${data.orgId}`;
        const exists = userMemberships.some(m => m.id === expectedMembershipId);
        
        console.log(`   OrgId: ${data.orgId}`);
        console.log(`   Expected Document ID: ${expectedMembershipId}`);
        console.log(`   Exists: ${exists ? '✅' : '❌'}`);
        
        if (!exists) {
          console.log(`   🔧 NEEDS FIX: Create orgMembers/${expectedMembershipId}`);
        }
        console.log('');
      });
    }
    
    // 5. Provide fix commands
    if (userMemberships.length === 0 && !trainersSnapshot.empty) {
      console.log('\n' + '='.repeat(60));
      console.log('🔧 RECOMMENDED FIX');
      console.log('='.repeat(60));
      console.log('Run this script to create missing orgMembers documents:');
      console.log('node fix-org-membership.js ' + email);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('No Firebase Auth user found with that email.');
    }
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node check-org-membership.js YOUR_EMAIL');
  console.error('Example: node check-org-membership.js matt@example.com');
  process.exit(1);
}

checkOrgMembership(email)
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
