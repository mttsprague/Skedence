const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function update() {
  await db.collection('organizations').doc('0Mtow1OaV7oUlCisKSNy').update({
    'billing.subscriptionId': 'sub_1SnQkm2XPese4Q6Cm9fQzcHx',
    'billing.status': 'trialing',
    'billing.plan': 'starter'
  });
  console.log('✅ Updated');
  process.exit(0);
}
update().catch(e => { console.error(e); process.exit(1); });
