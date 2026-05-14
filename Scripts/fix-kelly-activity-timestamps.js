// fix-kelly-activity-timestamps.js
// Patch Kelly's backfilled activity docs to use the original registeredAt
// timestamps from classRegistrations (so they appear at the right time in feed)
// Run: node Scripts/fix-kelly-activity-timestamps.js

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function main() {
  // Find Kelly's class_registered activities
  const snap = await db.collection('activities')
    .where('actorId', '==', 'kelly_hailey')
    .where('type', '==', 'class_registered')
    .get();

  console.log(`Found ${snap.size} class_registered activities for kelly_hailey`);

  // Get original registeredAt timestamps from classRegistrations
  const classRegSnap = await db.collection('classRegistrations')
    .where('clientId', '==', 'kelly_hailey').get();

  const classTimestamps = {};
  for (const d of classRegSnap.docs) {
    const data = d.data();
    classTimestamps[data.classId] = data.registeredAt;
  }

  console.log('Original registration timestamps:');
  for (const [classId, ts] of Object.entries(classTimestamps)) {
    console.log(`  ${classId}: ${ts.toDate().toLocaleString()}`);
  }

  // Update each activity doc
  for (const activityDoc of snap.docs) {
    const data = activityDoc.data();
    const classId = data.targetId || data.metadata?.classId;
    const originalTs = classTimestamps[classId];

    if (!originalTs) {
      console.log(`\n⚠️  No original timestamp for classId "${classId}" — skipping ${activityDoc.id}`);
      continue;
    }

    const currentTs = data.timestamp ? data.timestamp.toDate().toLocaleString() : '(none)';
    console.log(`\nActivity ${activityDoc.id}:`);
    console.log(`  classId: ${classId}`);
    console.log(`  current timestamp: ${currentTs}`);
    console.log(`  -> patching to: ${originalTs.toDate().toLocaleString()}`);

    await activityDoc.ref.update({ timestamp: originalTs });
    console.log(`  ✅ Updated`);
  }

  console.log('\nDone! Kelly\'s activities now show at the original registration time.');
}

main().catch(console.error).finally(() => process.exit());
