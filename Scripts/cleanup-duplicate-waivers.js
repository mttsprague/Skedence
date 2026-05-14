/**
 * cleanup-duplicate-waivers.js
 * 
 * Finds and deletes duplicate waiver documents from Firestore.
 * A "duplicate" is any waiver for the same athlete/userId where more than one
 * waiver document exists — all but the most recent are deleted.
 * 
 * Usage:
 *   DRY RUN (safe, no deletes):  node cleanup-duplicate-waivers.js
 *   LIVE DELETE:                  node cleanup-duplicate-waivers.js --delete
 */

const admin = require('firebase-admin');
const serviceAccount = require('../SkedenceAdmin/functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const DRY_RUN = !process.argv.includes('--delete');

async function run() {
  console.log(`\n=== Waiver Duplicate Cleanup (${DRY_RUN ? 'DRY RUN' : '🔴 LIVE DELETE'}) ===\n`);

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users\n`);

  let totalDuplicates = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;

    let docsSnap;
    try {
      docsSnap = await db.collection('users').doc(userId).collection('documents').get();
    } catch (err) {
      console.error(`  ERROR fetching documents for user ${userId}:`, err.message);
      totalErrors++;
      continue;
    }

    // Filter to waiver docs only
    const waivers = docsSnap.docs.filter(d => d.data().type === 'waiver');
    if (waivers.length <= 1) continue;

    // Group by athlete name (normalised). Use athleteName field, fallback to signedBy.
    const byAthlete = {};
    for (const w of waivers) {
      const data = w.data();
      const rawName =
        data.athleteName ??
        data.signedBy ??
        '__unknown__';
      const key = String(rawName).toLowerCase().trim();
      if (!byAthlete[key]) byAthlete[key] = [];
      byAthlete[key].push(w);
    }

    for (const [athleteKey, docs] of Object.entries(byAthlete)) {
      if (docs.length <= 1) continue;

      // Sort: newest first. Use signedAt timestamp if present, else doc creation time.
      docs.sort((a, b) => {
        const timeOf = (d) => {
          const data = d.data();
          if (data.signedAt?.toMillis) return data.signedAt.toMillis();
          if (data.uploadedAt?.toMillis) return data.uploadedAt.toMillis();
          if (data.createdAt?.toMillis) return data.createdAt.toMillis();
          return 0;
        };
        return timeOf(b) - timeOf(a); // descending
      });

      const [keep, ...duplicates] = docs;

      console.log(`  User ${userId} | athlete "${athleteKey}" | keeping ${keep.id}, removing ${duplicates.length} duplicate(s):`);
      duplicates.forEach(d => {
        const ts = d.data().signedAt?.toDate?.()?.toISOString() ?? 'no-timestamp';
        console.log(`    DELETE ${d.id}  (signedAt: ${ts})`);
      });

      totalDuplicates += duplicates.length;

      if (!DRY_RUN) {
        for (const dup of duplicates) {
          try {
            await db
              .collection('users')
              .doc(userId)
              .collection('documents')
              .doc(dup.id)
              .delete();
            totalDeleted++;
          } catch (err) {
            console.error(`    ERROR deleting ${dup.id}:`, err.message);
            totalErrors++;
          }
        }
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Duplicate docs found:  ${totalDuplicates}`);
  if (!DRY_RUN) {
    console.log(`Docs deleted:          ${totalDeleted}`);
    console.log(`Errors:                ${totalErrors}`);
  } else {
    console.log('No deletions performed (dry run). Re-run with --delete to apply.');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
