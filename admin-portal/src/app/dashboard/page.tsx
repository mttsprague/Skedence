'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DashboardStats } from '@/types';
import { Users, UserCog, Calendar, DollarSign, Package, GraduationCap, Clock, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { orgId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalTrainers: 0,
    upcomingBookings: 0,
    thisMonthRevenue: 0,
    activePackages: 0,
    openClasses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function loadStats() {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get clients
        const clientsQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'client')
        );
        const clientsSnap = await getDocs(clientsQuery);
        
        // Get trainers
        const trainersQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'trainer')
        );
        const trainersSnap = await getDocs(trainersQuery);
        
        // Get upcoming bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(now))
        );
        const bookingsSnap = await getDocs(bookingsQuery);

        setStats({
          totalClients: clientsSnap.size,
          totalTrainers: trainersSnap.size,
          upcomingBookings: bookingsSnap.size,
          thisMonthRevenue: 0, // TODO: Calculate from payments
          activePackages: 0, // TODO: Count active packages
          openClasses: 0, // TODO: Count open classes
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [orgId]);

  const statCards = [
    { title: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-blue-600' },
    { title: 'Total Trainers', value: stats.totalTrainers, icon: UserCog, color: 'text-teal-600' },
    { title: 'Upcoming Bookings', value: stats.upcomingBookings, icon: Calendar, color: 'text-purple-600' },
    { title: 'This Month Revenue', value: `$${stats.thisMonthRevenue}`, icon: DollarSign, color: 'text-green-600' },
    { title: 'Active Packages', value: stats.activePackages, icon: Package, color: 'text-orange-600' },
    { title: 'Open Classes', value: stats.openClasses, icon: GraduationCap, color: 'text-pink-600' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your organization.</p>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/availability">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-blue-100 text-[#3258A3]">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Manage Availability</p>
                        <p className="text-sm text-gray-600">Set trainer schedules</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/bookings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-green-100 text-green-600">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Book Session</p>
                        <p className="text-sm text-gray-600">Schedule for clients</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/classes">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Manage Classes</p>
                        <p className="text-sm text-gray-600">Create group sessions</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/schedule">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">View Schedule</p>
                        <p className="text-sm text-gray-600">See all bookings</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                          <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg bg-gray-100 ${stat.color}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
