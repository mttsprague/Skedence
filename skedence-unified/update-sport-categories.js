/**
 * Update Script: Replace 'sport-specific' with actual sport categories
 * Replaces sport-specific category with volleyball, basketball, soccer, or baseball
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

async function updateSportCategories() {
  console.log('🚀 Updating sport-specific categories...\n');

  try {
    // Get all blog posts
    const postsSnapshot = await getDocs(collection(db, 'blogPosts'));
    
    if (postsSnapshot.empty) {
      console.log('❌ No blog posts found');
      return;
    }

    console.log(`📊 Found ${postsSnapshot.size} blog posts to check\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Update each post
    for (const docSnap of postsSnapshot.docs) {
      const data = docSnap.data();
      const postId = docSnap.id;
      
      try {
        // Check if post has 'sport-specific' in categories
        if (!data.categories || !Array.isArray(data.categories)) {
          console.log(`⏭️  ${data.title} - No categories array`);
          skippedCount++;
          continue;
        }

        if (!data.categories.includes('sport-specific')) {
          console.log(`⏭️  ${data.title} - No sport-specific category`);
          skippedCount++;
          continue;
        }

        // Remove 'sport-specific' and add actual sport category
        const updatedCategories = data.categories.filter(cat => cat !== 'sport-specific');
        
        // Add sport category based on post's sport field
        if (data.sport && data.sport !== 'all') {
          const sportCategory = data.sport; // volleyball, basketball, soccer, baseball
          if (!updatedCategories.includes(sportCategory)) {
            updatedCategories.push(sportCategory);
          }
        }

        // Update the document
        const postRef = doc(db, 'blogPosts', postId);
        await updateDoc(postRef, {
          categories: updatedCategories
        });

        console.log(`✅ ${data.title}`);
        console.log(`   Old: [${data.categories.join(', ')}]`);
        console.log(`   New: [${updatedCategories.join(', ')}]\n`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error updating ${postId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Update Summary:');
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (errorCount === 0) {
      console.log('🎉 All blog posts updated successfully!');
    }

  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    // Exit process
    process.exit(0);
  }
}

// Run update
updateSportCategories();
