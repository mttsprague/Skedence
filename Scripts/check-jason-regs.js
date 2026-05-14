const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();
async function run() {
  const snap = await db.collection('classRegistrations').where('clientId', '==', 'jason_hargis').get();
  snap.docs.forEach(d => {
    console.log('ID:', d.id);
    console.log(JSON.stringify(d.data(), null, 2));
  });
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
