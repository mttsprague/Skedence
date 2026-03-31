#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

const postsToFix = [
  {
    slug: 'get-more-volleyball-lesson-bookings',
    category: 'operations',
    ctaText: 'Start Getting More Bookings',
    ctaLink: '/login'
  },
  {
    slug: 'run-profitable-group-soccer-training',
    category: 'revenue-growth',
    ctaText: 'Start Running Group Sessions',
    ctaLink: '/login'
  },
  {
    slug: 'basketball-client-retention-strategies',
    category: 'client-retention',
    ctaText: 'Keep Your Clients Coming Back',
    ctaLink: '/login'
  },
  {
    slug: 'weekly-baseball-training-schedule-youth',
    category: 'operations',
    ctaText: 'Organize Your Training Schedule',
    ctaLink: '/login'
  }
];

async function fixPosts() {
  try {
    console.log('🔧 Fixing blog posts to match expected schema...\n');
    
    for (const postInfo of postsToFix) {
      const snapshot = await db.collection('blogPosts')
        .where('slug', '==', postInfo.slug)
        .get();
      
      if (snapshot.empty) {
        console.log(`❌ Post not found: ${postInfo.slug}`);
        continue;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      console.log(`📝 Fixing: ${data.title}`);
      console.log(`   Slug: ${postInfo.slug}`);
      
      // Update with missing fields
      await doc.ref.update({
        category: postInfo.category,
        authorId: 'skedence-team',
        authorName: 'Skedence Team',
        authorBio: 'Helping coaches build and scale their private training businesses with scheduling software and business insights.',
        ctaText: postInfo.ctaText,
        ctaLink: postInfo.ctaLink
      });
      
      console.log(`   ✅ Added: category, authorId, authorName, authorBio, ctaText, ctaLink\n`);
    }
    
    console.log('✅ All posts fixed!');
    console.log('\n🌐 Try the posts again at:');
    postsToFix.forEach(p => {
      console.log(`   https://skedence.com/blog/detail#${p.slug}`);
    });
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

fixPosts();
