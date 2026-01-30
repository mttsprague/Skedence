'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DollarSign, TrendingUp, Package, Users, Calendar } from 'lucide-react';

interface PackageData {
  type: string;
  amountPaid: number;
  purchasedAt: any;
  remainingLessons: number;
}

interface BookingData {
  startTime: any;
  trainerId: string;
  clientId: string;
}

export default function AnalyticsPage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [revenueByType, setRevenueByType] = useState<Record<string, { count: number; revenue: number }>>({});

  useEffect(() => {
    if (!orgId) return;

    async function loadAnalytics() {
      try {
        // Get org members
        const orgMembersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId)
        );
        const orgMembersSnap = await getDocs(orgMembersQuery);
        
        // Load all packages
        const allPackages: PackageData[] = [];
        for (const memberDoc of orgMembersSnap.docs) {
          const memberData = memberDoc.data();
          if (memberData.role !== 'client') continue;
          
          // Try new organization path first (only if orgId is available)
          let packagesSnap = await getDocs(
            collection(db, 'organizations', orgId!, 'users', memberData.userId, 'packages')
          );
          
          // Fall back to old path if no packages found
          if (packagesSnap.empty) {
            packagesSnap = await getDocs(
              collection(db, 'users', memberData.userId, 'lessonPackages')
            );
          }
          
          packagesSnap.forEach(pkgDoc => {
            allPackages.push(pkgDoc.data() as PackageData);
          });
        }
        
        // Load bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const allBookings = bookingsSnap.docs.map(doc => doc.data() as BookingData);
        
        // Calculate revenue
        const total = allPackages.reduce((sum, pkg) => sum + (pkg.amountPaid || 0), 0) / 100;
        
        // This month's revenue
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthPackages = allPackages.filter(pkg => {
          const purchasedDate = pkg.purchasedAt?.toDate?.() || new Date(pkg.purchasedAt);
          return purchasedDate >= monthStart;
        });
        const month = thisMonthPackages.reduce((sum, pkg) => sum + (pkg.amountPaid || 0), 0) / 100;
        
        // Revenue by package type
        const byType: Record<string, { count: number; revenue: number }> = {};
        allPackages.forEach(pkg => {
          const type = pkg.type || 'Unknown';
          if (!byType[type]) {
            byType[type] = { count: 0, revenue: 0 };
          }
          byType[type].count++;
          byType[type].revenue += (pkg.amountPaid || 0) / 100;
        });
        
        setPackages(allPackages);
        setBookings(allBookings);
        setTotalRevenue(total);
        setMonthRevenue(month);
        setRevenueByType(byType);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [orgId]);

  const avgPackageRevenue = packages.length > 0 ? totalRevenue / packages.length : 0;

  // Group bookings by month
  const bookingsByMonth: Record<string, number> = {};
  bookings.forEach(booking => {
    const date = booking.startTime?.toDate?.() || new Date(booking.startTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    bookingsByMonth[monthKey] = (bookingsByMonth[monthKey] || 0) + 1;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Revenue insights and business performance metrics</p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${monthRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Current month revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Package Value</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgPackageRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Per package</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packages.length}</div>
              <p className="text-xs text-gray-500 mt-1">Sold</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Package Type */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Package Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(revenueByType)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{type}</p>
                      <p className="text-sm text-gray-500">{data.count} packages sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">${data.revenue.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">${(data.revenue / data.count).toFixed(2)} avg</p>
                    </div>
                  </div>
                ))}
              {Object.keys(revenueByType).length === 0 && (
                <p className="text-center text-gray-500 py-8">No package data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(bookingsByMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 6)
                .map(([month, count]) => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">{monthName}</span>
                      </div>
                      <span className="text-lg font-semibold text-blue-600">{count} bookings</span>
                    </div>
                  );
                })}
              {Object.keys(bookingsByMonth).length === 0 && (
                <p className="text-center text-gray-500 py-8">No booking data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
