/**
 * Publish 4 New Blog Posts - Starting Training Businesses & Pricing Strategies
 * Topics: Volleyball business startup, Soccer pricing guide, Basketball social media marketing, Baseball hitting coach business
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
  
  .blog-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;
    font-size: 1rem;
  }
  
  .blog-content th {
    background-color: #FF6B35;
    color: white;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
  }
  
  .blog-content td {
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1rem;
    color: #4a5568;
  }
  
  .blog-content tr:nth-child(even) {
    background-color: #f7fafc;
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
    // VOLLEYBALL POST - Starting a Business
    title: "How to Start a Private Volleyball Lesson Business",
    slug: "start-private-volleyball-lesson-business",
    excerpt: "Learn how to start a profitable volleyball training business in 5 steps: choose your specialty (setter, hitting, libero), find training facilities, set competitive pricing ($60-$120/hour), promote through social media and clubs, and organize scheduling.",
    metaTitle: "How to Start a Volleyball Training Business (5 Steps)",
    metaDescription: "Start a private volleyball lesson business: choose training specialty, find court access, set pricing ($60-$120/hr), promote on Instagram and clubs, automate scheduling and payments.",
    keywords: "how to start private volleyball lessons, starting a volleyball training business, private volleyball lesson business, volleyball coaching business startup, how to become a volleyball trainer",
    categories: ["volleyball", "getting-started", "business-tips", "revenue-growth"],
    sport: "volleyball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Start Volleyball Business",
    content: `${blogStyles}
<div class="blog-content">

<p>Private volleyball lessons have become one of the fastest-growing segments of youth sports training. Parents are increasingly investing in individualized development, especially for athletes preparing for club volleyball, high school tryouts, or college recruiting.</p>

<p>For coaches or former players, starting a private volleyball lesson business can become a profitable side hustle or even a full-time career.</p>

<p>Here's how to get started.</p>

<h2>Step 1: Choose Your Training Specialty</h2>

<p>Successful volleyball trainers usually specialize in specific skill areas rather than offering generic training.</p>

<p><strong>Common specialties include:</strong></p>
<ul>
<li>Setter development</li>
<li>Hitting and approach mechanics</li>
<li>Libero and defensive training</li>
<li>Serve receive improvement</li>
<li>Tryout preparation</li>
</ul>

<p><span class="blog-highlight">Specializing helps you stand out from other trainers in your area.</span></p>

<h2>Step 2: Find a Training Facility</h2>

<p>You'll need consistent court access to run lessons. Most private volleyball trainers use one of the following options:</p>

<ul>
<li>Local volleyball clubs</li>
<li>School gyms</li>
<li>Recreation centers</li>
<li>Private training facilities</li>
</ul>

<p>If you're just starting out, renting court space by the hour is usually the most affordable option.</p>

<h2>Step 3: Set Your Lesson Pricing</h2>

<p>Private volleyball lessons typically range from:</p>

<ul>
<li><strong>$60–$120 per hour</strong> for individual training</li>
<li><strong>$40–$80 per athlete</strong> for small group lessons</li>
</ul>

<p>Many trainers increase revenue by offering lesson packages such as:</p>
<ul>
<li>4 session packages</li>
<li>8 session development programs</li>
<li>Monthly training memberships</li>
</ul>

<div class="blog-callout">
<p><strong>Packages provide predictable income and keep athletes committed.</strong></p>
</div>

<h2>Step 4: Promote Your Volleyball Training</h2>

<p>Most trainers find clients through:</p>

<ul>
<li>Instagram</li>
<li>Local volleyball clubs</li>
<li>Word of mouth</li>
<li>Google search</li>
</ul>

<p>Posting training clips, drill breakdowns, and athlete progress videos can attract new athletes quickly.</p>

<h2>Step 5: Organize Scheduling and Payments</h2>

<p>As your athlete roster grows, managing lessons manually through texts or spreadsheets becomes difficult.</p>

<p>Many volleyball trainers eventually adopt scheduling platforms like Skedence to:</p>

<ul>
<li>Sell lesson packages</li>
<li>Manage trainer availability</li>
<li>Allow athletes to book sessions automatically</li>
<li>Track training revenue</li>
</ul>

<div class="blog-callout">
<p><strong>Running lessons like a real business helps trainers scale faster.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and launch your volleyball training business.</a></p>
</div>

</div>`
  },
  {
    // SOCCER POST - Pricing Guide
    title: "How Much Should You Charge for Private Soccer Training?",
    slug: "private-soccer-training-pricing-guide",
    excerpt: "Private soccer training pricing guide: youth coaches charge $40-$60, club coaches $60-$90, former college/pro players $90-$150 per session. Learn how to set competitive rates based on experience, location, facility costs, and athlete skill level.",
    metaTitle: "Private Soccer Training Pricing Guide (2026 Rates)",
    metaDescription: "Soccer training pricing: youth coaches $40-$60, club coaches $60-$90, college/pro players $90-$150 per session. Learn how experience, location, and packages affect your rates.",
    keywords: "private soccer training pricing, how much to charge for soccer training, soccer lesson rates, soccer coaching pricing guide, private soccer trainer rates",
    categories: ["soccer", "getting-started", "business-tips", "revenue-growth"],
    sport: "soccer",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Soccer Training Pricing",
    content: `${blogStyles}
<div class="blog-content">

<p>Pricing private soccer training can be challenging for new coaches. Charge too little and you undervalue your time. Charge too much and athletes may hesitate to book.</p>

<p>The key is finding a balance between market demand and your coaching experience.</p>

<h2>Average Private Soccer Lesson Prices</h2>

<p>Across the United States, private soccer training usually falls within these ranges:</p>

<table>
<tr>
<th>Experience Level</th>
<th>Typical Price</th>
</tr>
<tr>
<td>Youth coach</td>
<td>$40–$60 per session</td>
</tr>
<tr>
<td>Club coach</td>
<td>$60–$90 per session</td>
</tr>
<tr>
<td>Former college/pro player</td>
<td>$90–$150 per session</td>
</tr>
</table>

<p><span class="blog-highlight">Location also plays a major role. Large metro areas typically support higher prices.</span></p>

<h2>Small Group Training Pricing</h2>

<p>Many soccer trainers increase revenue by offering small group training sessions.</p>

<p><strong>Example:</strong></p>
<ul>
<li>Individual lesson: $80 per athlete</li>
<li>Small group (3 athletes): $50 each</li>
</ul>

<p>The coach earns $150 instead of $80 while athletes still pay less.</p>

<h2>Offer Soccer Training Packages</h2>

<p>Parents prefer structured development programs instead of random sessions.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>5 session development plan</li>
<li>8 week striker training program</li>
<li>Preseason conditioning package</li>
</ul>

<div class="blog-callout">
<p><strong>Packages increase both commitment and revenue stability.</strong></p>
</div>

<h2>Factors That Influence Pricing</h2>

<p>Consider these factors when setting prices:</p>

<ul>
<li>Coaching experience</li>
<li>Training facility costs</li>
<li>Athlete skill level</li>
<li>Location demand</li>
<li>Session length</li>
</ul>

<p>Higher-level trainers working with elite club athletes often charge premium rates.</p>

<h2>Managing a Growing Soccer Training Business</h2>

<p>Once trainers begin working with dozens of athletes, managing bookings manually becomes difficult.</p>

<p>Platforms like Skedence help soccer trainers:</p>

<ul>
<li>Sell training packages</li>
<li>Manage schedules</li>
<li>Automate lesson bookings</li>
<li>Track athlete sessions</li>
</ul>

<div class="blog-callout">
<p><strong>This allows coaches to focus more on training and less on administration.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and simplify your soccer training business.</a></p>
</div>

</div>`
  },
  {
    // BASKETBALL POST - Social Media Marketing
    title: "How Basketball Trainers Can Get More Clients Using Social Media",
    slug: "basketball-trainers-social-media-marketing",
    excerpt: "Social media is the most powerful tool for basketball trainers to grow their business. Learn 5 proven strategies: post drill breakdowns, show athlete progress, share training tips, use local hashtags, and make booking easy with automated scheduling.",
    metaTitle: "Basketball Trainer Marketing Tips (5 Social Media Strategies)",
    metaDescription: "Grow your basketball training business with social media: post drill breakdowns, show athlete progress, share tips, use local hashtags (#CityBasketballTraining), and automate booking.",
    keywords: "basketball trainer marketing ideas, how to promote basketball training, basketball trainer social media tips, basketball coaching marketing, grow basketball training business",
    categories: ["basketball", "marketing", "getting-started", "business-tips"],
    sport: "basketball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Basketball Marketing",
    content: `${blogStyles}
<div class="blog-content">

<p>Social media has become one of the most powerful tools for basketball trainers to grow their business.</p>

<p>Many successful trainers attract dozens of athletes simply by posting the right type of content consistently.</p>

<p>Here's how basketball trainers can use social media to get more private training clients.</p>

<h2>1. Post Drill Breakdowns</h2>

<p>Educational content performs extremely well on social media.</p>

<p><strong>Examples include:</strong></p>
<ul>
<li>Shooting mechanics breakdowns</li>
<li>Dribbling technique tips</li>
<li>Finishing drills</li>
<li>Defensive positioning</li>
</ul>

<p><span class="blog-highlight">Short instructional clips build credibility and attract athletes looking to improve.</span></p>

<h2>2. Show Athlete Progress</h2>

<p>Parents love seeing improvement.</p>

<p><strong>Post videos showing:</strong></p>
<ul>
<li>Before and after skill development</li>
<li>Athlete highlights</li>
<li>Training sessions</li>
</ul>

<div class="blog-callout">
<p><strong>This demonstrates that your coaching produces results.</strong></p>
</div>

<h2>3. Share Training Tips</h2>

<p>Simple posts with quick tips perform well.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>"3 mistakes young shooters make"</li>
<li>"How to improve ball control"</li>
<li>"Footwork tips for guards"</li>
</ul>

<p>These posts position you as a knowledgeable trainer.</p>

<h2>4. Use Local Hashtags</h2>

<p>Using location-based hashtags helps athletes in your area discover your training.</p>

<p><strong>Examples:</strong></p>
<ul>
<li>#DallasBasketballTraining</li>
<li>#ChicagoBasketballTrainer</li>
<li>#AtlantaBasketballLessons</li>
</ul>

<p><span class="blog-highlight">Local hashtags help you reach nearby athletes.</span></p>

<h2>5. Make Booking Easy</h2>

<p>The easier it is for athletes to book sessions, the more likely they are to schedule training.</p>

<p>Many basketball trainers eventually use scheduling platforms like Skedence that allow athletes to:</p>

<ul>
<li>Purchase lesson packages</li>
<li>View trainer availability</li>
<li>Book sessions instantly</li>
</ul>

<div class="blog-callout">
<p><strong>Automating booking removes the friction of manual scheduling.</strong></p>
<p><a href="https://skedence.com" style="color: #FF6B35; font-weight: 600; text-decoration: underline;">👉 Try Skedence free and make booking effortless for your athletes.</a></p>
</div>

</div>`
  },
  {
    // BASEBALL POST - Hitting Coach Business
    title: "How to Start a Private Baseball Hitting Coach Business",
    slug: "start-baseball-hitting-coach-business",
    excerpt: "Learn how to start a baseball hitting coach business in 5 steps: define your coaching focus (hitting mechanics, pitching, catching, infield), secure training facility access, set competitive pricing ($60-$120/hour), market to travel teams, and organize scheduling.",
    metaTitle: "Start a Baseball Hitting Coach Business (5-Step Guide)",
    metaDescription: "Start a hitting coach business: define coaching focus, secure batting cage access, price lessons $60-$120/hour, market to travel teams and social media, automate scheduling and payments.",
    keywords: "private baseball training business, starting a hitting coach business, baseball private lesson business, how to become a hitting coach, baseball coaching business startup",
    categories: ["baseball", "getting-started", "business-tips", "revenue-growth"],
    sport: "baseball",
    authorName: "Skedence Team",
    featuredImage: "https://skedence.com/logo-nav.png",
    featuredImageAlt: "Skedence - Baseball Hitting Coach Business",
    content: `${blogStyles}
<div class="blog-content">

<p>Private hitting coaches are in high demand as youth baseball becomes increasingly competitive. Many parents invest in private instruction to help athletes improve mechanics, increase bat speed, and prepare for higher levels of play.</p>

<p>For experienced players or coaches, starting a hitting coach business can be both rewarding and profitable.</p>

<h2>Step 1: Define Your Coaching Focus</h2>

<p>Many successful baseball trainers specialize in one area such as:</p>

<ul>
<li>Hitting mechanics</li>
<li>Pitching development</li>
<li>Catching fundamentals</li>
<li>Infield defense</li>
</ul>

<p><span class="blog-highlight">Specializing allows you to position yourself as an expert.</span></p>

<h2>Step 2: Secure a Training Facility</h2>

<p>Hitting lessons typically require access to:</p>

<ul>
<li>Indoor batting cages</li>
<li>Baseball training facilities</li>
<li>Private practice fields</li>
</ul>

<p>Indoor facilities are particularly valuable during winter months.</p>

<h2>Step 3: Set Competitive Lesson Pricing</h2>

<p>Private baseball lessons typically range between:</p>

<p><strong>$60–$120 per hour</strong> depending on experience and location.</p>

<p>Many coaches also offer:</p>
<ul>
<li>Hitting lesson packages</li>
<li>Seasonal development programs</li>
<li>Team training sessions</li>
</ul>

<div class="blog-callout">
<p><strong>Packages create predictable income.</strong></p>
</div>

<h2>Step 4: Market Your Baseball Training</h2>

<p>Most baseball trainers find clients through:</p>

<ul>
<li>Local travel teams</li>
<li>High school programs</li>
<li>Social media</li>
<li>Word of mouth</li>
</ul>

<p>Posting swing breakdowns or training drills can attract new athletes.</p>

<h2>Step 5: Organize Scheduling and Payments</h2>

<p>As the number of athletes grows, managing lessons manually becomes challenging.</p>

<p>Many baseball coaches eventually adopt scheduling platforms like Skedence to:</p>

<ul>
<li>Manage lesson schedules</li>
<li>Sell training packages</li>
<li>Automate bookings</li>
<li>Track training revenue</li>
</ul>

<div class="blog-callout">
<p><strong>This allows coaches to focus more on athlete development.</strong></p>
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
