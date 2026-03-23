#!/usr/bin/env node

/**
 * Backfill all packages for mike_parent with correct pricing tier data.
 * 
 * Tier mapping from pricingStructure:
 *   Elite  (0AC207CB-D64C-4C46-9BBF-8B71066F90A5): 1_athlete_lesson, elite_three_athletes
 *   Class pass (DC6A6C57-E779-4D51-AA90-4E4301C93CD1): weekend_class
 *   Pro    (5C2B02CC-36E2-41D3-ACF2-04C6582F522C): pro_two_athlete, pro_one_athlete_
 */

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

const TIER_MAP = {
  '1_athlete_lesson':     { id: '0AC207CB-D64C-4C46-9BBF-8B71066F90A5', name: 'Elite' },
  'elite_three_athletes': { id: '0AC207CB-D64C-4C46-9BBF-8B71066F90A5', name: 'Elite' },
  'weekend_class':        { id: 'DC6A6C57-E779-4D51-AA90-4E4301C93CD1', name: 'Class pass' },
  'pro_two_athlete':      { id: '5C2B02CC-36E2-41D3-ACF2-04C6582F522C', name: 'Pro' },
  'pro_one_athlete_':     { id: '5C2B02CC-36E2-41D3-ACF2-04C6582F522C', name: 'Pro' },
};

async function main() {
  const packagesRef = db.collection('organizations')
    .doc('skedence_gym')
    .collection('users')
    .doc('mike_parent')
    .collection('packages');

  const snapshot = await packagesRef.get();
  console.log(`Found ${snapshot.size} packages for mike_parent\n`);

  let updated = 0;
  let skipped = 0;
  let unknown = 0;

  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { packageType, pricingTierId } = data;

    const tier = TIER_MAP[packageType];

    if (!tier) {
      console.log(`⚠️  Unknown packageType "${packageType}" on ${doc.id} — skipping`);
      unknown++;
      continue;
    }

    if (pricingTierId && pricingTierId === tier.id) {
      console.log(`✅  ${doc.id} (${packageType}) already has tier "${tier.name}"`);
      skipped++;
      continue;
    }

    console.log(`📝  ${doc.id} (${packageType}) → tier "${tier.name}" (${tier.id})`);
    batch.update(doc.ref, {
      pricingTierId: tier.id,
      pricingTierName: tier.name,
    });
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
    console.log(`\n✅ Backfilled ${updated} packages`);
  } else {
    console.log('\nℹ️  No packages needed updating');
  }

  if (skipped > 0) console.log(`ℹ️  ${skipped} already correct`);
  if (unknown > 0) console.log(`⚠️  ${unknown} unknown package types (not updated)`);

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
