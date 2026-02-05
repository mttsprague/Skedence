'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Download, ArrowUpDown } from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
  passes?: number;
}

interface PackageRevenue {
  packageType: string;
  count: number;
  paidCount: number;
  adminAddedCount: number;
  totalRevenue: number;
}

type SortField = 'packageType' | 'count' | 'paidCount' | 'adminAddedCount' | 'totalRevenue';
type SortDirection = 'asc' | 'desc';
type ChartFilter = 'all' | 'paid' | 'adminAdded' | 'none';

export default function RevenuePage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<RevenueData[]>([]);
  const [tableData, setTableData] = useState<PackageRevenue[]>([]);
  const [sortField, setSortField] = useState<SortField>('packageType');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Filters
  const [dateRange, setDateRange] = useState(format(new Date(), 'yyyy-MM'));
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');

  // Generate month options: 4 months future + current + all past months + "All"
  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Add "All" option
    options.push({ value: 'all', label: 'All Time (Past)' });
    
    // Add 4 months into the future
    for (let i = 4; i >= 1; i--) {
      const futureDate = new Date(currentYear, currentMonth + i, 1);
      options.push({
        value: format(futureDate, 'yyyy-MM'),
        label: format(futureDate, 'MMMM yyyy')
      });
    }
    
    // Add current month
    options.push({
      value: format(now, 'yyyy-MM'),
      label: format(now, 'MMMM yyyy') + ' (Current)'
    });
    
    // Add all past months (going back 24 months)
    for (let i = 1; i <= 24; i++) {
      const pastDate = new Date(currentYear, currentMonth - i, 1);
      options.push({
        value: format(pastDate, 'yyyy-MM'),
        label: format(pastDate, 'MMMM yyyy')
      });
    }
    
    return options;
  })();

  useEffect(() => {
    if (!orgId) return;
    loadRevenue();
  }, [orgId, dateRange]);

  // Separate chart data that tracks paid vs admin added separately
  const [dailyPaidRevenue, setDailyPaidRevenue] = useState<{ [key: string]: number }>({});
  const [dailyAdminRevenue, setDailyAdminRevenue] = useState<{ [key: string]: number }>({});
  const [dailyPaidPasses, setDailyPaidPasses] = useState<{ [key: string]: number }>({});
  const [dailyAdminPasses, setDailyAdminPasses] = useState<{ [key: string]: number }>({});
  const [dailyAllPasses, setDailyAllPasses] = useState<{ [key: string]: number }>({});

  async function loadRevenue() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      
      console.log('Revenue: Selected dateRange:', dateRange);
      
      let startDate: Date;
      let endDate: Date;
      
      // Handle "All" date range - all past data only
      if (dateRange === 'all') {
        startDate = new Date(2020, 0, 1); // Start from Jan 1, 2020
        endDate = new Date(); // Up to now
      } else {
        startDate = startOfMonth(parseISO(`${dateRange}-01`));
        endDate = endOfMonth(startDate);
      }
      
      console.log('Revenue: Date range calculated:', startDate, 'to', endDate);

      // Get all org members to find clients
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      const orgMembersSnap = await getDocs(orgMembersQuery);

      const dailyRevenue: { [key: string]: number } = {};
      const dailyPaid: { [key: string]: number } = {};
      const dailyAdmin: { [key: string]: number } = {};
      const dailyPassesAll: { [key: string]: number } = {};
      const dailyPassesPaid: { [key: string]: number } = {};
      const dailyPassesAdmin: { [key: string]: number } = {};
      const packageRevenue: { [key: string]: { count: number; paidCount: number; adminAddedCount: number; total: number } } = {};

      // Process each client's packages
      for (const memberDoc of orgMembersSnap.docs) {
        const memberData = memberDoc.data();
        
        try {
          // Try new organization path first
          let packagesSnap = await getDocs(
            collection(db, 'organizations', orgId, 'users', memberData.userId, 'packages')
          );
          
          // Fall back to old path if no packages found
          if (packagesSnap.empty) {
            packagesSnap = await getDocs(
              collection(db, 'users', memberData.userId, 'lessonPackages')
            );
          }
          
          for (const pkgDoc of packagesSnap.docs) {
            const pkgData = pkgDoc.data();
            
            console.log('Revenue: Processing package', pkgDoc.id, 'ALL FIELDS:', Object.keys(pkgData));
            console.log('Revenue: Package full data:', pkgData);
            
            // Check if package was purchased in date range
            let purchaseDate: Date | null = null;
            if (pkgData.purchaseDate) {
              purchaseDate = pkgData.purchaseDate?.toDate?.() || new Date(pkgData.purchaseDate);
            } else if (pkgData.purchasedAt) {
              purchaseDate = pkgData.purchasedAt?.toDate?.() || new Date(pkgData.purchasedAt);
            }
            
            if (!purchaseDate) {
              console.warn('Revenue: No purchase date found for package', pkgDoc.id);
              continue;
            }
            
            if (purchaseDate < startDate || purchaseDate > endDate) {
              console.log('Revenue: Package outside date range', purchaseDate, 'range:', startDate, 'to', endDate);
              continue;
            }
            
            const isAdminAdded = pkgData.transactionId?.startsWith('ADMIN_ADDED');
            const revenue = pkgData.amountPaid ? pkgData.amountPaid / 100 : 0; // Convert cents to dollars
            const dateKey = format(purchaseDate, 'yyyy-MM-dd');
            
            if (!pkgData.amountPaid) {
              console.warn('Revenue: No amountPaid for package', pkgDoc.id, '- counting package but $0 revenue');
            } else {
              console.log('Revenue: Adding revenue', revenue, 'for date', dateKey);
            }
            
            // Track daily revenue (all)
            dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + revenue;
            
            // Track paid vs admin added separately for chart
            if (isAdminAdded) {
              dailyAdmin[dateKey] = (dailyAdmin[dateKey] || 0) + revenue;
              dailyPassesAdmin[dateKey] = (dailyPassesAdmin[dateKey] || 0) + 1;
            } else {
              dailyPaid[dateKey] = (dailyPaid[dateKey] || 0) + revenue;
              dailyPassesPaid[dateKey] = (dailyPassesPaid[dateKey] || 0) + 1;
            }
            
            // Track all passes
            dailyPassesAll[dateKey] = (dailyPassesAll[dateKey] || 0) + 1;
            
            // Track package type revenue - count package even if no revenue
            const packageType = pkgData.packageType || pkgData.packageName || 'Unknown Package';
            if (!packageRevenue[packageType]) {
              packageRevenue[packageType] = { count: 0, paidCount: 0, adminAddedCount: 0, total: 0 };
            }
            packageRevenue[packageType].count += 1;
            if (isAdminAdded) {
              packageRevenue[packageType].adminAddedCount += 1;
            } else {
              packageRevenue[packageType].paidCount += 1;
            }
            packageRevenue[packageType].total += revenue;
          }
        } catch (err) {
          console.warn('Revenue: Could not load packages for user', memberData.userId, err);
        }
      }

      // Process chart data based on filter
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const chartDataArray: RevenueData[] = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        let revenueValue = 0;
        let passesValue: number | undefined;
        
        if (chartFilter === 'all') {
          revenueValue = dailyRevenue[dateKey] || 0;
          passesValue = dailyPassesAll[dateKey] || 0;
        } else if (chartFilter === 'paid') {
          revenueValue = dailyPaid[dateKey] || 0;
          passesValue = dailyPassesPaid[dateKey] || 0;
        } else if (chartFilter === 'adminAdded') {
          revenueValue = dailyAdmin[dateKey] || 0;
          passesValue = dailyPassesAdmin[dateKey] || 0;
        } else if (chartFilter === 'none') {
          revenueValue = dailyRevenue[dateKey] || 0;
          passesValue = undefined; // Don't show passes line
        }
        
        return {
          date: format(day, 'MMM d'),
          revenue: revenueValue,
          passes: passesValue
        };
      });
      
      setChartData(chartDataArray);
      setDailyPaidRevenue(dailyPaid);
      setDailyAdminRevenue(dailyAdmin);
      setDailyPaidPasses(dailyPassesPaid);
      setDailyAdminPasses(dailyPassesAdmin);
      setDailyAllPasses(dailyPassesAll);

      // Process table data
      const tableDataArray: PackageRevenue[] = Object.entries(packageRevenue).map(([type, data]) => ({
        packageType: type,
        count: data.count,
        paidCount: data.paidCount,
        adminAddedCount: data.adminAddedCount,
        totalRevenue: data.total
      }));
      
      setTableData(tableDataArray);
      
    } catch (error) {
      console.error('Error loading revenue:', error);
    } finally {
      setLoading(false);
    }
  }

  // Update chart when filter changes
  useEffect(() => {
    if (!orgId) return;
    
    // Recalculate chart data based on filter
    const days = dateRange === 'all' 
      ? eachDayOfInterval({ start: new Date(2020, 0, 1), end: new Date() })
      : eachDayOfInterval({ 
          start: startOfMonth(parseISO(`${dateRange}-01`)), 
          end: endOfMonth(startOfMonth(parseISO(`${dateRange}-01`)))
        });
    
    const chartDataArray: RevenueData[] = days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      let revenueValue = 0;
      let passesValue: number | undefined;
      
      if (chartFilter === 'all') {
        revenueValue = (dailyPaidRevenue[dateKey] || 0) + (dailyAdminRevenue[dateKey] || 0);
        passesValue = dailyAllPasses[dateKey] || 0;
      } else if (chartFilter === 'paid') {
        revenueValue = dailyPaidRevenue[dateKey] || 0;
        passesValue = dailyPaidPasses[dateKey] || 0;
      } else if (chartFilter === 'adminAdded') {
        revenueValue = dailyAdminRevenue[dateKey] || 0;
        passesValue = dailyAdminPasses[dateKey] || 0;
      } else if (chartFilter === 'none') {
        revenueValue = (dailyPaidRevenue[dateKey] || 0) + (dailyAdminRevenue[dateKey] || 0);
        passesValue = undefined;
      }
      
      return {
        date: format(day, 'MMM d'),
        revenue: revenueValue,
        passes: passesValue
      };
    });
    
    setChartData(chartDataArray);
  }, [chartFilter, dailyPaidRevenue, dailyAdminRevenue, dailyPaidPasses, dailyAdminPasses, dailyAllPasses, dateRange]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getSortedTableData() {
    const sorted = [...tableData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    
    return sorted;
  }

  function exportToSpreadsheet() {
    const csv = [
      ['Package Type', 'Count', 'Paid', 'Admin Added', 'Total Revenue'],
      ...getSortedTableData().map(row => [
        row.packageType,
        row.count,
        row.paidCount,
        row.adminAddedCount,
        `$${row.totalRevenue.toFixed(2)}`
      ]),
      [
        'Total',
        tableData.reduce((sum, r) => sum + r.count, 0),
        tableData.reduce((sum, r) => sum + r.paidCount, 0),
        tableData.reduce((sum, r) => sum + r.adminAddedCount, 0),
        `$${tableData.reduce((sum, r) => sum + r.totalRevenue, 0).toFixed(2)}`
      ]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${dateRange}.csv`;
    a.click();
  }

  const totalCount = tableData.reduce((sum, row) => sum + row.count, 0);
  const totalPaidCount = tableData.reduce((sum, row) => sum + row.paidCount, 0);
  const totalAdminAddedCount = tableData.reduce((sum, row) => sum + row.adminAddedCount, 0);
  const totalRevenue = tableData.reduce((sum, row) => sum + row.totalRevenue, 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {dateRange === 'all' 
              ? 'Revenue Report - All Time (Past)' 
              : `Revenue Report - ${format(parseISO(`${dateRange}-01`), 'MMMM yyyy')}`
            }
          </h1>
          <p className="text-gray-600 mt-2">
            Total Revenue: <span className="font-bold text-[#3258A3] text-xl">${totalRevenue.toFixed(2)}</span>
          </p>
        </div>

        {/* Line Chart */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Chart Filter:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartFilter('all')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartFilter === 'all'
                      ? 'bg-[#3258A3] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setChartFilter('paid')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartFilter === 'paid'
                      ? 'bg-[#3258A3] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setChartFilter('adminAdded')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartFilter === 'adminAdded'
                      ? 'bg-[#3258A3] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Admin Added
                </button>
                <button
                  onClick={() => setChartFilter('none')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartFilter === 'none'
                      ? 'bg-[#3258A3] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  None
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Passes', angle: 90, position: 'insideRight' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (name === 'Revenue') {
                      return value !== undefined ? [`$${value.toFixed(2)}`, 'Revenue'] : ['$0.00', 'Revenue'];
                    }
                    if (name === 'Passes') {
                      return value !== undefined ? [value, 'Passes'] : [0, 'Passes'];
                    }
                    return [value, name || ''];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Revenue"
                  yAxisId="left"
                  dot={{ r: 3 }}
                />
                {chartFilter !== 'none' && (
                  <Line 
                    type="monotone" 
                    dataKey="passes" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Passes"
                    yAxisId="right"
                    dot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date range:
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                >
                  {monthOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={loadRevenue}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                SHOW
              </button>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={exportToSpreadsheet}
                className="text-[#3258A3] hover:underline text-sm font-medium flex items-center gap-2 ml-auto"
              >
                <Download className="h-4 w-4" />
                Export to spreadsheet
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      onClick={() => handleSort('packageType')}
                      className="text-left py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        Package Type
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('count')}
                      className="text-right py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Count
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('paidCount')}
                      className="text-right py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Paid
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('adminAddedCount')}
                      className="text-right py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Admin Added
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('totalRevenue')}
                      className="text-right py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Total Revenue
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedTableData().map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{row.packageType}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{row.count}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{row.paidCount}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{row.adminAddedCount}</td>
                      <td className="py-3 px-4 text-right text-gray-900">${row.totalRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">Total</td>
                    <td className="py-3 px-4 text-right text-gray-900">{totalCount}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{totalPaidCount}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{totalAdminAddedCount}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${totalRevenue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
