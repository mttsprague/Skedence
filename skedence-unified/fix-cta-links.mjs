import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyCed2hTvqoE5UUe5ezom6mmWlNvzxmPdd8', projectId: 'polyface-ae6d3' });
const db = getFirestore(app);
const snap = await getDocs(collection(db, 'blogPosts'));
const batch = writeBatch(db);
let count = 0;

for (const d of snap.docs) {
  const data = d.data();
  const updates = {};
  if (data.ctaLink === '/login' || data.ctaLink === 'https://skedence.com/login') {
    updates.ctaLink = '/register';
  }
  if (Object.keys(updates).length > 0) {
    batch.update(doc(db, 'blogPosts', d.id), updates);
    console.log(`Fixing "${data.title?.substring(0,50)}" ctaLink: ${data.ctaLink} → /register`);
    count++;
  }
}

// Also list all slugs to find any that would 404
console.log('\n--- All slugs ---');
for (const d of snap.docs) {
  console.log(d.data().slug);
}

if (count > 0) {
  await batch.commit();
  console.log(`\n✅ Fixed ctaLink on ${count} posts`);
}
process.exit(0);
