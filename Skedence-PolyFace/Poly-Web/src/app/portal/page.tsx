'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Ticket, CalendarCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUpcomingBookings, fetchUserPackages } from '@/lib/firestore';
import type { Booking, LessonPackage } from '@/types';
import Spinner from '@/components/Spinner';
import BookingCard from '@/components/BookingCard';
import BookingDetailModal from '@/components/BookingDetailModal';
import { DashboardPassesView } from '@/components/PassCard';

export default function PortalDashboard() {
  const { user, profile, userDocId } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [passes, setPasses] = useState<LessonPackage[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const firstName = profile?.firstName || 'Athlete';

  useEffect(() => {
    if (!user || !userDocId) {
      setLoadingData(false);
      return;
    }

    async function fetchData() {
      try {
        const [bookingData, passData] = await Promise.all([
          fetchUpcomingBookings(userDocId!, 5),
          fetchUserPackages(userDocId!),
        ]);
        setUpcomingBookings(bookingData);
        setPasses(passData);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user, userDocId]);

  const totalRemaining = passes.filter(p => p.remainingLessons > 0).reduce((sum, p) => sum + (p.remainingLessons || 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-pva-navy">
          Hey, {firstName}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your training.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-pva-teal transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-pva-teal/10 rounded-xl flex items-center justify-center text-pva-teal">
              <CalendarCheck size={20} />
            </div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Upcoming</span>
          </div>
          <div className="text-3xl font-black text-pva-navy">{upcomingBookings.length}</div>
          <div className="text-sm text-gray-500 mt-1">sessions booked</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-pva-orange transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-pva-orange/10 rounded-xl flex items-center justify-center text-pva-orange">
              <Ticket size={20} />
            </div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Passes</span>
          </div>
          <div className="text-3xl font-black text-pva-navy">{totalRemaining}</div>
          <div className="text-sm text-gray-500 mt-1">lessons remaining</div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-pva-navy to-pva-teal rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">Quick Action</span>
          </div>
          <Link
            href="/portal/book"
            className="inline-flex items-center gap-2 bg-pva-orange hover:bg-pva-orange/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition mt-1"
          >
            Book a Lesson <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Lessons */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-pva-navy text-lg">Upcoming Lessons</h2>
            <Link href="/portal/schedule" className="text-pva-teal text-sm font-bold hover:text-pva-navy transition">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loadingData ? (
              <div className="p-6 text-center">
                <Spinner size="sm" className="mx-auto" />
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarCheck size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No upcoming lessons</p>
                <Link href="/portal/book" className="inline-block mt-3 text-pva-orange font-bold text-sm hover:text-pva-navy transition">
                  Book your first session →
                </Link>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} onClick={setSelectedBooking} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Passes */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-pva-navy text-lg">My Passes</h2>
            <Link href="/portal/passes" className="text-pva-teal text-sm font-bold hover:text-pva-navy transition">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loadingData ? (
              <div className="p-6 text-center">
                <Spinner size="sm" className="mx-auto" />
              </div>
            ) : (
              <DashboardPassesView passes={passes} />
            )}
          </div>
        </div>
      </div>

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
