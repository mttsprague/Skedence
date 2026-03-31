#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

const newSlugs = [
  'get-more-volleyball-lesson-bookings',
  'run-profitable-group-soccer-training',
  'basketball-client-retention-strategies',
  'weekly-baseball-training-schedule-youth'
];

async function checkPosts() {
  try {
    console.log('🔍 Checking the 4 new blog posts...\n');
    
    for (const slug of newSlugs) {
      console.log('═'.repeat(80));
      console.log(`📝 Post: ${slug}\n`);
      
      const snapshot = await db.collection('blogPosts')
        .where('slug', '==', slug)
        .get();
      
      if (snapshot.empty) {
        console.log('❌ Post not found!\n');
        continue;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      console.log('ID:', doc.id);
      console.log('Title:', data.title);
      console.log('Status:', data.status);
      console.log('\nDate Fields:');
      console.log('  createdAt:', data.createdAt);
      console.log('  updatedAt:', data.updatedAt);
      console.log('  publishedAt:', data.publishedAt);
      console.log('\nDate Types:');
      console.log('  createdAt type:', typeof data.createdAt, data.createdAt?.constructor?.name);
      console.log('  updatedAt type:', typeof data.updatedAt, data.updatedAt?.constructor?.name);
      console.log('  publishedAt type:', typeof data.publishedAt, data.publishedAt?.constructor?.name);
      console.log('\nOther Fields:');
      console.log('  excerpt length:', data.excerpt?.length || 'MISSING');
      console.log('  content length:', data.content?.length || 'MISSING');
      console.log('  categories:', data.categories);
      console.log('  sport:', data.sport);
      console.log('  keywords:', data.keywords);
      console.log();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

checkPosts();
