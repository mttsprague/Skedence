/**
 * Backfill the two most recently purchased packages for mike_parent in skedence_gym.
 * Finds packages missing pricingTierId/pricingTierName and fills them from the
 * org's pricing structure by matching packageType → tier.
 *
 * Usage:
 *   node backfill-recent-packages.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const ORG_ID = 'skedence_gym';
const USER_ID = 'mike_parent';

async function run() {
  // 1. Load pricing structure
  const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
  if (!orgDoc.exists) {
    console.error(`❌ Organization '${ORG_ID}' not found.`);
    process.exit(1);
  }

  const orgData = orgDoc.data();
  const tiers = orgData?.pricingStructure?.tiers ?? [];

  if (tiers.length === 0) {
    console.error('❌ No pricing structure tiers found.');
    process.exit(1);
  }

  console.log(`✅ Loaded ${tiers.length} pricing tier(s):`);
  tiers.forEach(t => {
    const types = (t.packages || []).map(p => p.packageType).join(', ');
    console.log(`   • ${t.tierName} (${t.id}) → [${types}]`);
  });

  // 2. Fetch the 2 most recently purchased packages (any missing tier info)
  const packagesRef = db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('users')
    .doc(USER_ID)
    .collection('packages');

  const snap = await packagesRef
    .orderBy('purchaseDate', 'desc')
    .limit(2)
    .get();

  if (snap.empty) {
    console.error('❌ No packages found.');
    process.exit(1);
  }

  console.log(`\n📦 Found ${snap.docs.length} most recent package(s) to process:\n`);

  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`─── ${doc.id} ───`);
    console.log(`   packageType:     ${data.packageType}`);
    console.log(`   packageName:     ${data.packageName ?? '(none)'}`);
    console.log(`   transactionId:   ${data.transactionId ?? '(none)'}`);
    console.log(`   pricingTierId:   ${data.pricingTierId ?? '(missing)'}`);
    console.log(`   pricingTierName: ${data.pricingTierName ?? '(missing)'}`);

    // Skip if already has both tier fields
    if (data.pricingTierId && data.pricingTierName) {
      console.log(`   ⏭️  Already has tier info — skipping.\n`);
      skipped++;
      continue;
    }

    // Resolve tier from pricing structure
    let tierId = null;
    let tierName = null;

    for (const tier of tiers) {
      const match = (tier.packages || []).find(
        p => p.packageType === data.packageType
      );
      if (match) {
        tierId = tier.id;
        tierName = tier.tierName;
        break;
      }
    }

    if (!tierId) {
      console.warn(`   ⚠️  packageType '${data.packageType}' not found in any tier — skipping.\n`);
      skipped++;
      continue;
    }

    console.log(`   🎯 Resolved tier: '${tierName}' (${tierId})`);

    // Also fill packageName if missing
    const updates = {
      pricingTierId: tierId,
      pricingTierName: tierName,
    };

    // Backfill packageName from pricing structure if missing
    if (!data.packageName) {
      for (const tier of tiers) {
        const pkg = (tier.packages || []).find(p => p.packageType === data.packageType);
        if (pkg?.title) {
          updates.packageName = pkg.title;
          console.log(`   📝 Also backfilling packageName: '${pkg.title}'`);
          break;
        }
      }
    }

    await doc.ref.update(updates);
    console.log(`   ✅ Updated!\n`);
    updated++;
  }

  console.log(`\n🏁 Done. Updated: ${updated}, Skipped: ${skipped}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
