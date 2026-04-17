#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function checkRendering() {
  try {
    // Get one post
    const snapshot = await db.collection('blogPosts')
      .where('slug', '==', 'private-volleyball-lesson-pricing-2026')
      .get();
    
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      
      console.log('Content structure:');
      console.log('='.repeat(80));
      
      // Check if it starts with <style>
      const hasStyle = data.content.startsWith('<style>');
      const hasDivBlogContent = data.content.includes('<div class="blog-content">');
      
      console.log('Starts with <style>:', hasStyle);
      console.log('Has <div class="blog-content">:', hasDivBlogContent);
      
      // Find where blog-content div starts
      const styleEnd = data.content.indexOf('</style>');
      const blogContentStart = data.content.indexOf('<div class="blog-content">');
      
      console.log('\nStyle tag ends at position:', styleEnd);
      console.log('Blog content div starts at position:', blogContentStart);
      
      console.log('\nContent between style and div:');
      console.log(data.content.substring(styleEnd, blogContentStart + 30));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkRendering();
