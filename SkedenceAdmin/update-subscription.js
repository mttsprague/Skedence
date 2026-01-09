const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateSubscription() {
  try {
    await db.collection('organizations').doc('0Mtow1OaV7oUlCisKSNy').update({
      'billing.subscriptionId': 'sub_1SnQkm2XPese4Q6Cm9fQzcHx',
      'billing.status': 'trialing',
      'billing.plan': 'starter',
      'billing.isActive': true,
      'billing.isInGrace': false,
      'updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Successfully updated subscription ID');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

updateSubscription();
