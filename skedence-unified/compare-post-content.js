#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function comparePosts() {
  try {
    // Get one old working post
    const oldPost = await db.collection('blogPosts')
      .where('slug', '==', 'private-volleyball-lesson-pricing-2026')
      .get();
    
    // Get one new post
    const newPost = await db.collection('blogPosts')
      .where('slug', '==', 'volleyball-hitting-drills-private-lessons')
      .get();
    
    if (!oldPost.empty) {
      const oldData = oldPost.docs[0].data();
      console.log('OLD POST (Working):');
      console.log('='.repeat(80));
      console.log('First 2000 chars of content:');
      console.log(oldData.content.substring(0, 2000));
      console.log('\n');
    }
    
    if (!newPost.empty) {
      const newData = newPost.docs[0].data();
      console.log('NEW POST (Not formatting):');
      console.log('='.repeat(80));
      console.log('First 2000 chars of content:');
      console.log(newData.content.substring(0, 2000));
      console.log('\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

comparePosts();
