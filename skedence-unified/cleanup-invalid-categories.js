/**
 * Cleanup Script: Remove invalid categories from blog posts
 * Ensures all posts only have valid categories
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

// Valid categories
const VALID_CATEGORIES = [
  'revenue-growth',
  'operations',
  'getting-started',
  'tools',
  'volleyball',
  'basketball',
  'soccer',
  'baseball',
  'business-tips'
];

async function cleanupInvalidCategories() {
  console.log('🧹 Cleaning up invalid categories...\n');

  try {
    // Get all blog posts
    const postsSnapshot = await getDocs(collection(db, 'blogPosts'));
    
    if (postsSnapshot.empty) {
      console.log('❌ No blog posts found');
      return;
    }

    console.log(`📊 Found ${postsSnapshot.size} blog posts to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Check each post
    for (const docSnap of postsSnapshot.docs) {
      const data = docSnap.data();
      const postId = docSnap.id;
      
      try {
        // Check if post has categories array
        if (!data.categories || !Array.isArray(data.categories)) {
          console.log(`⏭️  ${data.title} - No categories array`);
          skippedCount++;
          continue;
        }

        // Filter to only valid categories
        const validCategories = data.categories.filter(cat => VALID_CATEGORIES.includes(cat));
        
        // Check if any invalid categories were found
        const invalidCategories = data.categories.filter(cat => !VALID_CATEGORIES.includes(cat));
        
        if (invalidCategories.length === 0) {
          console.log(`✅ ${data.title} - All categories valid`);
          skippedCount++;
          continue;
        }

        // Update the document with only valid categories
        const postRef = doc(db, 'blogPosts', postId);
        await updateDoc(postRef, {
          categories: validCategories
        });

        console.log(`🔧 ${data.title}`);
        console.log(`   Removed: [${invalidCategories.join(', ')}]`);
        console.log(`   Kept: [${validCategories.join(', ')}]\n`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating ${postId}:`, error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log(`   🔧 Posts updated: ${updatedCount}`);
    console.log(`   ✅ Posts already clean: ${skippedCount}`);
    console.log('='.repeat(60) + '\n');

    if (updatedCount > 0) {
      console.log('🎉 Invalid categories removed!');
    } else {
      console.log('✨ All posts already had valid categories!');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    // Exit process
    process.exit(0);
  }
}

// Run cleanup
cleanupInvalidCategories();
