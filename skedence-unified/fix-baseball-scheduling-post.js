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

const formattedContent = `
${blogStyles}

<p>If you're a baseball coach offering private lessons, you probably manage scheduling through:</p>

<ul>
  <li>Text messages</li>
  <li>Phone calls</li>
  <li>DMs</li>
  <li>Back-and-forth email chains</li>
</ul>

<p>It works... until it doesn't.</p>

<p>One missed text and you've got a double-booked cage. One miscommunication and a parent is frustrated. One no-show and you've lost an hour of revenue.</p>

<p>Here's how to schedule private baseball lessons without relying on endless texting — so you can stay organized and focus on coaching.</p>

<h2>The Problem With Text-Based Scheduling</h2>

<p>Texting works when you have 3 clients.</p>

<p>When you have 10, 20, or 30+ athletes booking weekly sessions, it breaks down fast.</p>

<div class="blog-callout">
  <p style="margin: 0;"><strong>Common issues coaches face:</strong></p>
  <ul style="margin: 0.75rem 0 0 0;">
    <li>Athletes asking "What times do you have open?"</li>
    <li>Parents forgetting when their session is</li>
    <li>Double bookings when you reply to two texts out of order</li>
    <li>Chasing payment after every session</li>
    <li>No-shows because reminders are manual</li>
    <li>Time wasted answering the same scheduling questions</li>
  </ul>
</div>

<p>If you're spending more time scheduling than coaching, you need a better system.</p>

<h2>Step 1: Use a Booking Link (Not a Phone Number)</h2>

<p>Instead of telling athletes to "text me for availability," give them a booking link.</p>

<p><strong>What this looks like:</strong></p>

<ul>
  <li>Athletes see your real-time availability</li>
  <li>They pick a time that works</li>
  <li>Booking confirms instantly</li>
  <li>Both of you get calendar notifications</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Result:</strong> No back-and-forth. No missed messages. No confusion.</p>
</div>

<p>Your booking link becomes your scheduling assistant.</p>

<h2>Step 2: Let Athletes Self-Schedule</h2>

<p>When athletes can see availability and book directly:</p>

<ul>
  <li>You're not texting back at 10 PM</li>
  <li>They book when it's convenient for them</li>
  <li>Double bookings become impossible</li>
  <li>Your calendar stays accurate in real-time</li>
</ul>

<p><strong>Example workflow:</strong></p>

<ul>
  <li>You set your weekly availability (e.g., Mon/Wed/Fri 4-8 PM)</li>
  <li>Athletes book open slots</li>
  <li>Slots automatically mark as unavailable</li>
  <li>You show up and coach</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Self-scheduling eliminates 90% of <strong>"what times do you have?"</strong> texts.</p>
</div>

<h2>Step 3: Automate Reminders</h2>

<p>No-shows happen when athletes forget.</p>

<p>Manual reminders work — but they're exhausting.</p>

<p><strong>Better approach:</strong></p>

<ul>
  <li>Automated email/SMS reminder 24 hours before</li>
  <li>Includes session time, location, and cancellation policy</li>
  <li>Sent automatically — no manual work</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>Result:</strong> Fewer no-shows, less chasing, more consistent revenue.</p>
</div>

<h2>Step 4: Track Lesson Packages Automatically</h2>

<p>If you sell 10-session packages, you're probably tracking them in:</p>

<ul>
  <li>A notebook</li>
  <li>A spreadsheet</li>
  <li>Your memory</li>
</ul>

<p>That creates problems:</p>

<ul>
  <li>Athletes ask "How many lessons do I have left?"</li>
  <li>You lose track and give free sessions accidentally</li>
  <li>Payment confusion at the end of a package</li>
</ul>

<p><strong>Better system:</strong></p>

<ul>
  <li>Each booking automatically deducts from the package</li>
  <li>Athletes see their remaining lessons</li>
  <li>You get alerts when packages run low</li>
</ul>

<div class="blog-callout">
  <p style="margin: 0;">Automatic package tracking = <strong>zero manual counting.</strong></p>
</div>

<h2>Step 5: Centralize Everything in One Place</h2>

<p>When scheduling lives in text messages:</p>

<ul>
  <li>You can't see your week at a glance</li>
  <li>Revenue tracking is manual</li>
  <li>Cancellation policies are hard to enforce</li>
</ul>

<p><strong>Professional scheduling tools let you:</strong></p>

<ul>
  <li>See all bookings in one calendar</li>
  <li>Track which athletes have packages</li>
  <li>Set cancellation policies that enforce automatically</li>
  <li>View weekly/monthly revenue</li>
  <li>Avoid double bookings</li>
</ul>

<div class="blog-highlight">
  <p style="margin: 0;"><strong>One calendar. One system. Zero chaos.</strong></p>
</div>

<h2>Why Scheduling Systems Matter More as You Grow</h2>

<p>When you're coaching 5 athletes, texting is fine.</p>

<p>When you hit 15+ weekly sessions, manual scheduling becomes:</p>

<ul>
  <li>Time-consuming</li>
  <li>Error-prone</li>
  <li>Unprofessional</li>
</ul>

<p>Parents expect professionalism. Athletes expect convenience.</p>

<div class="blog-callout">
  <p style="margin: 0;">A booking link makes you look like a <strong>professional business</strong> — not a side hustle.</p>
</div>

<h2>Final Thought</h2>

<p>The best baseball coaches aren't glued to their phones.</p>

<p><strong>They use systems that:</strong></p>

<ul>
  <li>Let athletes book 24/7</li>
  <li>Track packages automatically</li>
  <li>Send reminders without manual work</li>
  <li>Prevent double bookings</li>
  <li>Keep everything organized</li>
</ul>

<p>Skedence is built for private baseball coaches who want to stop texting and start scaling.</p>

<p><strong>👉 <a href="/login">Try Skedence free</a> and schedule your lessons without the chaos.</strong></p>

</div>
`;

async function fixBaseballPost() {
  console.log('🔧 Fixing baseball scheduling blog post formatting...\n');

  try {
    const querySnapshot = await db.collection('blogPosts')
      .where('slug', '==', 'schedule-private-baseball-lessons-without-texting')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.log('⚠️  Post not found');
      process.exit(1);
    }

    const doc = querySnapshot.docs[0];
    
    await doc.ref.update({
      content: formattedContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Updated: schedule-private-baseball-lessons-without-texting');
    console.log('   URL: https://skedence.com/blog/detail?slug=schedule-private-baseball-lessons-without-texting\n');
    console.log('✅ Blog post now has proper CSS formatting!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBaseballPost();
