'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, getDoc, doc, documentId, orderBy, Timestamp, collectionGroup, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { Users, Calendar, DollarSign, TrendingUp, Clock, MapPin, Activity, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';

interface DashboardStats {
  totalClients: number;
  todaySessions: number;
  monthlyPasses: number;
  activeBookings: number;
}

interface TodayBooking {
  id: string;
  clientName: string;
  trainerName: string;
  startTime: Date;
  endTime: Date;
  location: string;
}

interface RecentActivity {
  id: string;
  description: string;
  timestamp: Date;
  type: string;
}

export default function DashboardPage() {
  const { orgId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const now = new Date();
    const dayStart = Timestamp.fromDate(startOfDay(now));
    const dayEnd = Timestamp.fromDate(endOfDay(now));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Load stats
    async function loadStats() {
      try {
        // NOTE: Booking queries deliberately use single-field where('orgId') only, then filter
        // date ranges and status in JS. Multi-field Firestore queries with 'in' + range filters
        // silently fail (caught by catch block → zeroed stats) even when composite indexes exist.
        // DO NOT switch these back to multi-condition Firestore queries.
        const [membersSnap, allBookingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'orgMembers'), where('orgId', '==', orgId), where('isActive', '==', true))),
          getDocs(query(collection(db, 'bookings'), where('orgId', '==', orgId))),
        ]);

        // Active client count: same logic as /activity — cross-check orgMembers against users docs
        const clientUserIds = membersSnap.docs
          .map(d => d.data())
          .filter((m: any) => m.role === 'client' && !!m.userId)
          .map((m: any) => m.userId as string);
        let activeClientCount = 0;
        if (clientUserIds.length > 0) {
          const BATCH = 30;
          for (let i = 0; i < clientUserIds.length; i += BATCH) {
            const batch = clientUserIds.slice(i, i + BATCH);
            const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)));
            usersSnap.docs.forEach(d => { if (d.data().isActive !== false) activeClientCount++; });
          }
        }

        const dayStartMs = dayStart.toMillis();
        const dayEndMs = dayEnd.toMillis();
        const activeStatuses = new Set(['confirmed', 'scheduled']);

        const todayCount = allBookingsSnap.docs.filter(d => {
          const st = d.data().startTime?.toMillis() ?? 0;
          return activeStatuses.has(d.data().status) && st >= dayStartMs && st <= dayEndMs;
        }).length;

        const upcomingCount = allBookingsSnap.docs.filter(d => {
          const st = d.data().startTime?.toMillis() ?? 0;
          return activeStatuses.has(d.data().status) && st >= dayStartMs;
        }).length;

        // Monthly passes query may fail if no collection-group index — isolate it
        let monthlyPassesCount = 0;
        try {
          const monthPassesSnap = await getDocs(query(collectionGroup(db, 'packages'), where('orgId', '==', orgId), where('purchaseDate', '>=', Timestamp.fromDate(startOfMonth))));
          monthlyPassesCount = monthPassesSnap.size;
        } catch { /* no index or no permission — skip */ }

        setStats({ totalClients: activeClientCount, todaySessions: todayCount, monthlyPasses: monthlyPassesCount, activeBookings: upcomingCount });
      } catch {
        setStats({ totalClients: 0, todaySessions: 0, monthlyPasses: 0, activeBookings: 0 });
      } finally {
        setStatsLoading(false);
      }
    }

    // Load today's bookings
    async function loadTodayBookings() {
      try {
        // Single-field orgId query, filter + sort in JS — no composite index needed
        const snap = await getDocs(query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId)
        ));
        const dayStartMs = dayStart.toMillis();
        const dayEndMs = dayEnd.toMillis();
        const activeStatuses = new Set(['confirmed', 'scheduled']);
        const confirmed = snap.docs
          .filter(d => {
            const st = d.data().startTime?.toMillis() ?? 0;
            return activeStatuses.has(d.data().status) && st >= dayStartMs && st <= dayEndMs;
          })
          .sort((a, b) => (a.data().startTime?.toMillis() ?? 0) - (b.data().startTime?.toMillis() ?? 0));
        const bookings: TodayBooking[] = await Promise.all(
          confirmed.map(async (docSnap) => {
            const data = docSnap.data();
            let trainerName = data.trainerName || '';
            if ((!trainerName || !trainerName.includes(' ')) && data.trainerId) {
              try {
                const td = await getDoc(doc(db, 'trainers', data.trainerId));
                if (td.exists()) trainerName = `${td.data().firstName || ''} ${td.data().lastName || ''}`.trim();
              } catch { /* keep */ }
            }
            return {
              id: docSnap.id,
              clientName: data.clientName || 'Unknown Client',
              trainerName: trainerName || 'Unknown Trainer',
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate() || new Date(),
              location: data.location || 'TBD',
            };
          })
        );
        setTodayBookings(bookings);
      } catch {
        setTodayBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    }

    // Load recent activity
    async function loadRecentActivity() {
      try {
        const snap = await getDocs(query(
          collection(db, 'activities'),
          where('orgId', '==', orgId),
          orderBy('timestamp', 'desc'),
          limit(8)
        ));
        setRecentActivity(snap.docs.map(d => ({
          id: d.id,
          description: d.data().description || '',
          timestamp: d.data().timestamp?.toDate() || new Date(),
          type: d.data().type || '',
        })));
      } catch {
        setRecentActivity([]);
      } finally {
        setActivityLoading(false);
      }
    }

    loadStats();
    loadTodayBookings();
    loadRecentActivity();
  }, [orgId]);

  const statCards = [
    { label: 'Clients', value: stats?.totalClients ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: "Today", value: stats?.todaySessions ?? 0, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Upcoming', value: stats?.activeBookings ?? 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Passes', value: stats?.monthlyPasses ?? 0, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">{format(new Date(), 'EEEE, MMMM d')}</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-border flex flex-col items-center gap-1">
                <div className={`${bg} p-2 rounded-full`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-xs text-foreground/60">{label}</p>
              </div>
            ))}
      </div>

      {/* Today's Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-border mb-6">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            Today's Sessions
          </h2>
          <Link href="/scheduling" className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
            Schedule <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {bookingsLoading ? (
          <div className="px-4 pb-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : todayBookings.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-foreground/50">No sessions scheduled for today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {todayBookings.map(b => (
              <li key={b.id} className="px-4 py-3 flex items-start gap-3">
                <div className="bg-green-50 text-green-700 text-xs font-semibold rounded-lg px-2 py-1 min-w-[52px] text-center leading-tight mt-0.5">
                  {format(b.startTime, 'h:mm')}
                  <span className="block font-normal text-green-600">{format(b.startTime, 'a')}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{b.clientName}</p>
                  <p className="text-xs text-foreground/60 truncate">with {b.trainerName}</p>
                  {b.location && b.location !== 'TBD' && (
                    <p className="text-xs text-foreground/50 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5" />{b.location}
                    </p>
                  )}
                </div>
                <div className="ml-auto text-xs text-foreground/40 whitespace-nowrap mt-0.5">
                  {format(b.startTime, 'h:mm')}–{format(b.endTime, 'h:mm a')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-border mb-6">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-600" />
            Recent Activity
          </h2>
          <Link href="/activity" className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {activityLoading ? (
          <div className="px-4 pb-4 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-foreground/50">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map(a => (
              <li key={a.id} className="px-4 py-3 flex items-start gap-3">
                <Clock className="h-4 w-4 text-foreground/30 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground/80 truncate">{a.description}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    {format(a.timestamp, 'MMM d, h:mm a')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/clients', label: 'Manage Clients', icon: Users },
          { href: '/scheduling', label: 'View Schedule', icon: Calendar },
          { href: '/passes', label: 'Assign Passes', icon: DollarSign },
          { href: '/reports/appointments', label: 'View Reports', icon: TrendingUp },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors active:scale-[0.98]">
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

