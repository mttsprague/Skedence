'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ticket, AlertCircle } from 'lucide-react';
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
      <div className="mb-6">
        <h1 className="text-3xl font-black text-pva-navy">My Passes</h1>
        <p className="text-gray-500 mt-1">Your lesson passes grouped by type.</p>
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
        />
      ) : (
        <PassesView passes={passes} onRefresh={load} />
      )}
    </div>
  );
}

