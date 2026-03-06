/**
 * Publish 4 New Blog Posts - Training Session Structure & Client Acquisition
 * Topics: Volleyball lesson plans, Soccer client acquisition, Basketball workout structure, Baseball hitting lessons
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
    // VOLLEYBALL POST - Lesson Plan Structure
    title: "The Perfect Private Volleyball Lesson Plan (Step-by-Step Structure)",
    slug: "perfect-volleyball-lesson-plan-structure",
    excerpt: "Private volleyball lessons need structure to be effective. Learn the proven 5-part framework: warm-up and ball control, skill-specific training, game simulation drills, conditioning and footwork, plus feedback and review.",
    metaTitle: "Perfect Volleyball Lesson Plan (5-Part Structure)",
    metaDescription: "Learn how to structure private volleyball lessons: 10-min warm-up, 20-min skill training (setters, hitters, liberos), 15-min game simulation, 10-min conditioning, 5-min feedback and review.",
    keywords: "volleyball lesson plan for private training, private volleyball lesson structure, volleyball individual training session plan, volleyball training framework, private volleyball coaching plan",
    categories: ["volleyball", "operations", "business-tips"],
    sport: "volleyball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Volleyball Lesson Plan",
    content: `${blogStyles}
<div class="blog-content">

<p>Private volleyball lessons are one of the best ways for athletes to accelerate their development. Unlike team practices, private training allows coaches to focus entirely on individual weaknesses and skill refinement.</p>

<p>But for lessons to be effective, they need structure.</p>

<p>Here is a proven framework many private volleyball trainers use to run effective sessions.</p>

<h2>1. Warm-Up and Ball Control (10 Minutes)</h2>

<p>Start every lesson with movement and ball control drills.</p>

<p>This prepares athletes physically while reinforcing fundamentals.</p>

<p><strong>Examples include:</strong></p>
<ul>
<li>Pepper drills</li>
<li>Passing control</li>
<li>Controlled setting repetitions</li>
<li>Platform angle work</li>
</ul>

<p><span class="blog-highlight">Ball control is the foundation of volleyball development.</span></p>

<h2>2. Skill-Specific Training (20 Minutes)</h2>

<p>Next, focus on the athlete's primary development area.</p>

<p><strong>Examples:</strong></p>

<h3>Setters</h3>
<ul>
<li>Footwork to the ball</li>
<li>Release speed</li>
<li>Back-row setting</li>
</ul>

<h3>Hitters</h3>
<ul>
<li>Approach mechanics</li>
<li>Arm swing timing</li>
<li>Shot placement</li>
</ul>

<h3>Liberos</h3>
<ul>
<li>Platform angles</li>
<li>Serve receive consistency</li>
<li>Defensive reaction drills</li>
</ul>

<div class="blog-callout">
<p><strong>Private volleyball training is most effective when one specific skill is emphasized per session.</strong></p>
</div>

<h2>3. Game Simulation Drills (15 Minutes)</h2>

<p>Game-like scenarios help athletes apply technique under pressure.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Serve receive under movement</li>
<li>Attacking against defensive reads</li>
<li>Transition footwork drills</li>
</ul>

<p>This bridges the gap between practice and match performance.</p>

<h2>4. Conditioning and Footwork (10 Minutes)</h2>

<p>Athletes should leave lessons physically challenged.</p>

<p>Focus on volleyball-specific movement such as:</p>
<ul>
<li>Lateral shuffle drills</li>
<li>Explosive jumps</li>
<li>Quick reaction exercises</li>
</ul>

<p><span class="blog-highlight">These movements translate directly to in-game performance.</span></p>

<h2>5. Feedback and Review (5 Minutes)</h2>

<p>End every lesson with quick feedback.</p>

<p><strong>Discuss:</strong></p>
<ul>
<li>Improvement areas</li>
<li>Progress since last session</li>
<li>Drills to practice independently</li>
</ul>

<p>This keeps athletes engaged in long-term development.</p>

<h2>Running a Professional Volleyball Training Business</h2>

<p>As trainers grow their athlete roster, managing lessons can quickly become complicated.</p>

<p>Many volleyball trainers start by scheduling lessons through text messages or spreadsheets.</p>

<div class="blog-callout">
<p><strong>Platforms like Skedence help volleyball trainers organize lesson packages, manage availability, and allow athletes to book sessions automatically.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and streamline your volleyball training business.</a></p>
</div>

</div>`
  },
  {
    // SOCCER POST - Client Acquisition
    title: "How to Get More Clients for Your Private Soccer Training Business",
    slug: "get-clients-soccer-training-business",
    excerpt: "Word of mouth alone limits soccer training growth. Learn 4 proven strategies to attract new clients: post educational social media content, partner with local clubs, offer development packages, and make booking simple.",
    metaTitle: "Get More Soccer Training Clients (4 Proven Strategies)",
    metaDescription: "Learn how to get more private soccer training clients: post educational social media content, partner with local clubs, offer structured development packages, and simplify the booking process.",
    keywords: "how to get private soccer training clients, marketing private soccer lessons, grow soccer training business, soccer training client acquisition, marketing soccer coaching business",
    categories: ["soccer", "marketing", "revenue-growth", "getting-started"],
    sport: "soccer",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Soccer Client Acquisition",
    content: `${blogStyles}
<div class="blog-content">

<p>Many soccer trainers start their private training business through referrals.</p>

<p>While word of mouth helps early on, relying on it alone limits growth.</p>

<p>If you want consistent bookings, you need a simple system for attracting new athletes.</p>

<p>Here are proven strategies used by successful soccer trainers.</p>

<h2>1. Post Educational Content on Social Media</h2>

<p>Parents look for coaches who teach.</p>

<p>Posting educational content builds credibility.</p>

<p><strong>Examples include:</strong></p>
<ul>
<li>Dribbling technique breakdowns</li>
<li>Finishing tips</li>
<li>Defensive positioning drills</li>
<li>First touch exercises</li>
</ul>

<p><span class="blog-highlight">Short instructional clips perform extremely well on Instagram and TikTok.</span></p>

<h2>2. Partner With Local Clubs</h2>

<p>Club teams are full of athletes who want extra development.</p>

<p><strong>Reach out to:</strong></p>
<ul>
<li>Assistant coaches</li>
<li>Club directors</li>
<li>Team managers</li>
</ul>

<p><strong>Offer specialized training such as:</strong></p>
<ul>
<li>Striker finishing sessions</li>
<li>Midfielder vision training</li>
<li>Defender positioning clinics</li>
</ul>

<div class="blog-callout">
<p><strong>These partnerships can generate consistent referrals.</strong></p>
</div>

<h2>3. Offer Development Packages</h2>

<p>Parents prefer structured programs.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>6-session development plan</li>
<li>8-week striker training program</li>
<li>Preseason conditioning packages</li>
</ul>

<p>Packages also increase revenue stability.</p>

<h2>4. Make Booking Simple</h2>

<p>One of the biggest mistakes soccer trainers make is requiring athletes to schedule lessons manually.</p>

<p>If booking requires texting or email coordination, many parents will simply delay scheduling.</p>

<p><strong>Allowing athletes to:</strong></p>
<ul>
<li>View availability</li>
<li>Purchase lesson packages</li>
<li>Book sessions</li>
</ul>

<p>makes the process significantly easier.</p>

<h2>Running a Professional Soccer Training Business</h2>

<p>As your client list grows, managing lessons manually becomes difficult.</p>

<div class="blog-callout">
<p><strong>Platforms like Skedence allow soccer trainers to manage schedules, sell training packages, and automate bookings in one system.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and grow your soccer training business.</a></p>
</div>

</div>`
  },
  {
    // BASKETBALL POST - Session Structure
    title: "The Ideal Structure for a Private Basketball Training Session",
    slug: "ideal-basketball-training-session-structure",
    excerpt: "Private basketball workouts need structure for skill development. Learn the proven 5-part framework: ball handling warm-up, shooting mechanics, game-speed drills, finishing at the rim, and conditioning with competitive drills.",
    metaTitle: "Ideal Basketball Training Session Structure (5 Parts)",
    metaDescription: "Learn how to structure private basketball training sessions: ball handling warm-up, shooting mechanics progression, game-speed drills, finishing at the rim, and competitive conditioning drills.",
    keywords: "basketball training session structure, private basketball workout plan, basketball individual workout drills, basketball training framework, private basketball session plan",
    categories: ["basketball", "operations", "business-tips"],
    sport: "basketball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Basketball Training Structure",
    content: `${blogStyles}
<div class="blog-content">

<p>Private basketball workouts should focus on skill development, repetition, and game-speed decision making.</p>

<p>Unlike team practices, private sessions allow trainers to isolate specific weaknesses and accelerate development.</p>

<p>Here is a proven structure used by many basketball trainers.</p>

<h2>1. Ball Handling Warm-Up</h2>

<p>Start with ball control drills.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Two-ball dribbling</li>
<li>Stationary crossovers</li>
<li>Hesitation moves</li>
<li>Speed dribble variations</li>
</ul>

<p><span class="blog-highlight">This improves coordination and control.</span></p>

<h2>2. Shooting Mechanics</h2>

<p>Shooting is the most common focus of private basketball training.</p>

<p>Start close to the basket and gradually move outward.</p>

<p><strong>Focus on:</strong></p>
<ul>
<li>Footwork</li>
<li>Balance</li>
<li>Release timing</li>
<li>Shot arc</li>
</ul>

<div class="blog-callout">
<p><strong>Repetition is key to improving consistency.</strong></p>
</div>

<h2>3. Game-Speed Drills</h2>

<p>Players must learn to execute skills under pressure.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Pull-up jump shots off the dribble</li>
<li>Catch-and-shoot under movement</li>
<li>Attacking the basket through cones</li>
</ul>

<p>Game-speed drills prepare athletes for real situations.</p>

<h2>4. Finishing at the Rim</h2>

<p>Finishing drills improve scoring ability.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Euro steps</li>
<li>Reverse layups</li>
<li>Contact finishes</li>
<li>Floaters</li>
</ul>

<p><span class="blog-highlight">These skills are critical for guards and forwards.</span></p>

<h2>5. Conditioning and Competitive Drills</h2>

<p>End sessions with high-intensity drills.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Full-court dribble sprints</li>
<li>Timed shooting challenges</li>
<li>Defensive slide competitions</li>
</ul>

<p>These drills simulate game pressure.</p>

<h2>Managing a Basketball Training Business</h2>

<p>As trainers build their client base, managing schedules, payments, and sessions becomes more complex.</p>

<div class="blog-callout">
<p><strong>Tools like Skedence help basketball trainers organize their lesson schedules, sell packages, and allow athletes to book sessions easily.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and streamline your basketball training business.</a></p>
</div>

</div>`
  },
  {
    // BASEBALL POST - Hitting Lessons
    title: "How to Structure Effective Private Baseball Hitting Lessons",
    slug: "structure-baseball-hitting-lessons",
    excerpt: "Private hitting lessons need structure to improve mechanics and timing. Learn the proven 5-part framework: warm-up and tee work, front toss drills, situational hitting, live pitching practice, and review with feedback.",
    metaTitle: "Structure Baseball Hitting Lessons (5-Part Framework)",
    metaDescription: "Learn how to structure private hitting lessons: tee work for mechanics, front toss for timing, situational hitting, live pitching practice, and comprehensive feedback review.",
    keywords: "how to structure baseball hitting lessons, private hitting coach lesson plan, baseball hitting training session, hitting lesson framework, private baseball hitting coaching",
    categories: ["baseball", "operations", "business-tips"],
    sport: "baseball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Baseball Hitting Lessons",
    content: `${blogStyles}
<div class="blog-content">

<p>Private hitting lessons allow coaches to focus on mechanics, timing, and consistency.</p>

<p>But without a structured plan, sessions can become repetitive or ineffective.</p>

<p>Here is a proven framework used by many hitting coaches.</p>

<h2>1. Warm-Up and Tee Work</h2>

<p>Start with controlled swings.</p>

<p>Tee drills allow athletes to focus on mechanics without timing pressure.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Inside pitch tee drill</li>
<li>Outside pitch tee drill</li>
<li>High/low pitch adjustments</li>
</ul>

<p><span class="blog-highlight">This reinforces proper swing mechanics.</span></p>

<h2>2. Front Toss Drills</h2>

<p>Front toss helps athletes work on timing and pitch recognition.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Inside fastball</li>
<li>Outside pitch</li>
<li>Off-speed recognition</li>
</ul>

<div class="blog-callout">
<p><strong>Focus on solid contact and swing path.</strong></p>
</div>

<h2>3. Situational Hitting</h2>

<p>Private lessons should include game scenarios.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Hitting behind runners</li>
<li>Opposite field hitting</li>
<li>Two-strike approach</li>
</ul>

<p>These drills improve real-game performance.</p>

<h2>4. Live Pitching Practice</h2>

<p>Advanced athletes benefit from live pitching simulations.</p>

<p><span class="blog-highlight">This builds reaction speed and pitch recognition.</span></p>

<h2>5. Review and Feedback</h2>

<p>End sessions by reviewing mechanics and progress.</p>

<p><strong>Discuss:</strong></p>
<ul>
<li>Swing adjustments</li>
<li>Timing improvements</li>
<li>Focus areas for next lesson</li>
</ul>

<p>This reinforces development.</p>

<h2>Managing a Baseball Training Business</h2>

<p>As baseball coaches train more athletes, manual scheduling and payment tracking becomes difficult.</p>

<div class="blog-callout">
<p><strong>Platforms like Skedence help hitting coaches manage lesson schedules, sell training packages, and allow athletes to book sessions automatically.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and run your hitting lessons professionally.</a></p>
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
