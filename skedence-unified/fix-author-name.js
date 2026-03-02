/**
 * Fix missing authorName field in the 4 newly published blog posts
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

// IDs of the 4 posts that need fixing
const postIds = [
  'LDTjF0za7UVFMCOm83lw', // Volleyball lesson structure
  'cxWnpta2ps7Uv7sX11ko', // Soccer insurance
  'bhuBKzY4hhBgIRBVLRPz', // Basketball gym rental
  'SkFSlDmI33L7DWh3ftvs'  // Baseball pricing tiers
];

async function fixPosts() {
  console.log('🔧 Fixing missing authorName field...\n');
  
  for (const postId of postIds) {
    try {
      await db.collection('blogPosts').doc(postId).update({
        authorName: 'Skedence Team',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Fixed post: ${postId}`);
    } catch (error) {
      console.error(`❌ Error fixing ${postId}:`, error);
    }
  }
  
  console.log('\n✅ All posts fixed!');
  process.exit(0);
}

fixPosts();
