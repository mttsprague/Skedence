#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

// These are posts that were NOT part of the original 8 publishing sessions
const extraSlugs = [
  'volleyball-highlight-video-length-guide',
  'serve-receive-volleyball-passing-mistakes',
  'college-volleyball-serve-receive-evaluation',
  'how-to-improve-serve-receive-volleyball'
];

async function removeExtraPosts() {
  try {
    console.log('🔍 Finding extra blog posts to remove...\n');
    
    for (const slug of extraSlugs) {
      const snapshot = await db.collection('blogPosts')
        .where('slug', '==', slug)
        .get();
      
      if (snapshot.empty) {
        console.log(`⚠️  Post not found: ${slug}`);
        continue;
      }
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        console.log(`🗑️  Deleting: ${data.title}`);
        console.log(`    Slug: ${slug}`);
        console.log(`    ID: ${doc.id}\n`);
        await doc.ref.delete();
      }
    }
    
    console.log('✅ Cleanup complete!');
    console.log('📊 You should now have exactly 32 blog posts (8 sessions × 4 posts)\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

removeExtraPosts();
