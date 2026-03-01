const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function diagnoseRevenue() {
  try {
    const orgId = '0Mtow1OaV7oUlCisKSNy'; // Polyface Volleyball Academy
    
    console.log('🔍 Diagnosing Revenue Report Issues...\n');
    console.log('Organization:', orgId);
    console.log('═'.repeat(80));
    
    // Get all members
    const membersSnap = await db.collection('orgMembers').where('orgId', '==', orgId).get();
    const userIds = membersSnap.docs.map(doc => doc.data().userId);
    
    console.log('Found', userIds.length, 'members\n');
    
    let totalPackages = 0;
    let packagesWithRevenue = 0;
    let packagesWithoutAmountPaid = 0;
    let adminAddedPackages = 0;
    let paidPackages = 0;
    let totalRevenue = 0;
    
    const issuesFound = [];
    
    // Check packages for each user
    for (const userId of userIds) {
      // Try new path first
      let packagesSnap = await db.collection('organizations')
        .doc(orgId)
        .collection('users')
        .doc(userId)
        .collection('packages')
        .get();
      
      // Fallback to old path
      if (packagesSnap.empty) {
        packagesSnap = await db.collection('users')
          .doc(userId)
          .collection('lessonPackages')
          .get();
      }
      
      if (packagesSnap.empty) continue;
      
      // Get user info
      let userName = 'Unknown';
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      }
      
      // Analyze packages
      for (const doc of packagesSnap.docs) {
        const data = doc.data();
        totalPackages++;
        
        const transactionId = data.transactionId || '';
        const isAdminAdded = transactionId.startsWith('ADMIN_ADDED');
        const hasAmountPaid = 'amountPaid' in data;
        const amountPaid = data.amountPaid || 0;
        const amountInDollars = amountPaid / 100;
        
        if (isAdminAdded) {
          adminAddedPackages++;
        } else {
          paidPackages++;
        }
        
        if (!hasAmountPaid) {
          packagesWithoutAmountPaid++;
          issuesFound.push({
            user: userName,
            userId: userId,
            packageId: doc.id,
            packageName: data.packageName || data.packageType,
            transactionId: transactionId,
            isAdminAdded: isAdminAdded,
            issue: 'Missing amountPaid field',
            purchaseDate: data.purchaseDate?.toDate?.() || 'N/A'
          });
        } else if (amountPaid > 0) {
          packagesWithRevenue++;
          totalRevenue += amountInDollars;
        } else if (!isAdminAdded && amountPaid === 0) {
          // Paid package with $0 - suspicious
          issuesFound.push({
            user: userName,
            userId: userId,
            packageId: doc.id,
            packageName: data.packageName || data.packageType,
            transactionId: transactionId,
            isAdminAdded: false,
            issue: 'Paid package with $0 amount',
            purchaseDate: data.purchaseDate?.toDate?.() || 'N/A'
          });
        }
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('═'.repeat(80));
    console.log('Total Packages:', totalPackages);
    console.log('Admin-Added Packages:', adminAddedPackages);
    console.log('Paid Packages:', paidPackages);
    console.log('Packages with Revenue:', packagesWithRevenue);
    console.log('Packages Missing amountPaid Field:', packagesWithoutAmountPaid);
    console.log('Total Revenue:', '$' + totalRevenue.toFixed(2));
    
    if (issuesFound.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      console.log('═'.repeat(80));
      issuesFound.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.issue}`);
        console.log('   User:', issue.user);
        console.log('   Package:', issue.packageName);
        console.log('   Transaction ID:', issue.transactionId || 'N/A');
        console.log('   Purchase Date:', issue.purchaseDate);
        console.log('   Is Admin Added:', issue.isAdminAdded);
        console.log('   Package ID:', issue.packageId);
      });
      
      console.log('\n\n🔧 RECOMMENDED FIX:');
      console.log('═'.repeat(80));
      console.log('Run fix_package_revenue.js to add amountPaid:0 to packages missing the field.');
    } else {
      console.log('\n✅ No issues found! All packages have amountPaid field.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnoseRevenue();
