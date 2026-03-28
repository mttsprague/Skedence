#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function comparePosts() {
  try {
    const slugs = [
      'schedule-private-baseball-lessons-without-texting',
      'private-volleyball-lesson-pricing-2026'
    ];
    
    for (const slug of slugs) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Post: ${slug}\n`);
      
      const snapshot = await db.collection('blogPosts')
        .where('slug', '==', slug)
        .get();
      
      if (snapshot.empty) {
        console.log('❌ Post not found');
        continue;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      console.log('Title:', data.title);
      console.log('\nFirst 1000 characters of content:');
      console.log(data.content?.substring(0, 1000));
      console.log('\n...\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

comparePosts();
