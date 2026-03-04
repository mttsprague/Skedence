/**
 * Publish 4 New Blog Posts - Marketing & Training Strategies
 * Topics: Volleyball marketing, Soccer training drills, Basketball business, Baseball pitching lessons
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

// Blog content CSS styles (matching existing posts)
const blogStyles = `
<style>
  .blog-content h2 {
    color: #1a1a1a;
    font-size: 1.875rem;
    font-weight: 700;
    margin-top: 2.5rem;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #FF6B35;
  }
  
  .blog-content h3 {
    color: #2d3748;
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  
  .blog-content p {
    color: #4a5568;
    font-size: 1.125rem;
    line-height: 1.75;
    margin-bottom: 1.5rem;
  }
  
  .blog-content ul, .blog-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1.5rem;
    color: #4a5568;
  }
  
  .blog-content li {
    font-size: 1.125rem;
    line-height: 1.75;
    margin-bottom: 0.75rem;
  }
  
  .blog-content strong {
    color: #1a1a1a;
    font-weight: 600;
  }
  
  .blog-callout {
    background: linear-gradient(135deg, #fff5f0 0%, #ffe8dc 100%);
    border-left: 4px solid #FF6B35;
    padding: 1.5rem;
    margin: 2rem 0;
    border-radius: 0.5rem;
  }
  
  .blog-callout p {
    margin-bottom: 0.5rem;
    color: #2d3748;
  }
  
  .blog-highlight {
    background-color: #fff5f0;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    color: #FF6B35;
    font-weight: 600;
  }
</style>
`;

// Blog posts data
const posts = [
  {
    // VOLLEYBALL POST - Marketing
    title: "How to Get More Private Volleyball Lesson Clients (Marketing Strategies That Work)",
    slug: "get-volleyball-lesson-clients-marketing",
    excerpt: "Private volleyball lessons are growing fast, but many coaches rely only on word of mouth. Learn 5 proven marketing strategies that work: Instagram optimization, educational content, club partnerships, training packages, and simple booking systems.",
    metaTitle: "Get Volleyball Lesson Clients (5 Marketing Strategies)",
    metaDescription: "Learn how to get more private volleyball lesson clients with proven marketing strategies: Instagram optimization, drill breakdowns, club partnerships, structured packages, and simple booking.",
    keywords: "volleyball private lesson marketing, how to get volleyball lesson clients, how to promote volleyball lessons, marketing private volleyball training, volleyball lesson marketing strategies",
    categories: ["volleyball", "marketing", "revenue-growth", "getting-started"],
    sport: "volleyball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Volleyball Lesson Marketing",
    content: `${blogStyles}
<div class="blog-content">

<p>Private volleyball lessons are one of the fastest-growing segments of youth sports training.</p>

<p>But many coaches rely only on word of mouth — which limits how fast their training business can grow.</p>

<p>If you want consistent bookings and full schedules, you need simple marketing strategies that actually work.</p>

<p>Here's how successful volleyball trainers attract new athletes.</p>

<h2>1. Optimize Your Instagram for Volleyball Lessons</h2>

<p>Instagram is the #1 discovery platform for youth sports training.</p>

<p><strong>Make sure your profile clearly states:</strong></p>
<ul>
<li>Private volleyball lessons</li>
<li>Position training (setter, libero, hitter)</li>
<li>Location</li>
<li>Booking link</li>
</ul>

<div class="blog-callout">
<p><strong>Example bio:</strong></p>
<p>Private Volleyball Training<br>
Setter + Serve Receive Development<br>
📍 Austin, TX<br>
Book lessons ↓</p>
</div>

<p>Clear positioning helps parents find you faster.</p>

<h2>2. Post Drill Breakdowns</h2>

<p>Instead of random highlights, post educational content like:</p>
<ul>
<li>"3 mistakes middle blockers make"</li>
<li>"How to improve serve receive"</li>
<li>"Footwork drills for setters"</li>
</ul>

<p><span class="blog-highlight">This positions you as a specialist.</span></p>

<p>Parents are more likely to book trainers who teach — not just train.</p>

<h2>3. Partner With Local Clubs</h2>

<p>Many club players want extra reps outside of team practice.</p>

<p><strong>Reach out to:</strong></p>
<ul>
<li>Club directors</li>
<li>Assistant coaches</li>
<li>Team parents</li>
</ul>

<p><strong>Offer:</strong></p>
<ul>
<li>Tryout prep sessions</li>
<li>Position clinics</li>
<li>Small group training</li>
</ul>

<p>Club partnerships can become a consistent referral source.</p>

<h2>4. Create Structured Training Packages</h2>

<p>Parents prefer programs, not random sessions.</p>

<p>Instead of selling one lesson at a time, offer packages like:</p>
<ul>
<li>6-week tryout prep</li>
<li>8-session skill development plan</li>
<li>Position-specific training blocks</li>
</ul>

<p><span class="blog-highlight">Programs increase commitment and revenue.</span></p>

<h2>5. Make Booking Simple</h2>

<p>The easier it is to book, the more athletes will schedule lessons.</p>

<p>Parents should be able to:</p>
<ul>
<li>View availability</li>
<li>Purchase packages</li>
<li>Book sessions</li>
</ul>

<p><strong>Without texting back and forth.</strong></p>

<div class="blog-callout">
<p><strong>Skedence helps volleyball trainers automate scheduling, payments, and packages so athletes can book instantly.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and simplify your lesson business.</a></p>
</div>

</div>`
  },
  {
    // SOCCER POST - Training Drills
    title: "10 Private Soccer Training Drills That Work Best in 1-on-1 Sessions",
    slug: "private-soccer-training-drills-1-on-1",
    excerpt: "Private soccer training is most effective with individual-focused drills. Learn 10 drills that work best in 1-on-1 sessions: ball mastery, cone dribbling, first touch control, passing accuracy, finishing, weak foot development, and more.",
    metaTitle: "10 Private Soccer Training Drills for 1-on-1 Sessions",
    metaDescription: "Learn 10 soccer drills designed for private 1-on-1 training: ball mastery ladder, cone progressions, first touch control, finishing under pressure, weak foot development, and decision making.",
    keywords: "private soccer training drills, soccer individual training plan, soccer lesson plan for private training, soccer 1 on 1 training drills, best soccer drills for private lessons",
    categories: ["soccer", "operations", "business-tips"],
    sport: "soccer",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Soccer Training Drills",
    content: `${blogStyles}
<div class="blog-content">

<p>Private soccer training sessions are most effective when drills are designed for individual development.</p>

<p>Unlike team practice, 1-on-1 training allows coaches to focus on specific weaknesses and accelerate skill growth.</p>

<p>Here are 10 drills that work especially well in private soccer lessons.</p>

<h2>1. Ball Mastery Ladder</h2>

<p>Use cones or a ladder to improve quick touches.</p>

<p><strong>Focus on:</strong></p>
<ul>
<li>Inside touches</li>
<li>Outside touches</li>
<li>Sole control</li>
</ul>

<p>This drill improves coordination and close ball control.</p>

<h2>2. Cone Dribble Progression</h2>

<p>Set up a small cone grid.</p>

<p><strong>Athletes practice:</strong></p>
<ul>
<li>Tight turns</li>
<li>Quick cuts</li>
<li>Explosive exits</li>
</ul>

<p>Perfect for attacking players.</p>

<h2>3. First Touch Directional Control</h2>

<p>Pass the ball to the athlete.</p>

<p>They must control and redirect the ball into space with their first touch.</p>

<p><span class="blog-highlight">This improves game-speed decision making.</span></p>

<h2>4. Passing Accuracy Targets</h2>

<p>Set small targets or mini goals.</p>

<p>Players must pass accurately under time pressure.</p>

<p>Helps midfielders improve precision.</p>

<h2>5. Finishing Under Pressure</h2>

<p>Combine dribbling with a shot.</p>

<p><strong>Example sequence:</strong></p>
<p>Cone dribble → quick turn → shot on goal.</p>

<p>Simulates real game situations.</p>

<h2>6. Weak Foot Development</h2>

<p>Dedicate part of every session to the weak foot.</p>

<p><strong>Use:</strong></p>
<ul>
<li>Short passes</li>
<li>Shooting drills</li>
<li>Controlled dribbling</li>
</ul>

<p>Balanced players improve faster.</p>

<h2>7. 1v1 Attacking Moves</h2>

<p><strong>Practice:</strong></p>
<ul>
<li>Step overs</li>
<li>Scissors</li>
<li>Body feints</li>
</ul>

<p>Then immediately apply them in mini 1v1 scenarios.</p>

<h2>8. Speed Dribbling</h2>

<p>Athletes dribble at high speed through cones.</p>

<p><strong>Focus on:</strong></p>
<ul>
<li>Long touches</li>
<li>Control at pace</li>
<li>Acceleration</li>
</ul>

<h2>9. Receiving Under Pressure</h2>

<p>Coach applies light defensive pressure.</p>

<p>Athlete must control and protect the ball.</p>

<p><span class="blog-highlight">Improves composure.</span></p>

<h2>10. Decision Making Drills</h2>

<p>Add two targets and force quick choices.</p>

<p>Players must choose the correct passing option under pressure.</p>

<div class="blog-callout">
<p><strong>Private soccer training works best when sessions are structured around progressive drills.</strong></p>
<p><strong>Skedence helps soccer trainers organize lessons, track sessions, and manage athlete schedules in one system.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Start your free trial and streamline your training business.</a></p>
</div>

</div>`
  },
  {
    // BASKETBALL POST - Business Tips
    title: "How to Start a Private Basketball Training Business",
    slug: "start-basketball-training-business",
    excerpt: "Private basketball training can turn into full-time income with the right structure. Learn the 6 steps to start: define your niche, set competitive pricing, find court access, build online presence, create packages, and automate scheduling.",
    metaTitle: "How to Start a Basketball Training Business (6 Steps)",
    metaDescription: "Learn how to start a private basketball training business: define your niche, set pricing ($60-$120/session), find court access, build online presence, create packages, and automate scheduling.",
    keywords: "basketball training business tips, how to start a basketball training business, private basketball trainer business, starting basketball training company, basketball coaching business",
    categories: ["basketball", "getting-started", "revenue-growth", "business-tips"],
    sport: "basketball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Basketball Training Business",
    content: `${blogStyles}
<div class="blog-content">

<p>Private basketball training has become one of the most popular side businesses for coaches and former players.</p>

<p>With the right structure, many trainers turn private lessons into full-time income.</p>

<p>Here's how to start a private basketball training business.</p>

<h2>Step 1: Define Your Training Niche</h2>

<p>Specialization helps you stand out.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Guard skill development</li>
<li>Shooting mechanics</li>
<li>Youth fundamentals</li>
<li>AAU preparation</li>
</ul>

<p><span class="blog-highlight">Clear positioning makes marketing easier.</span></p>

<h2>Step 2: Set Competitive Pricing</h2>

<p>Research other trainers in your area.</p>

<p>Typical private basketball lesson prices range from:</p>

<div class="blog-callout">
<p><strong>$60–$120 per session</strong> depending on experience and location.</p>
</div>

<p>Offer packages to increase commitment.</p>

<h2>Step 3: Find Consistent Court Access</h2>

<p>You'll need a reliable place to train.</p>

<p><strong>Options include:</strong></p>
<ul>
<li>Community centers</li>
<li>School gyms</li>
<li>Private training facilities</li>
<li>Rented court space</li>
</ul>

<p>Reliable court access keeps scheduling consistent.</p>

<h2>Step 4: Build Your Online Presence</h2>

<p>Parents often search online when looking for trainers.</p>

<p><strong>Create:</strong></p>
<ul>
<li>Instagram profile</li>
<li>Google business listing</li>
<li>Simple website</li>
</ul>

<p>Post training content regularly.</p>

<h2>Step 5: Create Training Packages</h2>

<p>Instead of selling individual sessions, offer structured programs:</p>

<ul>
<li>5 session skill package</li>
<li>8 session development plan</li>
<li>Monthly training membership</li>
</ul>

<p><span class="blog-highlight">Packages increase athlete commitment.</span></p>

<h2>Step 6: Automate Scheduling</h2>

<p>Manual scheduling becomes difficult as your client list grows.</p>

<p>Professional trainers use systems that allow athletes to:</p>
<ul>
<li>Purchase packages</li>
<li>View availability</li>
<li>Book sessions</li>
</ul>

<div class="blog-callout">
<p><strong>Skedence helps basketball trainers manage scheduling, payments, and lesson packages all in one place.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and run your training like a business.</a></p>
</div>

</div>`
  },
  {
    // BASEBALL POST - Pitching Lessons
    title: "How to Run Effective Private Pitching Lessons",
    slug: "run-effective-pitching-lessons",
    excerpt: "Pitching development requires focused instruction and careful structure. Learn how to run effective private pitching lessons with this 5-part framework: warm-up/mobility, mechanical breakdown, target throwing, game situations, and feedback loops.",
    metaTitle: "How to Run Effective Pitching Lessons (5-Part Structure)",
    metaDescription: "Learn how to structure private pitching lessons: 10-min warm-up, 15-min mechanical breakdown, 15-min target throwing, 10-min game situations, 10-min feedback. Professional pitching lesson framework.",
    keywords: "pitching lesson structure, baseball pitching lesson plan, private pitching coach drills, how to run pitching lessons, pitching lesson framework",
    categories: ["baseball", "operations", "business-tips"],
    sport: "baseball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Pitching Lesson Structure",
    content: `${blogStyles}
<div class="blog-content">

<p>Pitching development requires focused repetition and careful instruction.</p>

<p>Private pitching lessons allow coaches to isolate mechanics and improve performance faster than team practices.</p>

<p>Here's how to structure an effective pitching lesson.</p>

<h2>Warm-Up and Mobility (10 Minutes)</h2>

<p><strong>Start with:</strong></p>
<ul>
<li>Arm circles</li>
<li>Shoulder mobility work</li>
<li>Light throwing progression</li>
</ul>

<p><span class="blog-highlight">Proper warm-up reduces injury risk.</span></p>

<h2>Mechanical Breakdown (15 Minutes)</h2>

<p>Focus on one key mechanical element such as:</p>
<ul>
<li>Stride direction</li>
<li>Arm slot</li>
<li>Hip rotation</li>
<li>Balance point</li>
</ul>

<p>Breaking mechanics into pieces improves learning.</p>

<h2>Target Throwing (15 Minutes)</h2>

<p>Use targets to improve command.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Inside fastball targets</li>
<li>Low strike zone targets</li>
<li>Outside corner accuracy</li>
</ul>

<div class="blog-callout">
<p><strong>Command training builds consistency.</strong></p>
</div>

<h2>Game Situation Throws (10 Minutes)</h2>

<p>Simulate real pitching scenarios:</p>
<ul>
<li>Runners on base</li>
<li>Different pitch counts</li>
<li>Pressure situations</li>
</ul>

<p>This prepares athletes for game environments.</p>

<h2>Feedback and Adjustment (10 Minutes)</h2>

<p>End the session by reviewing:</p>
<ul>
<li>Mechanics</li>
<li>Progress</li>
<li>Adjustments for next lesson</li>
</ul>

<p><span class="blog-highlight">Consistent feedback accelerates development.</span></p>

<div class="blog-callout">
<p><strong>Private pitching lessons work best when sessions are structured and repeatable.</strong></p>
<p><strong>Skedence helps baseball trainers manage lesson schedules, track athletes, and organize training programs in one platform.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Start your free trial and run your pitching lessons professionally.</a></p>
</div>

</div>`
  }
];

async function publishPosts() {
  console.log('🚀 Publishing 4 new blog posts...\n');
  
  for (const post of posts) {
    try {
      const docRef = await db.collection('blogPosts').add({
        ...post,
        status: 'published',
        views: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Published: ${post.title}`);
      console.log(`   ID: ${docRef.id}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Categories: ${post.categories.join(', ')}`);
      console.log(`   Sport: ${post.sport}\n`);
    } catch (error) {
      console.error(`❌ Error publishing ${post.title}:`, error);
    }
  }
  
  console.log('✅ All posts published successfully!');
  process.exit(0);
}

publishPosts();
