const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixClassPassCategories() {
  const orgId = 'aLxHq5mFam5ohsLM1okb';
  
  console.log('\n=== Fixing Class Pass Categories ===\n');
  
  // Get all users in the org
  const members = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('role', '==', 'client')
    .get();
  
  let totalFixed = 0;
  
  for (const memberDoc of members.docs) {
    const userId = memberDoc.data().userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    
    // Check NEW path
    const newPackagesRef = db.collection('organizations').doc(orgId)
      .collection('users').doc(userId)
      .collection('packages');
    const newPackages = await newPackagesRef.get();
    
    for (const doc of newPackages.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const updates = {};
      
      // Fix packages where packageType is "class" (should be descriptive like "class_pass")
      // and packageCategory is "pass" (should be "class")
      if (data.packageType === 'class' && data.packageCategory === 'pass') {
        console.log(`\n📦 ${userName}: Found mismatched package ${doc.id}`);
        console.log(`   Current: type=${data.packageType}, category=${data.packageCategory}`);
        
        // Update to correct values
        updates.packageType = 'class_pass';
        updates.packageCategory = 'class';
        updates.packageName = data.packageName || 'Class Pass';
        
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await newPackagesRef.doc(doc.id).update(updates);
        console.log(`   ✅ Fixed: type=${updates.packageType}, category=${updates.packageCategory}`);
        totalFixed++;
      }
    }
    
    // Also check and fix OLD path
    const oldPackagesRef = db.collection('users').doc(userId).collection('lessonPackages');
    const oldPackages = await oldPackagesRef.get();
    
    for (const doc of oldPackages.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const updates = {};
      
      if (data.packageType === 'class' && data.packageCategory === 'pass') {
        console.log(`\n📦 ${userName} (OLD path): Found mismatched package ${doc.id}`);
        console.log(`   Current: type=${data.packageType}, category=${data.packageCategory}`);
        
        updates.packageType = 'class_pass';
        updates.packageCategory = 'class';
        updates.packageName = data.packageName || 'Class Pass';
        
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await oldPackagesRef.doc(doc.id).update(updates);
        console.log(`   ✅ Fixed: type=${updates.packageType}, category=${updates.packageCategory}`);
        totalFixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${totalFixed} packages\n`);
  process.exit(0);
}

fixClassPassCategories().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
