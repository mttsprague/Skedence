const admin = require('./SkedenceAdmin/functions/node_modules/firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./SkedenceAdmin/functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDocuments() {
  try {
    // Check documents subcollection for mike_parent
    console.log('\n=== Checking users/mike_parent/documents ===');
    const docsSnapshot = await db.collection('users').doc('mike_parent').collection('documents').get();
    console.log(`Found ${docsSnapshot.size} documents in subcollection`);
    docsSnapshot.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      console.log('Data:', doc.data());
      console.log('---');
    });

    // Check if there's a waivers subcollection
    console.log('\n=== Checking users/mike_parent/waivers ===');
    const waiversSnapshot = await db.collection('users').doc('mike_parent').collection('waivers').get();
    console.log(`Found ${waiversSnapshot.size} waivers in subcollection`);
    waiversSnapshot.forEach(doc => {
      console.log(`Waiver ID: ${doc.id}`);
      console.log('Data:', doc.data());
      console.log('---');
    });

    // Check user document itself
    console.log('\n=== Checking users/mike_parent document ===');
    const userDoc = await db.collection('users').doc('mike_parent').get();
    if (userDoc.exists) {
      console.log('User data:', userDoc.data());
    } else {
      console.log('User document does not exist');
    }

    // List all subcollections of this user
    console.log('\n=== Listing all subcollections for users/mike_parent ===');
    const collections = await db.collection('users').doc('mike_parent').listCollections();
    console.log('Subcollections:', collections.map(col => col.id));

  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkDocuments();
