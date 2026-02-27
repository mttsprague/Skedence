const admin = require('firebase-admin');

// Initialize with default credentials
admin.initializeApp({
  projectId: 'polyface-ae6d3'
});

const db = admin.firestore();

// Organization ID - Use the actual ID from your Firebase console
// To find your org ID, run: node list_orgs.js
const ORG_ID = 'skedence_gym'; // Skedence Gym

// All other purchases were $1.00 = 100 cents
const DEFAULT_PAID_AMOUNT = 100;

async function backfillRevenue() {
  console.log('💰 Revenue Backfill Script');
  console.log('═'.repeat(80));
  console.log('Organization:', ORG_ID);
  console.log('Default amount for paid packages: $' + (DEFAULT_PAID_AMOUNT / 100).toFixed(2));
  console.log('═'.repeat(80));
  console.log();

  try {
    // Get all members
    const membersSnap = await db.collection('orgMembers')
      .where('orgId', '==', ORG_ID)
      .get();
    
    const userIds = membersSnap.docs.map(doc => doc.data().userId);
    console.log(`📋 Found ${userIds.length} members to check\n`);

    const packagesToUpdate = [];
    let totalPackages = 0;
    let packagesWithAmountPaid = 0;

    // Check each user's packages
    for (const userId of userIds) {
      // Get user info
      let userName = 'Unknown';
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
      } catch (err) {
        // Silent fail
      }

      // Try new path first
      let packagesSnap = await db.collection('organizations')
        .doc(ORG_ID)
        .collection('users')
        .doc(userId)
        .collection('packages')
        .get();
      
      let usingNewPath = true;
      
      // Fallback to old path
      if (packagesSnap.empty) {
        packagesSnap = await db.collection('users')
          .doc(userId)
          .collection('lessonPackages')
          .get();
        usingNewPath = false;
      }

      // Process packages
      for (const doc of packagesSnap.docs) {
        totalPackages++;
        const data = doc.data();
        
        // Check if package already has amountPaid field
        if ('amountPaid' in data) {
          packagesWithAmountPaid++;
          continue;
        }

        // Package needs updating
        const transactionId = data.transactionId || '';
        const isAdminAdded = transactionId.startsWith('ADMIN_ADDED');
        const amountPaid = isAdminAdded ? 0 : DEFAULT_PAID_AMOUNT;
        
        packagesToUpdate.push({
          userId,
          userName,
          docId: doc.id,
          packageName: data.packageName || data.packageType || 'Unknown',
          transactionId: transactionId || 'N/A',
          isAdminAdded,
          amountPaid,
          usingNewPath,
          purchaseDate: data.purchaseDate?.toDate?.() || 'N/A'
        });
      }
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('═'.repeat(80));
    console.log('Total packages found:', totalPackages);
    console.log('Packages already have amountPaid:', packagesWithAmountPaid);
    console.log('Packages need updating:', packagesToUpdate.length);
    console.log();

    if (packagesToUpdate.length === 0) {
      console.log('✅ No packages need updating! All packages already have amountPaid field.');
      process.exit(0);
    }

    // Show packages to update
    console.log('📝 PACKAGES TO UPDATE:');
    console.log('═'.repeat(80));
    
    const adminAddedCount = packagesToUpdate.filter(p => p.isAdminAdded).length;
    const paidCount = packagesToUpdate.filter(p => !p.isAdminAdded).length;
    
    console.log(`\n🎁 Admin-Added Packages (${adminAddedCount}) - Will set to $0.00:`);
    packagesToUpdate.filter(p => p.isAdminAdded).forEach((pkg, i) => {
      console.log(`\n${i + 1}. ${pkg.userName}`);
      console.log(`   Package: ${pkg.packageName}`);
      console.log(`   Purchase Date: ${pkg.purchaseDate}`);
      console.log(`   Path: ${pkg.usingNewPath ? 'NEW' : 'OLD'}`);
    });

    console.log(`\n\n💳 Paid Packages (${paidCount}) - Will set to $${(DEFAULT_PAID_AMOUNT / 100).toFixed(2)}:`);
    packagesToUpdate.filter(p => !p.isAdminAdded).forEach((pkg, i) => {
      console.log(`\n${i + 1}. ${pkg.userName}`);
      console.log(`   Package: ${pkg.packageName}`);
      console.log(`   Transaction ID: ${pkg.transactionId}`);
      console.log(`   Purchase Date: ${pkg.purchaseDate}`);
      console.log(`   Path: ${pkg.usingNewPath ? 'NEW' : 'OLD'}`);
    });

    // Calculate total revenue to be added
    const totalRevenue = packagesToUpdate.reduce((sum, pkg) => sum + pkg.amountPaid, 0);
    console.log('\n\n💰 TOTAL REVENUE TO BE RECORDED:');
    console.log('═'.repeat(80));
    console.log(`$${(totalRevenue / 100).toFixed(2)}`);
    console.log();

    // Confirmation prompt
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\n⚠️  Do you want to proceed with the update? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Update cancelled. No changes made.');
        readline.close();
        process.exit(0);
      }

      console.log('\n🔄 Updating packages...\n');
      
      let updated = 0;
      let errors = 0;

      for (const pkg of packagesToUpdate) {
        try {
          const docRef = pkg.usingNewPath
            ? db.collection('organizations')
                .doc(ORG_ID)
                .collection('users')
                .doc(pkg.userId)
                .collection('packages')
                .doc(pkg.docId)
            : db.collection('users')
                .doc(pkg.userId)
                .collection('lessonPackages')
                .doc(pkg.docId);

          await docRef.update({
            amountPaid: pkg.amountPaid
          });

          updated++;
          process.stdout.write(`\r✅ Updated: ${updated}/${packagesToUpdate.length}`);
        } catch (error) {
          errors++;
          console.error(`\n❌ Error updating ${pkg.packageName} for ${pkg.userName}:`, error.message);
        }
      }

      console.log('\n\n📊 FINAL RESULTS:');
      console.log('═'.repeat(80));
      console.log('✅ Successfully updated:', updated);
      console.log('❌ Errors:', errors);
      console.log('\n💡 Next step: Refresh the revenue report to see updated data!');
      
      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

backfillRevenue();
