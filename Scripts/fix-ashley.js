const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  console.log('=== Fixing Ashley Schexnaildre account ===\n');

  // 1. Delete junk user doc (Auth UID used as doc ID - has no authUserId field, no orgId)
  const junkDoc = db.collection('users').doc('eDXR8puqKIhX2AeaVV04XqAJGKk1');
  const junkSnap = await junkDoc.get();
  if (junkSnap.exists && !junkSnap.data().authUserId && !junkSnap.data().orgId) {
    await junkDoc.delete();
    console.log('✅ Deleted junk user doc: users/eDXR8puqKIhX2AeaVV04XqAJGKk1');
  } else {
    console.log('⚠️  Skipped users/eDXR8puqKIhX2AeaVV04XqAJGKk1 — unexpected state, review manually');
    if (junkSnap.exists) console.log('   Data:', JSON.stringify(junkSnap.data()));
  }

  // 2. Delete old orphaned orgMember (old deleted auth account)
  const oldMember = db.collection('orgMembers').doc('A0E3d6lNpxS21HPWrGiCQ76P7E62_polyface_volleyball_academy_');
  const oldSnap = await oldMember.get();
  if (oldSnap.exists) {
    await oldMember.delete();
    console.log('✅ Deleted old orphaned orgMember: A0E3d6lNpxS21HPWrGiCQ76P7E62_polyface_volleyball_academy_');
  } else {
    console.log('ℹ️  Old orgMember already gone');
  }

  // 3. Verify the good records are intact
  console.log('\n--- Verifying good records ---');
  const userDoc = await db.collection('users').doc('ashley_schexnaildre').get();
  console.log('users/ashley_schexnaildre exists:', userDoc.exists);
  if (userDoc.exists) {
    const d = userDoc.data();
    console.log('  authUserId:', d.authUserId);
    console.log('  email:', d.email || d.emailAddress);
    console.log('  orgId:', d.orgId);
  }

  const goodMember = await db.collection('orgMembers').doc('eDXR8puqKIhX2AeaVV04XqAJGKk1_polyface_volleyball_academy_').get();
  console.log('orgMembers/eDXR8puqKIhX2AeaVV04XqAJGKk1_polyface_volleyball_academy_ exists:', goodMember.exists);
  if (goodMember.exists) {
    const d = goodMember.data();
    console.log('  userId:', d.userId, '| isActive:', d.isActive, '| role:', d.role);
  }

  console.log('\n=== Done ===');
  console.log('\nNEXT STEPS:');
  console.log('1. Go to Admin Portal → Passes page → find Ashley Schexnaildre');
  console.log('2. Add her lesson passes manually');
  console.log('3. Have her force-close and reopen the Skedence app to refresh pricing display');
}

run().catch(console.error);
