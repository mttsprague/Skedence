const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

async function checkBlogImages() {
  try {
    const snapshot = await db.collection('blogPosts')
      .where('status', '==', 'published')
      .get();
    
    console.log('\n📝 Published Blog Posts and Cover Images:\n');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Title: ${data.title}`);
      console.log(`Cover Image: ${data.coverImage || 'NONE'}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkBlogImages();
