const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('bookings')
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get();

  console.log('Recent bookings with athlete info:');
  snap.docs.forEach(doc => {
    const d = doc.data();
    const created = d.createdAt ? d.createdAt.toDate().toISOString() : 'unknown';
    console.log(`\nID: ${doc.id}`);
    console.log(`  created: ${created}`);
    console.log(`  keys: ${Object.keys(d).join(', ')}`);
    console.log(`  athleteName: ${d.athleteName || '(none)'}`);
    console.log(`  secondAthleteName: ${d.secondAthleteName || '(none)'}`);
    console.log(`  athleteNames: ${JSON.stringify(d.athleteNames) || '(none)'}`);
    console.log(`  status: ${d.status}`);
  });
})().catch(console.error).finally(() => process.exit());
