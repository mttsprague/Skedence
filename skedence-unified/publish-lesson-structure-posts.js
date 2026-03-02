/**
 * Publish 4 New Blog Posts - Lesson Structure & Business Operations
 * Topics: Volleyball lesson structure, Soccer insurance, Basketball gym rental, Baseball pricing tiers
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
    // VOLLEYBALL POST
    title: "How to Structure a 60-Minute Private Volleyball Lesson (With Sample Plan)",
    slug: "structure-60-minute-volleyball-private-lesson",
    excerpt: "Private volleyball lessons work best with clear structure. Learn the proven 4-part framework (warm-up, skill isolation, game-speed application, pressure finish) that maximizes athlete development and parent retention.",
    metaTitle: "60-Minute Volleyball Lesson Structure (Sample Plan)",
    metaDescription: "Learn how to structure a 60-minute private volleyball lesson with this proven 4-part framework. Includes warm-up, skill drills, game-speed application, and pressure finish.",
    keywords: "private volleyball lesson drills, volleyball lesson plan template, how to structure a volleyball private lesson, volleyball training structure, private volleyball coaching",
    categories: ["volleyball", "operations", "business-tips"],
    sport: "volleyball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Volleyball Lesson Structure",
    content: `${blogStyles}
<div class="blog-content">

<p>Private volleyball lessons shouldn't feel random.</p>

<p>Athletes improve faster when sessions follow a clear structure — not just reps and feedback.</p>

<p>Here's how to structure a 60-minute private volleyball lesson for maximum development.</p>

<h2>The Ideal 60-Minute Framework</h2>

<h3>1️⃣ Warm-Up (10 Minutes)</h3>

<p><strong>Focus:</strong></p>
<ul>
<li>Footwork activation</li>
<li>Ball control touches</li>
<li>Dynamic movement</li>
</ul>

<p><strong>Examples:</strong></p>
<ul>
<li>Short court pepper with movement</li>
<li>Shuffle + dig reps</li>
<li>Approach timing drills</li>
</ul>

<div class="blog-callout">
<p><strong>Goal:</strong> Prime movement, not exhaust.</p>
</div>

<h3>2️⃣ Skill Isolation (20 Minutes)</h3>

<p><strong>Choose ONE primary focus:</strong></p>
<ul>
<li>Serve receive mechanics</li>
<li>Setter hand positioning</li>
<li>Hitting arm swing</li>
<li>Blocking footwork</li>
</ul>

<p>Keep reps high.<br>
Correct immediately.<br>
Short feedback loops.</p>

<h3>3️⃣ Game-Speed Application (20 Minutes)</h3>

<p>Now apply the skill under pressure.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>Live serve receive scenarios</li>
<li>Transition hitting drills</li>
<li>Competitive scoring reps</li>
</ul>

<p><span class="blog-highlight">Skill transfer happens here.</span></p>

<h3>4️⃣ Pressure Finish (10 Minutes)</h3>

<p><strong>End with:</strong></p>
<ul>
<li>Competitive drill</li>
<li>Target-based serving</li>
<li>Timed challenge</li>
</ul>

<p>Confidence matters.</p>

<h2>Why Structure Increases Retention</h2>

<p>When parents see:</p>
<ul>
<li>Clear progression</li>
<li>Focused improvement</li>
<li>Organized sessions</li>
</ul>

<p><strong>They rebook.</strong></p>

<p>Professional structure builds trust.</p>

<h2>Scaling Structured Lessons</h2>

<p>As you grow, consistent lesson frameworks:</p>
<ul>
<li>Improve athlete results</li>
<li>Help assistant trainers stay aligned</li>
<li>Make multi-trainer academies smoother</li>
<li>Allow packaged programs to make sense</li>
</ul>

<div class="blog-callout">
<p><strong>Skedence helps volleyball coaches organize structured sessions into bookable packages and track athlete progress over time.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and run structured, scalable lessons.</a></p>
</div>

</div>`
  },
  {
    // SOCCER POST
    title: "Do You Need Insurance for Private Soccer Training? (What Coaches Should Know)",
    slug: "insurance-requirements-private-soccer-training",
    excerpt: "If you charge for private soccer sessions, you likely need insurance. Learn about general liability, professional liability, facility requirements, and why waivers alone aren't enough for serious trainers.",
    metaTitle: "Do Soccer Trainers Need Insurance? (Requirements Guide)",
    metaDescription: "Learn what insurance private soccer trainers need: general liability, professional liability, facility requirements. Waivers help but aren't replacements for proper coverage.",
    keywords: "soccer training business insurance, do I need insurance for private soccer training, soccer coach liability, private soccer trainer insurance requirements, soccer coaching business protection",
    categories: ["soccer", "operations", "business-tips", "getting-started"],
    sport: "soccer",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Soccer Training Insurance",
    content: `${blogStyles}
<div class="blog-content">

<p>If you're running private soccer sessions — especially on rented fields or public spaces — you've probably wondered:</p>

<p><strong>Do I need insurance?</strong></p>

<p>Short answer: <span class="blog-highlight">yes, if you're charging money.</span></p>

<p>Here's what private soccer trainers should understand about liability and protection.</p>

<h2>Why Insurance Matters</h2>

<p>Soccer includes:</p>
<ul>
<li>Sprinting</li>
<li>Contact</li>
<li>Slips and falls</li>
<li>Collisions</li>
</ul>

<p>If an athlete gets injured, even accidentally, you could be exposed to liability.</p>

<p><strong>Even if parents are supportive, accidents can become legal issues.</strong></p>

<h2>Types of Insurance to Consider</h2>

<h3>1️⃣ General Liability Insurance</h3>

<p><strong>Covers:</strong></p>
<ul>
<li>Injury claims</li>
<li>Property damage</li>
<li>Legal defense costs</li>
</ul>

<p>Often <span class="blog-highlight">required if renting facilities.</span></p>

<h3>2️⃣ Professional Liability (Errors & Omissions)</h3>

<p><strong>Covers:</strong></p>
<ul>
<li>Claims related to instruction</li>
<li>Negligence allegations</li>
</ul>

<p>Important if you provide technical training advice.</p>

<h3>3️⃣ Facility Requirements</h3>

<p>Many fields or indoor facilities require:</p>
<ul>
<li>Certificate of Insurance (COI)</li>
<li>Proof of coverage limits</li>
</ul>

<div class="blog-callout">
<p><strong>Without insurance, you may lose rental access.</strong></p>
</div>

<h2>What About Waivers?</h2>

<p>Waivers help — but they are <strong>not replacements</strong> for insurance.</p>

<p>You should:</p>
<ul>
<li>Have digital waivers signed</li>
<li>Store them securely</li>
<li>Keep policies clear</li>
</ul>

<p>Professional setup reduces risk.</p>

<h2>Professionalism Attracts Higher-Paying Clients</h2>

<p>Parents trust trainers who:</p>
<ul>
<li>Have structured systems</li>
<li>Carry insurance</li>
<li>Have clear policies</li>
<li>Operate professionally</li>
</ul>

<p><span class="blog-highlight">Going legit builds long-term sustainability.</span></p>

<div class="blog-callout">
<p><strong>Skedence helps soccer trainers centralize athlete data, waivers, scheduling, and payments — creating a more professional operation overall.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Start your free trial and run your training like a real business.</a></p>
</div>

</div>`
  },
  {
    // BASKETBALL POST
    title: "How to Rent Gym Space for Private Basketball Training",
    slug: "rent-gym-space-basketball-training",
    excerpt: "Securing gym space is critical for private basketball trainers. Explore 4 options: community centers, school gyms, private facilities, and AAU partnerships. Learn how to schedule around rental windows and protect your margins.",
    metaTitle: "How to Rent Gym Space for Basketball Training (4 Options)",
    metaDescription: "Learn how private basketball trainers rent gym space: community centers, school gyms, private facilities, AAU partnerships. Includes scheduling tips and cost structures.",
    keywords: "basketball training gym rental, how to rent gym space for private training, basketball trainer facility options, rent basketball court for training, basketball gym rental options",
    categories: ["basketball", "operations", "getting-started", "business-tips"],
    sport: "basketball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Basketball Gym Rental",
    content: `${blogStyles}
<div class="blog-content">

<p>If you're serious about private basketball training, one challenge comes quickly:</p>

<p><strong>Where do you train?</strong></p>

<p>Backyard courts and public parks only go so far.</p>

<p>Here's how private basketball trainers secure gym space professionally.</p>

<h2>Option 1: Community Centers</h2>

<p><strong>Pros:</strong></p>
<ul>
<li>Affordable hourly rates</li>
<li>Indoor courts</li>
<li>Consistent lighting</li>
</ul>

<p><strong>Cons:</strong></p>
<ul>
<li>Limited availability</li>
<li>Shared usage</li>
</ul>

<p>Call local rec centers and ask about hourly rental rates.</p>

<h2>Option 2: School Gyms</h2>

<p>Many schools rent space after hours.</p>

<p>You'll often need:</p>
<ul>
<li>Insurance</li>
<li>Rental agreement</li>
<li>Set schedule</li>
</ul>

<p><span class="blog-highlight">Good option for recurring sessions.</span></p>

<h2>Option 3: Private Training Facilities</h2>

<p>Some gyms offer <strong>revenue splits</strong> instead of flat rental.</p>

<p><strong>Example:</strong></p>
<ul>
<li>You keep 70%</li>
<li>Facility keeps 30%</li>
</ul>

<div class="blog-callout">
<p><strong>Can be lower upfront risk.</strong></p>
</div>

<h2>Option 4: Partner With AAU Programs</h2>

<p>If you coach for an AAU team:</p>
<ul>
<li>Ask for off-day gym access</li>
<li>Offer revenue split</li>
<li>Mutually beneficial</li>
</ul>

<h2>Scheduling Around Rentals</h2>

<p>If you rent hourly:</p>
<ul>
<li>Define strict availability blocks</li>
<li>Sell packages aligned to rental windows</li>
<li>Avoid overbooking risk</li>
</ul>

<p><strong>Professional scheduling protects margins.</strong></p>

<div class="blog-callout">
<p><strong>Skedence allows basketball trainers to set availability based on gym rental windows and prevent double bookings.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and manage gym time efficiently.</a></p>
</div>

</div>`
  },
  {
    // BASEBALL POST
    title: "How to Structure Pricing Tiers for Private Baseball Lessons",
    slug: "pricing-tiers-baseball-lessons",
    excerpt: "Flat hourly pricing limits baseball training revenue. Learn the 4-tier pricing model (individual sessions, development packages, monthly plans, elite programs) that increases income without adding hours.",
    metaTitle: "Baseball Lesson Pricing Tiers (4-Level Structure)",
    metaDescription: "Structure baseball training pricing with 4 tiers: individual sessions, development packages, monthly plans, elite programs. Increase revenue and lifetime value using tiered pricing.",
    keywords: "baseball lesson pricing tiers, pitching coach pricing structure, how to price baseball training programs, baseball trainer pricing model, tiered pricing baseball coaching",
    categories: ["baseball", "revenue-growth", "business-tips", "getting-started"],
    sport: "baseball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Baseball Pricing Tiers",
    content: `${blogStyles}
<div class="blog-content">

<p>Flat hourly pricing limits growth.</p>

<p>The most successful private baseball trainers use <span class="blog-highlight">tiered pricing models.</span></p>

<p>Here's how to structure pricing tiers that increase revenue without adding hours.</p>

<h2>Tier 1: Individual Sessions</h2>

<p><strong>Example:</strong></p>
<ul>
<li>$100 per pitching lesson</li>
<li>$90 per hitting session</li>
</ul>

<p>High flexibility.<br>
Lower commitment.</p>

<h2>Tier 2: Development Packages</h2>

<p><strong>Example:</strong></p>
<ul>
<li>5 pitching sessions: $475</li>
<li>10 hitting sessions: $900</li>
</ul>

<p><span class="blog-highlight">Increases upfront cash flow.</span></p>

<h2>Tier 3: Monthly Performance Plans</h2>

<p><strong>Example:</strong></p>
<ul>
<li>8 sessions/month: $700</li>
<li>12 sessions/month: $950</li>
</ul>

<p>Predictable income.<br>
Higher athlete retention.</p>

<h2>Tier 4: Elite Performance Program</h2>

<p><strong>Premium tier could include:</strong></p>
<ul>
<li>Video analysis</li>
<li>Customized development plans</li>
<li>Priority scheduling</li>
<li>Performance tracking</li>
</ul>

<div class="blog-callout">
<p><strong>Higher perceived value.</strong></p>
</div>

<h2>Why Tiers Work</h2>

<p>Tiered pricing:</p>
<ul>
<li>Encourages upsells</li>
<li>Reduces friction</li>
<li>Gives parents clear options</li>
<li>Increases lifetime value</li>
</ul>

<p><strong>Professional pricing structure separates hobby trainers from serious businesses.</strong></p>

<div class="blog-callout">
<p><strong>Skedence helps baseball trainers create multiple pricing tiers, track package balances, and manage recurring plans in one system.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Start your free trial and structure your pricing professionally.</a></p>
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
