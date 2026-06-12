const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  console.log('=== Full data of Cobi Christiansen schedule slots ===');
  const snap = await db.collection('trainers').doc('cobi__christiansen').collection('schedules')
    .orderBy('startTime', 'asc')
    .get();
  
  console.log(`Total slots: ${snap.size}\n`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`Slot: ${d.id}`);
    console.log(`  status: "${data.status}"`);
    console.log(`  location: "${data.location}"`);
    console.log(`  startTime: ${data.startTime?.toDate?.()}`);
    console.log(`  isOrgWide: ${data.isOrgWide}`);
    console.log(`  createdByRole: ${data.createdByRole}`);
    console.log(`  createdById: ${data.createdById}`);
    console.log();
  });

  // Compare with Jeff's open slots to understand the data shape  
  console.log('=== Jeff Schmitz sample open slot ===');
  const jeffSnap = await db.collection('trainers').doc('jeffschmitz').collection('schedules')
    .where('status', '==', 'open')
    .limit(1)
    .get();
  jeffSnap.forEach(d => {
    const data = d.data();
    console.log(`Slot: ${d.id}`);
    console.log(`  status: "${data.status}"`);
    console.log(`  isOrgWide: ${data.isOrgWide}`);
    console.log(`  createdByRole: ${data.createdByRole}`);
    console.log(`  createdById: ${data.createdById}`);
  });
}
run().catch(console.error);
