/**
 * Backfill pricingTierId / pricingTierName on user packages that are missing the field.
 *
 * Strategy: load the org's pricingStructure, build a map of packageType → tier,
 * then iterate every user's packages collection and update docs that are missing
 * or have an empty pricingTierId but whose packageType maps to a known tier.
 *
 * DRY RUN by default — set DRY_RUN = false to actually write.
 */

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

const DRY_RUN = false; // set to false to actually write

async function main() {
  // ── 1. Load org ──────────────────────────────────────────────────────────
  const orgSnap = await db.collection('organizations').get();
  const org = orgSnap.docs.find(d => (d.data().name || '').toLowerCase().includes('polyface')) || orgSnap.docs[0];
  const orgId = org.id;
  const orgData = org.data();
  console.log('Org:', orgId, '–', orgData.name);

  // ── 2. Build packageType → tier map ──────────────────────────────────────
  const tierMap = new Map(); // packageType → { tierId, tierName }
  const tiers = (orgData.pricingStructure && orgData.pricingStructure.tiers) || [];
  tiers.forEach(tier => {
    (tier.packages || []).forEach(pkg => {
      if (pkg.packageType) {
        tierMap.set(pkg.packageType, { tierId: String(tier.id), tierName: tier.tierName });
      }
    });
  });

  console.log('\nTier map built:');
  tierMap.forEach((v, k) => console.log(`  "${k}" → ${v.tierName} (${v.tierId})`));

  // ── 3. Collect all users that have packages via a collection group query ──
  // (The parent user doc may not exist, but subcollection docs will appear)
  let usersProcessed = 0;
  let packagesScanned = 0;
  let packagesUpdated = 0;

  // Use collectionGroup to find all package docs under this org
  const allPkgsSnap = await db
    .collectionGroup('packages')
    .where('orgId', '==', orgId)
    .get();

  console.log(`\nFound ${allPkgsSnap.size} total packages in org`);

  for (const pkgDoc of allPkgsSnap.docs) {
        const d = pkgDoc.data();
        const packageType = d.packageType;
        const existingTierId = d.pricingTierId;

        // Skip if already has a tier assigned
        if (existingTierId && String(existingTierId).trim() !== '') continue;

        // Skip class passes — they're not tier-specific
        const cat = d.packageCategory || '';
        if (cat === 'classPass' || cat === 'class') continue;
        if (packageType === 'class_pass' || packageType === 'class') continue;

        const tierInfo = tierMap.get(packageType);
        if (!tierInfo) {
          console.log(`  SKIP  ${userDoc.id}/${pkgDoc.id} — packageType "${packageType}" not in pricing structure`);
          continue;
        }

        console.log(
          `  ${DRY_RUN ? '[DRY]' : 'UPDATE'} ${userDoc.id}/${pkgDoc.id} | type="${packageType}" → tier="${tierInfo.tierName}" (${tierInfo.tierId})`
        );

        if (!DRY_RUN) {
          await pkgDoc.ref.update({
            pricingTierId: tierInfo.tierId,
            pricingTierName: tierInfo.tierName,
          });
        }
        packagesUpdated++;
      }
    }

    if (usersSnap.size < PAGE_SIZE) break;
  }

  console.log(`\nDone. Users scanned: ${usersProcessed} | Packages scanned: ${packagesScanned} | Packages ${DRY_RUN ? 'would update' : 'updated'}: ${packagesUpdated}`);
  if (DRY_RUN) console.log('→ Re-run with DRY_RUN = false to apply changes.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
