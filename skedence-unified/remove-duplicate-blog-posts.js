#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function removeDuplicates() {
  try {
    console.log('🔍 Finding duplicate blog posts...\n');
    
    const snapshot = await db.collection('blogPosts').get();
    console.log(`📊 Found ${snapshot.size} total blog posts\n`);
    
    // Group posts by slug
    const postsBySlug = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const slug = data.slug;
      
      if (!postsBySlug[slug]) {
        postsBySlug[slug] = [];
      }
      
      postsBySlug[slug].push({
        id: doc.id,
        slug: slug,
        title: data.title,
        createdAt: data.createdAt?.toDate() || new Date('2026-03-24'),
        updatedAt: data.updatedAt?.toDate() || new Date('2026-03-24'),
      });
    });
    
    // Find duplicates
    const duplicateSlugs = Object.keys(postsBySlug).filter(slug => postsBySlug[slug].length > 1);
    
    console.log(`🔄 Found ${duplicateSlugs.length} slugs with duplicates:\n`);
    
    if (duplicateSlugs.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    let totalDeleted = 0;
    
    for (const slug of duplicateSlugs) {
      const posts = postsBySlug[slug];
      console.log(`\n📝 Slug: ${slug} (${posts.length} copies)`);
      
      // Sort by createdAt (oldest first)
      posts.sort((a, b) => a.createdAt - b.createdAt);
      
      // Keep the oldest post, delete the rest
      const keepPost = posts[0];
      const deletePosts = posts.slice(1);
      
      console.log(`  ✅ Keeping: ${keepPost.id} (created: ${keepPost.createdAt.toISOString().split('T')[0]})`);
      
      for (const post of deletePosts) {
        console.log(`  🗑️  Deleting: ${post.id} (created: ${post.createdAt.toISOString().split('T')[0]})`);
        await db.collection('blogPosts').doc(post.id).delete();
        totalDeleted++;
      }
    }
    
    console.log(`\n\n✅ Cleanup complete!`);
    console.log(`📊 Deleted ${totalDeleted} duplicate posts`);
    console.log(`📊 Remaining: ${snapshot.size - totalDeleted} unique posts`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

removeDuplicates();
