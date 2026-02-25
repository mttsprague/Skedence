'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RealTimeStats {
  count: number;
  lastUpdate: Date;
  isLive: boolean;
}

/**
 * Hook to get real-time count of documents in a collection
 * Uses Firestore onSnapshot for live updates
 */
export function useRealTimeCount(
  collectionPath: string,
  constraints: any[] = [],
  enabled: boolean = true
): RealTimeStats {
  const [count, setCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsLive(false);
      return;
    }

    const collectionRef = collection(db, collectionPath);
    const q = constraints.length > 0 
      ? query(collectionRef, ...constraints)
      : collectionRef;

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCount(snapshot.size);
        setLastUpdate(new Date());
        setIsLive(true);
      },
      (error) => {
        console.error(`Real-time count error (${collectionPath}):`, error);
        setIsLive(false);
      }
    );

    return () => {
      unsubscribe();
      setIsLive(false);
    };
  }, [collectionPath, enabled, ...constraints]);

  return { count, lastUpdate, isLive };
}

/**
 * Hook to detect when data has recently updated
 * Returns true for 3 seconds after an update
 */
export function useUpdateIndicator(lastUpdate: Date, duration: number = 3000): boolean {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    setShowIndicator(true);
    const timer = setTimeout(() => setShowIndicator(false), duration);
    return () => clearTimeout(timer);
  }, [lastUpdate, duration]);

  return showIndicator;
}

/**
 * Hook for real-time presence tracking (simplified version)
 * In a full implementation, this would use Firestore presence system
 */
export function usePresence(documentPath: string, enabled: boolean = true) {
  const [viewersCount, setViewersCount] = useState(0);
  const [editors, setEditors] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // In a full implementation:
    // 1. Add current user to presence collection
    // 2. Listen for other users in same document
    // 3. Remove user on unmount or disconnect
    // For now, just return static data

    return () => {
      // Cleanup: remove user from presence
    };
  }, [documentPath, enabled]);

  return { viewersCount, editors };
}

/**
 * Hook to track if data is stale (hasn't updated in X seconds)
 */
export function useStaleIndicator(lastUpdate: Date, threshold: number = 60000): boolean {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const checkStale = () => {
      const now = new Date();
      const diff = now.getTime() - lastUpdate.getTime();
      setIsStale(diff > threshold);
    };

    checkStale();
    const interval = setInterval(checkStale, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [lastUpdate, threshold]);

  return isStale;
}
