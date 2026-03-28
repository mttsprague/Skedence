/**
 * List All Blog Post Slugs
 * Shows all blog posts with their slugs to help create complete date mapping
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function listAllSlugs() {
  console.log('📊 Fetching all blog posts from polyface-ae6d3...\n');
  
  const snapshot = await db.collection('blogPosts')
    .orderBy('createdAt', 'desc')
    .get();
  
  if (snapshot.empty) {
    console.log('❌ No blog posts found!');
    process.exit(1);
  }
  
  console.log(`Total posts: ${snapshot.size}\n`);
  console.log('='.repeat(80));
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate();
    const dateStr = createdAt ? createdAt.toISOString().split('T')[0] : 'No date';
    
    console.log(`Date: ${dateStr}`);
    console.log(`Slug: ${data.slug}`);
    console.log(`Title: ${data.title}`);
    console.log('-'.repeat(80));
  }
  
  process.exit(0);
}

listAllSlugs().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
