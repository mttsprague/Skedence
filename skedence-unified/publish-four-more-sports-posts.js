const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

const blogStyles = `
<style>
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
    color: #0A0A0A;
    font-weight: 600;
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

  .blog-content a {
    color: #FF6B35;
    text-decoration: underline;
    font-weight: 500;
  }

  .blog-content a:hover {
    color: #E55A2B;
  }
</style>

<div class="blog-content">
`;

const posts = [
  // Volleyball - Structuring seasonal training
  {
    title: 'How to Structure Private Volleyball Lessons for Tryouts and Off-Season Development',
    slug: 'structure-volleyball-lessons-tryouts-off-season',
    excerpt: 'Learn how to structure private volleyball lessons throughout the year with tryout prep, in-season maintenance, and off-season development programs for better results and higher revenue.',
    content: `
${blogStyles}

<p>Private volleyball lessons aren't just random sessions.</p>

<p>The most successful coaches structure their training around:</p>

<ul>
  <li>Tryout prep</li>
  <li>In-season maintenance</li>
  <li>Off-season development</li>
</ul>

<p>If you want consistent bookings and stronger athlete results, your lessons need structure — not just availability.</p>

<p>Here's how to structure private volleyball lessons throughout the year.</p>

<h2>Phase 1: Tryout Preparation (6–8 Weeks Before Tryouts)</h2>

<p>This is <strong>peak demand season.</strong></p>

<p>Athletes want:</p>

<ul>
  <li>Confidence</li>
  <li>Position clarity</li>
  <li>Consistency under pressure</li>
</ul>

<p>Instead of selling single sessions, offer:</p>

<ul>
  <li>6-week tryout prep package</li>
  <li>Position-specific intensives</li>
  <li>Small group competitive reps</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Example:</strong></p>
  <ul style="margin: 0.75rem 0 0 0;">
    <li>2 sessions per week</li>
    <li>Focused on first-touch consistency, serve receive, transition speed</li>
  </ul>
</div>

<p><strong>This increases:</strong></p>

<ul>
  <li>Urgency</li>
  <li>Commitment</li>
  <li>Revenue</li>
</ul>

<h2>Phase 2: In-Season Skill Maintenance</h2>

<p>During season, athletes are busy with:</p>

<ul>
  <li>Team practice</li>
  <li>Games</li>
  <li>Travel tournaments</li>
</ul>

<p><strong>Private lessons should shift to:</strong></p>

<ul>
  <li>Weakness refinement</li>
  <li>Position-specific adjustments</li>
  <li>Video review sessions</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Keep sessions lighter but focused. Sell smaller packages <strong>(4–6 sessions).</strong></p>
</div>

<h2>Phase 3: Off-Season Development</h2>

<p>This is where real growth happens.</p>

<p><strong>Off-season = long-term skill building:</strong></p>

<ul>
  <li>Vertical jump development</li>
  <li>Strength & explosiveness</li>
  <li>Position mastery</li>
  <li>Game IQ</li>
</ul>

<p><strong>Sell:</strong></p>

<ul>
  <li>8–12 session development programs</li>
  <li>Small group specialty training</li>
  <li>Weekly recurring sessions</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Off-season is your highest lifetime value opportunity.</strong></p>
</div>

<h2>Why Structure Matters</h2>

<p>Structured programs:</p>

<ul>
  <li>Increase results</li>
  <li>Increase retention</li>
  <li>Increase package size</li>
  <li>Reduce cancellations</li>
  <li>Position you as professional</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">When athletes see a roadmap, <strong>they commit longer.</strong></p>
</div>

<h2>Final Thought</h2>

<p>Private volleyball lessons shouldn't feel random.</p>

<p>Seasonal structure turns sessions into programs — and programs scale.</p>

<p>Skedence helps volleyball coaches create structured packages, manage recurring sessions, and organize training year-round.</p>

<p><strong>👉 <a href="/login">Start your free trial</a> and structure your season professionally.</strong></p>

</div>
`,
    metaTitle: 'How to Structure Volleyball Lessons for Tryouts & Off-Season',
    metaDescription: 'Learn how to structure private volleyball lessons throughout the year with tryout prep, in-season maintenance, and off-season development programs for better results.',
    keywords: ['volleyball lesson structure', 'volleyball tryout prep', 'off-season volleyball training', 'seasonal volleyball coaching', 'volleyball training programs', 'private volleyball lessons'],
    categories: ['volleyball', 'operations', 'business-tips', 'revenue-growth'],
    tags: ['volleyball', 'lesson structure', 'tryout prep', 'off-season training', 'seasonal planning', 'private lessons'],
    sport: 'volleyball',
    status: 'published'
  },

  // Soccer - Side hustle to full-time
  {
    title: 'How to Go From Side-Hustle Soccer Trainer to Full-Time Business',
    slug: 'soccer-trainer-side-hustle-to-full-time',
    excerpt: 'Learn how to transition from part-time soccer training to a full-time business with strategic pricing, recurring revenue, and professional systems that scale.',
    content: `
${blogStyles}

<p>Many private soccer trainers start the same way:</p>

<ul>
  <li>A few athletes</li>
  <li>Word-of-mouth referrals</li>
  <li>Evening sessions after work</li>
</ul>

<p>But if you want to go full-time, your approach has to change.</p>

<p>Here's how to transition from side hustle to full-time private soccer training.</p>

<h2>Step 1: Track Real Revenue</h2>

<p>Before quitting anything, calculate:</p>

<ul>
  <li>Average sessions per week</li>
  <li>Average price per session</li>
  <li>Monthly revenue</li>
  <li>Growth rate</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Example:</strong></p>
  <ul style="margin: 0.75rem 0 0 0;">
    <li>12 athletes</li>
    <li>8 sessions/month</li>
    <li>$90 per session</li>
    <li>= <strong>$8,640/month gross</strong></li>
  </ul>
</div>

<div class="blog-callout">
  <p style="margin: 0;">That's not a hobby.</p>
</div>

<h2>Step 2: Move From Sessions to Programs</h2>

<p><strong>Side hustles sell:</strong> "Want a session?"</p>

<p><strong>Full-time trainers sell:</strong> "Join my 8-week development program."</p>

<p>Programs:</p>

<ul>
  <li>Increase commitment</li>
  <li>Create predictable income</li>
  <li>Improve retention</li>
</ul>

<h2>Step 3: Professionalize Your Setup</h2>

<p>If you want full-time income, your business must look full-time.</p>

<p><strong>That means:</strong></p>

<ul>
  <li>Clear pricing packages</li>
  <li>Defined cancellation policy</li>
  <li>Online booking</li>
  <li>Professional payment system</li>
  <li>Organized calendar</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Parents trust structure.</p>
</div>

<h2>Step 4: Build Recurring Revenue</h2>

<p>Full-time trainers don't rely on random bookings.</p>

<p><strong>They build:</strong></p>

<ul>
  <li>Monthly recurring training blocks</li>
  <li>Seasonal development packages</li>
  <li>Ongoing athlete pipelines</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Recurring income reduces stress dramatically.</strong></p>
</div>

<h2>Step 5: Raise Rates Strategically</h2>

<p>As demand grows:</p>

<ul>
  <li>Increase pricing gradually</li>
  <li>Improve positioning</li>
  <li>Add specialized training tracks</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">You don't scale by working more hours forever.<br><strong>You scale by increasing value.</strong></p>
</div>

<h2>Final Thought</h2>

<p>The difference between side hustle and full-time business isn't talent.</p>

<p><strong>It's structure.</strong></p>

<p>Skedence helps soccer trainers organize booking, packages, and recurring sessions so growth feels manageable — not chaotic.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and build your training business professionally.</strong></p>

</div>
`,
    metaTitle: 'Go From Side-Hustle Soccer Trainer to Full-Time Business',
    metaDescription: 'Learn how to transition from part-time soccer training to a full-time business with strategic pricing, recurring revenue, and professional systems that scale.',
    keywords: ['full-time soccer trainer', 'soccer training business', 'side hustle to full-time', 'soccer coaching career', 'private soccer training', 'soccer trainer income'],
    categories: ['soccer', 'revenue-growth', 'getting-started', 'business-tips'],
    tags: ['soccer', 'full-time training', 'side hustle', 'business growth', 'recurring revenue', 'professional development'],
    sport: 'soccer',
    status: 'published'
  },

  // Basketball - Cancellation policies
  {
    title: 'The Right Cancellation Policy for Private Basketball Training',
    slug: 'basketball-training-cancellation-policy',
    excerpt: 'Stop losing revenue to last-minute cancellations. Learn how to create and enforce a strong cancellation policy for private basketball training that protects your time and income.',
    content: `
${blogStyles}

<p>One of the most uncomfortable parts of private basketball training?</p>

<p><strong>Cancellations.</strong></p>

<p>Without clear policies, you'll deal with:</p>

<ul>
  <li>Last-minute texts</li>
  <li>"Something came up"</li>
  <li>Payment disputes</li>
  <li>Lost revenue</li>
</ul>

<p>A strong cancellation policy protects your time and income.</p>

<p>Here's how to structure it properly.</p>

<h2>Why You Need a Written Policy</h2>

<div class="blog-callout">
  <p style="margin: 0;">If your policy is verbal, <strong>it's optional.</strong></p>
  <p style="margin: 0.5rem 0 0 0;">If it's written and shared upfront, <strong>it's enforceable.</strong></p>
</div>

<p>Clarity removes awkward conversations.</p>

<h2>Recommended Policy Structure</h2>

<h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0;">1. 24-Hour Cancellation Window</h3>

<p>Athletes must cancel 24 hours in advance.</p>

<p><strong>Inside 24 hours:</strong></p>

<ul>
  <li>Session is deducted from package<br><em>OR</em></li>
  <li>Full fee applies</li>
</ul>

<h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0;">2. Limited Reschedules</h3>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Example:</strong></p>
  <ul style="margin: 0.75rem 0 0 0;">
    <li>1 free reschedule per 5-session package</li>
    <li>After that, session counts as used</li>
  </ul>
</div>

<p>Prevents abuse.</p>

<h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0;">3. Package Expiration</h3>

<p><strong>Example:</strong></p>

<ul>
  <li>5-session package expires in 60 days</li>
  <li>10-session package expires in 90 days</li>
</ul>

<p>Encourages consistency.</p>

<h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0;">4. Clear Communication</h3>

<p>When athletes purchase, they should see:</p>

<ul>
  <li>Cancellation window</li>
  <li>Reschedule rules</li>
  <li>Expiration terms</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;"><strong>No surprises.</strong></p>
</div>

<h2>Why Policies Increase Revenue</h2>

<p>Strong policies:</p>

<ul>
  <li>Reduce no-shows</li>
  <li>Improve commitment</li>
  <li>Create professionalism</li>
  <li>Filter unserious clients</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;">The best trainers enforce structure <strong>calmly and confidently.</strong></p>
</div>

<h2>Final Thought</h2>

<p>Your time is valuable.</p>

<p>A strong cancellation policy protects both your schedule and your income.</p>

<p>Skedence allows basketball trainers to define cancellation rules, track packages, and manage sessions in one place — no awkward tracking required.</p>

<p><strong>👉 <a href="/login">Start your free trial</a> and run your training professionally.</strong></p>

</div>
`,
    metaTitle: 'The Right Cancellation Policy for Basketball Training',
    metaDescription: 'Stop losing revenue to last-minute cancellations. Learn how to create and enforce a strong cancellation policy for private basketball training that protects your time.',
    keywords: ['basketball cancellation policy', 'basketball training policy', 'prevent basketball no-shows', 'private basketball lessons', 'basketball coach policies', 'training cancellation rules'],
    categories: ['basketball', 'operations', 'business-tips'],
    tags: ['basketball', 'cancellation policy', 'no-shows', 'operations', 'business policies', 'professional training'],
    sport: 'basketball',
    status: 'published'
  },

  // Baseball - Recurring monthly revenue
  {
    title: 'How to Build Recurring Monthly Revenue as a Private Baseball Trainer',
    slug: 'build-recurring-revenue-baseball-training',
    excerpt: 'Stop relying on random bookings. Learn how to build predictable monthly income with recurring training programs, membership tiers, and structured revenue systems.',
    content: `
${blogStyles}

<p>Many private baseball coaches operate month-to-month.</p>

<ul>
  <li>Random bookings</li>
  <li>Inconsistent income</li>
  <li>Seasonal swings</li>
</ul>

<p>If you want stable revenue, you need recurring training structures.</p>

<p>Here's how to build predictable monthly income in private baseball training.</p>

<h2>Step 1: Create Monthly Training Plans</h2>

<p><strong>Instead of:</strong> "Book when you want."</p>

<p><strong>Offer:</strong></p>

<ul>
  <li>Monthly pitching development plan</li>
  <li>Monthly hitting mechanics block</li>
  <li>8-session recurring package</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Athletes commit monthly.<br><strong>Revenue stabilizes.</strong></p>
</div>

<h2>Step 2: Set Automatic Renewal Cycles</h2>

<p>At the end of each month:</p>

<ul>
  <li>Package renews</li>
  <li>Sessions reset</li>
  <li>Calendar stays consistent</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Recurring systems reduce friction.</strong></p>
</div>

<h2>Step 3: Offer Tiered Membership Levels</h2>

<p><strong>Example:</strong></p>

<ul style="list-style: none; padding-left: 1rem;">
  <li><strong>Basic:</strong> 4 sessions/month</li>
  <li><strong>Advanced:</strong> 8 sessions/month</li>
  <li><strong>Elite:</strong> 12 sessions/month</li>
</ul>

<p><strong>This creates:</strong></p>

<ul>
  <li>Clear options</li>
  <li>Upsell paths</li>
  <li>Revenue growth without new clients</li>
</ul>

<h2>Step 4: Lock in Prime Time Slots</h2>

<p>Recurring athletes get priority booking.</p>

<p>This incentivizes commitment.</p>

<div class="blog-callout">
  <p style="margin: 0;">Trainers get <strong>predictable schedules.</strong></p>
</div>

<h2>Step 5: Track Attendance & Performance</h2>

<p>Recurring athletes:</p>

<ul>
  <li>Improve more</li>
  <li>Stay longer</li>
  <li>Refer more athletes</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;">Retention becomes easier when training feels <strong>structured.</strong></p>
</div>

<h2>Final Thought</h2>

<p>Random bookings create unstable income.</p>

<p><strong>Recurring training programs create stability.</strong></p>

<p>Skedence helps baseball trainers manage monthly packages, track sessions, and organize schedules so revenue becomes predictable.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and build recurring income.</strong></p>

</div>
`,
    metaTitle: 'Build Recurring Monthly Revenue as a Baseball Trainer',
    metaDescription: 'Stop relying on random bookings. Learn how to build predictable monthly income with recurring training programs, membership tiers, and structured revenue systems.',
    keywords: ['recurring baseball training', 'baseball training revenue', 'monthly baseball income', 'baseball trainer business', 'recurring training programs', 'predictable income baseball'],
    categories: ['baseball', 'revenue-growth', 'operations', 'business-tips'],
    tags: ['baseball', 'recurring revenue', 'monthly income', 'membership tiers', 'business growth', 'predictable income'],
    sport: 'baseball',
    status: 'published'
  }
];

async function publishPosts() {
  console.log('🚀 Publishing 4 more sport-specific blog posts...\n');

  for (const post of posts) {
    try {
      const postData = {
        ...post,
        authorId: 'admin',
        authorName: 'Skedence Team',
        authorBio: 'Skedence Team',
        ctaText: 'Ready to Transform Your Coaching Business?',
        ctaLink: '/login',
        featuredImage: 'https://skedence.com/logo-nav.png',
        featuredImageAlt: 'Skedence - Coaching Business Management Software',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        views: 0
      };

      const docRef = await db.collection('blogPosts').add(postData);
      console.log(`✅ Published: "${post.title}"`);
      console.log(`   ID: ${docRef.id}`);
      console.log(`   URL: https://skedence.com/blog/detail?slug=${post.slug}`);
      console.log(`   Categories: ${post.categories.join(', ')}`);
      console.log(`   Sport: ${post.sport}\n`);
    } catch (error) {
      console.error(`❌ Error publishing "${post.title}":`, error);
    }
  }

  console.log('✅ All posts published successfully!');
  console.log('\n📊 Summary:');
  console.log('   🏐 Volleyball: Structuring seasonal training');
  console.log('   ⚽ Soccer: Side hustle to full-time business');
  console.log('   🏀 Basketball: Cancellation policies');
  console.log('   ⚾ Baseball: Building recurring revenue');
  
  process.exit(0);
}

publishPosts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
