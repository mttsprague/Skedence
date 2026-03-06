/**
 * Delete User Documents
 * 
 * This script deletes documents from both Firestore and Firebase Storage
 * for a specific user.
 * 
 * Usage:
 * node Scripts/delete-user-documents.js
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
const storage = admin.storage();

async function deleteUserDocuments() {
  const userId = 'mike_parent';
  
  console.log(`\n🗑️  Deleting all documents for user: ${userId}\n`);
  
  try {
    // Get all documents
    const docsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('documents')
      .get();
    
    if (docsSnapshot.empty) {
      console.log('✅ No documents found to delete\n');
      return;
    }
    
    console.log(`📄 Found ${docsSnapshot.size} documents to delete\n`);
    
    for (const doc of docsSnapshot.docs) {
      const docId = doc.id;
      const data = doc.data();
      
      console.log(`🗑️  Deleting document: ${docId}`);
      console.log(`   Type: ${data.type || 'N/A'}`);
      console.log(`   Name: ${data.name || 'N/A'}`);
      console.log(`   Athlete: ${data.athleteName || 'N/A'}`);
      
      // Delete from Firestore
      await db.collection('users')
        .doc(userId)
        .collection('documents')
        .doc(docId)
        .delete();
      console.log(`   ✅ Deleted from Firestore`);
      
      // Delete from Storage
      if (data.name) {
        try {
          const storagePath = `users/${userId}/documents/${data.name}`;
          await storage.bucket().file(storagePath).delete();
          console.log(`   ✅ Deleted from Storage: ${storagePath}`);
        } catch (storageError) {
          console.log(`   ⚠️  Storage file not found or already deleted`);
        }
      }
      
      console.log();
    }
    
    console.log(`✅ Deleted ${docsSnapshot.size} documents successfully\n`);
    
  } catch (error) {
    console.error(`\n❌ Error deleting documents:`, error.message);
    throw error;
  }
}

// Run the deletion
deleteUserDocuments()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
