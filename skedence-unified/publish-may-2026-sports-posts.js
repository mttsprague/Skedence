#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

const publishDate = new Date('2026-05-07T10:00:00-05:00');

const posts = [
  {
    title: "The Best Volleyball Serving Drills for Private Lessons",
    slug: "volleyball-serving-drills-private-lessons",
    excerpt: "Master essential serving techniques with these proven drills for private volleyball training. Float serves, jump serves, and consistency training.",
    metaTitle: "Best Volleyball Serving Drills for Private Lessons | Skedence",
    metaDescription: "Improve serving consistency and power with these coach-tested volleyball serving drills. Perfect for private lessons and individual training.",
    keywords: [
      "volleyball serving drills for private lessons",
      "volleyball serve training",
      "how to improve volleyball serve",
      "float serve drills",
      "jump serve training volleyball"
    ],
    categories: ["volleyball", "training-tips"],
    category: "training-tips",
    tags: ["serving", "skills", "drills", "volleyball"],
    sport: "volleyball",
    content: `<div class="blog-content">

<p class="lead">A consistent, powerful serve can win matches. But mastering serving technique requires focused, repetitive practice — making it perfect for private volleyball lessons.</p>

<p>Here are the most effective serving drills used by coaches in private training sessions.</p>

<h2>1. Target Serving Drill</h2>

<p>Place targets in specific zones on the court.</p>

<p><strong>Focus areas:</strong></p>

<ul>
<li>Deep corners</li>
<li>Seams between passers</li>
<li>Short zones</li>
<li>Left back corner (hardest to pass)</li>
</ul>

<p>This builds accuracy and strategic placement.</p>

<h2>2. Float Serve Mechanics</h2>

<p>Break down the float serve into components.</p>

<p><strong>Key elements:</strong></p>

<ul>
<li>Consistent toss height and placement</li>
<li>Contact point (center of ball)</li>
<li>Firm wrist on contact</li>
<li>Follow-through straight toward target</li>
</ul>

<p>Practice each element separately before combining.</p>

<h2>3. Serve and Sprint Drill</h2>

<p>Serve, then sprint to defensive position.</p>

<p><strong>Benefits:</strong></p>

<ul>
<li>Game-like conditioning</li>
<li>Mental transition after serving</li>
<li>Builds consistency under fatigue</li>
</ul>

<p>This simulates real match situations.</p>

<h2>4. Jump Serve Progression</h2>

<p>For advanced players developing jump serves.</p>

<p><strong>Progression steps:</strong></p>

<ul>
<li>Standing jump toss (no approach)</li>
<li>Two-step approach</li>
<li>Full approach with controlled power</li>
<li>Full power jump serve</li>
</ul>

<p>Master each step before advancing.</p>

<h2>5. Serving Consistency Challenge</h2>

<p>Set serving goals and track success rate.</p>

<p><strong>Examples:</strong></p>

<ul>
<li>8 out of 10 serves in play</li>
<li>5 consecutive successful serves</li>
<li>3 out of 5 hitting target zones</li>
</ul>

<p>This builds mental toughness and consistency.</p>

<div class="blog-highlight">
<h3>Managing Volleyball Training</h3>

<p>As volleyball trainers work with more athletes, scheduling lessons and tracking progress becomes complex.</p>

<p>Platforms like <strong>Skedence</strong> help coaches manage schedules, lesson packages, and allow athletes to book sessions online.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&h=630&fit=crop",
    featuredImageAlt: "Volleyball player practicing serving technique during private lesson",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  },
  {
    title: "Essential Goalkeeper Training for Private Soccer Lessons",
    slug: "goalkeeper-training-private-soccer-lessons",
    excerpt: "Master goalkeeper fundamentals with proven drills for private coaching. Shot stopping, positioning, distribution, and decision-making skills.",
    metaTitle: "Goalkeeper Training Drills for Private Soccer Lessons | Skedence",
    metaDescription: "Develop elite goalkeeper skills with these essential drills for private soccer coaching. Shot stopping, positioning, and distribution training.",
    keywords: [
      "goalkeeper training drills",
      "private soccer goalkeeper coaching",
      "goalkeeper training private lessons",
      "soccer goalkeeper drills",
      "goalkeeper shot stopping drills"
    ],
    categories: ["soccer", "training-tips"],
    category: "training-tips",
    tags: ["goalkeeper", "skills", "drills", "soccer"],
    sport: "soccer",
    content: `<div class="blog-content">

<p class="lead">Goalkeepers require specialized training that differs completely from field players. Private lessons allow coaches to focus exclusively on goalkeeper-specific skills.</p>

<p>Here are the most effective goalkeeper drills for private soccer coaching.</p>

<h2>1. Shot Stopping Fundamentals</h2>

<p>Start with basic shot stopping technique.</p>

<p><strong>Key components:</strong></p>

<ul>
<li>Ready position and stance</li>
<li>Footwork and angles</li>
<li>Hand positioning</li>
<li>Diving technique (low, mid, high)</li>
</ul>

<p>Build proper habits from the foundation up.</p>

<h2>2. Reflex Training Drill</h2>

<p>Rapid-fire shots from close range.</p>

<p><strong>Setup:</strong></p>

<ul>
<li>Coach shoots from 10-15 yards</li>
<li>Quick succession of shots</li>
<li>Various heights and angles</li>
<li>Keeper must react instantly</li>
</ul>

<p>This develops quick reactions and recovery speed.</p>

<h2>3. High Ball Handling</h2>

<p>Practice catching crosses and high balls.</p>

<p><strong>Focus areas:</strong></p>

<ul>
<li>Timing the jump</li>
<li>Hand positioning for catching</li>
<li>Calling for the ball</li>
<li>Body protection in traffic</li>
</ul>

<p>Confidence with high balls is critical.</p>

<h2>4. Distribution Training</h2>

<p>Goalkeepers are the first attacker.</p>

<p><strong>Distribution types:</strong></p>

<ul>
<li>Goal kicks (placement and distance)</li>
<li>Throwing to feet or space</li>
<li>Punt accuracy</li>
<li>Quick rolls to start counters</li>
</ul>

<p>Proper distribution creates scoring chances.</p>

<h2>5. 1v1 Situations</h2>

<p>Practice breakaway scenarios.</p>

<p><strong>Key skills:</strong></p>

<ul>
<li>Reading attacker's body language</li>
<li>Closing down angles quickly</li>
<li>Shot blocking technique</li>
<li>Decision making (when to dive, when to stay)</li>
</ul>

<p>Game-winning saves often come from 1v1s.</p>

<div class="blog-highlight">
<h3>Managing Soccer Training Sessions</h3>

<p>As soccer coaches train more goalkeepers and field players, staying organized becomes essential.</p>

<p>Platforms like <strong>Skedence</strong> help manage schedules, track athlete progress, and handle bookings automatically.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&h=630&fit=crop",
    featuredImageAlt: "Soccer goalkeeper training during private coaching session",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  },
  {
    title: "How to Fix Shooting Form in Private Basketball Training",
    slug: "fix-basketball-shooting-form",
    excerpt: "Correct common shooting form issues in private basketball training. Footwork, release point, follow-through, and repetition patterns.",
    metaTitle: "How to Fix Basketball Shooting Form | Private Training",
    metaDescription: "Fix shooting mechanics with proven techniques for private basketball training. Footwork, release, follow-through, and consistency drills.",
    keywords: [
      "fix basketball shooting form",
      "basketball shooting mechanics",
      "shooting form correction basketball",
      "private basketball shooting lessons",
      "improve basketball shot"
    ],
    categories: ["basketball", "training-tips"],
    category: "training-tips",
    tags: ["shooting", "form", "mechanics", "basketball"],
    sport: "basketball",
    content: `<div class="blog-content">

<p class="lead">Poor shooting form is the #1 issue basketball trainers see in private lessons. Small mechanical flaws compound into inconsistent shooting percentages.</p>

<p>Here's how to diagnose and fix shooting form in private training.</p>

<h2>1. Identify the Problem First</h2>

<p>Don't guess — diagnose the actual issue.</p>

<p><strong>Common problems:</strong></p>

<ul>
<li>Inconsistent release point</li>
<li>Poor footwork and balance</li>
<li>Thumb interference</li>
<li>Low release (getting blocked)</li>
<li>Elbow flaring out</li>
</ul>

<p>Record video to identify specific flaws.</p>

<h2>2. Form Shooting (Close Range)</h2>

<p>Start 5 feet from the basket.</p>

<p><strong>Focus only on:</strong></p>

<ul>
<li>One-handed release</li>
<li>High elbow position</li>
<li>Wrist snap and follow-through</li>
<li>Ball rotation</li>
</ul>

<p>Make 10 in a row before moving back.</p>

<h2>3. Footwork Foundation</h2>

<p>Shooting starts with the feet.</p>

<p><strong>Key elements:</strong></p>

<ul>
<li>Feet shoulder-width apart</li>
<li>Shooting-side foot slightly forward</li>
<li>Knees bent for power</li>
<li>Weight on balls of feet</li>
</ul>

<p>Proper base leads to consistent shooting.</p>

<h2>4. Release Point Consistency</h2>

<p>Release at the same point every time.</p>

<p><strong>Check:</strong></p>

<ul>
<li>Ball leaves hand at forehead height</li>
<li>Elbow under ball</li>
<li>Wrist cocked back</li>
<li>Fingers spread on ball</li>
</ul>

<p>Use a mirror or video for feedback.</p>

<h2>5. Progressive Distance Drill</h2>

<p>Build range gradually with proper form.</p>

<p><strong>Progression:</strong></p>

<ul>
<li>5 feet: 10 makes</li>
<li>10 feet: 10 makes</li>
<li>15 feet: 10 makes</li>
<li>Three-point line: 10 makes</li>
</ul>

<p>Only advance after hitting the target number.</p>

<div class="blog-highlight">
<h3>Running Basketball Training Efficiently</h3>

<p>As basketball trainers work with more clients, managing schedules and tracking progress becomes critical.</p>

<p>Platforms like <strong>Skedence</strong> automate bookings, lesson packages, and scheduling so trainers can focus on coaching.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop",
    featuredImageAlt: "Basketball player working on shooting form during private training",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  },
  {
    title: "Baseball Catching Fundamentals for Private Lessons",
    slug: "baseball-catching-fundamentals-private-lessons",
    excerpt: "Master catcher training with essential drills for private baseball lessons. Receiving, blocking, framing, footwork, and throwing mechanics.",
    metaTitle: "Baseball Catching Drills for Private Lessons | Skedence",
    metaDescription: "Train catchers effectively with these essential drills for private baseball lessons. Receiving, blocking, framing, and throwing fundamentals.",
    keywords: [
      "baseball catching drills private lessons",
      "catcher training drills",
      "catching fundamentals baseball",
      "private catching coach",
      "catcher blocking drills"
    ],
    categories: ["baseball", "training-tips"],
    category: "training-tips",
    tags: ["catching", "fundamentals", "drills", "baseball"],
    sport: "baseball",
    content: `<div class="blog-content">

<p class="lead">Catching is the most demanding position in baseball. It requires technique, toughness, and leadership — all of which can be developed through focused private lessons.</p>

<p>Here are the essential catching drills for private baseball coaching.</p>

<h2>1. Receiving Mechanics</h2>

<p>Proper receiving technique is the foundation.</p>

<p><strong>Key points:</strong></p>

<ul>
<li>Relaxed hands and soft catch</li>
<li>Quiet glove presentation</li>
<li>Framing pitches on corners</li>
<li>Giving with the pitch</li>
</ul>

<p>Catchers who receive well help their pitchers.</p>

<h2>2. Blocking Drill Series</h2>

<p>Blocking wild pitches keeps runners from advancing.</p>

<p><strong>Progression:</strong></p>

<ul>
<li>Stationary blocking (knees down)</li>
<li>Blocking from catching stance</li>
<li>Blocking left and right</li>
<li>Blocking with runners (game speed)</li>
</ul>

<p>Repetition builds confidence and fearlessness.</p>

<h2>3. Pop Time Footwork</h2>

<p>Quick footwork on throws to second base.</p>

<p><strong>Focus areas:</strong></p>

<ul>
<li>Quick exchange (glove to hand)</li>
<li>Jab step and replace feet</li>
<li>Short, quick arm action</li>
<li>Throwing on a line</li>
</ul>

<p>Elite catchers have pop times under 2.0 seconds.</p>

<h2>4. Framing Practice</h2>

<p>Steal strikes by framing borderline pitches.</p>

<p><strong>Technique:</strong></p>

<ul>
<li>Catch and stick pitches</li>
<li>Minimal glove movement</li>
<li>Work pitches back to strike zone</li>
<li>Stay square to pitcher</li>
</ul>

<p>Good framing can add 10+ strikes per game.</p>

<h2>5. Game Situation Drills</h2>

<p>Practice real scenarios catchers face.</p>

<p><strong>Situations:</strong></p>

<ul>
<li>Bunt coverage</li>
<li>Pop-ups and foul balls</li>
<li>Rundowns and pickoffs</li>
<li>Plays at the plate</li>
</ul>

<p>Game experience builds decision-making skills.</p>

<div class="blog-highlight">
<h3>Managing Baseball Training</h3>

<p>As baseball coaches train multiple catchers and position players, organizing schedules and tracking development becomes challenging.</p>

<p>Platforms like <strong>Skedence</strong> help coaches manage lesson bookings, packages, and athlete progress tracking.</p>
</div>

</div>`,
    featuredImage: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&h=630&fit=crop",
    featuredImageAlt: "Baseball catcher working on receiving technique during private lesson",
    ctaText: "Start Your Free Trial",
    ctaLink: "/login",
    authorId: "skedence-team",
    authorName: "Skedence Team",
    authorBio: "Expert insights on running successful sports training businesses."
  }
];

async function publishPosts() {
  console.log('🚀 Publishing 4 new blog posts (May 2026)...\n');
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
  console.log('   Volleyball: Serving Drills for Private Lessons');
  console.log('   Soccer: Goalkeeper Training for Private Lessons');
  console.log('   Basketball: How to Fix Shooting Form');
  console.log('   Baseball: Catching Fundamentals for Private Lessons\n');
  console.log('🌐 View at: https://skedence.com/blog\n');
  
  process.exit(0);
}

publishPosts();
