const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();
async function run() {
  const doc = await db.collection('bookings').doc('BxbMnY3R8zWJq1ztyQqX').get();
  console.log('Exists:', doc.exists);
  console.log(JSON.stringify(doc.data(), null, 2));
}
run().catch(console.error);
