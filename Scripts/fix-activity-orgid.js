// fix-activity-orgid.js
// Finds all activity documents with null/missing orgId and fills in the correct orgId
// by looking up the actorId in the users collection (checks orgId + legacy organizationId).
// Run with: node Scripts/fix-activity-orgid.js

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  console.log('\n🔍 Fetching activities with null/missing orgId...\n');

  // Query for orgId == null — also catches missing field via JS filter below
  const snap = await db.collection('activities').where('orgId', '==', null).get();
  console.log(`Found ${snap.size} activity documents with orgId: null`);

  if (snap.size === 0) {
    console.log('✅ Nothing to fix.\n');
    process.exit(0);
  }

  // Build a cache of userId -> resolved orgId so we don't re-fetch the same user
  const orgIdCache = {};

  async function resolveOrgId(actorId) {
    if (!actorId) return null;
    if (orgIdCache[actorId] !== undefined) return orgIdCache[actorId];

    try {
      const userSnap = await db.collection('users').doc(actorId).get();
      if (userSnap.exists) {
        const d = userSnap.data();
        const resolved = d.orgId || d.organizationId || null;
        orgIdCache[actorId] = resolved;
        return resolved;
      }
    } catch (e) {
      console.warn(`  ⚠️  Could not fetch user ${actorId}:`, e.message);
    }
    orgIdCache[actorId] = null;
    return null;
  }

  const toFix = [];
  const unfixable = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const actorId = data.actorId;
    const resolvedOrgId = await resolveOrgId(actorId);

    if (resolvedOrgId) {
      toFix.push({ id: doc.id, actorId, type: data.type, description: data.description, resolvedOrgId });
    } else {
      unfixable.push({ id: doc.id, actorId, type: data.type });
    }
  }

  console.log(`\n✅ Can fix: ${toFix.length}`);
  console.log(`❌ No orgId found for actor: ${unfixable.length}`);

  if (unfixable.length > 0) {
    console.log('\nUnfixable (will be skipped):');
    unfixable.forEach(a => console.log(`  - ${a.id}  actor=${a.actorId}  type=${a.type}`));
  }

  if (toFix.length === 0) {
    console.log('\nNothing to update.\n');
    process.exit(0);
  }

  console.log('\nActivities to fix:');
  toFix.forEach(a => console.log(`  - ${a.id}  type=${a.type}  orgId → ${a.resolvedOrgId}`));

  // Commit in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500;
  let updated = 0;
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toFix.slice(i, i + BATCH_SIZE);
    for (const item of chunk) {
      batch.update(db.collection('activities').doc(item.id), { orgId: item.resolvedOrgId });
    }
    await batch.commit();
    updated += chunk.length;
    console.log(`\n💾 Updated ${updated}/${toFix.length} activity documents`);
  }

  console.log(`\n✅ Done! ${updated} activities now have the correct orgId.\n`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
