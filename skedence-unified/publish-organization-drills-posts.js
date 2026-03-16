/**
 * Publish 4 New Blog Posts - Organizing Training & Youth Drills
 * Topics: Volleyball scheduling organization, Soccer beginner drills, Basketball session tips, Baseball youth hitting drills
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
    // VOLLEYBALL POST - Scheduling Organization
    title: "How to Organize Private Volleyball Lessons Without Scheduling Chaos",
    slug: "organize-volleyball-lessons-scheduling",
    excerpt: "Running private volleyball lessons for 10-20 athletes becomes chaotic without a system. Learn 5 proven strategies: set consistent training blocks, separate individual and group lessons, offer lesson packages, track athlete progress, and use automated scheduling.",
    metaTitle: "Organize Volleyball Lessons (5 Scheduling Tips)",
    metaDescription: "Organize volleyball training for 10-20 athletes: set consistent time blocks, separate individual/group sessions, offer lesson packages, track progress, and automate scheduling.",
    keywords: "how to organize private volleyball lessons, managing volleyball training schedule, volleyball lesson scheduling tips, volleyball training organization, managing volleyball lessons",
    categories: ["volleyball", "operations", "business-tips"],
    sport: "volleyball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Organize Volleyball Lessons",
    content: `${blogStyles}
<div class="blog-content">

<p>Running private volleyball lessons can quickly become complicated once you start working with multiple athletes. Many trainers begin by scheduling sessions through text messages or emails, but as the number of athletes grows, keeping everything organized becomes difficult.</p>

<p>If you're training 10–20 athletes per week, you need a clear system for managing scheduling, communication, and lesson tracking.</p>

<p>Here are some practical ways to organize your volleyball training schedule more efficiently.</p>

<h2>1. Set Consistent Training Blocks</h2>

<p>One of the easiest ways to reduce scheduling chaos is by offering lessons during consistent time blocks.</p>

<p><strong>For example:</strong></p>

<p><strong>Monday – Thursday</strong><br>
4:00 PM – 8:00 PM private training</p>

<p><strong>Saturday</strong><br>
10:00 AM – 2:00 PM development sessions</p>

<p><span class="blog-highlight">By limiting training to predictable time windows, athletes know when you are available and scheduling becomes easier.</span></p>

<h2>2. Separate Individual and Group Lessons</h2>

<p>Private volleyball trainers often offer both:</p>

<ul>
<li>One-on-one lessons</li>
<li>Small group training sessions</li>
</ul>

<p>Mixing these randomly can make scheduling confusing. Instead, assign specific blocks to each type of session.</p>

<p><strong>Example:</strong></p>
<ul>
<li>Tuesday / Thursday – Individual lessons</li>
<li>Saturday – Small group sessions</li>
</ul>

<div class="blog-callout">
<p><strong>This structure keeps your calendar organized.</strong></p>
</div>

<h2>3. Offer Volleyball Lesson Packages</h2>

<p>Instead of scheduling one session at a time, many successful trainers sell lesson packages such as:</p>

<ul>
<li>4 lesson package</li>
<li>8 lesson development program</li>
<li>Monthly training plans</li>
</ul>

<p>Packages help athletes stay consistent while reducing administrative work for the coach.</p>

<h2>4. Track Athlete Progress</h2>

<p>Keeping notes on each athlete helps improve lesson quality.</p>

<p><strong>After each session, record:</strong></p>
<ul>
<li>Skills worked on</li>
<li>Strengths and weaknesses</li>
<li>Goals for the next lesson</li>
</ul>

<p><span class="blog-highlight">This helps athletes see measurable improvement over time.</span></p>

<h2>5. Use a Scheduling System</h2>

<p>Many volleyball trainers eventually move away from manual scheduling.</p>

<p>Platforms like Skedence allow athletes to:</p>

<ul>
<li>Purchase lesson packages</li>
<li>View trainer availability</li>
<li>Book sessions directly</li>
</ul>

<div class="blog-callout">
<p><strong>This removes the constant back-and-forth texting and keeps your training schedule organized.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and eliminate scheduling chaos.</a></p>
</div>

</div>`
  },
  {
    // SOCCER POST - Beginner Drills
    title: "The Best Private Soccer Training Drills for Beginner Players",
    slug: "best-soccer-drills-beginner-players",
    excerpt: "Private soccer training for beginners requires focused skill development. Learn 4 essential drills: first touch control (body positioning and soft touch), cone dribbling (both feet coordination), passing accuracy (inside-foot technique), and shooting mechanics.",
    metaTitle: "Best Soccer Drills for Beginners (4 Essential Drills)",
    metaDescription: "Private soccer training drills for beginners: first touch control, cone dribbling with both feet, passing accuracy with inside-foot technique, and proper shooting mechanics.",
    keywords: "private soccer training drills for beginners, beginner soccer training session plan, youth soccer private lesson drills, soccer drills for beginners, youth soccer training drills",
    categories: ["soccer", "operations", "business-tips"],
    sport: "soccer",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Soccer Beginner Drills",
    content: `${blogStyles}
<div class="blog-content">

<p>Private soccer training is extremely effective for beginners because it allows coaches to focus on individual skill development. Young players benefit from repetition, detailed feedback, and drills designed specifically for their skill level.</p>

<p>Here are some of the most effective drills for beginner soccer players during private training sessions.</p>

<h2>1. First Touch Control Drill</h2>

<p>A strong first touch is essential in soccer.</p>

<p><strong>Drill setup:</strong></p>
<ul>
<li>Coach passes ball to athlete</li>
<li>Athlete controls the ball with one touch</li>
<li>Athlete passes it back</li>
</ul>

<p><strong>Focus points:</strong></p>
<ul>
<li>Soft touch</li>
<li>Controlling the ball away from pressure</li>
<li>Proper body positioning</li>
</ul>

<p><span class="blog-highlight">This drill improves ball control quickly.</span></p>

<h2>2. Dribbling Cone Drill</h2>

<p>Set up 5–6 cones in a straight line.</p>

<p>Athletes dribble the ball through the cones while focusing on:</p>

<ul>
<li>Small controlled touches</li>
<li>Using both feet</li>
<li>Maintaining balance</li>
</ul>

<div class="blog-callout">
<p><strong>Dribbling drills improve confidence and coordination.</strong></p>
</div>

<h2>3. Passing Accuracy Drill</h2>

<p>Passing accuracy is another essential skill.</p>

<p>Set up a small target area and have the athlete pass the ball through it repeatedly.</p>

<p><strong>Focus on:</strong></p>
<ul>
<li>Proper foot placement</li>
<li>Inside-of-foot technique</li>
<li>Controlled power</li>
</ul>

<p>This helps beginner players develop consistency.</p>

<h2>4. Shooting Technique Drill</h2>

<p>Beginner athletes should practice proper shooting mechanics early.</p>

<p>Start with stationary shooting before adding movement.</p>

<p><strong>Focus on:</strong></p>
<ul>
<li>Planting foot beside the ball</li>
<li>Striking with the laces</li>
<li>Following through toward the target</li>
</ul>

<p><span class="blog-highlight">This builds good habits early.</span></p>

<h2>Managing Soccer Training Sessions</h2>

<p>As trainers work with more athletes, managing lesson scheduling and payments becomes more complicated.</p>

<div class="blog-callout">
<p><strong>Many soccer coaches eventually use systems like Skedence to organize training schedules and allow athletes to book sessions automatically.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and streamline your soccer training business.</a></p>
</div>

</div>`
  },
  {
    // BASKETBALL POST - Training Session Tips
    title: "How to Run Successful Basketball Training Sessions",
    slug: "run-successful-basketball-training-sessions",
    excerpt: "Run effective basketball training sessions with 4 proven strategies: focus on one skill per session (shooting, ball handling, finishing, defense), emphasize high repetition, simulate game situations, and keep sessions competitive with challenges.",
    metaTitle: "Run Successful Basketball Training (4 Key Strategies)",
    metaDescription: "Run effective basketball training: focus on one skill per session, emphasize repetition (hundreds of reps), simulate game situations, and keep sessions competitive with timed challenges.",
    keywords: "basketball trainer business tips, how to run basketball training sessions, basketball trainer business growth, basketball training session tips, private basketball coaching tips",
    categories: ["basketball", "operations", "business-tips"],
    sport: "basketball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Basketball Training Sessions",
    content: `${blogStyles}
<div class="blog-content">

<p>Private basketball training has become increasingly popular as athletes look for extra skill development outside of team practices.</p>

<p>For trainers, running effective sessions requires both coaching skill and business organization.</p>

<p>Here are some tips for running successful basketball training sessions.</p>

<h2>1. Focus on One Skill Per Session</h2>

<p>The most effective private sessions focus on a single development area.</p>

<p><strong>Examples include:</strong></p>
<ul>
<li>Shooting mechanics</li>
<li>Ball handling</li>
<li>Finishing at the rim</li>
<li>Defensive footwork</li>
</ul>

<p><span class="blog-highlight">Trying to cover too many skills in one session can overwhelm athletes.</span></p>

<h2>2. Emphasize Repetition</h2>

<p>Skill development in basketball comes from repetition.</p>

<p><strong>Private sessions should include:</strong></p>
<ul>
<li>Hundreds of shooting reps</li>
<li>Controlled dribbling repetitions</li>
<li>Repeated finishing drills</li>
</ul>

<div class="blog-callout">
<p><strong>The more repetitions athletes complete, the faster they improve.</strong></p>
</div>

<h2>3. Simulate Game Situations</h2>

<p>Once the athlete understands a skill, introduce game-like scenarios.</p>

<p><strong>Examples include:</strong></p>
<ul>
<li>Shooting after dribble moves</li>
<li>Attacking defenders</li>
<li>Finishing through contact</li>
</ul>

<p>Game-speed drills help athletes apply skills under pressure.</p>

<h2>4. Keep Sessions Competitive</h2>

<p>Competition increases intensity.</p>

<p><strong>Examples include:</strong></p>
<ul>
<li>Timed shooting challenges</li>
<li>Dribble races</li>
<li>Scoring competitions</li>
</ul>

<p><span class="blog-highlight">Athletes stay more engaged when training includes challenges.</span></p>

<h2>Managing a Basketball Training Business</h2>

<p>As basketball trainers work with more athletes, scheduling lessons and managing payments becomes increasingly difficult.</p>

<div class="blog-callout">
<p><strong>Platforms like Skedence allow basketball trainers to organize schedules, sell training packages, and automate lesson bookings.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and grow your basketball training business.</a></p>
</div>

</div>`
  },
  {
    // BASEBALL POST - Youth Hitting Drills
    title: "The Best Baseball Hitting Drills for Youth Players",
    slug: "best-baseball-hitting-drills-youth",
    excerpt: "Youth baseball hitting lessons require focused drill work. Learn 4 essential drills: tee work fundamentals (inside/outside/middle contact), soft toss for timing and bat path, opposite field drill for balance, and live pitching practice for game preparation.",
    metaTitle: "Best Baseball Hitting Drills for Youth (4 Essential Drills)",
    metaDescription: "Youth baseball hitting drills: tee work for mechanics (inside/outside/middle), soft toss for hand-eye coordination, opposite field drill for balance, and live pitching for game situations.",
    keywords: "baseball hitting drills for youth players, youth baseball hitting lesson drills, baseball private hitting drills, youth baseball training drills, hitting drills for young players",
    categories: ["baseball", "operations", "business-tips"],
    sport: "baseball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Youth Baseball Hitting Drills",
    content: `${blogStyles}
<div class="blog-content">

<p>Hitting is one of the most difficult skills for young baseball players to master. Private hitting lessons allow coaches to break down mechanics and help athletes improve faster than in team practices.</p>

<p>Here are some of the most effective drills used in youth baseball hitting lessons.</p>

<h2>1. Tee Work Fundamentals</h2>

<p>Tee drills are the foundation of hitting development.</p>

<p><strong>Common tee drills include:</strong></p>
<ul>
<li>Inside pitch drill</li>
<li>Outside pitch drill</li>
<li>Middle contact drill</li>
</ul>

<p><span class="blog-highlight">These drills help athletes focus on proper swing mechanics.</span></p>

<h2>2. Soft Toss Drill</h2>

<p>Soft toss allows athletes to practice timing and bat path.</p>

<p>The coach tosses the ball from the side while the athlete focuses on:</p>

<ul>
<li>Quick hands</li>
<li>Proper swing path</li>
<li>Solid contact</li>
</ul>

<div class="blog-callout">
<p><strong>This drill helps improve hand-eye coordination.</strong></p>
</div>

<h2>3. Opposite Field Drill</h2>

<p>Young players often pull the ball too early.</p>

<p>Opposite field drills teach athletes to:</p>

<ul>
<li>Stay balanced</li>
<li>Keep hands inside the ball</li>
<li>Drive the ball the other way</li>
</ul>

<p>This improves hitting consistency.</p>

<h2>4. Live Pitching Practice</h2>

<p>Once mechanics are solid, athletes should practice against live pitching.</p>

<p><strong>This builds:</strong></p>
<ul>
<li>Pitch recognition</li>
<li>Reaction speed</li>
<li>Timing</li>
</ul>

<p><span class="blog-highlight">Live pitching is essential for preparing athletes for real games.</span></p>

<h2>Organizing Baseball Training Sessions</h2>

<p>As hitting coaches train more athletes, scheduling lessons and tracking sessions manually becomes difficult.</p>

<div class="blog-callout">
<p><strong>Platforms like Skedence help baseball coaches organize lesson schedules, sell training packages, and automate bookings.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and simplify your hitting coach business.</a></p>
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
