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
    font-size: 1.5rem;
    font-weight: 600;
    color: #0A0A0A;
    margin: 2rem 0 1rem 0;
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

const publishDate = new Date('2026-04-13T09:00:00-05:00');

const posts = [
  {
    title: "The Best Hitting Drills for Private Volleyball Lessons",
    slug: "volleyball-hitting-drills-private-lessons",
    excerpt: "Master the most effective hitting drills used in private volleyball training. Learn techniques for approach footwork, arm swing mechanics, and game-speed attacking.",
    metaTitle: "Best Hitting Drills for Private Volleyball Lessons | Skedence",
    metaDescription: "Discover proven hitting drills for private volleyball training. Improve power, consistency, and shot placement with these coach-tested techniques.",
    keywords: [
      "volleyball private lesson drills for hitters",
      "hitting drills for private volleyball training",
      "volleyball hitting lesson plan",
      "volleyball approach footwork drills",
      "volleyball hitting technique"
    ],
    categories: ["volleyball", "training-tips"],
    category: "training-tips",
    tags: ["hitting", "skills", "drills", "volleyball"],
    sport: "volleyball",
    content: `${blogCSS}<div class="blog-content">

<p class="lead">Hitting is one of the most requested skills in private volleyball training. Athletes want to improve power, consistency, and shot placement — and private lessons are the perfect environment to focus on these details.</p>

<p>Here are some of the most effective hitting drills for private volleyball lessons.</p>

<h2>1. Approach Footwork Drill</h2>

<p>Start without a ball.</p>

<p><strong>Focus on:</strong></p>

<ul>
<li>Proper 3-step or 4-step approach</li>
<li>Rhythm and timing</li>
<li>Explosive last two steps</li>
</ul>

<p>This builds the foundation for all hitting.</p>

<h2>2. Arm Swing Mechanics Drill</h2>

<p>Use controlled reps.</p>

<p><strong>Focus on:</strong></p>

<ul>
<li>Elbow position</li>
<li>Fast arm swing</li>
<li>Full extension</li>
</ul>

<p>This improves power and consistency.</p>

<h2>3. Controlled Toss Hitting</h2>

<p>Coach tosses the ball.</p>

<p><strong>Athlete focuses on:</strong></p>

<ul>
<li>Timing</li>
<li>Contact point</li>
<li>Hitting high and fast</li>
</ul>

<p>This removes complexity and isolates technique.</p>

<h2>4. Target Hitting Drill</h2>

<p>Place targets on the court.</p>

<p><strong>Athletes aim for:</strong></p>

<ul>
<li>Deep corners</li>
<li>Cross-court shots</li>
<li>Line shots</li>
</ul>

<p>This improves accuracy and decision-making.</p>

<h2>5. Game-Speed Hitting</h2>

<p>Add movement and tempo.</p>

<p><strong>Simulate:</strong></p>

<ul>
<li>Transition attacks</li>
<li>Out-of-system sets</li>
<li>Defensive reads</li>
</ul>

<p>This prepares athletes for real matches.</p>

<div class="blog-highlight">
<h3>Running Better Volleyball Lessons</h3>

<p>As volleyball trainers work with more athletes, organizing sessions becomes more difficult.</p>

<p>Platforms like <strong>Skedence</strong> help coaches manage lesson schedules, sell training packages, and allow athletes to book sessions automatically.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&h=630&fit=crop",
    featuredImageAlt: "Volleyball player practicing hitting technique during private lesson",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  },
  {
    title: "How to Structure a Private Soccer Training Session",
    slug: "structure-private-soccer-training-session",
    excerpt: "Learn the proven format for running effective one-on-one soccer training sessions. Includes warm-up, technical work, game drills, and conditioning structure.",
    metaTitle: "How to Structure Private Soccer Training Sessions | Skedence",
    metaDescription: "Master the format for effective one-on-one soccer lessons. Step-by-step session structure from warm-up to feedback for private soccer coaching.",
    keywords: [
      "how to structure soccer private lessons",
      "soccer private training session structure",
      "one on one soccer coaching plan",
      "private soccer lesson format",
      "soccer training session plan"
    ],
    categories: ["soccer", "operations"],
    category: "operations",
    tags: ["session-structure", "coaching", "planning", "soccer"],
    sport: "soccer",
    content: `${blogCSS}<div class="blog-content">

<p class="lead">Private soccer lessons are most effective when they follow a structured plan. Without structure, sessions can feel random and less productive.</p>

<p>Here's a proven format for running effective one-on-one soccer training sessions.</p>

<h2>1. Warm-Up (10 Minutes)</h2>

<p>Start with movement and ball control.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Light dribbling</li>
<li>Dynamic stretching</li>
<li>First touch drills</li>
</ul>

<h2>2. Technical Skill Work (20 Minutes)</h2>

<p>Focus on one core skill.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Dribbling</li>
<li>Passing</li>
<li>Shooting</li>
<li>First touch</li>
</ul>

<p><strong>Repetition is key.</strong></p>

<h2>3. Game-Like Drills (15 Minutes)</h2>

<p>Apply skills in realistic situations.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Attacking scenarios</li>
<li>Defensive positioning</li>
<li>Small-sided drills</li>
</ul>

<h2>4. Conditioning (10 Minutes)</h2>

<p>Include soccer-specific movement.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>Sprint drills</li>
<li>Agility ladders</li>
<li>Change-of-direction work</li>
</ul>

<h2>5. Feedback and Review (5 Minutes)</h2>

<p><strong>Discuss:</strong></p>

<ul>
<li>What improved</li>
<li>What to work on</li>
<li>Goals for next session</li>
</ul>

<div class="blog-highlight">
<h3>Managing Soccer Training Efficiently</h3>

<p>As coaches train more athletes, scheduling sessions manually becomes time-consuming.</p>

<p>Platforms like <strong>Skedence</strong> allow athletes to book sessions and help coaches stay organized.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop",
    featuredImageAlt: "Soccer coach running private training session with player",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  },
  {
    title: "The Best Basketball Training Drills for Guards",
    slug: "basketball-training-drills-for-guards",
    excerpt: "Essential skill development drills for basketball guards. Master ball handling, shooting off the dribble, finishing, and decision-making in private training.",
    metaTitle: "Best Basketball Training Drills for Guards | Skedence",
    metaDescription: "Train guards effectively with these essential basketball drills. Ball handling, shooting, finishing, and decision-making skills for private lessons.",
    keywords: [
      "basketball training drills for guards",
      "private basketball training for guards",
      "guard skill development drills basketball",
      "basketball ball handling drills",
      "shooting drills for guards"
    ],
    categories: ["basketball", "training-tips"],
    category: "training-tips",
    tags: ["guards", "skills", "drills", "basketball"],
    sport: "basketball",
    content: `${blogCSS}<div class="blog-content">

<p class="lead">Guards play a critical role in basketball, requiring strong ball handling, decision-making, and scoring ability.</p>

<p>Private training allows coaches to focus on these key skills.</p>

<p>Here are the best drills for guard development.</p>

<h2>1. Ball Handling Control Drills</h2>

<p><strong>Start with:</strong></p>

<ul>
<li>Two-ball dribbling</li>
<li>Crossovers</li>
<li>Hesitation moves</li>
</ul>

<p>This improves control and coordination.</p>

<h2>2. Change of Direction Drills</h2>

<p>Guards must create space.</p>

<p><strong>Practice:</strong></p>

<ul>
<li>In-and-out moves</li>
<li>Behind-the-back dribbles</li>
<li>Quick stops and starts</li>
</ul>

<h2>3. Shooting Off the Dribble</h2>

<p><strong>Focus on:</strong></p>

<ul>
<li>Pull-up jump shots</li>
<li>Step-back shots</li>
<li>Movement shooting</li>
</ul>

<p>This is essential for scoring.</p>

<h2>4. Finishing at the Rim</h2>

<p><strong>Include:</strong></p>

<ul>
<li>Euro steps</li>
<li>Floaters</li>
<li>Contact finishes</li>
</ul>

<h2>5. Decision-Making Drills</h2>

<p><strong>Simulate:</strong></p>

<ul>
<li>Pick-and-roll situations</li>
<li>Drive-and-kick decisions</li>
<li>Reading defenders</li>
</ul>

<div class="blog-highlight">
<h3>Running Basketball Training Efficiently</h3>

<p>As trainers work with more athletes, organizing schedules and sessions becomes harder.</p>

<p>Platforms like <strong>Skedence</strong> help automate bookings and keep everything organized.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop",
    featuredImageAlt: "Basketball guard practicing ball handling drills during private training",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  },
  {
    title: "The Best Pitching Drills for Private Baseball Lessons",
    slug: "baseball-pitching-drills-private-lessons",
    excerpt: "Master essential pitching drills for private baseball lessons. Balance point, towel drill, target throwing, bullpen simulation, and velocity development.",
    metaTitle: "Best Pitching Drills for Private Baseball Lessons | Skedence",
    metaDescription: "Improve pitching mechanics with these essential drills for private baseball lessons. Balance, accuracy, game simulation, and velocity training.",
    keywords: [
      "baseball pitching drills for private lessons",
      "pitching lesson drills baseball",
      "private pitching coach drills",
      "baseball pitching mechanics drills",
      "pitching accuracy drills"
    ],
    categories: ["baseball", "training-tips"],
    category: "training-tips",
    tags: ["pitching", "drills", "mechanics", "baseball"],
    sport: "baseball",
    content: `${blogCSS}<div class="blog-content">

<p class="lead">Pitching is one of the most technical skills in baseball. Private lessons allow coaches to break down mechanics and help pitchers improve faster.</p>

<p>Here are some of the best pitching drills used in private lessons.</p>

<h2>1. Balance Point Drill</h2>

<p><strong>Focus on:</strong></p>

<ul>
<li>Body control</li>
<li>Staying balanced</li>
<li>Proper posture</li>
</ul>

<p>This improves consistency.</p>

<h2>2. Towel Drill</h2>

<p>Use a towel instead of a ball.</p>

<p><strong>Focus on:</strong></p>

<ul>
<li>Arm path</li>
<li>Extension</li>
<li>Mechanics</li>
</ul>

<p>This helps refine technique.</p>

<h2>3. Target Throwing Drill</h2>

<p>Place targets in the strike zone.</p>

<p><strong>Pitchers focus on:</strong></p>

<ul>
<li>Accuracy</li>
<li>Control</li>
<li>Consistency</li>
</ul>

<h2>4. Bullpen Simulation</h2>

<p>Simulate real game situations.</p>

<p><strong>Pitchers practice:</strong></p>

<ul>
<li>Pitch sequences</li>
<li>Game strategy</li>
<li>Pressure situations</li>
</ul>

<h2>5. Velocity and Strength Work</h2>

<p><strong>Include:</strong></p>

<ul>
<li>Resistance training</li>
<li>Mobility exercises</li>
<li>Throwing programs</li>
</ul>

<div class="blog-highlight">
<h3>Managing Pitching Lessons</h3>

<p>As pitching coaches train more athletes, scheduling and tracking sessions becomes difficult.</p>

<p>Platforms like <strong>Skedence</strong> help coaches manage schedules, bookings, and training programs.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&h=630&fit=crop",
    featuredImageAlt: "Baseball pitcher working on mechanics during private pitching lesson",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  }
];

async function publishPosts() {
  console.log('🚀 Publishing 4 new blog posts (April 2026)...\n');
  console.log('📍 Project: polyface-ae6d3 (Skedence)\n');
  
  for (const post of posts) {
    try {
      const postData = {
        ...post,
        status: 'published',
        views: 0,
        createdAt: admin.firestore.Timestamp.fromDate(publishDate),
        updatedAt: admin.firestore.Timestamp.fromDate(publishDate),
        publishedAt: admin.firestore.Timestamp.fromDate(publishDate)
      };
      
      await db.collection('blogPosts').add(postData);
      
      console.log(`✅ Published: ${post.title}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Sport: ${post.sport}`);
      console.log(`   Keywords: ${post.keywords.slice(0, 2).join(', ')}...`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error publishing ${post.title}:`, error.message);
    }
  }
  
  console.log('═'.repeat(80));
  console.log('✅ All 4 blog posts published!\n');
  console.log('📊 Summary:');
  console.log('   Volleyball: Hitting Drills for Private Lessons');
  console.log('   Soccer: How to Structure Private Training Sessions');
  console.log('   Basketball: Training Drills for Guards');
  console.log('   Baseball: Pitching Drills for Private Lessons\n');
  console.log('🌐 View at: https://skedence.com/blog\n');
  
  process.exit(0);
}

publishPosts();
