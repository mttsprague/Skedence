const admin = require('../SkedenceAdmin/functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  const serviceAccount = require('../SkedenceAdmin/admin-panel/polyface-ae6d3-firebase-adminsdk-fbsvc-c1359274d9.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();
const ORG_ID = 'polyface_volleyball_academy_';

async function run() {
  // --- Client list diagnosis ---
  const [members, u1, u2, u3] = await Promise.all([
    db.collection('orgMembers').where('orgId','==',ORG_ID).where('role','==','client').get(),
    db.collection('users').where('orgId','==',ORG_ID).get(),
    db.collection('users').where('organizationId','==',ORG_ID).get(),
    db.collection('users').where('orgId','==',ORG_ID).where('role','==','client').get(),
  ]);
  console.log('=== Client List Diagnosis ===');
  console.log('orgMembers with role=client:', members.size);
  console.log('users with orgId (any role):', u1.size, '| roles:', [...new Set(u1.docs.map(d => d.data().role))]);
  console.log('users with organizationId (any role):', u2.size);
  console.log('users with orgId + role=client:', u3.size);
  console.log('\nAll users (orgId), id + name + role:');
  u1.docs.forEach(d => {
    const data = d.data();
    console.log(' ', d.id, `| ${data.firstName} ${data.lastName} | role:${data.role} | orgId:${data.orgId} | organizationId:${data.organizationId}`);
  });

  // --- Josephine Hargis participant doc ---
  console.log('\n=== Saturday Class Participants ===');
  const classes = await db.collection('classes').where('orgId','==',ORG_ID).get();
  for (const cls of classes.docs) {
    const d = cls.data();
    const start = d.startTime && d.startTime.toDate ? d.startTime.toDate() : null;
    if (start && start >= new Date('2026-05-10') && start <= new Date('2026-05-18')) {
      console.log('\nClass:', cls.id, '|', d.title || d.name || d.className, '|', start && start.toDateString());
      const parts = await db.collection('classes').doc(cls.id).collection('participants').get();
      parts.docs.forEach(p => {
        const pd = p.data();
        console.log('  Participant:', p.id, JSON.stringify(pd));
      });
    }
  }
}
run().catch(console.error);
