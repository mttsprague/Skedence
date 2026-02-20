#!/usr/bin/env node

/**
 * Add Invite Code to Organization
 * 
 * This script generates a unique 6-character invite code for an organization
 * that doesn't have one yet.
 * 
 * Usage: 
 *   cd SkedenceAdmin/functions
 *   node ../../add-invite-code.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using application default credentials
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

// Characters for code generation (excludes confusing characters like O, I, 0, 1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a unique 6-character invite code
 */
async function generateUniqueInviteCode() {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 6-character code
    code = Array.from({ length: 6 }, () => 
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join('');

    // Check if code already exists
    const snapshot = await db.collection('organizations')
      .where('inviteCode', '==', code)
      .limit(1)
      .get();

    isUnique = snapshot.empty;
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique code after ' + maxAttempts + ' attempts');
  }

  return code;
}

/**
 * Add invite code to an organization
 */
async function addInviteCodeToOrg(orgId) {
  try {
    // Check if organization exists
    const orgRef = db.collection('organizations').doc(orgId);
    const orgDoc = await orgRef.get();

    if (!orgDoc.exists) {
      console.error(`❌ Organization with ID "${orgId}" not found`);
      process.exit(1);
    }

    const orgData = orgDoc.data();
    
    // Check if it already has an invite code
    if (orgData.inviteCode) {
      console.log(`✅ Organization "${orgData.name}" already has invite code: ${orgData.inviteCode}`);
      process.exit(0);
    }

    // Generate new unique code
    console.log('🔄 Generating unique invite code...');
    const inviteCode = await generateUniqueInviteCode();

    // Update organization with invite code
    await orgRef.update({
      inviteCode: inviteCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Successfully added invite code to organization');
    console.log('');
    console.log(`Organization: ${orgData.name}`);
    console.log(`Invite Code: ${inviteCode}`);
    console.log('');
    console.log('Clients can now use this code to join your organization!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Add invite codes to ALL organizations that don't have one
 */
async function addInviteCodesToAllOrgs() {
  try {
    console.log('🔄 Checking all organizations for missing invite codes...\n');

    const orgsSnapshot = await db.collection('organizations').get();
    const orgsMissingCode = [];

    for (const doc of orgsSnapshot.docs) {
      const orgData = doc.data();
      if (!orgData.inviteCode) {
        orgsMissingCode.push({ id: doc.id, name: orgData.name || 'Unnamed' });
      }
    }

    if (orgsMissingCode.length === 0) {
      console.log('✅ All organizations already have invite codes!');
      return;
    }

    console.log(`Found ${orgsMissingCode.length} organization(s) without invite codes:\n`);
    
    for (const org of orgsMissingCode) {
      console.log(`Processing: ${org.name} (${org.id})`);
      
      const inviteCode = await generateUniqueInviteCode();
      await db.collection('organizations').doc(org.id).update({
        inviteCode: inviteCode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`  ✅ Added code: ${inviteCode}\n`);
    }

    console.log('✅ All organizations now have invite codes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Adding invite codes to all organizations without one...\n');
  addInviteCodesToAllOrgs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else if (args.length === 1) {
  const orgId = args[0];
  console.log(`Adding invite code to organization: ${orgId}\n`);
  addInviteCodeToOrg(orgId)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  node add-invite-code.js           # Add codes to all orgs missing them');
  console.log('  node add-invite-code.js <orgId>   # Add code to specific org');
  process.exit(1);
}
