const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'polyface-ae6d3' });
const db = admin.firestore();

async function searchUsers() {
  console.log('\n🔍 Searching for users named Lenora or Leanora...\n');
  
  // Get all users
  const usersSnapshot = await db.collection('users').get();
  
  const matches = [];
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    const firstName = (data.firstName || '').toLowerCase();
    const lastName = (data.lastName || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    
    if (fullName.includes('lenora') || fullName.includes('leanora') || fullName.includes('brown')) {
      matches.push({
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || data.emailAddress,
        authUserId: data.authUserId
      });
    }
  });
  
  if (matches.length === 0) {
    console.log('❌ No users found matching "lenora" or "brown"\n');
    return;
  }
  
  console.log(`Found ${matches.length} matching users:\n`);
  matches.forEach(user => {
    console.log(`📋 User ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Auth UID: ${user.authUserId || 'N/A'}\n`);
  });
}

searchUsers().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
