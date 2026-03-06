const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function check() {
  console.log('\n🔍 Checking documents for: lenora_brown\n');
  
  const snapshot = await db.collection('users')
    .doc('lenora_brown')
    .collection('documents')
    .get();
  
  console.log(`Found ${snapshot.size} documents:\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ${doc.id}`);
    console.log(`  Type: ${data.type}`);
    console.log(`  Athlete: ${data.athleteName || 'N/A'}`);
    console.log(`  Uploaded: ${data.uploadedAt?.toDate() || 'N/A'}\n`);
  });
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
