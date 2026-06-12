const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  console.log('=== Cobi Christiansen schedule slots (first 10) ===');
  const snap = await db.collection('trainers').doc('cobi__christiansen').collection('schedules')
    .orderBy('startTime', 'asc')
    .limit(10)
    .get();
  
  console.log(`Total slots: ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}:`);
    console.log(`    status: "${data.status}"`);
    console.log(`    location: "${data.location}"`);
    console.log(`    startTime: ${data.startTime?.toDate?.()}`);
    console.log(`    orgId: ${data.orgId}`);
  });
}
run().catch(console.error);
