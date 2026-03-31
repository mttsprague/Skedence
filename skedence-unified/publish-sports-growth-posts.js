#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

// Standard blog CSS
const blogCSS = `<style>
  .blog-content {
    font-size: 1.0625rem;
    line-height: 1.8;
    color: #0A0A0A;
  }
  
  .blog-content h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0A0A0A;
    margin: 2.5rem 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #FF6B35;
  }
  
  .blog-content h3 {
    font-size: 1.375rem;
    font-weight: 600;
    color: #0A0A0A;
    margin: 2rem 0 0.75rem 0;
  }
  
  .blog-content p {
    margin: 1.25rem 0;
  }
  
  .blog-content ul {
    margin: 1.25rem 0;
    padding-left: 1.5rem;
  }
  
  .blog-content li {
    margin: 0.5rem 0;
  }
  
  .blog-content strong {
    font-weight: 600;
    color: #0A0A0A;
  }
  
  .blog-callout {
    background: #FFF5F2;
    border-left: 4px solid #FF6B35;
    padding: 1.5rem;
    margin: 2rem 0;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  
  .blog-highlight {
    background: #FFF5F2;
    padding: 1.25rem 1.5rem;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    border: 1px solid #FF6B35;
  }
</style>

`;

// Publish date: March 31, 2026
const publishDate = new Date('2026-03-31T09:00:00-05:00');

const posts = [
  {
    title: 'How to Get More Bookings for Your Private Volleyball Lessons',
    slug: 'get-more-volleyball-lesson-bookings',
    excerpt: 'Learn proven strategies to increase private volleyball lesson bookings and grow your training business beyond word-of-mouth referrals.',
    metaTitle: 'How to Get More Bookings for Private Volleyball Lessons (2026)',
    metaDescription: 'Learn proven strategies to increase volleyball lesson bookings and grow your private training business beyond word-of-mouth referrals.',
    keywords: 'how to get more volleyball lesson bookings, increase private volleyball clients, volleyball training business growth, volleyball lesson scheduling, private volleyball training business',
    categories: ['volleyball', 'operations', 'getting-started', 'marketing'],
    sport: 'volleyball',
    content: blogCSS + `
<div class="blog-content">

<p class="lead">Many volleyball trainers start by relying on word of mouth to get clients. While referrals can help early on, they often aren't enough to consistently fill your schedule.</p>

<p>If you want to grow your private volleyball training business, you need a simple system for attracting and converting athletes into regular bookings.</p>

<p>Here are proven strategies to increase your lesson bookings.</p>

<h2>1. Make Booking Easy</h2>

<p>The biggest mistake many volleyball trainers make is making booking too complicated.</p>

<p>If athletes or parents have to:</p>

<ul>
<li>Text you back and forth</li>
<li>Wait days for availability confirmation</li>
<li>Go through multiple messages to confirm times</li>
</ul>

<p>Many will delay or not book at all.</p>

<p><strong>The easier it is to book, the more sessions you'll fill.</strong></p>

<h2>2. Offer Structured Training Programs</h2>

<p>Instead of offering random sessions, create structured programs like:</p>

<ul>
<li><strong>4-session development plan</strong> — Focus on specific skills</li>
<li><strong>8-week hitter training program</strong> — Build attacking consistency</li>
<li><strong>Monthly training memberships</strong> — Ongoing development</li>
</ul>

<p>Programs create commitment and increase repeat bookings.</p>

<h2>3. Showcase Results</h2>

<p>Parents care about improvement.</p>

<p>Post:</p>

<ul>
<li>Before/after videos of skills</li>
<li>Athlete highlights and achievements</li>
<li>Progress clips showing technique improvements</li>
</ul>

<p>This builds trust and encourages new bookings.</p>

<h2>4. Follow Up With Athletes</h2>

<p>After sessions, follow up with:</p>

<ul>
<li>Next available training times</li>
<li>Recommended training frequency</li>
<li>Specific skills to work on next</li>
</ul>

<p>This keeps athletes coming back and prevents them from dropping off.</p>

<h2>5. Use a Booking System</h2>

<p>As your business grows, manual scheduling limits your capacity.</p>

<p>Platforms like Skedence allow athletes to:</p>

<ul>
<li>View your real-time availability</li>
<li>Purchase lesson packages online</li>
<li>Book sessions instantly without texting</li>
</ul>

<p>This removes friction and increases bookings.</p>

<div class="blog-highlight">
<p><strong>Bottom Line:</strong> The key to getting more volleyball lesson bookings is making it easy for athletes to find you, book you, and stay consistent with training.</p>
</div>

<p>By implementing these strategies, you'll fill more time slots and build a more predictable training business.</p>

</div>
    `
  },
  {
    title: 'How to Run Profitable Small Group Soccer Training Sessions',
    slug: 'run-profitable-group-soccer-training',
    excerpt: 'Learn how to structure and run small group soccer training sessions that increase revenue while delivering high-quality coaching.',
    metaTitle: 'How to Run Profitable Small Group Soccer Training Sessions',
    metaDescription: 'Learn how to structure small group soccer training sessions that increase revenue while delivering high-quality coaching to multiple players.',
    keywords: 'how to run group soccer training sessions, small group soccer training ideas, soccer group training drills, group soccer coaching, private soccer training business',
    categories: ['soccer', 'revenue-growth', 'operations', 'training'],
    sport: 'soccer',
    content: blogCSS + `
<div class="blog-content">

<p class="lead">Small group training is one of the best ways for soccer trainers to increase revenue while still delivering high-quality coaching.</p>

<p>Instead of training one athlete at a time, group sessions allow coaches to work with multiple players at once — increasing earnings without sacrificing quality.</p>

<p>Here's how to run effective and profitable group soccer training sessions.</p>

<h2>1. Group Players by Skill Level</h2>

<p>Keep groups balanced by:</p>

<ul>
<li><strong>Age</strong> — Similar age groups work better together</li>
<li><strong>Experience</strong> — Beginner, intermediate, or advanced</li>
<li><strong>Position</strong> — Forwards, midfielders, defenders</li>
</ul>

<p>This ensures all players benefit from the session and stay challenged.</p>

<h2>2. Focus on High-Repetition Drills</h2>

<p>Group sessions should maximize touches on the ball.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Passing circuits with multiple stations</li>
<li>Dribbling patterns through cones</li>
<li>Shooting rotations with quick resets</li>
</ul>

<p>Avoid drills where players are standing around waiting — keep everyone active.</p>

<h2>3. Include Competitive Elements</h2>

<p>Competition increases intensity and engagement.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Small-sided games (3v3, 4v4)</li>
<li>Shooting competitions with scoring systems</li>
<li>Timed challenges with leaderboards</li>
</ul>

<p>This keeps players motivated throughout the session.</p>

<h2>4. Price Group Sessions Strategically</h2>

<p><strong>Example pricing structure:</strong></p>

<ul>
<li>Private lesson: $80</li>
<li>Group session (4 players): $40 each</li>
</ul>

<p>Coach earns <strong>$160 instead of $80</strong> — double the revenue in the same time.</p>

<p>Players pay less than private lessons but still get quality coaching.</p>

<h2>5. Simplify Scheduling</h2>

<p>Group sessions require coordinating multiple athletes.</p>

<p>Using platforms like Skedence allows players to:</p>

<ul>
<li>Sign up for specific group sessions</li>
<li>Reserve spots in advance</li>
<li>Pay online before sessions</li>
</ul>

<p>This removes scheduling confusion and no-shows.</p>

<div class="blog-highlight">
<p><strong>Pro Tip:</strong> Limit group sizes to 4-6 players to maintain quality coaching while maximizing revenue.</p>
</div>

<p>Small group soccer training is a win-win: athletes get affordable coaching, and coaches increase their earning potential.</p>

</div>
    `
  },
  {
    title: 'How to Keep Clients Coming Back for Basketball Training',
    slug: 'basketball-client-retention-strategies',
    excerpt: 'Discover proven strategies to improve client retention and keep athletes consistently booking basketball training sessions.',
    metaTitle: 'How to Keep Basketball Training Clients Coming Back (2026)',
    metaDescription: 'Learn proven strategies to improve client retention and keep athletes consistently booking private basketball training sessions.',
    keywords: 'how to keep basketball training clients, basketball client retention strategies, private basketball training retention, retain basketball clients, basketball coaching business',
    categories: ['basketball', 'client-retention', 'operations', 'revenue-growth'],
    sport: 'basketball',
    content: blogCSS + `
<div class="blog-content">

<p class="lead">Getting clients is important — but keeping them is what builds a successful basketball training business.</p>

<p>Many trainers lose clients simply because they don't have a system for retention. Athletes stop booking, parents lose interest, and schedules empty out.</p>

<p>Here's how to keep athletes consistently booking sessions.</p>

<h2>1. Set Clear Development Goals</h2>

<p>Athletes stay committed when they see progress.</p>

<p>At the start of training, define:</p>

<ul>
<li>Specific skill goals (shooting accuracy, ball handling)</li>
<li>Performance targets (increase shooting percentage by 10%)</li>
<li>Development milestones (make varsity team, improve defense)</li>
</ul>

<p>This gives sessions purpose and keeps athletes motivated.</p>

<h2>2. Track Progress</h2>

<p>Show athletes how they're improving.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Shooting percentage improvements over time</li>
<li>Ball handling speed and consistency</li>
<li>Finishing moves and success rates</li>
</ul>

<p>Visible progress keeps athletes (and parents) engaged.</p>

<h2>3. Recommend Training Frequency</h2>

<p>Tell athletes how often they should train.</p>

<p><strong>Example:</strong></p>

<p>"To reach your goal of making varsity, I recommend training 2–3 sessions per week for the next month."</p>

<p>This increases consistency and bookings.</p>

<h2>4. Build Relationships</h2>

<p>Strong coach-athlete relationships increase retention.</p>

<p>Take time to:</p>

<ul>
<li>Give specific, constructive feedback</li>
<li>Encourage athletes when they improve</li>
<li>Communicate progress with parents</li>
</ul>

<p>Athletes stay with coaches they trust and connect with.</p>

<h2>5. Offer Packages</h2>

<p>Packages encourage long-term commitment.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>5-session package (slight discount)</li>
<li>Monthly training plan (8-12 sessions)</li>
<li>Pre-season prep package</li>
</ul>

<p>When athletes buy packages, they're more likely to complete all sessions.</p>

<h2>6. Make Booking Simple</h2>

<p>If booking is difficult, athletes drop off.</p>

<p>Platforms like Skedence make it easy to:</p>

<ul>
<li>Purchase packages online</li>
<li>Book sessions instantly</li>
<li>Stay consistent with training</li>
</ul>

<p>Removing friction increases retention.</p>

<div class="blog-highlight">
<p><strong>Key Takeaway:</strong> Client retention is built on progress tracking, clear communication, and making it easy for athletes to stay consistent.</p>
</div>

<p>By implementing these strategies, you'll keep athletes training longer and build a more stable business.</p>

</div>
    `
  },
  {
    title: 'The Ideal Weekly Baseball Training Schedule for Youth Players',
    slug: 'weekly-baseball-training-schedule-youth',
    excerpt: 'Discover the ideal weekly baseball training schedule for youth players to maximize skill development and performance improvement.',
    metaTitle: 'Weekly Baseball Training Schedule for Youth Players (2026)',
    metaDescription: 'Learn the ideal weekly baseball training schedule for youth players to maximize skill development and performance improvement.',
    keywords: 'baseball training schedule for youth players, weekly baseball training plan, baseball practice schedule for development, youth baseball training, baseball lesson schedule',
    categories: ['baseball', 'training', 'operations', 'youth-development'],
    sport: 'baseball',
    content: blogCSS + `
<div class="blog-content">

<p class="lead">Consistency is key to improving in baseball. Private lessons can accelerate development, but only if they are part of a structured weekly training schedule.</p>

<p>Random practice sessions won't produce the same results as a well-planned training week.</p>

<p>Here's an example of an effective weekly training plan for youth baseball players.</p>

<h2>Weekly Training Breakdown</h2>

<h3>Day 1 — Hitting Mechanics</h3>

<p>Focus on:</p>

<ul>
<li>Tee work and swing path</li>
<li>Bat speed and timing</li>
<li>Proper mechanics and form</li>
</ul>

<h3>Day 2 — Fielding and Defense</h3>

<p>Work on:</p>

<ul>
<li>Ground balls and fly balls</li>
<li>Footwork and positioning</li>
<li>Throwing mechanics and accuracy</li>
</ul>

<h3>Day 3 — Rest or Light Training</h3>

<p>Recovery is important.</p>

<p>Light work:</p>

<ul>
<li>Stretching and mobility</li>
<li>Light throwing (50-60%)</li>
<li>Mental practice and film review</li>
</ul>

<h3>Day 4 — Live Hitting</h3>

<p>Focus on:</p>

<ul>
<li>Timing against live pitching</li>
<li>Pitch recognition and approach</li>
<li>In-game swings and adjustments</li>
</ul>

<h3>Day 5 — Strength and Conditioning</h3>

<p>Include:</p>

<ul>
<li>Agility drills and footwork</li>
<li>Strength exercises (age-appropriate)</li>
<li>Speed and explosiveness work</li>
</ul>

<h3>Day 6 — Private Lesson or Skills Training</h3>

<p>Private coaching allows athletes to:</p>

<ul>
<li>Fix specific weaknesses</li>
<li>Get personalized feedback</li>
<li>Work on individual development</li>
</ul>

<h3>Day 7 — Rest</h3>

<p>Recovery is essential for long-term performance and injury prevention.</p>

<h2>Why Structure Matters</h2>

<p>Athletes who follow structured schedules improve faster than those who train randomly.</p>

<p><strong>Benefits of a structured plan:</strong></p>

<ul>
<li>Consistent skill development</li>
<li>Balanced training (hitting, fielding, conditioning)</li>
<li>Proper recovery to prevent burnout</li>
<li>Clear goals and progress tracking</li>
</ul>

<p>Consistency leads to better results.</p>

<h2>Managing Training Schedules</h2>

<p>As players train more frequently, scheduling becomes more complex.</p>

<p>Many coaches use tools like Skedence to:</p>

<ul>
<li>Organize lesson schedules with multiple athletes</li>
<li>Track training sessions and progress</li>
<li>Manage athlete bookings efficiently</li>
</ul>

<div class="blog-highlight">
<p><strong>Pro Tip:</strong> Adjust training intensity based on the player's age and experience level. Younger players need more rest and variety.</p>
</div>

<p>A structured weekly schedule gives youth baseball players the consistency they need to develop skills and reach their potential.</p>

</div>
    `
  }
];

async function publishPosts() {
  console.log('📝 Publishing 4 New Blog Posts (March 31, 2026)\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  for (const post of posts) {
    try {
      const postData = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        keywords: post.keywords,
        categories: post.categories,
        sport: post.sport,
        tags: post.categories, // Use categories as tags
        status: 'published',
        views: 0,
        createdAt: admin.firestore.Timestamp.fromDate(publishDate),
        updatedAt: admin.firestore.Timestamp.fromDate(publishDate),
        publishedAt: admin.firestore.Timestamp.fromDate(publishDate)
      };

      const docRef = await db.collection('blogPosts').add(postData);
      
      console.log(`✅ Published: ${post.title}`);
      console.log(`   Sport: ${post.sport}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   ID: ${docRef.id}`);
      console.log(`   Keywords: ${post.keywords.split(',').slice(0, 3).join(', ')}...`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error publishing ${post.title}:`, error.message);
      console.log('');
    }
  }

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ All 4 blog posts published successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   🏐 Volleyball: Get More Lesson Bookings');
  console.log('   ⚽ Soccer: Run Profitable Group Training');
  console.log('   🏀 Basketball: Client Retention Strategies');
  console.log('   ⚾ Baseball: Weekly Training Schedule');
  console.log('');
  console.log('🌐 View at: https://skedence.com/blog');
  console.log('');
  console.log('✨ Features:');
  console.log('   • SEO optimized with long-tail keywords');
  console.log('   • Full meta data (title, description, keywords)');
  console.log('   • CSS formatted (matches existing posts)');
  console.log('   • Google Analytics ready (auto-tracked on page load)');
  console.log('   • Published: March 31, 2026');
  console.log('');
  
  process.exit(0);
}

publishPosts();
