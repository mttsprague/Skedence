/**
 * Test what getBillingStatus actually returns
 * Usage: node test-get-billing-status.js <orgId>
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function getBillingStatus(orgId) {
  try {
    console.log(`\n🔍 Testing getBillingStatus for org: ${orgId}\n`);
    
    // Get organization
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    const orgData = orgDoc.data();

    if (!orgData) {
      console.error('❌ Organization not found');
      return;
    }

    // Count bookings this month (simplified version)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let bookingCount = 0;
    try {
      const bookingsSnapshot = await db.collection('bookings')
        .where('orgId', '==', orgId)
        .where('startTime', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
        .where('status', '==', 'booked')
        .count()
        .get();

      bookingCount = bookingsSnapshot.data().count;
    } catch (bookingError) {
      console.warn('Failed to count bookings, defaulting to 0:', bookingError.message);
      bookingCount = 0;
    }

    // Determine recommended plan
    let recommendedPlan = 'free';
    if (bookingCount > 200) {
      recommendedPlan = 'academy';
    } else if (bookingCount > 100) {
      recommendedPlan = 'studio';
    } else if (bookingCount > 50) {
      recommendedPlan = 'starter';
    }

    const result = {
      currentPlan: orgData.billing?.plan || 'free',
      status: orgData.billing?.status || 'active',
      bookingsThisMonth: bookingCount,
      recommendedPlan,
      subscriptionId: orgData.billing?.subscriptionId || null,
      currentPeriodEnd: orgData.billing?.currentPeriodEnd || null,
      cancelAtPeriodEnd: orgData.billing?.cancelAtPeriodEnd || false,
    };

    console.log('📊 Result that would be returned:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n✅ Test complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

// Get org ID from command line
const orgId = process.argv[2];

if (!orgId) {
  console.error('Usage: node test-get-billing-status.js <orgId>');
  process.exit(1);
}

getBillingStatus(orgId);
