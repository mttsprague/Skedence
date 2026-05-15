import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyCed2hTvqoE5UUe5ezom6mmWlNvzxmPdd8', projectId: 'polyface-ae6d3' });
const db = getFirestore(app);
const snap = await getDocs(collection(db, 'blogPosts'));

const sportCounts = {};
for (const d of snap.docs) {
  const s = d.data().sport || '(none)';
  sportCounts[s] = (sportCounts[s] || 0) + 1;
}
console.log('Sport field distribution:', sportCounts);

// Also check a few volleyball posts
let i = 0;
for (const d of snap.docs) {
  if ((d.data().sport || '').toLowerCase().includes('volley') && i++ < 5) {
    console.log(`"${d.data().title?.substring(0,40)}" sport="${d.data().sport}" status="${d.data().status}"`);
  }
}
process.exit(0);
