#!/usr/bin/env node
// Quick check of pricePerLesson on the two working packages
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function main() {
  const base = db.collection('organizations').doc('skedence_gym')
    .collection('users').doc('mike_parent').collection('packages');

  for (const id of ['KywgrEV1SoBXyMQdgoxJ', 't2pQaqrQ0G6CPWEKMUoF']) {
    const doc = await base.doc(id).get();
    const d = doc.data();
    console.log(id, '→ pricingTierId:', d.pricingTierId, '| pricingTierName:', d.pricingTierName, '| pricePerLesson:', d.pricePerLesson);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
