'use client';

import { useEffect } from 'react';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ViewCounter({ postId }: { postId: string }) {
  useEffect(() => {
    if (!postId) return;
    const ref = doc(db, 'blogPosts', postId);
    updateDoc(ref, { views: increment(1) }).catch(() => {/* silent */});
  }, [postId]);

  return null;
}
