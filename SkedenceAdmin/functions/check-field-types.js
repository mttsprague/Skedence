// Check pricePerLesson field type
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

async function checkFieldTypes() {
  try {
    const packageDoc = await db.collection('organizations')
      .doc('skedence_gym')
      .collection('users')
      .doc('mike_parent')
      .collection('packages')
      .doc('KywgrEV1SoBXyMQdgoxJ')
      .get();
    
    const packageData = packageDoc.data();
    
    console.log('📦 Package Field Types:\n');
    console.log(`  pricePerLesson:`, typeof packageData.pricePerLesson, packageData.pricePerLesson);
    console.log(`  pricingTierId:`, typeof packageData.pricingTierId, packageData.pricingTierId);
    console.log(`  pricingTierName:`, typeof packageData.pricingTierName, packageData.pricingTierName);
    console.log(`  purchaseDate:`, typeof packageData.purchaseDate, packageData.purchaseDate);
    console.log(`  expirationDate:`, typeof packageData.expirationDate, packageData.expirationDate);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkFieldTypes();
