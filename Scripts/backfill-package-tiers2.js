/**
 * Backfill pricingTierId / pricingTierName on user packages that are missing the field.
 * Uses collectionGroup('packages') to find all packages regardless of whether the
 * parent user document exists.
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

const DRY_RUN = false; // set to false to actually write

async function main() {
  // 1. Load org
  const orgSnap = await db.collection('organizations').get();
  const org = orgSnap.docs.find(d => (d.data().name || '').toLowerCase().includes('polyface')) || orgSnap.docs[0];
  const orgId = org.id;
  const orgData = org.data();
  console.log('Org:', orgId, '–', orgData.name);

  // 2. Build packageType → tier map from pricing structure
  const tierMap = new Map(); // packageType → { tierId, tierName }
  const tiers = (orgData.pricingStructure && orgData.pricingStructure.tiers) || [];
  tiers.forEach(tier => {
    (tier.packages || []).forEach(pkg => {
      if (pkg.packageType) {
        tierMap.set(pkg.packageType, { tierId: String(tier.id), tierName: tier.tierName });
      }
    });
  });

  console.log('\nTier map:');
  tierMap.forEach((v, k) => console.log(`  "${k}" → ${v.tierName} (${v.tierId})`));

  // 3. Find all packages via collectionGroup, filtered by orgId
  const allPkgsSnap = await db.collectionGroup('packages').where('orgId', '==', orgId).get();
  console.log(`\nTotal packages found in org: ${allPkgsSnap.size}`);

  let scanned = 0;
  let updated = 0;
  let skippedAlreadyHasTier = 0;
  let skippedClassPass = 0;
  let skippedUnknownType = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const pkgDoc of allPkgsSnap.docs) {
    scanned++;
    const d = pkgDoc.data();

    // Only touch packages in the standard path: organizations/{orgId}/users/{userId}/packages/{pkgId}
    const pathParts = pkgDoc.ref.path.split('/');
    if (pathParts[0] !== 'organizations' || pathParts[2] !== 'users' || pathParts[4] !== 'packages') {
      continue;
    }

    const userId = pathParts[3];
    const packageType = d.packageType;
    const existingTierId = d.pricingTierId;

    // Skip if already has a tier
    if (existingTierId && String(existingTierId).trim() !== '') {
      skippedAlreadyHasTier++;
      continue;
    }

    // Skip class passes
    const cat = d.packageCategory || '';
    if (cat === 'classPass' || cat === 'class' || packageType === 'class_pass' || packageType === 'class') {
      skippedClassPass++;
      continue;
    }

    const tierInfo = tierMap.get(packageType);
    if (!tierInfo) {
      console.log(`  SKIP unknown type  user=${userId} pkg=${pkgDoc.id} type="${packageType}"`);
      skippedUnknownType++;
      continue;
    }

    // Skip the generic "Classes" tier — those are class-only
    if (String(tierInfo.tierId) === '1') {
      skippedClassPass++;
      continue;
    }

    console.log(`  ${DRY_RUN ? '[DRY]' : 'UPDATE'} user=${userId} pkg=${pkgDoc.id} type="${packageType}" → ${tierInfo.tierName} (${tierInfo.tierId})`);

    if (!DRY_RUN) {
      batch.update(pkgDoc.ref, {
        pricingTierId: tierInfo.tierId,
        pricingTierName: tierInfo.tierName,
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    updated++;
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n── Summary ─────────────────────────────────`);
  console.log(`Scanned:              ${scanned}`);
  console.log(`Already had tier:     ${skippedAlreadyHasTier}`);
  console.log(`Class passes skipped: ${skippedClassPass}`);
  console.log(`Unknown type skipped: ${skippedUnknownType}`);
  console.log(`${DRY_RUN ? 'Would update' : 'Updated'}:           ${updated}`);
  if (DRY_RUN) console.log('\n→ Re-run with DRY_RUN = false to apply changes.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
