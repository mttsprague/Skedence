/**
 * Check Documents for a Specific User
 * 
 * This script checks what documents exist in Firestore for a specific user
 * across all possible paths.
 * 
 * Usage:
 * node Scripts/check-user-documents.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: 'polyface-ae6d3'
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkUserDocuments() {
  const userId = 'mike_parent'; // The user having issues
  
  console.log(`\n🔍 Checking documents for user: ${userId}\n`);
  
  try {
    // Check primary path: users/{firstName_lastName}/documents
    console.log(`📂 Checking path: users/${userId}/documents/`);
    const docsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('documents')
      .get();
    
    console.log(`   Found ${docsSnapshot.size} documents`);
    
    if (docsSnapshot.size > 0) {
      console.log(`\n   📄 Documents found:`);
      docsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`     Type: ${data.type || 'N/A'}`);
        console.log(`     Name: ${data.name || data.displayName || 'N/A'}`);
        console.log(`     Athlete: ${data.athleteName || 'N/A'}`);
        console.log(`     Uploaded: ${data.uploadedAt?.toDate?.() || 'N/A'}`);
        console.log(`     URL: ${data.url ? 'EXISTS' : 'N/A'}`);
        console.log();
      });
    } else {
      console.log(`   ✅ No documents in primary path (expected after deletion)\n`);
    }
    
    // Check if user has authUserId field (for checking old path)
    console.log(`\n📂 Checking user document for authUserId field...`);
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const authUserId = userData.authUserId;
      
      if (authUserId) {
        console.log(`   Found authUserId: ${authUserId}`);
        
        // Check old path: users/{authUserId}/documents
        console.log(`\n📂 Checking OLD path: users/${authUserId}/documents/`);
        const oldDocsSnapshot = await db.collection('users')
          .doc(authUserId)
          .collection('documents')
          .get();
        
        console.log(`   Found ${oldDocsSnapshot.size} documents in OLD path`);
        
        if (oldDocsSnapshot.size > 0) {
          console.log(`\n   ⚠️  OLD WAIVER DOCUMENTS FOUND (should be deleted):`);
          oldDocsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ID: ${doc.id}`);
            console.log(`     Type: ${data.type || 'N/A'}`);
            console.log(`     Name: ${data.name || data.displayName || 'N/A'}`);
            console.log(`     Athlete: ${data.athleteName || 'N/A'}`);
            console.log(`     Uploaded: ${data.uploadedAt?.toDate?.() || 'N/A'}`);
            console.log();
          });
          
          console.log(`   🔧 These documents should be deleted from the old path.`);
        }
      } else {
        console.log(`   No authUserId field found - user only has new path`);
      }
    } else {
      console.log(`   ⚠️  User document not found: users/${userId}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error checking documents:`, error.message);
  }
  
  console.log('\n✅ Check complete!\n');
}

// Run the check
checkUserDocuments()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
