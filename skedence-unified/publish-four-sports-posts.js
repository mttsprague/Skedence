const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

const posts = [
  // Volleyball - Getting more clients
  {
    title: 'How to Get More Private Volleyball Lesson Clients (Without Paid Ads)',
    slug: 'get-more-volleyball-lesson-clients-without-ads',
    excerpt: 'Learn proven strategies to attract more private volleyball lesson clients without paid advertising. Position yourself with outcomes, leverage your network, and create a repeatable growth system.',
    content: `
<p>If you're a volleyball coach offering private lessons, getting your first few athletes is easy.</p>

<p>Growing consistently? That's harder.</p>

<p>Most coaches rely on:</p>

<ul>
  <li>Word of mouth</li>
  <li>Club connections</li>
  <li>Occasional Instagram posts</li>
</ul>

<p>But if you want consistent bookings, you need a repeatable system.</p>

<p>Here's how to get more private volleyball lesson clients — without running paid ads.</p>

<h2>1. Position Yourself Around Outcomes, Not "Lessons"</h2>

<p>"Private volleyball lessons" is generic.</p>

<p>Instead, position around specific outcomes:</p>

<ul>
  <li>Middle blocker jump development</li>
  <li>Setter decision-making sessions</li>
  <li>Tryout prep training</li>
  <li>Defensive specialist footwork clinics</li>
</ul>

<p>Parents pay for results — not time blocks.</p>

<h2>2. Use Your Club Network Strategically</h2>

<p>If you coach club volleyball, you're sitting on built-in demand.</p>

<p><strong>Tactics:</strong></p>

<ul>
  <li>Offer position-specific add-on training</li>
  <li>Run small group clinics during off-days</li>
  <li>Ask satisfied parents for referrals directly</li>
</ul>

<p><strong>Simple script:</strong></p>

<p><em>"If you know any athletes looking for extra reps before tryouts, feel free to share my booking link."</em></p>

<h2>3. Turn Instagram Into a Funnel</h2>

<p>Instead of random highlight videos, post:</p>

<ul>
  <li>Before/after technique clips</li>
  <li>"3 mistakes middle blockers make"</li>
  <li>Drill breakdowns</li>
  <li>Tryout tips</li>
</ul>

<p>Every post should lead to: <strong>"Link in bio to book private sessions."</strong></p>

<p>Your profile should clearly say: <em>"Private volleyball lessons | Book below"</em></p>

<h2>4. Offer Packages, Not Single Sessions</h2>

<p>Packages increase:</p>

<ul>
  <li>Commitment</li>
  <li>Referrals</li>
  <li>Retention</li>
</ul>

<p>Athletes who buy 10-session packages:</p>

<ul>
  <li>Talk about it more</li>
  <li>Improve more</li>
  <li>Refer more</li>
</ul>

<h2>5. Make Booking Frictionless</h2>

<p>The easier it is to book, the more bookings you get.</p>

<p>If parents have to:</p>

<ul>
  <li>Text</li>
  <li>Wait for reply</li>
  <li>Confirm payment manually</li>
</ul>

<p>They procrastinate.</p>

<p>Professional booking links convert better.</p>

<h2>Final Thought</h2>

<p>Getting more private volleyball lesson clients isn't about ads.</p>

<p>It's about:</p>

<ul>
  <li>Clear positioning</li>
  <li>Consistent visibility</li>
  <li>Professional systems</li>
</ul>

<p>Skedence helps volleyball coaches share booking links, sell packages, and stay organized — so growth doesn't create chaos.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and streamline your lesson business.</strong></p>
    `,
    metaTitle: 'How to Get More Volleyball Lesson Clients Without Paid Ads',
    metaDescription: 'Learn proven strategies to attract more private volleyball lesson clients without paid advertising. Position yourself with outcomes and create a repeatable growth system.',
    keywords: ['volleyball private lessons', 'get more volleyball clients', 'volleyball lesson marketing', 'volleyball coaching business', 'grow volleyball lessons', 'volleyball client acquisition'],
    categories: ['revenue-growth', 'volleyball', 'getting-started', 'business-tips'],
    tags: ['volleyball', 'private lessons', 'marketing', 'client growth', 'instagram marketing', 'referrals'],
    sport: 'volleyball',
    status: 'published'
  },

  // Soccer - Selling packages
  {
    title: 'How to Sell Private Soccer Training Packages (Instead of Single Sessions)',
    slug: 'sell-private-soccer-training-packages',
    excerpt: 'Stop selling single sessions and start selling soccer training packages. Learn how to structure programs, price effectively, and increase your upfront revenue while improving athlete commitment.',
    content: `
<p>Most private soccer trainers sell sessions one at a time.</p>

<p>That creates:</p>

<ul>
  <li>Unpredictable income</li>
  <li>Frequent cancellations</li>
  <li>Payment friction</li>
  <li>Scheduling headaches</li>
</ul>

<p>If you want consistent revenue and committed athletes, you need to sell packages — not sessions.</p>

<p>Here's how to structure private soccer training packages effectively.</p>

<h2>Why Packages Work</h2>

<p>Packages:</p>

<ul>
  <li>Increase upfront cash flow</li>
  <li>Improve athlete commitment</li>
  <li>Reduce no-shows</li>
  <li>Simplify scheduling</li>
</ul>

<p>When athletes commit to 8 sessions, improvement becomes measurable — and retention increases.</p>

<h2>Step 1: Build Skill-Based Packages</h2>

<p>Instead of: <em>"5 sessions"</em></p>

<p>Sell:</p>

<ul>
  <li>6-week ball mastery program</li>
  <li>8-session striker finishing package</li>
  <li>Speed & agility development block</li>
</ul>

<p>Programs feel premium.</p>

<h2>Step 2: Offer Tiered Options</h2>

<p><strong>Example:</strong></p>

<ul>
  <li><strong>4 sessions</strong> — foundational</li>
  <li><strong>8 sessions</strong> — development</li>
  <li><strong>12 sessions</strong> — elite progression</li>
</ul>

<p>Parents like options.</p>

<h2>Step 3: Price With Small Incentives</h2>

<p><strong>Example:</strong></p>

<ul>
  <li>Single session: $90</li>
  <li>8-session package: $680 ($85/session)</li>
</ul>

<p>Small discount = higher commitment.</p>

<h2>Step 4: Set Expiration Windows</h2>

<p>Packages should:</p>

<ul>
  <li>Expire after 60–90 days</li>
  <li>Encourage consistent attendance</li>
  <li>Protect your calendar</li>
</ul>

<h2>Step 5: Make It Easy to Purchase & Book</h2>

<p>If parents must:</p>

<ul>
  <li>Ask how many sessions remain</li>
  <li>Text for availability</li>
  <li>Track manually</li>
</ul>

<p>They'll hesitate.</p>

<p>Use a system that:</p>

<ul>
  <li>Tracks balances automatically</li>
  <li>Shows availability</li>
  <li>Confirms bookings instantly</li>
</ul>

<h2>Final Thought</h2>

<p>Private soccer training becomes scalable when you sell programs, not hours.</p>

<p>Skedence lets soccer trainers create structured packages, accept upfront payments, and manage sessions without friction.</p>

<p><strong>👉 <a href="/login">Start your free trial</a> and sell smarter.</strong></p>
    `,
    metaTitle: 'How to Sell Soccer Training Packages Instead of Single Sessions',
    metaDescription: 'Stop selling single sessions and start selling soccer training packages. Learn how to structure programs, price effectively, and increase your upfront revenue.',
    keywords: ['soccer training packages', 'sell soccer lessons', 'soccer lesson packages', 'private soccer training', 'soccer coaching pricing', 'soccer training programs'],
    categories: ['revenue-growth', 'soccer', 'operations', 'business-tips'],
    tags: ['soccer', 'lesson packages', 'pricing', 'revenue', 'private training', 'package sales'],
    sport: 'soccer',
    status: 'published'
  },

  // Basketball - Reducing no-shows
  {
    title: 'How to Reduce No-Shows in Private Basketball Training',
    slug: 'reduce-no-shows-basketball-training',
    excerpt: 'Stop losing revenue to missed sessions. Learn proven tactics to reduce no-shows in private basketball training with upfront payments, clear policies, and automated reminders.',
    content: `
<p>Missed sessions kill momentum — and revenue.</p>

<p>Private basketball trainers lose thousands per year to:</p>

<ul>
  <li>Last-minute cancellations</li>
  <li>Forgotten sessions</li>
  <li>"Something came up"</li>
  <li>Travel conflicts</li>
</ul>

<p>Here's how to reduce no-shows in private basketball training.</p>

<h2>1. Require Upfront Payment</h2>

<p>If athletes pay after sessions, cancellation risk increases.</p>

<p>When sessions are prepaid:</p>

<ul>
  <li>Commitment rises</li>
  <li>Cancellations drop</li>
</ul>

<h2>2. Use Clear Cancellation Policies</h2>

<p><strong>Example:</strong></p>

<ul>
  <li>24-hour cancellation required</li>
  <li>No refund inside window</li>
  <li>One reschedule allowed per package</li>
</ul>

<p>Clear policies reduce awkward conversations.</p>

<h2>3. Send Automated Reminders</h2>

<p>Basketball athletes juggle:</p>

<ul>
  <li>AAU</li>
  <li>School games</li>
  <li>Homework</li>
  <li>Social schedules</li>
</ul>

<p>Reminder emails 24 hours before sessions significantly reduce missed training.</p>

<h2>4. Sell Packages Instead of Singles</h2>

<p>Athletes with packages:</p>

<ul>
  <li>Value sessions more</li>
  <li>Attend consistently</li>
  <li>Commit to development</li>
</ul>

<h2>5. Track Attendance & Patterns</h2>

<p>If an athlete cancels frequently:</p>

<ul>
  <li>Adjust time slot</li>
  <li>Suggest group sessions</li>
  <li>Tighten policies</li>
</ul>

<p>Data > guesswork.</p>

<h2>Final Thought</h2>

<p>Reducing no-shows increases revenue without adding clients.</p>

<p>Professional systems reduce friction.</p>

<p>Skedence helps basketball trainers manage scheduling, track packages, and send reminders — so fewer sessions slip through the cracks.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and protect your training revenue.</strong></p>
    `,
    metaTitle: 'How to Reduce No-Shows in Basketball Training Sessions',
    metaDescription: 'Stop losing revenue to missed sessions. Learn proven tactics to reduce no-shows in private basketball training with upfront payments, clear policies, and automated reminders.',
    keywords: ['reduce basketball no-shows', 'basketball training attendance', 'private basketball lessons', 'basketball training cancellations', 'basketball coaching tips', 'prevent missed sessions'],
    categories: ['operations', 'basketball', 'business-tips'],
    tags: ['basketball', 'no-shows', 'scheduling', 'operations', 'cancellation policy', 'reminders'],
    sport: 'basketball',
    status: 'published'
  },

  // Baseball - Managing multiple trainers
  {
    title: 'How to Manage Multiple Trainers in a Private Baseball Academy',
    slug: 'manage-multiple-trainers-baseball-academy',
    excerpt: 'Scale your baseball training facility without chaos. Learn how to manage multiple trainers with centralized scheduling, standardized pricing, and clear revenue splits.',
    content: `
<p>If you run a baseball training facility with more than one trainer, scheduling gets complicated fast.</p>

<p>Without structure, you'll deal with:</p>

<ul>
  <li>Double-booked cages</li>
  <li>Inconsistent pricing</li>
  <li>Payment confusion</li>
  <li>Trainer calendar conflicts</li>
  <li>Parents messaging the wrong coach</li>
</ul>

<p>Here's how to manage multiple trainers in a private baseball academy efficiently.</p>

<h2>1. Standardize Pricing & Packages</h2>

<p>Every trainer should offer:</p>

<ul>
  <li>Clear session lengths</li>
  <li>Defined package tiers</li>
  <li>Consistent cancellation policies</li>
</ul>

<p>This avoids confusion and protects your brand.</p>

<h2>2. Centralize Scheduling</h2>

<p>When each trainer manages bookings individually:</p>

<ul>
  <li>Chaos increases</li>
  <li>Revenue visibility decreases</li>
  <li>Clients get confused</li>
</ul>

<p>Use one system where:</p>

<ul>
  <li>All availability is visible</li>
  <li>Each trainer controls their schedule</li>
  <li>Admin can see everything</li>
</ul>

<h2>3. Assign Revenue Splits Clearly</h2>

<p>Define:</p>

<ul>
  <li>% trainer keeps</li>
  <li>% academy keeps</li>
  <li>Payment structure</li>
</ul>

<p>Track everything in one place.</p>

<h2>4. Protect Cage / Field Time</h2>

<p>If multiple trainers share space:</p>

<ul>
  <li>Use defined availability blocks</li>
  <li>Prevent overlapping sessions</li>
  <li>Track usage</li>
</ul>

<p>Professional scheduling prevents disputes.</p>

<h2>5. Give Parents a Simple Booking Experience</h2>

<p>Parents shouldn't wonder:</p>

<ul>
  <li>Who to text</li>
  <li>Who to pay</li>
  <li>Which calendar is accurate</li>
</ul>

<p>One booking link per academy simplifies everything.</p>

<h2>Final Thought</h2>

<p>As your baseball academy grows, complexity increases.</p>

<p>Systems prevent friction between trainers, parents, and athletes.</p>

<p>Skedence allows academies to manage multiple trainers, track sessions, and centralize scheduling in one place.</p>

<p><strong>👉 <a href="/login">Start a free trial</a> and scale your academy without chaos.</strong></p>
    `,
    metaTitle: 'How to Manage Multiple Trainers in a Baseball Academy',
    metaDescription: 'Scale your baseball training facility without chaos. Learn how to manage multiple trainers with centralized scheduling, standardized pricing, and clear revenue splits.',
    keywords: ['manage multiple trainers', 'baseball academy management', 'training facility operations', 'baseball coaching staff', 'academy scheduling', 'multi-trainer management'],
    categories: ['operations', 'baseball', 'getting-started', 'tools'],
    tags: ['baseball', 'academy management', 'multiple trainers', 'operations', 'scheduling', 'team management'],
    sport: 'baseball',
    status: 'published'
  }
];

async function publishPosts() {
  console.log('🚀 Publishing 4 sport-specific blog posts...\n');

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
  console.log('   🏐 Volleyball: Getting more clients');
  console.log('   ⚽ Soccer: Selling lesson packages');
  console.log('   🏀 Basketball: Reducing no-shows');
  console.log('   ⚾ Baseball: Managing multiple trainers');
  
  process.exit(0);
}

publishPosts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
