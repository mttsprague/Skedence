const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  const trainerId = 'cobi__christiansen';
  
  console.log('=== Fixing Cobi Christiansen: unavailable → open (non-org-wide slots only) ===\n');
  
  const snap = await db.collection('trainers').doc(trainerId).collection('schedules').get();
  console.log(`Total slots: ${snap.size}`);
  
  const toFix = snap.docs.filter(d => {
    const data = d.data();
    // Only fix slots that Cobi created himself (not org-wide admin blocks)
    // and are unavailable
    return data.status === 'unavailable' && !data.isOrgWide;
  });
  
  const orgWideCount = snap.docs.filter(d => d.data().isOrgWide === true).length;
  
  console.log(`  Org-wide unavailability blocks (leave as-is): ${orgWideCount}`);
  console.log(`  Cobi's own unavailable slots to fix → open: ${toFix.length}`);
  
  if (toFix.length === 0) {
    console.log('\nNothing to fix.');
    return;
  }
  
  // Batch update
  const BATCH_SIZE = 400;
  let updated = 0;
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toFix.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      batch.update(doc.ref, { status: 'open' });
    }
    await batch.commit();
    updated += chunk.length;
    console.log(`  Updated ${updated}/${toFix.length}...`);
  }
  
  console.log(`\n✅ Done. Updated ${updated} slots to status: "open"`);
  console.log('\nCobi\'s availability will now show in:');
  console.log('  - The all-trainers calendar (as green open slots)');
  console.log('  - The Polyface client app booking view');
  
  // Verify
  const verify = await db.collection('trainers').doc(trainerId).collection('schedules')
    .where('status', '==', 'open')
    .get();
  console.log(`\nVerification: ${verify.size} open slots now exist for Cobi`);
  verify.docs.slice(0, 3).forEach(d => {
    console.log(`  ${d.id}: ${d.data().startTime?.toDate?.()}`);
  });
}
run().catch(console.error);
