const admin = require('firebase-admin');

// Initialize without service account - uses default Firebase credentials
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkPackage() {
  try {
    // Find user
    const usersQuery = await db.collection('users')
      .where('authUserId', '==', 'erGcrxrOyneNNsWOtvgVQ9Apdzp2')
      .limit(1)
      .get();
    
    if (usersQuery.empty) {
      console.log('❌ User not found');
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    const userId = userDoc.id;
    console.log('✅ User found:', userId);
    
    // Check for package with this payment intent
    const packagesQuery = await db
      .collection('organizations')
      .doc('skedence_gym')
      .collection('users')
      .doc(userId)
      .collection('packages')
      .where('transactionId', '==', 'pi_3T4ZyUFIh2MhEffN1VLwqd')
      .get();
    
    if (packagesQuery.empty) {
      console.log('\n⚠️  NO PACKAGE FOUND');
      console.log('Payment succeeded but package was NOT created');
      console.log('Payment Intent: pi_3T4ZyUFIh2MhEffN1VLwqd');
    } else {
      console.log('\n✅ Package found:', packagesQuery.docs[0].id);
      console.log('Data:', packagesQuery.docs[0].data());
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkPackage();
