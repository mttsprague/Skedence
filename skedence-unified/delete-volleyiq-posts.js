#!/usr/bin/env node

const admin = require('firebase-admin');

console.log('⚠️  WARNING: This script will DELETE blog posts from the VolleyIQ project');
console.log('📍 Skedence website reads from polyface-ae6d3 and will NOT be affected\n');

// Initialize Firebase Admin SDK for VolleyIQ project
const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'volleyiq-7ec77'
});

const db = admin.firestore();

async function removeVolleyIQBlogPosts() {
  try {
    console.log('🔍 Fetching blog posts from VolleyIQ (volleyiq-7ec77)...\n');
    
    const snapshot = await db.collection('blogPosts').get();
    
    if (snapshot.empty) {
      console.log('✅ No blog posts found in VolleyIQ project');
      console.log('   (They may have already been removed)\n');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} blog posts in VolleyIQ\n`);
    console.log('Posts to be deleted:');
    console.log('═'.repeat(80));
    
    const postsToDelete = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  • ${data.title || 'Untitled'}`);
      console.log(`    Slug: ${data.slug || 'no-slug'}`);
      console.log(`    ID: ${doc.id}\n`);
      postsToDelete.push({ id: doc.id, title: data.title });
    });
    
    console.log('═'.repeat(80));
    console.log(`\n🗑️  Deleting ${postsToDelete.length} posts from VolleyIQ...\n`);
    
    let deleted = 0;
    for (const post of postsToDelete) {
      try {
        await db.collection('blogPosts').doc(post.id).delete();
        console.log(`  ✅ Deleted: ${post.title}`);
        deleted++;
      } catch (error) {
        console.log(`  ❌ Failed to delete: ${post.title}`);
        console.log(`     Error: ${error.message}`);
      }
    }
    
    console.log('\n═'.repeat(80));
    console.log(`✅ Cleanup complete!`);
    console.log(`📊 Deleted ${deleted} of ${postsToDelete.length} posts from VolleyIQ\n`);
    console.log('🌐 Skedence website (reading from polyface-ae6d3) is unaffected');
    console.log('   Verify at: https://skedence.com/blog\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

removeVolleyIQBlogPosts();
