#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function checkNewPosts() {
  const slugs = [
    'get-more-volleyball-lesson-bookings',
    'run-profitable-group-soccer-training',
    'basketball-client-retention-strategies',
    'weekly-baseball-training-schedule-youth'
  ];
  
  console.log('Checking new blog posts for date fields...\n');
  
  for (const slug of slugs) {
    const snapshot = await db.collection('blogPosts').where('slug', '==', slug).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log(`Slug: ${slug}`);
      console.log(`  createdAt: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'MISSING'}`);
      console.log(`  updatedAt: ${data.updatedAt ? data.updatedAt.toDate().toISOString() : 'MISSING'}`);
      console.log(`  publishedAt: ${data.publishedAt ? data.publishedAt.toDate().toISOString() : 'MISSING'}`);
      console.log('');
    } else {
      console.log(`❌ Post not found: ${slug}\n`);
    }
  }
  process.exit(0);
}

checkNewPosts();
