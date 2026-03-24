/**
 * Backfill missing pricingTierId/pricingTierName on a specific package document.
 *
 * Usage:
 *   node backfill-package-tier.js
 *
 * Finds the package by transactionId within organizations/{orgId}/users/[uid]/packages
 * and updates it with the tier info resolved from the org's pricing structure.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const ORG_ID = 'skedence_gym';
const TRANSACTION_ID = 'pi_3TEHfPFIh2MhEffN0mKBBFBA';
// ───────────────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Load the org's pricing structure to find the correct tier
  const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
  if (!orgDoc.exists) {
    console.error(`❌ Organization '${ORG_ID}' not found.`);
    process.exit(1);
  }

  const orgData = orgDoc.data();
  const tiers = orgData?.pricingStructure?.tiers ?? [];

  if (tiers.length === 0) {
    console.error('❌ No pricing structure tiers found for this org.');
    process.exit(1);
  }

  console.log(`✅ Loaded ${tiers.length} pricing tier(s) for org '${ORG_ID}':`);
  tiers.forEach(t => {
    const types = (t.packages || []).map(p => p.packageType).join(', ');
    console.log(`   • ${t.tierName} (${t.id}) → [${types}]`);
  });

  // 2. Find the package by transactionId at the known path
  console.log(`\n🔍 Searching in organizations/${ORG_ID}/users/mike_parent/packages ...`);

  const packagesSnap = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('users')
    .doc('mike_parent')
    .collection('packages')
    .where('transactionId', '==', TRANSACTION_ID)
    .limit(1)
    .get();

  let foundRef = null;
  let foundData = null;

  if (!packagesSnap.empty) {
    foundRef = packagesSnap.docs[0].ref;
    foundData = packagesSnap.docs[0].data();
    console.log(`✅ Found package at path: ${foundRef.path}`);
  }

  if (!foundRef || !foundData) {
    console.error(`\n❌ Package with transactionId '${TRANSACTION_ID}' not found.`);
    process.exit(1);
  }

  console.log(`   packageType:     ${foundData.packageType}`);
  console.log(`   packageName:     ${foundData.packageName}`);
  console.log(`   pricingTierId:   ${foundData.pricingTierId ?? '(missing)'}`);
  console.log(`   pricingTierName: ${foundData.pricingTierName ?? '(missing)'}`);

  // 3. Resolve the correct tier from the pricing structure
  let tierId = null;
  let tierName = null;

  for (const tier of tiers) {
    const match = (tier.packages || []).find(
      p => p.packageType === foundData.packageType
    );
    if (match) {
      tierId = tier.id;
      tierName = tier.tierName;
      break;
    }
  }

  if (!tierId) {
    console.error(
      `\n❌ packageType '${foundData.packageType}' not found in any pricing tier.`
    );
    console.log('Available package types:');
    tiers.forEach(t =>
      (t.packages || []).forEach(p =>
        console.log(`   ${t.tierName}: ${p.packageType}`)
      )
    );
    process.exit(1);
  }

  console.log(`\n🎯 Resolved tier: '${tierName}' (${tierId})`);

  // 4. Update the package document
  await foundRef.update({
    pricingTierId: tierId,
    pricingTierName: tierName,
  });

  console.log(`\n✅ Backfill complete!`);
  console.log(`   pricingTierId  → ${tierId}`);
  console.log(`   pricingTierName → ${tierName}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
