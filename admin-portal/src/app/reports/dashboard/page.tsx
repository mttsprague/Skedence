'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
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
    console.log('Dashboard: orgId =', orgId);
    if (!orgId) {
      console.log('Dashboard: No orgId, waiting...');
      return;
    }

    async function loadStats() {
      try {
        console.log('Dashboard: Loading stats for orgId:', orgId);
        const now = new Date();

        // Get org members (clients only)
        console.log('Dashboard: Querying orgMembers...');
        const orgMembersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId)
        );
        const orgMembersSnap = await getDocs(orgMembersQuery);
        console.log('Dashboard: Found', orgMembersSnap.size, 'org members');
        
        let clientCount = 0;
        
        for (const memberDoc of orgMembersSnap.docs) {
          const memberData = memberDoc.data();
          console.log('Dashboard: Member data:', memberDoc.id, 'role:', memberData.role, 'all fields:', Object.keys(memberData));
          // Get role from orgMembers collection, not users collection (matches old admin schema)
          if (memberData.role === 'client') clientCount++;
        }
        
        // Get active trainers from trainers collection
        console.log('Dashboard: Querying trainers...');
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('orgId', '==', orgId),
          where('active', '==', true)
        );
        const trainersSnap = await getDocs(trainersQuery);
        const trainerCount = trainersSnap.size;
        
        console.log('Dashboard: Clients:', clientCount, 'Active Trainers:', trainerCount);
        
        // Get upcoming bookings
        console.log('Dashboard: Querying bookings...');
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(now))
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        console.log('Dashboard: Found', bookingsSnap.size, 'upcoming bookings');

        // Count active packages and calculate revenue
        let packageCount = 0;
        let monthRevenue = 0;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        for (const memberDoc of orgMembersSnap.docs) {
          const memberData = memberDoc.data();
          if (memberData.role !== 'client') continue;
          
          try {
            // Try new organization path first
            let packagesSnap = await getDocs(
              collection(db, 'organizations', orgId!, 'users', memberData.userId, 'packages')
            );
            
            // Fall back to old path if no packages found
            if (packagesSnap.empty) {
              packagesSnap = await getDocs(
                collection(db, 'users', memberData.userId, 'lessonPackages')
              );
            }
            
            for (const pkgDoc of packagesSnap.docs) {
              const pkgData = pkgDoc.data();
              
              // Count active packages
              if ((pkgData.remainingLessons || 0) > 0) {
                packageCount++;
              }
              
              // Calculate this month's revenue (amountPaid is in cents)
              if (pkgData.amountPaid && pkgData.purchaseDate) {
                const purchasedDate = pkgData.purchaseDate?.toDate?.() || new Date(pkgData.purchaseDate);
                if (purchasedDate >= monthStart) {
                  monthRevenue += pkgData.amountPaid;
                }
              } else if (pkgData.amountPaid && pkgData.purchasedAt) {
                // Fallback to purchasedAt if purchaseDate doesn't exist
                const purchasedDate = pkgData.purchasedAt?.toDate?.() || new Date(pkgData.purchasedAt);
                if (purchasedDate >= monthStart) {
                  monthRevenue += pkgData.amountPaid;
                }
              }
            }
          } catch (err) {
            console.warn('Dashboard: Could not load packages for user', memberData.userId, err);
          }
        }
        console.log('Dashboard: Found', packageCount, 'active packages');
        console.log('Dashboard: This month revenue:', monthRevenue, 'cents');

        // Count open classes (classes with available spots)
        let openClassCount = 0;
        try {
          console.log('Dashboard: Querying classes...');
          const classesQuery = query(
            collection(db, 'classes'),
            where('orgId', '==', orgId),
            where('startTime', '>=', Timestamp.fromDate(now))
          );
          const classesSnap = await getDocs(classesQuery);
          console.log('Dashboard: Found', classesSnap.size, 'upcoming classes');
          
          for (const classDoc of classesSnap.docs) {
            const classData = classDoc.data();
            const currentParticipants = classData.currentParticipants || 0;
            const maxParticipants = classData.maxParticipants || classData.maxCapacity || 0;
            console.log('Dashboard: Class', classDoc.id, '- participants:', currentParticipants, 'max:', maxParticipants, 'isOpen:', classData.isOpenForRegistration);
            if (currentParticipants < maxParticipants && classData.isOpenForRegistration !== false) {
              openClassCount++;
            }
          }
          console.log('Dashboard: Found', openClassCount, 'open classes');
        } catch (err) {
          console.warn('Dashboard: Could not load classes:', err);
        }

        setStats({
          totalClients: clientCount,
          totalTrainers: trainerCount,
          upcomingBookings: bookingsSnap.size,
          thisMonthRevenue: monthRevenue / 100, // Convert cents to dollars
          activePackages: packageCount,
          openClasses: openClassCount,
        });
        console.log('Dashboard: Stats loaded successfully');
      } catch (error) {
        console.error('Dashboard: Error loading stats:', error);
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
    <div className="p-6 lg:p-8">
      <div className="space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome back! Here&apos;s an overview of your organization.</p>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <Link href="/availability" className="touch-manipulation">
              <Card className="hover:shadow-lg active:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-2 sm:p-3 rounded-lg bg-blue-100 text-[#3258A3] flex-shrink-0">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">Manage Availability</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Set trainer schedules</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/bookings" className="touch-manipulation">
              <Card className="hover:shadow-lg active:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-2 sm:p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">Book Session</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Schedule for clients</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/classes" className="touch-manipulation">
              <Card className="hover:shadow-lg active:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-2 sm:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                        <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">Manage Classes</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Create group sessions</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/schedule" className="touch-manipulation">
              <Card className="hover:shadow-lg active:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-[#3258A3]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-2 sm:p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                        <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">View Schedule</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">See all bookings</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Overview</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stat.value}</p>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-lg bg-gray-100 ${stat.color} flex-shrink-0`}>
                          <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
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
    </div>
  );
}
