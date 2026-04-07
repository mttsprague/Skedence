'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionEnforcement } from '@/hooks/useSubscriptionEnforcement';
import { SubscriptionPaywall } from '@/components/admin/subscription-paywall';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
const RevenueComposedChart = dynamic(() => import('@/components/charts/revenue-composed-chart'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-md bg-muted" />,
});
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, addMonths } from 'date-fns';
import { Download, Calendar, Filter, ArrowUpDown, DollarSign, TrendingUp, Package } from 'lucide-react';
import { Skeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

interface PackageRevenue {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  packageType: string;
  packageName: string;
  purchaseDate: Date;
  amountPaid: number; // in dollars
  transactionId: string;
  source: 'paid' | 'admin_added';
  totalLessons: number;
  lessonsUsed: number;
}

interface DailyRevenue {
  date: string;
  paidRevenue: number;
  adminRevenue: number;
  totalRevenue: number;
  paidPassCount: number;
  adminPassCount: number;
  totalPassCount: number;
}

interface RevenueByType {
  packageType: string;
  packageName: string;
  count: number;
  paidCount: number;
  adminCount: number;
  revenue: number;
  avgPrice: number;
}

type DateRangeType = 'month' | 'custom';
type SortField = 'date' | 'user' | 'package' | 'amount' | 'source';
type SortDirection = 'asc' | 'desc';

export default function RevenueReportPage() {
  const { orgId, user } = useAuth();
  const { subscription, isLoading: subLoading, canAccessFeature, getBlockReason } = useSubscriptionEnforcement(orgId);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageRevenue[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<PackageRevenue[]>([]);
  const [chartData, setChartData] = useState<DailyRevenue[]>([]);
  const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
  
  // Filters
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [sourceFilter, setSourceFilter] = useState<'all' | 'paid' | 'admin_added'>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Month options: 4 future + current + 24 past - MOVED BEFORE EARLY RETURN
  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    
    for (let i = 4; i >= -24; i--) {
      const date = addMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy') + (i === 0 ? ' (Current)' : i > 0 ? ' (Future)' : '')
      });
    }
    
    return options;
  })();

  // Effects - MOVED BEFORE EARLY RETURN
  useEffect(() => {
    if (!orgId) return;
    loadPackages();
  }, [orgId, dateRangeType, selectedMonth, customStartDate, customEndDate]);

  useEffect(() => {
    applyFilters();
  }, [packages, sourceFilter, packageFilter, userSearch]);

  // Keyboard shortcut: Ctrl+E to export
  useEffect(() => {
    const handleExport = () => exportToCSV();
    window.addEventListener('trigger-export', handleExport);
    return () => window.removeEventListener('trigger-export', handleExport);
  }, []); // Empty deps - exportToCSV uses local variables
  
  // Check subscription access
  if (!subLoading && !canAccessFeature('canAccessReports')) {
    const reason = getBlockReason('canAccessReports');
    return (
      <SubscriptionPaywall
        feature="Revenue Reports"
        reason={reason || undefined}
        currentPlan={subscription?.plan}
        suggestedPlan="starter"
      />
    );
  }

  async function loadPackages() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      if (dateRangeType === 'month') {
        startDate = startOfMonth(parseISO(`${selectedMonth}-01`));
        endDate = endOfMonth(startDate);
      } else {
        startDate = parseISO(customStartDate);
        endDate = parseISO(customEndDate);
      }

      const loadedPackages: PackageRevenue[] = [];

      // Load all users in organization
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId)
      );
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const userIds = orgMembersSnapshot.docs.map(doc => doc.data().userId);

      // Load packages for each user (dual-path)
      for (const userId of userIds) {
        // Try NEW path first
        const newPath = collection(db, `organizations/${orgId}/users/${userId}/packages`);
        let packagesSnapshot = await getDocs(newPath);
        
        // Fallback to OLD path if empty
        if (packagesSnapshot.empty) {
          const oldPath = collection(db, `users/${userId}/lessonPackages`);
          packagesSnapshot = await getDocs(oldPath);
        }

        // Get user info
        let userName = 'Unknown User';
        let userEmail = '';
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            userEmail = userData.emailAddress || userData.email || '';
          }
        } catch (err) {
          console.warn('Could not load user:', err);
        }

        // Process packages
        for (const packageDoc of packagesSnapshot.docs) {
          const data = packageDoc.data();
          
          // Get purchase date (check both field names)
          let purchaseDate: Date | null = null;
          if (data.purchaseDate) {
            purchaseDate = data.purchaseDate.toDate();
          } else if (data.purchasedAt) {
            purchaseDate = data.purchasedAt.toDate();
          }
          
          if (!purchaseDate) {
            console.warn('Package missing purchase date:', packageDoc.id);
            continue;
          }
          
          // Filter by date range
          if (purchaseDate < startDate || purchaseDate > endDate) {
            continue;
          }
          
          // Get amount paid (in cents, convert to dollars)
          // Handle missing field (legacy data) vs 0 (admin-added)
          const amountPaidCents = typeof data.amountPaid === 'number' ? data.amountPaid : 0;
          const amountPaid = amountPaidCents / 100;
          
          // Determine source
          const transactionId = data.transactionId || '';
          const source: 'paid' | 'admin_added' = transactionId.startsWith('ADMIN_ADDED') 
            ? 'admin_added' 
            : 'paid';
          
          // Log warning for paid packages with no revenue
          if (source === 'paid' && amountPaidCents === 0) {
            console.warn('Paid package with $0 amount:', packageDoc.id, data.packageName);
          }
          
          loadedPackages.push({
            id: packageDoc.id,
            userId,
            userName,
            userEmail,
            packageType: data.packageType || '',
            packageName: data.packageName || data.packageType || 'Unknown Package',
            purchaseDate,
            amountPaid,
            transactionId,
            source,
            totalLessons: data.totalLessons || 0,
            lessonsUsed: data.lessonsUsed || 0
          });
        }
      }
      
      // DEMO DATA INJECTION - Only for specific admin and February 2026
      const isDemoUser = user?.email === 'mttsprague@gmail.com';
      const isFebruary2026 = dateRangeType === 'month' && selectedMonth === '2026-02';
      
      if (isDemoUser && isFebruary2026) {
        console.log('🎬 Injecting demo data for February 2026');
        
        // Generate realistic demo packages throughout February
        const demoPackages: PackageRevenue[] = [
          // Week 1 - Strong start
          { id: 'demo_1', userId: 'demo_user_1', userName: 'Sarah Johnson', userEmail: 'sarah.j@example.com', packageType: 'private_10', packageName: '10 Private Lessons', purchaseDate: new Date('2026-02-02'), amountPaid: 800, transactionId: 'demo_txn_1', source: 'paid', totalLessons: 10, lessonsUsed: 2 },
          { id: 'demo_2', userId: 'demo_user_2', userName: 'Mike Chen', userEmail: 'mchen@example.com', packageType: 'group_20', packageName: '20 Group Sessions', purchaseDate: new Date('2026-02-03'), amountPaid: 400, transactionId: 'demo_txn_2', source: 'paid', totalLessons: 20, lessonsUsed: 5 },
          { id: 'demo_3', userId: 'demo_user_3', userName: 'Emily Rodriguez', userEmail: 'emily.r@example.com', packageType: 'private_5', packageName: '5 Private Lessons', purchaseDate: new Date('2026-02-04'), amountPaid: 425, transactionId: 'demo_txn_3', source: 'paid', totalLessons: 5, lessonsUsed: 1 },
          { id: 'demo_4', userId: 'demo_user_4', userName: 'James Wilson', userEmail: 'jwilson@example.com', packageType: 'elite_unlimited', packageName: 'Elite Unlimited Monthly', purchaseDate: new Date('2026-02-05'), amountPaid: 1200, transactionId: 'demo_txn_4', source: 'paid', totalLessons: 0, lessonsUsed: 0 },
          { id: 'demo_5', userId: 'demo_user_5', userName: 'Lisa Martinez', userEmail: 'lmartinez@example.com', packageType: 'private_10', packageName: '10 Private Lessons', purchaseDate: new Date('2026-02-06'), amountPaid: 800, transactionId: 'demo_txn_5', source: 'paid', totalLessons: 10, lessonsUsed: 3 },
          
          // Week 2 - Peak performance
          { id: 'demo_6', userId: 'demo_user_6', userName: 'David Thompson', userEmail: 'dthompson@example.com', packageType: 'semi_private_8', packageName: '8 Semi-Private Sessions', purchaseDate: new Date('2026-02-09'), amountPaid: 600, transactionId: 'demo_txn_6', source: 'paid', totalLessons: 8, lessonsUsed: 2 },
          { id: 'demo_7', userId: 'demo_user_7', userName: 'Amanda Lee', userEmail: 'alee@example.com', packageType: 'private_10', packageName: '10 Private Lessons', purchaseDate: new Date('2026-02-10'), amountPaid: 800, transactionId: 'demo_txn_7', source: 'paid', totalLessons: 10, lessonsUsed: 4 },
          { id: 'demo_8', userId: 'demo_user_8', userName: 'Chris Anderson', userEmail: 'canderson@example.com', packageType: 'group_20', packageName: '20 Group Sessions', purchaseDate: new Date('2026-02-11'), amountPaid: 400, transactionId: 'demo_txn_8', source: 'paid', totalLessons: 20, lessonsUsed: 6 },
          { id: 'demo_9', userId: 'demo_user_9', userName: 'Jessica Brown', userEmail: 'jbrown@example.com', packageType: 'private_20', packageName: '20 Private Lessons', purchaseDate: new Date('2026-02-12'), amountPaid: 1500, transactionId: 'demo_txn_9', source: 'paid', totalLessons: 20, lessonsUsed: 1 },
          { id: 'demo_10', userId: 'demo_user_10', userName: 'Robert Davis', userEmail: 'rdavis@example.com', packageType: 'elite_unlimited', packageName: 'Elite Unlimited Monthly', purchaseDate: new Date('2026-02-13'), amountPaid: 1200, transactionId: 'demo_txn_10', source: 'paid', totalLessons: 0, lessonsUsed: 0 },
          { id: 'demo_11', userId: 'demo_user_11', userName: 'Nicole Garcia', userEmail: 'ngarcia@example.com', packageType: 'private_5', packageName: '5 Private Lessons', purchaseDate: new Date('2026-02-13'), amountPaid: 425, transactionId: 'demo_txn_11', source: 'paid', totalLessons: 5, lessonsUsed: 2 },
          
          // Week 3 - Consistent growth
          { id: 'demo_12', userId: 'demo_user_12', userName: 'Kevin White', userEmail: 'kwhite@example.com', packageType: 'semi_private_8', packageName: '8 Semi-Private Sessions', purchaseDate: new Date('2026-02-16'), amountPaid: 600, transactionId: 'demo_txn_12', source: 'paid', totalLessons: 8, lessonsUsed: 1 },
          { id: 'demo_13', userId: 'demo_user_13', userName: 'Rachel Taylor', userEmail: 'rtaylor@example.com', packageType: 'private_10', packageName: '10 Private Lessons', purchaseDate: new Date('2026-02-17'), amountPaid: 800, transactionId: 'demo_txn_13', source: 'paid', totalLessons: 10, lessonsUsed: 5 },
          { id: 'demo_14', userId: 'demo_user_14', userName: 'Tom Harris', userEmail: 'tharris@example.com', packageType: 'group_20', packageName: '20 Group Sessions', purchaseDate: new Date('2026-02-18'), amountPaid: 400, transactionId: 'demo_txn_14', source: 'paid', totalLessons: 20, lessonsUsed: 7 },
          { id: 'demo_15', userId: 'demo_user_15', userName: 'Sophia Clark', userEmail: 'sclark@example.com', packageType: 'private_20', packageName: '20 Private Lessons', purchaseDate: new Date('2026-02-19'), amountPaid: 1500, transactionId: 'demo_txn_15', source: 'paid', totalLessons: 20, lessonsUsed: 3 },
          { id: 'demo_16', userId: 'demo_user_16', userName: 'Daniel Lewis', userEmail: 'dlewis@example.com', packageType: 'private_10', packageName: '10 Private Lessons', purchaseDate: new Date('2026-02-20'), amountPaid: 800, transactionId: 'demo_txn_16', source: 'paid', totalLessons: 10, lessonsUsed: 2 },
          
          // Week 4 - Strong finish
          { id: 'demo_17', userId: 'demo_user_17', userName: 'Olivia Walker', userEmail: 'owalker@example.com', packageType: 'elite_unlimited', packageName: 'Elite Unlimited Monthly', purchaseDate: new Date('2026-02-23'), amountPaid: 1200, transactionId: 'demo_txn_17', source: 'paid', totalLessons: 0, lessonsUsed: 0 },
          { id: 'demo_18', userId: 'demo_user_18', userName: 'Matthew Hall', userEmail: 'mhall@example.com', packageType: 'private_5', packageName: '5 Private Lessons', purchaseDate: new Date('2026-02-24'), amountPaid: 425, transactionId: 'demo_txn_18', source: 'paid', totalLessons: 5, lessonsUsed: 1 },
          { id: 'demo_19', userId: 'demo_user_19', userName: 'Emma Young', userEmail: 'eyoung@example.com', packageType: 'semi_private_8', packageName: '8 Semi-Private Sessions', purchaseDate: new Date('2026-02-25'), amountPaid: 600, transactionId: 'demo_txn_19', source: 'paid', totalLessons: 8, lessonsUsed: 3 },
          { id: 'demo_20', userId: 'demo_user_20', userName: 'Nathan King', userEmail: 'nking@example.com', packageType: 'private_10', packageName: '10 Private Lessons', purchaseDate: new Date('2026-02-26'), amountPaid: 800, transactionId: 'demo_txn_20', source: 'paid', totalLessons: 10, lessonsUsed: 4 },
          { id: 'demo_21', userId: 'demo_user_21', userName: 'Ava Scott', userEmail: 'ascott@example.com', packageType: 'group_20', packageName: '20 Group Sessions', purchaseDate: new Date('2026-02-27'), amountPaid: 400, transactionId: 'demo_txn_21', source: 'paid', totalLessons: 20, lessonsUsed: 2 },
          { id: 'demo_22', userId: 'demo_user_22', userName: 'Ethan Green', userEmail: 'egreen@example.com', packageType: 'private_20', packageName: '20 Private Lessons', purchaseDate: new Date('2026-02-27'), amountPaid: 1500, transactionId: 'demo_txn_22', source: 'paid', totalLessons: 20, lessonsUsed: 1 },
          
          // Some admin-added passes
          { id: 'demo_23', userId: 'demo_user_23', userName: 'Isabella Adams', userEmail: 'iadams@example.com', packageType: 'comp_pass', packageName: 'Complimentary Pass', purchaseDate: new Date('2026-02-15'), amountPaid: 0, transactionId: 'ADMIN_ADDED_demo_23', source: 'admin_added', totalLessons: 5, lessonsUsed: 0 },
          { id: 'demo_24', userId: 'demo_user_24', userName: 'Mason Nelson', userEmail: 'mnelson@example.com', packageType: 'comp_pass', packageName: 'Complimentary Pass', purchaseDate: new Date('2026-02-22'), amountPaid: 0, transactionId: 'ADMIN_ADDED_demo_24', source: 'admin_added', totalLessons: 3, lessonsUsed: 1 },
        ];
        
        // Add demo packages to loaded packages
        loadedPackages.push(...demoPackages);
        console.log(`🎬 Added ${demoPackages.length} demo packages. Total revenue: $${demoPackages.filter(p => p.source === 'paid').reduce((sum, p) => sum + p.amountPaid, 0).toFixed(2)}`);
      }
      
      setPackages(loadedPackages);
      generateChartData(loadedPackages, startDate, endDate);
      generateRevenueByType(loadedPackages);
      
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateChartData(packages: PackageRevenue[], startDate: Date, endDate: Date) {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data: DailyRevenue[] = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayPackages = packages.filter(pkg => 
        format(pkg.purchaseDate, 'yyyy-MM-dd') === dayStr
      );
      
      const paidRevenue = dayPackages
        .filter(p => p.source === 'paid')
        .reduce((sum, p) => sum + p.amountPaid, 0);
        
      const adminRevenue = dayPackages
        .filter(p => p.source === 'admin_added')
        .reduce((sum, p) => sum + p.amountPaid, 0);
        
      const paidPassCount = dayPackages.filter(p => p.source === 'paid').length;
      const adminPassCount = dayPackages.filter(p => p.source === 'admin_added').length;
      
      return {
        date: format(day, 'MMM d'),
        paidRevenue: parseFloat(paidRevenue.toFixed(2)),
        adminRevenue: parseFloat(adminRevenue.toFixed(2)),
        totalRevenue: parseFloat((paidRevenue + adminRevenue).toFixed(2)),
        paidPassCount,
        adminPassCount,
        totalPassCount: paidPassCount + adminPassCount
      };
    });
    

    setChartData(data);
  }

  function generateRevenueByType(packages: PackageRevenue[]) {
    const typeMap = new Map<string, {
      packageName: string;
      count: number;
      paidCount: number;
      adminCount: number;
      revenue: number;
    }>();
    
    for (const pkg of packages) {
      const key = pkg.packageType || 'unknown';
      
      if (!typeMap.has(key)) {
        typeMap.set(key, {
          packageName: pkg.packageName,
          count: 0,
          paidCount: 0,
          adminCount: 0,
          revenue: 0
        });
      }
      
      const entry = typeMap.get(key)!;
      entry.count++;
      entry.revenue += pkg.amountPaid;
      
      if (pkg.source === 'paid') {
        entry.paidCount++;
      } else {
        entry.adminCount++;
      }
    }
    
    const revenueByTypeArray: RevenueByType[] = Array.from(typeMap.entries()).map(([type, data]) => ({
      packageType: type,
      packageName: data.packageName,
      count: data.count,
      paidCount: data.paidCount,
      adminCount: data.adminCount,
      revenue: data.revenue,
      avgPrice: data.count > 0 ? data.revenue / data.count : 0
    }));
    
    revenueByTypeArray.sort((a, b) => b.revenue - a.revenue);
    setRevenueByType(revenueByTypeArray);
  }

  function applyFilters() {
    let filtered = [...packages];
    
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(p => p.source === sourceFilter);
    }
    
    if (packageFilter !== 'all') {
      filtered = filtered.filter(p => p.packageType === packageFilter);
    }
    
    if (userSearch.trim()) {
      const search = userSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.userName.toLowerCase().includes(search) ||
        p.userEmail.toLowerCase().includes(search)
      );
    }
    
    setFilteredPackages(filtered);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  const sortedPackages = [...filteredPackages].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'date':
        comparison = a.purchaseDate.getTime() - b.purchaseDate.getTime();
        break;
      case 'user':
        comparison = a.userName.localeCompare(b.userName);
        break;
      case 'package':
        comparison = a.packageName.localeCompare(b.packageName);
        break;
      case 'amount':
        comparison = a.amountPaid - b.amountPaid;
        break;
      case 'source':
        comparison = a.source.localeCompare(b.source);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  function exportToCSV() {
    const headers = ['Date', 'User', 'Email', 'Package', 'Amount', 'Source', 'Transaction ID', 'Total Lessons', 'Used'];
    const rows = sortedPackages.map(pkg => [
      format(pkg.purchaseDate, 'yyyy-MM-dd'),
      pkg.userName,
      pkg.userEmail,
      pkg.packageName,
      `$${pkg.amountPaid.toFixed(2)}`,
      pkg.source === 'paid' ? 'Paid' : 'Admin Added',
      pkg.transactionId,
      pkg.totalLessons.toString(),
      pkg.lessonsUsed.toString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  }

  // Get unique package types for filter
  const uniquePackageTypes = Array.from(new Set(packages.map(p => p.packageType)));

  // Calculate summary stats
  const totalRevenue = filteredPackages.reduce((sum, p) => sum + p.amountPaid, 0);
  const paidRevenue = filteredPackages.filter(p => p.source === 'paid').reduce((sum, p) => sum + p.amountPaid, 0);
  const adminRevenue = filteredPackages.filter(p => p.source === 'admin_added').reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPassesSold = filteredPackages.length;
  const paidPasses = filteredPackages.filter(p => p.source === 'paid').length;
  const adminPasses = filteredPackages.filter(p => p.source === 'admin_added').length;
  const avgTransactionValue = totalPassesSold > 0 ? totalRevenue / totalPassesSold : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        
        {/* Charts */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        
        {/* Table */}
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Revenue Report</h1>
          <p className="text-foreground/70 mt-1">Comprehensive revenue analytics and package sales tracking</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          aria-label="Export revenue data to CSV file"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Range Type</label>
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="month">Specific Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {dateRangeType === 'month' && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {monthOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {dateRangeType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm text-muted-foreground mt-1">
              ${paidRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid, ${adminRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} admin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Passes Sold
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalPassesSold}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {paidPasses} paid, {adminPasses} admin added
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">${avgTransactionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Per package sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium">Paid Conversion</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">
              {totalPassesSold > 0 ? ((paidPasses / totalPassesSold) * 100).toFixed(1) : '0'}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {paidPasses} of {totalPassesSold} were paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueComposedChart data={chartData} />
        </CardContent>
      </Card>

      {/* Revenue by Package Type */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Package Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Package Type</th>
                  <th className="p-3 text-right font-medium">Total Sold</th>
                  <th className="p-3 text-right font-medium">Paid</th>
                  <th className="p-3 text-right font-medium">Admin Added</th>
                  <th className="p-3 text-right font-medium">Total Revenue</th>
                  <th className="p-3 text-right font-medium">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {revenueByType.map((item) => (
                  <tr key={item.packageType} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{item.packageName}</td>
                    <td className="p-3 text-right">{item.count}</td>
                    <td className="p-3 text-right text-green-600">{item.paidCount}</td>
                    <td className="p-3 text-right text-orange-600">{item.adminCount}</td>
                    <td className="p-3 text-right font-medium">${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-muted-foreground">${item.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {revenueByType.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No revenue data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Sources</option>
                <option value="paid">Paid Only</option>
                <option value="admin_added">Admin Added Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Package Type</label>
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Packages</option>
                {uniquePackageTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search User</label>
              <input
                type="text"
                placeholder="Name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Package Sales Detail ({sortedPackages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Date
                      {sortField === 'date' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('user')} className="flex items-center gap-1 font-medium hover:text-primary">
                      User
                      {sortField === 'user' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('package')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Package
                      {sortField === 'package' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button onClick={() => handleSort('amount')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Amount
                      {sortField === 'amount' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('source')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Source
                      {sortField === 'source' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-right">Lessons</th>
                </tr>
              </thead>
              <tbody>
                {sortedPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{format(pkg.purchaseDate, 'MMM d, yyyy')}</td>
                    <td className="p-3">
                      <div className="font-medium">{pkg.userName}</div>
                      <div className="text-muted-foreground text-xs truncate max-w-[200px]">{pkg.userEmail}</div>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {pkg.packageName}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${pkg.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        pkg.source === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {pkg.source === 'paid' ? 'Paid' : 'Admin Added'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-xs">
                      {pkg.lessonsUsed} / {pkg.totalLessons}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {sortedPackages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No packages found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
