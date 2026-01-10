/**
 * Migration script to add invite codes to existing organizations
 * Run with: node add_invite_codes.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

/**
 * Generate a random 6-character alphanumeric code
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar characters (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if invite code already exists
 */
async function codeExists(code) {
  const snapshot = await db.collection('organizations')
    .where('inviteCode', '==', code)
    .limit(1)
    .get();
  return !snapshot.empty;
}

/**
 * Generate a unique invite code
 */
async function generateUniqueInviteCode() {
  let code;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    code = generateInviteCode();
    attempts++;
    
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique invite code after maximum attempts');
    }
  } while (await codeExists(code));
  
  return code;
}

/**
 * Main migration function
 */
async function addInviteCodes() {
  try {
    console.log('🔄 Starting migration: Adding invite codes to organizations...\n');
    
    // Get all organizations
    const snapshot = await db.collection('organizations').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No organizations found');
      return;
    }
    
    console.log(`📊 Found ${snapshot.docs.length} organizations\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each organization
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const orgName = data.name || 'Unknown';
      
      // Skip if already has invite code
      if (data.inviteCode) {
        console.log(`⏭️  ${orgName} (${doc.id}): Already has code ${data.inviteCode}`);
        skipped++;
        continue;
      }
      
      try {
        // Generate unique invite code
        const inviteCode = await generateUniqueInviteCode();
        
        // Update organization document
        await db.collection('organizations').doc(doc.id).update({
          inviteCode: inviteCode,
          inviteCodeCreatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ ${orgName} (${doc.id}): Added code ${inviteCode}`);
        updated++;
      } catch (error) {
        console.error(`❌ ${orgName} (${doc.id}): Error - ${error.message}`);
        errors++;
      }
    }
    
    // Summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${snapshot.docs.length}`);
    
    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addInviteCodes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
