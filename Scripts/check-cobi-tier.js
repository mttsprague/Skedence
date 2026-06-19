const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

async function main() {
  const orgSnap = await db.collection('organizations').get();
  console.log('All orgs:');
  orgSnap.docs.forEach(d => console.log(' ', d.id, d.data().name));

  // Try to find Polyface
  let org = orgSnap.docs.find(d => (d.data().name || '').toLowerCase().includes('polyface'));
  if (!org) org = orgSnap.docs[0];
  const orgId = org.id;
  const orgData = org.data();
  console.log('Org ID:', orgId);
  console.log('\nPricing tiers:');
  (orgData.pricingStructure && orgData.pricingStructure.tiers || []).forEach(tier => {
    console.log(' - Tier ID:', tier.id, '| Name:', tier.tierName);
    (tier.packages || []).forEach(pkg => {
      console.log('    pkg:', pkg.packageType, '| title:', pkg.title);
    });
  });

  const trainerSnap = await db.collection('trainers').where('orgId', '==', orgId).get();
  console.log('\nAll trainers:');
  trainerSnap.docs.forEach(d => {
    const t = d.data();
    const name = (t.firstName || '') + ' ' + (t.lastName || '');
    console.log(' ', name, '| pricingTierId:', JSON.stringify(t.pricingTierId), '| pricingTierName:', JSON.stringify(t.pricingTierName));
  });
  // Sample some user packages to see what pricingTierId is stored
  const orgUsersSnap = await db.collection('organizations').doc(orgId).collection('users').limit(5).get();
  console.log('\nSample user packages (first 5 users):');
  for (const userDoc of orgUsersSnap.docs) {
    const pkgsSnap = await db.collection('organizations').doc(orgId).collection('users').doc(userDoc.id).collection('packages').limit(5).get();
    if (!pkgsSnap.empty) {
      console.log(' User:', userDoc.id);
      pkgsSnap.docs.forEach(p => {
        const d = p.data();
        console.log('  pkg:', d.packageType, '| pricingTierId:', JSON.stringify(d.pricingTierId), '| pricingTierName:', JSON.stringify(d.pricingTierName), '| remaining:', (d.totalLessons||0)-(d.lessonsUsed||0));
      });
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
