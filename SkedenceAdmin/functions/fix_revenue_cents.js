const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();
const ORG_ID = 'skedence_gym';

async function fixRevenueCents() {
  console.log('💰 Fix Revenue Cents - Multiply by 100');
  console.log('═'.repeat(80));
  console.log('Organization:', ORG_ID);
  console.log('Looking for paid packages with amountPaid < 10 (dollars instead of cents)');
  console.log('═'.repeat(80));
  console.log();

  try {
    const membersSnap = await db.collection('orgMembers')
      .where('orgId', '==', ORG_ID)
      .get();
    
    const userIds = membersSnap.docs.map(doc => doc.data().userId);
    console.log(`📋 Checking ${userIds.length} members\n`);

    const packagesToFix = [];

    for (const userId of userIds) {
      // Check new path
      const newPathSnap = await db.collection('organizations')
        .doc(ORG_ID)
        .collection('users')
        .doc(userId)
        .collection('packages')
        .get();

      for (const doc of newPathSnap.docs) {
        const data = doc.data();
        const amountPaid = data.amountPaid || 0;
        
        // If amountPaid is less than 10, it's probably in dollars not cents
        if (amountPaid > 0 && amountPaid < 10) {
          // Get user name
          let userName = 'Unknown';
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            }
          } catch (err) {}

          packagesToFix.push({
            userId,
            userName,
            docId: doc.id,
            packageName: data.packageName || data.packageType || 'Unknown',
            currentAmount: amountPaid,
            newAmount: amountPaid * 100,
            purchaseDate: data.purchaseDate?.toDate?.() || 'N/A'
          });
        }
      }
    }

    if (packagesToFix.length === 0) {
      console.log('✅ No packages need fixing!');
      process.exit(0);
    }

    console.log(`📝 Found ${packagesToFix.length} packages to fix:\n`);
    packagesToFix.forEach((pkg, i) => {
      console.log(`${i + 1}. ${pkg.userName} - ${pkg.packageName}`);
      console.log(`   Current: ${pkg.currentAmount} → New: ${pkg.newAmount} (×100)`);
      console.log(`   Purchase Date: ${pkg.purchaseDate}`);
      console.log();
    });

    const totalBefore = packagesToFix.reduce((sum, p) => sum + p.currentAmount, 0);
    const totalAfter = packagesToFix.reduce((sum, p) => sum + p.newAmount, 0);
    console.log('💰 REVENUE FIX:');
    console.log(`   Before: $${(totalBefore).toFixed(2)} (wrong - stored as dollars)`);
    console.log(`   After:  $${(totalAfter / 100).toFixed(2)} (correct - stored as cents)`);
    console.log();

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Update these packages? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log('\n🔄 Updating packages...\n');
        
        let updated = 0;
        for (const pkg of packagesToFix) {
          try {
            const docRef = db.collection('organizations')
              .doc(ORG_ID)
              .collection('users')
              .doc(pkg.userId)
              .collection('packages')
              .doc(pkg.docId);

            await docRef.update({
              amountPaid: pkg.newAmount
            });
            
            console.log(`✅ Updated ${pkg.userName} - ${pkg.packageName}: ${pkg.currentAmount} → ${pkg.newAmount}`);
            updated++;
          } catch (error) {
            console.error(`❌ Failed to update ${pkg.userName}:`, error.message);
          }
        }

        console.log(`\n✅ Update complete! ${updated}/${packagesToFix.length} packages updated.`);
        console.log(`💰 Total revenue now: $${(totalAfter / 100).toFixed(2)}`);
      } else {
        console.log('❌ Update cancelled.');
      }
      
      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixRevenueCents();
