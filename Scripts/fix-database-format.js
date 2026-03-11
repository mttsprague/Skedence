/**
 * Fix Database - Restore Correct orgMembers Format
 */

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  console.log('🔧 Fixing database...\n');
  
  // Delete the wrong format
  console.log('❌ Deleting wrong format: oRw1vNd8KURFGHm88lKEKTWR9Nt1_skedence_gym');
  await db.collection('orgMembers').doc('oRw1vNd8KURFGHm88lKEKTWR9Nt1_skedence_gym').delete();
  console.log('✅ Deleted\n');
  
  // Restore the correct format with authUserId
  console.log('✅ Restoring correct format: mattsprague_skedence_gym');
  await db.collection('orgMembers').doc('mattsprague_skedence_gym').set({
    userId: 'mattsprague',
    authUserId: 'oRw1vNd8KURFGHm88lKEKTWR9Nt1',
    orgId: 'skedence_gym',
    role: 'owner',
    isActive: true,
    joinedAt: admin.firestore.Timestamp.now()
  });
  console.log('✅ Restored with authUserId field\n');
  
  // Verify
  const doc = await db.collection('orgMembers').doc('mattsprague_skedence_gym').get();
  console.log('📊 Verification:');
  console.log(JSON.stringify(doc.data(), null, 2));
  console.log('\n✅ Database fixed!');
  
  process.exit(0);
})().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
