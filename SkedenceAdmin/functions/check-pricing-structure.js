#!/usr/bin/env node

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function main() {
  const orgDoc = await db.collection('organizations').doc('skedence_gym').get();
  const pricing = orgDoc.data()?.pricingStructure;
  if (!pricing) { console.log('No pricingStructure found'); process.exit(1); }

  console.log('lastUpdated:', pricing.lastUpdated);
  console.log('\nTiers:');
  for (const tier of pricing.tiers || []) {
    console.log(`\n  Tier: "${tier.tierName}" (id: ${tier.id})`);
    for (const pkg of tier.packages || []) {
      console.log(`    - packageType: "${pkg.packageType}"  title: "${pkg.title}"  price: $${(pkg.priceInCents/100).toFixed(2)}`);
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
