/**
 * Fix Blog Post Timestamps - Restore Original Publish Dates
 * Updates all blog posts with their correct original publish dates
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

console.log('🔍 Firebase Project ID:', admin.app().options.projectId);
console.log('📍 Updating timestamps in: polyface-ae6d3 (Skedence project)\n');

// Map of slug patterns to original publish dates
const publishDateMap = {
  // Session 1: February 25, 2026 - Initial Posts
  'private-volleyball-lesson-pricing-2026': new Date('2026-02-25T08:46:55-06:00'),
  'schedule-private-baseball-lessons-without-texting': new Date('2026-02-25T08:46:55-06:00'),
  'schedule-soccer-lessons-without-texting': new Date('2026-02-25T08:46:55-06:00'),
  'soccer-lesson-scheduling-private-trainers': new Date('2026-02-25T08:46:55-06:00'),
  'private-basketball-training-pricing-2026': new Date('2026-02-25T08:46:55-06:00'),
  'basketball-private-lesson-pricing-guide': new Date('2026-02-25T08:46:55-06:00'),
  
  // Session 2: February 26, 2026 - Four Sports Posts
  'get-more-volleyball-lesson-clients-without-ads': new Date('2026-02-26T10:48:41-06:00'),
  'private-volleyball-lesson-packages': new Date('2026-02-26T10:48:41-06:00'),
  'sell-private-soccer-training-packages': new Date('2026-02-26T10:48:41-06:00'),
  'private-soccer-lesson-packages': new Date('2026-02-26T10:48:41-06:00'),
  'reduce-no-shows-basketball-training': new Date('2026-02-26T10:48:41-06:00'),
  'private-basketball-lesson-packages': new Date('2026-02-26T10:48:41-06:00'),
  'manage-multiple-trainers-baseball-academy': new Date('2026-02-26T10:48:41-06:00'),
  'handle-baseball-lesson-no-shows': new Date('2026-02-26T10:48:41-06:00'),
  
  // Session 3: February 27, 2026 - Four MORE Sports Posts
  'structure-volleyball-lessons-tryouts-off-season': new Date('2026-02-27T10:12:59-06:00'),
  'volleyball-seasonal-training-programs': new Date('2026-02-27T10:12:59-06:00'),
  'soccer-trainer-side-hustle-to-full-time': new Date('2026-02-27T10:12:59-06:00'),
  'soccer-trainer-full-time-business': new Date('2026-02-27T10:12:59-06:00'),
  'basketball-training-cancellation-policy': new Date('2026-02-27T10:12:59-06:00'),
  'basketball-cancellation-policy': new Date('2026-02-27T10:12:59-06:00'),
  'build-recurring-revenue-baseball-training': new Date('2026-02-27T10:12:59-06:00'),
  'baseball-recurring-revenue': new Date('2026-02-27T10:12:59-06:00'),
  
  // Session 4: March 2, 2026 - Lesson Structure Posts
  'structure-60-minute-volleyball-private-lesson': new Date('2026-03-02T12:15:00-06:00'),
  'volleyball-lesson-structure-guide': new Date('2026-03-02T12:15:00-06:00'),
  'insurance-requirements-private-soccer-training': new Date('2026-03-02T12:15:00-06:00'),
  'soccer-training-insurance-requirement': new Date('2026-03-02T12:15:00-06:00'),
  'rent-gym-space-basketball-training': new Date('2026-03-02T12:15:00-06:00'),
  'basketball-gym-rental-private-lessons': new Date('2026-03-02T12:15:00-06:00'),
  'pricing-tiers-baseball-lessons': new Date('2026-03-02T12:15:00-06:00'),
  'baseball-pricing-tiers-private-lessons': new Date('2026-03-02T12:15:00-06:00'),
  
  // Session 5: March 4, 2026 - Marketing & Training Posts
  'get-volleyball-lesson-clients-marketing': new Date('2026-03-04T08:32:08-06:00'),
  'private-soccer-training-drills-1-on-1': new Date('2026-03-04T08:32:08-06:00'),
  'start-basketball-training-business': new Date('2026-03-04T08:32:08-06:00'),
  'run-effective-pitching-lessons': new Date('2026-03-04T08:32:08-06:00'),
  
  // Session 6: March 6, 2026 - Lesson Structure & Client Posts
  'perfect-volleyball-lesson-plan-structure': new Date('2026-03-06T10:57:58-06:00'),
  'get-clients-soccer-training-business': new Date('2026-03-06T10:57:58-06:00'),
  'ideal-basketball-training-session-structure': new Date('2026-03-06T10:57:58-06:00'),
  'structure-baseball-hitting-lessons': new Date('2026-03-06T10:57:58-06:00'),
  
  // Session 7: March 9, 2026 - Business Startup Posts
  'start-private-volleyball-lesson-business': new Date('2026-03-09T10:38:39-05:00'),
  'private-soccer-training-pricing-guide': new Date('2026-03-09T10:38:39-05:00'),
  'basketball-trainers-social-media-marketing': new Date('2026-03-09T10:38:39-05:00'),
  'start-baseball-hitting-coach-business': new Date('2026-03-09T10:38:39-05:00'),
  
  // Session 8: March 16, 2026 - Organization & Drills Posts
  'organize-volleyball-lessons-scheduling': new Date('2026-03-16T11:11:22-05:00'),
  'best-soccer-drills-beginner-players': new Date('2026-03-16T11:11:22-05:00'),
  'run-successful-basketball-training-sessions': new Date('2026-03-16T11:11:22-05:00'),
  'best-baseball-hitting-drills-youth': new Date('2026-03-16T11:11:22-05:00'),
};

async function fixTimestamps() {
  console.log('🔄 Fetching all blog posts...\n');
  
  const snapshot = await db.collection('blogPosts').get();
  
  if (snapshot.empty) {
    console.log('❌ No blog posts found!');
    process.exit(1);
  }
  
  console.log(`📊 Found ${snapshot.size} blog posts\n`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const slug = data.slug;
    
    if (publishDateMap[slug]) {
      const originalDate = publishDateMap[slug];
      
      // Update the document with original timestamps
      await doc.ref.update({
        createdAt: admin.firestore.Timestamp.fromDate(originalDate),
        updatedAt: admin.firestore.Timestamp.fromDate(originalDate),
        publishedAt: admin.firestore.Timestamp.fromDate(originalDate)
      });
      
      console.log(`✅ Updated: ${data.title}`);
      console.log(`   Slug: ${slug}`);
      console.log(`   Original Date: ${originalDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`);
      console.log('');
      
      updated++;
    } else {
      console.log(`⚠️  No date mapping found for: ${slug}`);
      notFound++;
    }
  }
  
  console.log('─────────────────────────────');
  console.log(`✅ Updated: ${updated} posts`);
  console.log(`⚠️  Not found: ${notFound} posts`);
  console.log('─────────────────────────────');
  console.log('');
  console.log('🌐 Check the blog at: https://skedence.com/blog');
  console.log('All posts should now show their original publish dates!');
  
  process.exit(0);
}

fixTimestamps().catch(error => {
  console.error('❌ Error fixing timestamps:', error);
  process.exit(1);
});
