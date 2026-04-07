const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function run() {
  for (const orgId of ['0Mtow1OaV7oUlCisKSNy', 'polyface_volleyball_academy_']) {
    const snap = await db.collection('organizations').doc(orgId).get();
    if (!snap.exists) { console.log('No doc for', orgId); continue; }
    const d = snap.data();
    console.log('\nOrg:', orgId);
    console.log('intakeFormFieldsPrivate:', JSON.stringify(d.intakeFormFieldsPrivate, null, 2));
    console.log('intakeFormFields:', JSON.stringify(d.intakeFormFields, null, 2));
  }
}
run().catch(console.error);
