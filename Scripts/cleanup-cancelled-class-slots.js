/**
 * One-time cleanup: delete trainer schedule slots whose classId references
 * a class document that no longer exists. These are orphaned slots left behind
 * by the old class deletion code that didn't clean up schedule subcollections.
 */
const admin = require('firebase-admin');
const serviceAccount = require('../SkedenceAdmin/functions/serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function cleanup() {
  console.log('Finding all trainers...');
  const trainersSnap = await db.collection('trainers').get();
  console.log(`Found ${trainersSnap.size} trainers`);

  let total = 0, deleted = 0;

  for (const trainerDoc of trainersSnap.docs) {
    const schedulesSnap = await db
      .collection('trainers').doc(trainerDoc.id)
      .collection('schedules')
      .where('isClassBooking', '==', true)
      .get();

    for (const slotDoc of schedulesSnap.docs) {
      total++;
      const classId = slotDoc.data().classId;
      if (!classId) continue;

      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.log(`  Deleting orphaned slot ${slotDoc.id} (classId: ${classId}) from trainer ${trainerDoc.id}`);
        await slotDoc.ref.delete();
        deleted++;
      }
    }
  }

  console.log(`Done. Checked ${total} class slots, deleted ${deleted} orphaned slots.`);
  process.exit(0);
}

cleanup().catch(e => { console.error(e); process.exit(1); });
