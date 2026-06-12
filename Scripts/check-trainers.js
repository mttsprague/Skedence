const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const orgId = 'polyface_volleyball_academy_';
  
  console.log('=== All trainers in polyface org ===');
  const snap = await db.collection('trainers')
    .where('orgId', '==', orgId)
    .get();
  
  console.log(`Total trainers: ${snap.size}\n`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`Trainer: ${d.id}`);
    console.log(`  name: ${data.firstName} ${data.lastName}`);
    console.log(`  active: ${data.active} (type: ${typeof data.active})`);
    console.log(`  needsPasswordSetup: ${data.needsPasswordSetup}`);
    console.log(`  pricingTierId: ${data.pricingTierId}`);
    console.log(`  createdAt: ${data.createdAt?.toDate?.()}`);
    console.log();
  });
}
run().catch(console.error);
