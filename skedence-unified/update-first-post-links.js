/**
 * Script to add internal link to first blog post
 * Run with: node update-first-post-links.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBL4i-r1gUPvY_BQ2GfCYk7SfYymtKB8JQ",
  authDomain: "polyface-ae6d3.firebaseapp.com",
  projectId: "polyface-ae6d3",
  storageBucket: "polyface-ae6d3.firebasestorage.app",
  messagingSenderId: "346989480864",
  appId: "1:346989480864:web:8f2cf3b6e1b1e1e1e1e1e1",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get the existing content and add internal link
const contentWithLinks = `
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
  
  .blog-quote {
    border-left: 3px solid #E5E7EB;
    padding-left: 1.5rem;
    margin: 1.5rem 0;
    color: #6B7280;
    font-style: italic;
  }
  
  .blog-divider {
    height: 1px;
    background: #E5E7EB;
    margin: 2.5rem 0;
  }
</style>

<div class="blog-content">

<div class="blog-callout">
  <p style="font-size: 1.125rem; margin: 0;"><em>"Are you free Tuesday at 5?"<br>
  "Actually I have practice. What about Wednesday?"<br>
  "I can do Wednesday at 6."<br>
  "Can we make it 6:30?"<br>
  "Let me check…"</em></p>
</div>

<p>If you run private volleyball lessons, you've probably had this conversation dozens of times.</p>

<p>Multiply that by 10–20 athletes per week, and scheduling alone becomes a part-time job.</p>

<div class="blog-highlight">
  <strong>The reality is: texting works when you have 2 clients. It breaks when you have 10. It becomes chaos at 25.</strong>
</div>

<p>If you want to grow your private volleyball lesson business, you need a better system. Here's how to schedule private volleyball lessons without endless back-and-forth.</p>

<div class="blog-divider"></div>

<h2>Why Texting Fails as You Grow</h2>

<p>Texting feels easy at first. But as your lessons increase, problems start stacking up:</p>

<ul>
  <li>Double bookings</li>
  <li>Missed messages</li>
  <li>Last-minute cancellations</li>
  <li>Parents texting during practice</li>
  <li>Forgetting who paid</li>
  <li>Manual calendar updates</li>
</ul>

<p>Most volleyball coaches don't realize how much time they're losing until they try a structured system.</p>

<p><strong>Scheduling is not just a convenience issue — it's a scalability issue.</strong></p>

<h2>Step 1: Set Fixed Availability Blocks</h2>

<p>Instead of negotiating times individually, define when you're available.</p>

<p><strong>Example:</strong></p>

<ul>
  <li><strong>Mondays:</strong> 4:00–7:00 PM</li>
  <li><strong>Wednesdays:</strong> 5:00–8:00 PM</li>
  <li><strong>Saturdays:</strong> 9:00 AM–12:00 PM</li>
</ul>

<p>When availability is predefined, athletes choose from real openings instead of asking for custom times. This removes 80% of scheduling friction instantly.</p>

<h2>Step 2: Sell Lesson Packages Instead of Single Sessions</h2>

<p>One of the biggest scheduling problems comes from unclear payment. If an athlete hasn't paid yet, scheduling becomes awkward:</p>

<div class="blog-quote">
  <p>"Did you Venmo me?"<br>
  "I'll send it tonight."<br>
  "Can I pay after?"</p>
</div>

<p><strong>Instead, sell lesson packages:</strong></p>

<ul>
  <li>5-session package</li>
  <li>10-session package</li>
  <li>Monthly training bundle</li>
</ul>

<p>Athletes purchase first. Then they book. This ensures you get paid upfront, they're committed, and there's no confusion.</p>

<p>Learn more about <a href="/blog/detail?slug=private-volleyball-lesson-pricing-2026" style="color: #FF6B35; text-decoration: underline;">how to price your volleyball lesson packages</a> to maximize revenue while staying competitive.</p>

<h2>Step 3: Let Athletes Book Based on Your Availability</h2>

<p>The real solution is removing negotiation entirely.</p>

<p>Instead of: <em>"What time works?"</em><br>
You provide: <strong>"Here's my booking link."</strong></p>

<p>Athletes or parents:</p>

<ul>
  <li>View your availability</li>
  <li>Pick a time</li>
  <li>Confirm the booking</li>
  <li>Receive confirmation</li>
</ul>

<p>You don't have to coordinate manually. This is how professional training businesses operate.</p>

<h2>Step 4: Automate Confirmations and Reminders</h2>

<p>No-shows often happen because parents forget, athletes mix up times, or schedules change. Email confirmations and reminders dramatically reduce missed sessions.</p>

<div class="blog-highlight">
  <strong>A simple reminder 24 hours before practice can save you thousands per year in lost sessions.</strong>
</div>

<h2>Step 5: Keep Everything in One Place</h2>

<p>When scheduling, payments, and availability are separated across Venmo, Google Calendar, Notes app, and text messages, you create unnecessary mental overhead.</p>

<p><strong>Your system should:</strong></p>

<ul>
  <li>Show all bookings in one calendar</li>
  <li>Track which athletes have remaining sessions</li>
  <li>Store package balances</li>
  <li>Keep client information organized</li>
</ul>

<p>This is what allows you to grow beyond just "side hustle lessons."</p>

<h2>What a Clean Scheduling System Looks Like</h2>

<p>A modern private volleyball lesson setup looks like this:</p>

<ul>
  <li>You set availability once</li>
  <li>Athletes purchase lesson packages</li>
  <li>They book sessions based on open slots</li>
  <li>Bookings appear instantly on your calendar</li>
  <li>You get paid upfront</li>
  <li>Email reminders reduce no-shows</li>
</ul>

<p><strong>No chasing payments. No manual scheduling. No guessing.</strong></p>

<h2>When Should You Switch From Texting?</h2>

<p>If you have:</p>

<ul>
  <li>5+ regular athletes</li>
  <li>Weekly recurring lessons</li>
  <li>Parents constantly texting</li>
  <li>More than 10 sessions per week</li>
</ul>

<p><strong>You've already outgrown texting.</strong></p>

<p>The earlier you implement a structured booking system, the easier growth becomes.</p>

<h2>How Skedence Helps Volleyball Coaches</h2>

<p>Skedence was built specifically for private sports lessons.</p>

<p><strong>With Skedence, volleyball coaches can:</strong></p>

<ul>
  <li>Create lesson packages</li>
  <li>Set availability</li>
  <li>Let athletes and parents book instantly</li>
  <li>Accept secure payments through Stripe</li>
  <li>Manage multiple trainers under one academy</li>
  <li>Stay organized without back-and-forth texting</li>
</ul>

<p>Instead of spending time coordinating schedules, you spend time coaching.</p>

<div class="blog-divider"></div>

<div class="blog-callout">
  <h3 style="margin-top: 0; font-size: 1.5rem; color: #0A0A0A;">Key Takeaway</h3>
  <p style="margin-bottom: 0; font-size: 1.125rem;">The biggest shift from "coach" to "business owner" is systemization. <strong>Texting works at the beginning. Systems scale.</strong> If you want to run your private volleyball lessons in rhythm — and grow without chaos — scheduling automation isn't optional. It's foundational.</p>
</div>

<div style="background: #FF6B35; color: white; padding: 2rem; border-radius: 0.75rem; margin: 2.5rem 0; text-align: center;">
  <h3 style="margin-top: 0; font-size: 1.5rem; color: white;">Ready to Automate Your Volleyball Lesson Scheduling?</h3>
  <p style="font-size: 1.125rem; margin-bottom: 1.5rem; opacity: 0.95;">
    Stop texting. Start scaling. Try Skedence free for 14 days.
  </p>
  <a href="/login" style="display: inline-block; background: white; color: #FF6B35; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 1.0625rem;">
    Start Free Trial →
  </a>
</div>

</div>
`;

async function updatePost() {
  try {
    console.log('🔗 Adding internal link to first blog post...');
    
    const postRef = doc(db, 'blogPosts', 'Ss02YcR3BgQVesczJ4VI');
    await updateDoc(postRef, {
      content: contentWithLinks,
      updatedAt: new Date()
    });
    
    console.log('✅ First blog post updated with internal link!');
    console.log('🔗 View at: http://localhost:3000/blog/detail?slug=schedule-volleyball-lessons-without-texting');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating post:', error);
    process.exit(1);
  }
}

updatePost();
