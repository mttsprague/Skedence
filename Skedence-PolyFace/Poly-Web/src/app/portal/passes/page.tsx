'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ticket, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserPackages } from '@/lib/firestore';
import type { LessonPackage } from '@/types';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { PassesView } from '@/components/PassCard';

export default function PassesPage() {
  const { user, userDocId } = useAuth();
  const [passes, setPasses] = useState<LessonPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user || !userDocId) return;
    setLoading(true);
    setError('');
    try {
      setPasses(await fetchUserPackages(userDocId));
    } catch {
      setError('Failed to load passes. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user, userDocId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-pva-navy">My Passes</h1>
          <p className="text-gray-500 mt-1">Your lesson passes grouped by type.</p>
        </div>
        <Link
          href="/portal/buy-passes"
          className="flex items-center gap-2 bg-pva-navy hover:bg-pva-teal text-white px-4 py-2.5 rounded-xl font-bold text-sm transition flex-shrink-0"
        >
          <Plus size={16} />Buy a Pass
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium mb-4">
          <AlertCircle size={16} className="flex-shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : passes.length === 0 ? (
        <EmptyState
          icon={<Ticket size={40} />}
          title="No Passes Yet"
          description="Purchase lesson passes to start booking sessions."
          action={
            <Link
              href="/portal/buy-passes"
              className="inline-flex items-center gap-2 bg-pva-navy hover:bg-pva-teal text-white px-6 py-3 rounded-xl font-bold text-sm transition mt-2"
            >
              <Plus size={16} />Buy Your First Pass
            </Link>
          }
        />
      ) : (
        <PassesView passes={passes} onRefresh={load} />
      )}
    </div>
  );
}


