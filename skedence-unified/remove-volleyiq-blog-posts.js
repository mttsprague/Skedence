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
    console.log('🔍 Fetching blog posts from VolleyIQ project...\n');
    
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
    console.log('\n⚠️  Ready to delete. Press Ctrl+C to cancel, or continue to proceed...\n');
    
    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🗑️  Deleting posts from VolleyIQ...\n');
    
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
    console.error('\nTroubleshooting:');
    console.error('1. Make sure you have the correct Firebase project ID for VolleyIQ');
    console.error('2. Run: firebase use <volleyiq-project-id>');
    console.error('3. Verify you have permissions to delete from that project\n');
    process.exit(1);
  }
  
  process.exit(0);
}

// Show help message
console.log('📋 Steps to run this script:');
console.log('');
console.log('1. Find your VolleyIQ Firebase project ID');
console.log('2. Edit this script and replace "volleyiq-project-id" with the actual ID');
console.log('3. Switch Firebase CLI: firebase use <volleyiq-project-id>');
console.log('4. Run: node remove-volleyiq-blog-posts.js');
console.log('5. After completion, switch back: firebase use polyface-ae6d3');
console.log('');
console.log('═'.repeat(80));
console.log('');

// Ask for confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Have you updated the project ID and switched Firebase CLI? (yes/no): ', (answer) => {
  readline.close();
  
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('');
    removeVolleyIQBlogPosts();
  } else {
    console.log('\n⚠️  Please update the script with VolleyIQ project ID first\n');
    process.exit(0);
  }
});
