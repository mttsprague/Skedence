/**
 * Fix Organization Membership Documents
 * 
 * This script creates missing orgMembers documents with the correct format
 * {authUid}_{orgId} required by the adminCancelLesson Cloud Function.
 * 
 * Usage:
 * node fix-org-membership.js YOUR_EMAIL
 * 
 * Add --dry-run to preview changes:
 * node fix-org-membership.js YOUR_EMAIL --dry-run
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
const isDryRun = process.argv.includes('--dry-run');

async function fixOrgMembership(email) {
  console.log(`🔧 Fixing organization membership for: ${email}\n`);
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // 1. Get user from Firebase Auth by email
    const userRecord = await auth.getUserByEmail(email);
    const authUid = userRecord.uid;
    console.log(`✅ Firebase Auth UID: ${authUid}\n`);
    
    // 2. Find user in trainers collection
    const trainersSnapshot = await db.collection('trainers')
      .where('email', '==', email)
      .get();
    
    if (trainersSnapshot.empty) {
      console.log('❌ No trainer documents found for this email.');
      console.log('This script only works for trainer/admin accounts.');
      return;
    }
    
    const fixes = [];
    
    for (const trainerDoc of trainersSnapshot.docs) {
      const trainerData = trainerDoc.data();
      const trainerId = trainerDoc.id;
      const orgId = trainerData.orgId;
      
      if (!orgId) {
        console.log(`⚠️  Trainer document ${trainerId} has no orgId - skipping`);
        continue;
      }
      
      console.log(`📋 Trainer: ${trainerData.firstName} ${trainerData.lastName}`);
      console.log(`   Document ID: ${trainerId}`);
      console.log(`   OrgId: ${orgId}`);
      console.log(`   Role: ${trainerData.role || 'trainer'}\n`);
      
      // Check if correct orgMembers doc exists
      const correctMembershipId = `${authUid}_${orgId}`;
      const correctMembershipDoc = await db.collection('orgMembers')
        .doc(correctMembershipId)
        .get();
      
      if (correctMembershipDoc.exists) {
        console.log(`   ✅ Correct orgMembers document already exists: ${correctMembershipId}\n`);
        continue;
      }
      
      // Check for old-format membership
      const oldMembershipId = `${trainerId}_${orgId}`;
      const oldMembershipDoc = await db.collection('orgMembers')
        .doc(oldMembershipId)
        .get();
      
      if (oldMembershipDoc.exists) {
        console.log(`   📝 Found old membership document: ${oldMembershipId}`);
        const oldData = oldMembershipDoc.data();
        
        fixes.push({
          type: 'migrate',
          oldId: oldMembershipId,
          newId: correctMembershipId,
          data: {
            userId: authUid,
            orgId: orgId,
            role: oldData.role || trainerData.role || 'trainer',
            isActive: oldData.isActive !== undefined ? oldData.isActive : true,
            joinedAt: oldData.joinedAt || admin.firestore.FieldValue.serverTimestamp()
          }
        });
      } else {
        console.log(`   📝 No existing membership found - will create new one`);
        
        fixes.push({
          type: 'create',
          newId: correctMembershipId,
          data: {
            userId: authUid,
            orgId: orgId,
            role: trainerData.role || 'trainer',
            isActive: true,
            joinedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        });
      }
    }
    
    if (fixes.length === 0) {
      console.log('\n✅ No fixes needed - all memberships are correct!\n');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FIXES TO APPLY');
    console.log('='.repeat(60));
    
    for (const fix of fixes) {
      if (fix.type === 'migrate') {
        console.log(`\n🔄 Migrate membership:`);
        console.log(`   Old: ${fix.oldId}`);
        console.log(`   New: ${fix.newId}`);
        console.log(`   Data:`, JSON.stringify(fix.data, null, 2));
      } else {
        console.log(`\n➕ Create membership:`);
        console.log(`   Document ID: ${fix.newId}`);
        console.log(`   Data:`, JSON.stringify(fix.data, null, 2));
      }
    }
    
    if (isDryRun) {
      console.log('\n📝 This was a dry run. Run without --dry-run to apply changes.\n');
      return;
    }
    
    // Apply fixes
    console.log('\n🔧 Applying fixes...\n');
    
    for (const fix of fixes) {
      const newRef = db.collection('orgMembers').doc(fix.newId);
      await newRef.set(fix.data);
      console.log(`✅ Created: ${fix.newId}`);
      
      if (fix.type === 'migrate' && fix.oldId) {
        // Keep old document for safety, just mark as migrated
        const oldRef = db.collection('orgMembers').doc(fix.oldId);
        await oldRef.update({
          migratedTo: fix.newId,
          migratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   Marked old document as migrated: ${fix.oldId}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETE');
    console.log('='.repeat(60));
    console.log('You should now be able to cancel bookings.');
    console.log('Try canceling a session again in the admin portal.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('No Firebase Auth user found with that email.');
    }
    process.exit(1);
  }
}

// Get email from command line argument
const emailArg = process.argv[2];

if (!emailArg || emailArg === '--dry-run') {
  console.error('❌ Usage: node fix-org-membership.js YOUR_EMAIL [--dry-run]');
  console.error('Example: node fix-org-membership.js matt@example.com');
  console.error('Preview: node fix-org-membership.js matt@example.com --dry-run');
  process.exit(1);
}

fixOrgMembership(emailArg)
  .then(() => {
    console.log('✅ Script complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
