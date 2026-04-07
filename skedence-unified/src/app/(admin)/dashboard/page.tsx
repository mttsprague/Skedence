'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, Timestamp, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  todaySessions: number;
  monthlyRevenue: number;
  activePasses: number;
}

export default function DashboardPage() {
  const { orgId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function loadStats() {
      try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [clientsSnap, todayBookingsSnap, monthPackagesSnap, activePassesSnap] = await Promise.all([
          getDocs(query(collection(db, 'orgMembers'), where('orgId', '==', orgId), where('role', '==', 'client'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'bookings'), where('orgId', '==', orgId), where('startTime', '>=', Timestamp.fromDate(startOfToday)), where('startTime', '<=', Timestamp.fromDate(endOfToday)), where('status', '!=', 'cancelled'))),
          getDocs(query(collectionGroup(db, 'packages'), where('orgId', '==', orgId), where('purchaseDate', '>=', Timestamp.fromDate(startOfMonth)))),
          getDocs(query(collection(db, 'bookings'), where('orgId', '==', orgId), where('status', '==', 'confirmed'))),
        ]);

        setStats({
          totalClients: clientsSnap.size,
          todaySessions: todayBookingsSnap.size,
          monthlyRevenue: monthPackagesSnap.size, // Count of passes purchased this month
          activePasses: activePassesSnap.size,
        });
      } catch {
        setStats({ totalClients: 0, todaySessions: 0, monthlyRevenue: 0, activePasses: 0 });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [orgId]);

  const statCards = [
    { label: 'Total Clients', value: stats?.totalClients ?? 0, icon: Users, color: 'text-blue-600' },
    { label: "Today's Sessions", value: stats?.todaySessions ?? 0, icon: Calendar, color: 'text-green-600' },
    { label: 'Active Bookings', value: stats?.activePasses ?? 0, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Passes This Month', value: stats?.monthlyRevenue ?? 0, icon: DollarSign, color: 'text-amber-600' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white p-6 rounded-lg shadow-sm border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-foreground/80 text-sm font-medium">{label}</h3>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </div>
            ))}
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-xl font-semibold mb-2">Quick Links</h2>
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { href: '/clients', label: 'Manage Clients' },
            { href: '/scheduling', label: 'View Schedule' },
            { href: '/passes', label: 'Assign Passes' },
            { href: '/reports/appointments', label: 'View Reports' },
          ].map(({ href, label }) => (
            <a key={href} href={href} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

