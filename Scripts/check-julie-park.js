const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  // Find Julie Park
  const users = await db.collection('users')
    .where('firstName', '==', 'Julie')
    .where('lastName', '==', 'Park')
    .get();
  console.log('\nJulie Park docs:', users.size);
  users.forEach(d => {
    console.log('\nDoc ID:', d.id);
    console.log(JSON.stringify(d.data(), null, 2));
  });

  // Get intake form config for polyface org
  const orgId = '0Mtow1OaV7oUlCisKSNy';
  const intakeSnap = await db.collection('organizations').doc(orgId).collection('settings').doc('intakeForms').get();
  console.log('\n--- Intake Form Config ---');
  if (intakeSnap.exists) {
    console.log(JSON.stringify(intakeSnap.data(), null, 2));
  } else {
    console.log('No intakeForms settings doc');
    // Try other possible locations
    const settingsSnap = await db.collection('organizations').doc(orgId).collection('settings').get();
    console.log('Available settings docs:', settingsSnap.docs.map(d => d.id));
  }

  // Check for any booking with Julie Park to see what lesson details contain
  if (!users.empty) {
    const julieId = users.docs[0].id;
    const bookings = await db.collection('bookings')
      .where('clientId', '==', julieId)
      .orderBy('startTime', 'desc')
      .limit(3)
      .get();
    console.log('\n--- Recent bookings for', julieId, '---');
    bookings.forEach(d => {
      const data = d.data();
      console.log('\nBooking:', d.id);
      // Show athlete/team related fields
      const relevant = {
        athleteName: data.athleteName,
        athletes: data.athletes,
        team: data.team,
        school: data.school,
        notesForCoach: data.notesForCoach,
        status: data.status,
        startTime: data.startTime?.toDate?.()
      };
      console.log(JSON.stringify(relevant, null, 2));
    });
  }
}
run().catch(console.error);
