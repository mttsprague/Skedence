/**
 * Migration Script: Update Blog Posts to Support Multiple Categories
 * Converts single category field to categories array
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

async function migrateBlogCategories() {
  console.log('🚀 Starting blog categories migration...\n');

  try {
    // Get all blog posts
    const postsSnapshot = await getDocs(collection(db, 'blogPosts'));
    
    if (postsSnapshot.empty) {
      console.log('❌ No blog posts found');
      return;
    }

    console.log(`📊 Found ${postsSnapshot.size} blog posts to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    // Update each post
    for (const docSnap of postsSnapshot.docs) {
      const data = docSnap.data();
      const postId = docSnap.id;
      
      try {
        // Skip if already using categories array
        if (data.categories && Array.isArray(data.categories)) {
          console.log(`⏭️  ${data.title} - Already migrated`);
          continue;
        }

        // Determine appropriate categories based on content
        const categories = [];
        
        // Add existing category if it exists
        if (data.category) {
          categories.push(data.category);
        }

        // Smart categorization based on title/content
        const title = data.title.toLowerCase();
        const content = data.content ? data.content.toLowerCase() : '';
        const excerpt = data.excerpt ? data.excerpt.toLowerCase() : '';
        const fullText = `${title} ${content} ${excerpt}`;

        // Add additional relevant categories
        if (fullText.includes('pricing') || fullText.includes('pricing') || fullText.includes('package') || fullText.includes('revenue')) {
          if (!categories.includes('revenue-growth')) {
            categories.push('revenue-growth');
          }
        }

        if (fullText.includes('schedul') || fullText.includes('calendar') || fullText.includes('appointment')) {
          if (!categories.includes('operations')) {
            categories.push('operations');
          }
        }

        if (fullText.includes('getting started') || fullText.includes('start') || fullText.includes('launch')) {
          if (!categories.includes('getting-started')) {
            categories.push('getting-started');
          }
        }

        if (fullText.includes('software') || fullText.includes('app') || fullText.includes('tool') || fullText.includes('platform')) {
          if (!categories.includes('tools')) {
            categories.push('tools');
          }
        }

        if (fullText.includes('business tips') || fullText.includes('coaching business')) {
          if (!categories.includes('business-tips')) {
            categories.push('business-tips');
          }
        }

        // Add sport category based on the post's sport field
        if (data.sport && data.sport !== 'all') {
          const sportCategory = data.sport; // volleyball, basketball, soccer, baseball
          if (!categories.includes(sportCategory)) {
            categories.push(sportCategory);
          }
        }

        // Ensure at least one category
        if (categories.length === 0) {
          categories.push('business-tips');
        }

        // Update the document
        const postRef = doc(db, 'blogPosts', postId);
        await updateDoc(postRef, {
          categories: categories,
          // Keep the old category field for backward compatibility
          category: data.category || categories[0]
        });

        console.log(`✅ ${data.title}`);
        console.log(`   Categories: ${categories.join(', ')}\n`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error updating ${postId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (errorCount === 0) {
      console.log('🎉 All blog posts migrated successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Exit process
    process.exit(0);
  }
}

// Run migration
migrateBlogCategories();
