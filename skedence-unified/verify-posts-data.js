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

  for (const slug of slugs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Checking: ${slug}\n`);
    
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
    console.log('Status:', data.status);
    console.log('Keywords type:', typeof data.keywords);
    console.log('Keywords value:', data.keywords);
    console.log('CreatedAt:', data.createdAt);
    console.log('UpdatedAt:', data.updatedAt);
    console.log('PublishedAt:', data.publishedAt);
    console.log('CreatedAt type:', typeof data.createdAt);
    console.log('Has toDate method?', data.createdAt && typeof data.createdAt.toDate === 'function');
  }
  
  process.exit(0);
}

checkNewPosts();
