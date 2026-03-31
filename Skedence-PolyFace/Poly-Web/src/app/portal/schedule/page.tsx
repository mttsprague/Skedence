'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllBookings } from '@/lib/firestore';
import type { Booking } from '@/types';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import BookingCard from '@/components/BookingCard';
import BookingDetailModal from '@/components/BookingDetailModal';
import { isFuture, isPast } from 'date-fns';

export default function SchedulePage() {
  const { user, userDocId } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user || !userDocId) return;
    fetchAllBookings(userDocId)
      .then(setBookings)
      .catch((err) => console.error('Failed to fetch bookings:', err))
      .finally(() => setLoading(false));
  }, [user, userDocId]);

  const upcoming = bookings.filter((b) => b.status === 'confirmed' && isFuture(b.startTime));
  const past = bookings.filter((b) => b.status !== 'confirmed' || isPast(b.startTime));
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-pva-navy">My Schedule</h1>
          <p className="text-gray-500 mt-1">View your upcoming and past training sessions.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition ${
                tab === t ? 'bg-white text-pva-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}{' '}
              <span className={`ml-1 ${tab === t ? 'text-pva-orange' : 'text-gray-400'}`}>
                {t === 'upcoming' ? upcoming.length : past.length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={40} />}
            title={tab === 'upcoming' ? 'No Upcoming Sessions' : 'No Past Sessions'}
            action={
              tab === 'upcoming' ? (
                <p className="text-gray-500 text-sm">
                  Head to{' '}
                  <Link href="/portal/book" className="text-pva-orange font-bold">
                    Book a Lesson
                  </Link>{' '}
                  to get started.
                </p>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {displayed.map((b) => (
              <BookingCard key={b.id} booking={b} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Lesson detail modal */}
      <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />
    </>
  );
}
