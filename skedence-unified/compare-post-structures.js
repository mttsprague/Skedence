#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

async function comparePosts() {
  try {
    // Get a working old post
    const oldPostSnapshot = await db.collection('blogPosts')
      .where('slug', '==', 'private-volleyball-lesson-pricing-2026')
      .get();
    
    // Get one of the new posts
    const newPostSnapshot = await db.collection('blogPosts')
      .where('slug', '==', 'get-more-volleyball-lesson-bookings')
      .get();
    
    if (oldPostSnapshot.empty || newPostSnapshot.empty) {
      console.log('❌ Could not find posts');
      return;
    }
    
    const oldPost = oldPostSnapshot.docs[0].data();
    const newPost = newPostSnapshot.docs[0].data();
    
    console.log('🔍 COMPARING POST STRUCTURES\n');
    console.log('=' .repeat(80));
    console.log('\n📝 OLD POST (WORKING):');
    console.log('Title:', oldPost.title);
    console.log('Slug:', oldPost.slug);
    console.log('\nFields:');
    Object.keys(oldPost).sort().forEach(key => {
      const value = oldPost[key];
      const type = value === null ? 'null' : typeof value;
      const preview = type === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
                     type === 'object' && value?.toDate ? `Timestamp(${value.toDate().toISOString()})` :
                     Array.isArray(value) ? `Array(${value.length})` :
                     JSON.stringify(value);
      console.log(`  ${key}: ${type} = ${preview}`);
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n📝 NEW POST (BROKEN):');
    console.log('Title:', newPost.title);
    console.log('Slug:', newPost.slug);
    console.log('\nFields:');
    Object.keys(newPost).sort().forEach(key => {
      const value = newPost[key];
      const type = value === null ? 'null' : typeof value;
      const preview = type === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
                     type === 'object' && value?.toDate ? `Timestamp(${value.toDate().toISOString()})` :
                     Array.isArray(value) ? `Array(${value.length})` :
                     JSON.stringify(value);
      console.log(`  ${key}: ${type} = ${preview}`);
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔍 DIFFERENCES:\n');
    
    const oldKeys = new Set(Object.keys(oldPost));
    const newKeys = new Set(Object.keys(newPost));
    
    // Keys in old but not in new
    const missingInNew = [...oldKeys].filter(k => !newKeys.has(k));
    if (missingInNew.length > 0) {
      console.log('❌ Missing in NEW post:', missingInNew.join(', '));
    }
    
    // Keys in new but not in old
    const extraInNew = [...newKeys].filter(k => !oldKeys.has(k));
    if (extraInNew.length > 0) {
      console.log('⚠️  Extra in NEW post:', extraInNew.join(', '));
    }
    
    // Compare field types
    console.log('\n📊 Field Type Comparison:');
    [...oldKeys].forEach(key => {
      if (newKeys.has(key)) {
        const oldType = typeof oldPost[key];
        const newType = typeof newPost[key];
        if (oldType !== newType) {
          console.log(`  ⚠️  ${key}: ${oldType} → ${newType}`);
        }
      }
    });
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

comparePosts();
