#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function testDOMPurify() {
  try {
    const snapshot = await db.collection('blogPosts')
      .where('slug', '==', 'volleyball-hitting-drills-private-lessons')
      .get();
    
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      
      console.log('Testing DOMPurify configuration:');
      console.log('='.repeat(80));
      
      // Check what would happen with DOMPurify
      const DOMPurify = require('isomorphic-dompurify');
      
      const sanitized = DOMPurify.sanitize(data.content, {
        ADD_TAGS: ['style'],
        ADD_ATTR: ['class', 'style']
      });
      
      console.log('\nOriginal content length:', data.content.length);
      console.log('Sanitized content length:', sanitized.length);
      
      console.log('\nOriginal has <style>:', data.content.includes('<style>'));
      console.log('Sanitized has <style>:', sanitized.includes('<style>'));
      
      console.log('\nFirst 500 chars of sanitized:');
      console.log(sanitized.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

testDOMPurify();
