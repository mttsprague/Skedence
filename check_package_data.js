const admin = require('firebase-admin');
const serviceAccount = require('./SkedenceAdmin/functions/service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkPackages() {
  const orgId = '0Mtow1OaV7oUlCisKSNy';
  
  // Get a member
  const membersSnap = await db.collection('orgMembers').where('orgId', '==', orgId).limit(1).get();
  if (membersSnap.empty) {
    console.log('No members found');
    process.exit(0);
  }
  
  const userId = membersSnap.docs[0].data().userId;
  console.log('Checking packages for user:', userId);
  
  // Try new path
  const packagesSnap = await db.collection('organizations').doc(orgId).collection('users').doc(userId).collection('packages').limit(3).get();
  
  if (!packagesSnap.empty) {
    console.log('\nPackages at NEW path:');
    packagesSnap.forEach(doc => {
      const data = doc.data();
      console.log('\n--- Package:', doc.id, '---');
      console.log('Type:', data.packageType);
      console.log('Name:', data.packageName);
      console.log('Transaction ID:', data.transactionId);
      console.log('Amount Paid:', data.amountPaid, '(field exists:', 'amountPaid' in data, ')');
      console.log('Total Lessons:', data.totalLessons);
      console.log('Purchase Date:', data.purchaseDate ? data.purchaseDate.toDate() : 'N/A');
    });
  } else {
    console.log('No packages at new path');
  }
  
  process.exit(0);
}

checkPackages().catch(e => { 
  console.error('Error:', e); 
  process.exit(1); 
});
