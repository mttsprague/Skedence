const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3'
  });
}

const db = admin.firestore();

// CSS styles to add to all posts
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

const blogPostUpdates = {
  'get-more-volleyball-lesson-clients-without-ads': `
${blogStyles}

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

<p><strong>Instead, position around specific outcomes:</strong></p>

<ul>
  <li>Middle blocker jump development</li>
  <li>Setter decision-making sessions</li>
  <li>Tryout prep training</li>
  <li>Defensive specialist footwork clinics</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;"><strong>Parents pay for results — not time blocks.</strong></p>
</div>

<h2>2. Use Your Club Network Strategically</h2>

<p>If you coach club volleyball, you're sitting on built-in demand.</p>

<p><strong>Tactics:</strong></p>

<ul>
  <li>Offer position-specific add-on training</li>
  <li>Run small group clinics during off-days</li>
  <li>Ask satisfied parents for referrals directly</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Simple script:</strong></p>
  <p style="margin: 0.5rem 0 0 0;"><em>"If you know any athletes looking for extra reps before tryouts, feel free to share my booking link."</em></p>
</div>

<h2>3. Turn Instagram Into a Funnel</h2>

<p>Instead of random highlight videos, post:</p>

<ul>
  <li>Before/after technique clips</li>
  <li>"3 mistakes middle blockers make"</li>
  <li>Drill breakdowns</li>
  <li>Tryout tips</li>
</ul>

<p><strong>Every post should lead to:</strong> "Link in bio to book private sessions."</p>

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

<div class="blog-callout">
  <p style="margin: 0;"><strong>Professional booking links convert better.</strong></p>
</div>

<h2>Final Thought</h2>

<p>Getting more private volleyball lesson clients isn't about ads.</p>

<p><strong>It's about:</strong></p>

<ul>
  <li>Clear positioning</li>
  <li>Consistent visibility</li>
  <li>Professional systems</li>
</ul>

<p>Skedence helps volleyball coaches share booking links, sell packages, and stay organized — so growth doesn't create chaos.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and streamline your lesson business.</strong></p>

</div>
`,

  'sell-private-soccer-training-packages': `
${blogStyles}

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

<div class="blog-callout">
  <p style="margin: 0;">When athletes commit to 8 sessions, <strong>improvement becomes measurable</strong> — and retention increases.</p>
</div>

<h2>Step 1: Build Skill-Based Packages</h2>

<p>Instead of: <em>"5 sessions"</em></p>

<p><strong>Sell:</strong></p>

<ul>
  <li>6-week ball mastery program</li>
  <li>8-session striker finishing package</li>
  <li>Speed & agility development block</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Programs feel premium.</strong></p>
</div>

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

<ul style="list-style: none; padding-left: 1rem;">
  <li>Single session: <strong>$90</strong></li>
  <li>8-session package: <strong>$680</strong> ($85/session)</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Small discount = <strong>higher commitment.</strong></p>
</div>

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

<p><strong>Use a system that:</strong></p>

<ul>
  <li>Tracks balances automatically</li>
  <li>Shows availability</li>
  <li>Confirms bookings instantly</li>
</ul>

<h2>Final Thought</h2>

<p>Private soccer training becomes scalable when you sell programs, not hours.</p>

<p>Skedence lets soccer trainers create structured packages, accept upfront payments, and manage sessions without friction.</p>

<p><strong>👉 <a href="/login">Start your free trial</a> and sell smarter.</strong></p>

</div>
`,

  'reduce-no-shows-basketball-training': `
${blogStyles}

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

<div class="blog-callout">
  <p style="margin: 0;"><strong>When sessions are prepaid:</strong></p>
  <ul style="margin: 0.75rem 0 0 0;">
    <li>Commitment rises</li>
    <li>Cancellations drop</li>
  </ul>
</div>

<h2>2. Use Clear Cancellation Policies</h2>

<p><strong>Example:</strong></p>

<ul>
  <li>24-hour cancellation required</li>
  <li>No refund inside window</li>
  <li>One reschedule allowed per package</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Clear policies reduce awkward conversations.</strong></p>
</div>

<h2>3. Send Automated Reminders</h2>

<p>Basketball athletes juggle:</p>

<ul>
  <li>AAU</li>
  <li>School games</li>
  <li>Homework</li>
  <li>Social schedules</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Reminder emails <strong>24 hours before sessions</strong> significantly reduce missed training.</p>
</div>

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

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Data > guesswork.</strong></p>
</div>

<h2>Final Thought</h2>

<p>Reducing no-shows increases revenue without adding clients.</p>

<p>Professional systems reduce friction.</p>

<p>Skedence helps basketball trainers manage scheduling, track packages, and send reminders — so fewer sessions slip through the cracks.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and protect your training revenue.</strong></p>

</div>
`,

  'manage-multiple-trainers-baseball-academy': `
${blogStyles}

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

<div class="blog-callout">
  <p style="margin: 0;">This avoids confusion and <strong>protects your brand.</strong></p>
</div>

<h2>2. Centralize Scheduling</h2>

<p>When each trainer manages bookings individually:</p>

<ul>
  <li>Chaos increases</li>
  <li>Revenue visibility decreases</li>
  <li>Clients get confused</li>
</ul>

<p><strong>Use one system where:</strong></p>

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

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Track everything in one place.</strong></p>
</div>

<h2>4. Protect Cage / Field Time</h2>

<p>If multiple trainers share space:</p>

<ul>
  <li>Use defined availability blocks</li>
  <li>Prevent overlapping sessions</li>
  <li>Track usage</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Professional scheduling <strong>prevents disputes.</strong></p>
</div>

<h2>5. Give Parents a Simple Booking Experience</h2>

<p>Parents shouldn't wonder:</p>

<ul>
  <li>Who to text</li>
  <li>Who to pay</li>
  <li>Which calendar is accurate</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>One booking link per academy simplifies everything.</strong></p>
</div>

<h2>Final Thought</h2>

<p>As your baseball academy grows, complexity increases.</p>

<p>Systems prevent friction between trainers, parents, and athletes.</p>

<p>Skedence allows academies to manage multiple trainers, track sessions, and centralize scheduling in one place.</p>

<p><strong>👉 <a href="/login">Start a free trial</a> and scale your academy without chaos.</strong></p>

</div>
`
};

async function fixBlogFormatting() {
  console.log('🔧 Fixing blog post formatting...\n');

  for (const [slug, content] of Object.entries(blogPostUpdates)) {
    try {
      // Find post by slug
      const querySnapshot = await db.collection('blogPosts')
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        console.log(`⚠️  Post not found: ${slug}`);
        continue;
      }

      const doc = querySnapshot.docs[0];
      
      // Update the content with proper formatting
      await doc.ref.update({
        content: content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Updated: ${slug}`);
    } catch (error) {
      console.error(`❌ Error updating ${slug}:`, error);
    }
  }

  console.log('\n✅ All blog posts updated with proper CSS formatting!');
  process.exit(0);
}

fixBlogFormatting().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
