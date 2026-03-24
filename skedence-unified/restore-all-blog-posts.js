/**
 * Restore All Blog Posts to polyface-ae6d3
 * This script re-publishes all blog posts from the recent publishing sessions
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with EXPLICIT project targeting
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'polyface-ae6d3',  // EXPLICITLY set to Skedence project
    databaseURL: 'https://polyface-ae6d3.firebaseio.com'
  });
}

const db = admin.firestore();

// Verify we're using the correct project
console.log('🔍 Firebase Project ID:', admin.app().options.projectId);
console.log('📍 This script will publish to: polyface-ae6d3 (Skedence project)\n');

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

// Import all blog posts from recent sessions
const blogPosts = [
  // Session 1: Lesson Structure & Client Posts (Mar 6)
  require('./publish-lesson-structure-client-posts.js'),
  
  // Session 2: Business Startup Posts (Mar 9)
  require('./publish-business-startup-posts.js'),
  
  // Session 3: Organization & Drills Posts (Mar 16)
  require('./publish-organization-drills-posts.js'),
];

console.log('⚠️  IMPORTANT: Make sure you are authenticated to the correct Firebase project!');
console.log('Run: firebase use polyface-ae6d3');
console.log('');

// Wait for user confirmation
setTimeout(() => {
  console.log('🚀 Starting restore process...\n');
  console.log('This will re-publish all blog posts to polyface-ae6d3 (Skedence)');
  console.log('NOT to volleyIQ or any other project\n');
}, 2000);
