#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

// Standard blog CSS that should be in all posts
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
  
  .blog-step {
    display: flex;
    gap: 1rem;
    margin: 1.5rem 0;
  }
  
  .blog-step-number {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    background: #FF6B35;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
</style>

`;

async function fixBaseballPost() {
  try {
    const slug = 'schedule-private-baseball-lessons-without-texting';
    
    console.log(`🔍 Finding post: ${slug}\n`);
    
    const snapshot = await db.collection('blogPosts')
      .where('slug', '==', slug)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Post not found');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('📝 Current post title:', data.title);
    
    // Check if it already has CSS
    if (data.content.includes('<style>')) {
      console.log('✅ Post already has CSS styling');
      return;
    }
    
    // Add CSS before the content
    const updatedContent = blogCSS + data.content;
    
    console.log('\n🔧 Adding CSS styling to post...');
    await doc.ref.update({
      content: updatedContent,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2026-02-25T08:46:55-06:00'))
    });
    
    console.log('✅ Post updated successfully!');
    console.log('\n📊 Stats:');
    console.log('  Original length:', data.content.length);
    console.log('  New length:', updatedContent.length);
    console.log('  CSS added:', blogCSS.length, 'characters');
    console.log('\n🌐 View at: https://skedence.com/blog/detail#' + slug);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

fixBaseballPost();
