#!/usr/bin/env node

/**
 * Add missing pricePerLesson field to all mike_parent packages.
 * Reads pricing structure from Firestore to get the correct price per lesson.
 */

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function main() {
  // Load pricing structure to build packageType → pricePerLesson map
  const orgDoc = await db.collection('organizations').doc('skedence_gym').get();
  const pricing = orgDoc.data()?.pricingStructure;
  if (!pricing) { console.error('No pricingStructure found'); process.exit(1); }

  // Build map: packageType -> pricePerLesson (in cents)
  const priceMap = {};
  for (const tier of pricing.tiers || []) {
    for (const pkg of tier.packages || []) {
      const lessonCount = pkg.lessonCount || 1;
      priceMap[pkg.packageType] = Math.round(pkg.priceInCents / lessonCount);
    }
  }

  console.log('Price map from pricing structure:');
  for (const [type, price] of Object.entries(priceMap)) {
    console.log(`  ${type}: ${price} cents ($${(price/100).toFixed(2)}/lesson)`);
  }
  console.log();

  // Load all mike_parent packages
  const packagesRef = db.collection('organizations').doc('skedence_gym')
    .collection('users').doc('mike_parent').collection('packages');
  const snapshot = await packagesRef.get();

  console.log(`Found ${snapshot.size} packages\n`);

  const batch = db.batch();
  let updated = 0;
  let skipped = 0;
  let unknown = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { packageType, pricePerLesson } = data;

    const expectedPrice = priceMap[packageType];

    if (expectedPrice === undefined) {
      console.log(`⚠️  Unknown packageType "${packageType}" on ${doc.id} — skipping`);
      unknown++;
      continue;
    }

    if (pricePerLesson === expectedPrice) {
      console.log(`✅  ${doc.id} (${packageType}) already has pricePerLesson: ${pricePerLesson}`);
      skipped++;
      continue;
    }

    console.log(`📝  ${doc.id} (${packageType}) → pricePerLesson: ${expectedPrice} cents`);
    batch.update(doc.ref, { pricePerLesson: expectedPrice });
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
    console.log(`\n✅ Updated pricePerLesson on ${updated} packages`);
  } else {
    console.log('\nℹ️  No packages needed updating');
  }

  if (skipped > 0) console.log(`ℹ️  ${skipped} already correct`);
  if (unknown > 0) console.log(`⚠️  ${unknown} unknown package types`);

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
