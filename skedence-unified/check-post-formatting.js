#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function checkPost() {
  try {
    const slug = 'schedule-private-baseball-lessons-without-texting';
    
    console.log(`🔍 Checking post: ${slug}\n`);
    
    const snapshot = await db.collection('blogPosts')
      .where('slug', '==', slug)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Post not found');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('📄 Post Data:');
    console.log('Title:', data.title);
    console.log('Status:', data.status);
    console.log('Categories:', data.categories);
    console.log('Sport:', data.sport);
    console.log('\nContent Preview (first 500 chars):');
    console.log(data.content?.substring(0, 500));
    console.log('\n\nFull Content Length:', data.content?.length);
    
    // Check for common formatting issues
    console.log('\n🔍 Formatting Analysis:');
    console.log('Has HTML tags:', /<[^>]+>/.test(data.content));
    console.log('Has paragraphs:', /<p>/i.test(data.content));
    console.log('Has headings:', /<h[1-6]/i.test(data.content));
    console.log('Has lists:', /<ul>/i.test(data.content) || /<ol>/i.test(data.content));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

checkPost();
