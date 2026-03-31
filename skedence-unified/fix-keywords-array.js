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
    keywords: [
      'how to get more volleyball lesson bookings',
      'increase private volleyball clients',
      'volleyball training business growth',
      'volleyball lesson scheduling',
      'private volleyball training business'
    ]
  },
  {
    slug: 'run-profitable-group-soccer-training',
    keywords: [
      'how to run group soccer training sessions',
      'small group soccer training ideas',
      'soccer group training drills',
      'group soccer coaching',
      'private soccer training business'
    ]
  },
  {
    slug: 'basketball-client-retention-strategies',
    keywords: [
      'how to keep basketball training clients',
      'basketball client retention strategies',
      'private basketball training retention',
      'retain basketball clients',
      'basketball coaching business'
    ]
  },
  {
    slug: 'weekly-baseball-training-schedule-youth',
    keywords: [
      'baseball training schedule for youth players',
      'weekly baseball training plan',
      'baseball practice schedule for development',
      'youth baseball training',
      'baseball lesson schedule'
    ]
  }
];

async function fixKeywords() {
  try {
    console.log('🔧 Fixing keywords field in 4 new blog posts...\n');
    
    let fixed = 0;
    
    for (const post of postsToFix) {
      const snapshot = await db.collection('blogPosts')
        .where('slug', '==', post.slug)
        .get();
      
      if (snapshot.empty) {
        console.log(`❌ Post not found: ${post.slug}`);
        continue;
      }
      
      const doc = snapshot.docs[0];
      await doc.ref.update({
        keywords: post.keywords
      });
      
      console.log(`✅ Fixed: ${post.slug}`);
      console.log(`   Keywords: [${post.keywords.length} items]`);
      fixed++;
    }
    
    console.log(`\n✅ Fixed ${fixed} of ${postsToFix.length} posts`);
    console.log('\n🌐 Refresh the blog pages - they should work now!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

fixKeywords();
