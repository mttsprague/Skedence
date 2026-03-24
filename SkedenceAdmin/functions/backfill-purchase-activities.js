/**
 * Backfill activity log entries for all packages in organizations/{orgId}/users/{userId}/packages
 * that don't already have a matching 'pass_purchased' activity.
 *
 * Usage:
 *   node backfill-purchase-activities.js
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
  // 1. Load org pricing structure for name/tier resolution
  const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
  if (!orgDoc.exists) { console.error('❌ Org not found'); process.exit(1); }
  const orgData = orgDoc.data();
  const tiers = orgData?.pricingStructure?.tiers ?? [];

  function resolvePackageInfo(packageType) {
    for (const tier of tiers) {
      const pkg = (tier.packages || []).find(p => p.packageType === packageType);
      if (pkg) return { packageName: pkg.title, tierId: tier.id, tierName: tier.tierName };
    }
    return { packageName: packageType.replace(/_/g, ' '), tierId: null, tierName: null };
  }

  // 2. Load user info for actor name
  const userDoc = await db.collection('organizations').doc(ORG_ID).collection('users').doc(USER_ID).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  const clientName = (userData.firstName && userData.lastName)
    ? `${userData.firstName} ${userData.lastName}`
    : (userData.email || USER_ID);

  // 3. Load all packages for user
  const packagesSnap = await db
    .collection('organizations').doc(ORG_ID)
    .collection('users').doc(USER_ID)
    .collection('packages')
    .orderBy('purchaseDate', 'desc')
    .get();

  console.log(`📦 Found ${packagesSnap.docs.length} packages for ${clientName}\n`);

  // 4. Load existing activities to avoid duplicates (by transactionId)
  const existingActivitiesSnap = await db.collection('activities')
    .where('orgId', '==', ORG_ID)
    .where('type', '==', 'pass_purchased')
    .get();

  const existingTransactionIds = new Set(
    existingActivitiesSnap.docs
      .map(d => d.data()?.metadata?.transactionId)
      .filter(Boolean)
  );

  console.log(`📋 ${existingTransactionIds.size} existing pass_purchased activities found\n`);

  let created = 0;
  let skipped = 0;

  for (const doc of packagesSnap.docs) {
    const data = doc.data();
    const transactionId = data.transactionId;

    if (transactionId && existingTransactionIds.has(transactionId)) {
      console.log(`⏭️  Skipping ${doc.id} — activity already exists (${transactionId})`);
      skipped++;
      continue;
    }

    const { packageName, tierId, tierName } = resolvePackageInfo(data.packageType);
    const totalLessons = data.totalLessons || 1;
    const amountPaid = data.amountPaid || 0;
    const purchaseDate = data.purchaseDate || admin.firestore.Timestamp.now();

    await db.collection('activities').add({
      type: 'pass_purchased',
      actorId: USER_ID,
      actorName: clientName,
      actorRole: 'client',
      targetId: transactionId || doc.id,
      targetName: packageName,
      targetType: 'pass',
      description: `${clientName} purchased ${packageName} (${totalLessons} sessions) for $${(amountPaid / 100).toFixed(2)}`,
      metadata: {
        passType: data.packageType,
        sessionsCount: totalLessons,
        amountPaid: amountPaid,
        transactionId: transactionId || doc.id,
        pricingTierId: data.pricingTierId || tierId || null,
        pricingTierName: data.pricingTierName || tierName || null,
      },
      orgId: ORG_ID,
      timestamp: purchaseDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Created activity for ${packageName} (${transactionId || doc.id})`);
    created++;
  }

  console.log(`\n🏁 Done. Created: ${created}, Skipped: ${skipped}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
