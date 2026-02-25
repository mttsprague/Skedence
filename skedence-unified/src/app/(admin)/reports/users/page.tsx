'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionEnforcement } from '@/hooks/useSubscriptionEnforcement';
import { SubscriptionPaywall } from '@/components/admin/subscription-paywall';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, parseISO, addMonths, differenceInDays } from 'date-fns';
import { Download, Calendar, Filter, ArrowUpDown, Users, TrendingUp, UserPlus } from 'lucide-react';
import { Skeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

interface Athlete {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  position?: string;
  experienceLevel?: string;
  schoolClubTeam?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
  athletes: Athlete[];
  athleteCount: number;
  athleteNames: string[];
  daysSinceSignup: number;
}

interface ChartData {
  date: string;
  signups: number;
  cumulativeSignups: number;
}

type DateRangeType = 'month' | 'custom' | 'all';
type SortField = 'name' | 'email' | 'createdAt' | 'athletes';
type SortDirection = 'asc' | 'desc';

export default function UsersReportPage() {
  const { orgId } = useAuth();
  const { subscription, isLoading: subLoading, canAccessFeature, getBlockReason } = useSubscriptionEnforcement(orgId);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  
  // Filters
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [nameSearch, setNameSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [athleteFilter, setAthleteFilter] = useState<'all' | 'has' | 'none'>('all');
  
  // Check subscription access
  if (!subLoading && !canAccessFeature('canAccessReports')) {
    const reason = getBlockReason('canAccessReports');
    return (
      <SubscriptionPaywall
        feature="User Analytics"
        reason={reason || undefined}
        currentPlan={subscription?.plan}
        suggestedPlan="starter"
      />
    );
  }
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Month options: 4 future + current + 24 past
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

  useEffect(() => {
    if (!orgId) return;
    loadUsers();
  }, [orgId]);

  useEffect(() => {
    applyFiltersAndChart();
  }, [users, dateRangeType, selectedMonth, customStartDate, customEndDate, nameSearch, emailSearch, athleteFilter]);

  // Keyboard shortcut: Ctrl+E to export
  useEffect(() => {
    const handleExport = () => exportToCSV();
    window.addEventListener('trigger-export', handleExport);
    return () => window.removeEventListener('trigger-export', handleExport);
  }, []); // Empty deps - exportToCSV uses local variables

  async function loadUsers() {
    if (!orgId) return;
    
    try {
      setLoading(true);

      // Load all client members
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const userIds = orgMembersSnapshot.docs.map(doc => doc.data().userId);

      // Batch load users (Firestore 'in' query limited to 30)
      const loadedUsers: User[] = [];
      const batchSize = 30;
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const usersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', batch)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        for (const userDoc of usersSnapshot.docs) {
          const data = userDoc.data();
          
          let createdAt: Date;
          if (data.createdAt) {
            createdAt = data.createdAt.toDate();
          } else {
            // Fallback to current date if no createdAt
            createdAt = new Date();
          }
          
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          const name = `${firstName} ${lastName}`.trim() || 'Unknown User';
          const email = data.emailAddress || data.email || '';
          const phoneNumber = data.phoneNumber || '';
          
          // Extract athletes - support both NEW array format and LEGACY flat field format
          let athletes: Athlete[] = [];
          
          if (data.athletes && Array.isArray(data.athletes)) {
            // NEW FORMAT: athletes array
            athletes = data.athletes as Athlete[];
          } else {
            // LEGACY FORMAT: Flat fields (athleteFirstName, athlete2FirstName, athlete3FirstName, etc.)
            // Extract up to 3 athletes from legacy format
            const legacyAthletes: Athlete[] = [];
            
            // Athlete 1 (no number suffix)
            if (data.athleteFirstName || data.athleteLastName) {
              legacyAthletes.push({
                firstName: data.athleteFirstName || '',
                lastName: data.athleteLastName || '',
                birthday: data.athleteBirthday || '',
                position: data.athletePosition || '',
                experienceLevel: data.athleteExperienceLevel || '',
                schoolClubTeam: data.athleteSchoolClubTeam || ''
              });
            }
            
            // Athlete 2
            if (data.athlete2FirstName || data.athlete2LastName) {
              legacyAthletes.push({
                firstName: data.athlete2FirstName || '',
                lastName: data.athlete2LastName || '',
                birthday: data.athlete2Birthday || '',
                position: data.athlete2Position || '',
                experienceLevel: data.athlete2ExperienceLevel || '',
                schoolClubTeam: data.athlete2SchoolClubTeam || ''
              });
            }
            
            // Athlete 3
            if (data.athlete3FirstName || data.athlete3LastName) {
              legacyAthletes.push({
                firstName: data.athlete3FirstName || '',
                lastName: data.athlete3LastName || '',
                birthday: data.athlete3Birthday || '',
                position: data.athlete3Position || '',
                experienceLevel: data.athlete3ExperienceLevel || '',
                schoolClubTeam: data.athlete3SchoolClubTeam || ''
              });
            }
            
            athletes = legacyAthletes;
          }
          
          const athleteCount = athletes.length;
          
          // Extract athlete names for display
          const athleteNames = athletes.map(athlete => {
            const athleteFirstName = athlete.firstName || '';
            const athleteLastName = athlete.lastName || '';
            const fullName = `${athleteFirstName} ${athleteLastName}`.trim();
            
            // Return full name if we have it, otherwise try individual parts, otherwise 'Athlete'
            if (fullName) {
              return fullName;
            } else if (athleteFirstName) {
              return athleteFirstName;
            } else if (athleteLastName) {
              return athleteLastName;
            } else {
              return 'Athlete'; // Fallback for athlete with no name
            }
          });
          
          const daysSinceSignup = differenceInDays(new Date(), createdAt);
          
          loadedUsers.push({
            id: userDoc.id,
            firstName,
            lastName,
            name,
            email,
            phoneNumber,
            createdAt,
            athletes,
            athleteCount,
            athleteNames,
            daysSinceSignup
          });
        }
      }
      
      setUsers(loadedUsers);
      
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFiltersAndChart() {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (dateRangeType === 'month') {
      startDate = startOfMonth(parseISO(`${selectedMonth}-01`));
      endDate = endOfMonth(startDate);
    } else if (dateRangeType === 'custom') {
      startDate = parseISO(customStartDate);
      endDate = parseISO(customEndDate);
    }
    // 'all' means no date filter
    
    let filtered = [...users];
    
    // Date filter
    if (startDate && endDate) {
      filtered = filtered.filter(u => u.createdAt >= startDate! && u.createdAt <= endDate!);
    }
    
    // Name search
    if (nameSearch.trim()) {
      const search = nameSearch.toLowerCase();
      filtered = filtered.filter(u => u.name.toLowerCase().includes(search));
    }
    
    // Email search
    if (emailSearch.trim()) {
      const search = emailSearch.toLowerCase();
      filtered = filtered.filter(u => u.email.toLowerCase().includes(search));
    }
    
    // Athlete filter
    if (athleteFilter === 'has') {
      filtered = filtered.filter(u => u.athleteCount > 0);
    } else if (athleteFilter === 'none') {
      filtered = filtered.filter(u => u.athleteCount === 0);
    }
    
    setFilteredUsers(filtered);
    generateChartData(filtered, startDate, endDate);
  }

  function generateChartData(users: User[], startDate: Date | null, endDate: Date | null) {
    if (!startDate || !endDate) {
      // For "all time", show monthly aggregation
      const monthlyData = new Map<string, number>();
      let cumulativeCount = 0;
      
      const sortedUsers = [...users].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      for (const user of sortedUsers) {
        const monthKey = format(user.createdAt, 'yyyy-MM');
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
      }
      
      const data: ChartData[] = [];
      const sortedMonths = Array.from(monthlyData.keys()).sort();
      
      for (const month of sortedMonths) {
        const count = monthlyData.get(month) || 0;
        cumulativeCount += count;
        data.push({
          date: format(parseISO(`${month}-01`), 'MMM yyyy'),
          signups: count,
          cumulativeSignups: cumulativeCount
        });
      }
      
      setChartData(data);
    } else {
      // For specific date range, show daily aggregation
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      let cumulativeCount = 0;
      
      const data: ChartData[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const daySignups = users.filter(u => 
          format(u.createdAt, 'yyyy-MM-dd') === dayStr
        ).length;
        
        cumulativeCount += daySignups;
        
        return {
          date: format(day, 'MMM d'),
          signups: daySignups,
          cumulativeSignups: cumulativeCount
        };
      });
      
      setChartData(data);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'athletes':
        comparison = a.athleteCount - b.athleteCount;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  function exportToCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Signup Date', 'Days Since Signup', 'Athletes', 'Athlete Names'];
    const rows = sortedUsers.map(user => [
      user.name,
      user.email,
      user.phoneNumber,
      format(user.createdAt, 'yyyy-MM-dd'),
      user.daysSinceSignup.toString(),
      user.athleteCount.toString(),
      user.athleteNames.join('; ')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  }

  // Calculate summary stats
  const totalSignups = filteredUsers.length;
  const totalAthletes = filteredUsers.reduce((sum, u) => sum + u.athleteCount, 0);
  const avgAthletesPerUser = totalSignups > 0 ? totalAthletes / totalSignups : 0;
  const usersWithAthletes = filteredUsers.filter(u => u.athleteCount > 0).length;
  const avgDaysSinceSignup = totalSignups > 0 
    ? filteredUsers.reduce((sum, u) => sum + u.daysSinceSignup, 0) / totalSignups 
    : 0;

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
        
        {/* Chart */}
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
          <h1 className="text-3xl font-bold">Users Report</h1>
          <p className="text-foreground/70 mt-1">Client signup analytics and user demographics</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          aria-label="Export user data to CSV file"
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
                <option value="all">All Time</option>
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
              <UserPlus className="h-4 w-4" />
              Total Signups
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalSignups}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {usersWithAthletes} have athletes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Athletes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalAthletes}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Athletes/User
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{avgAthletesPerUser.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Per user account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium">Avg Account Age</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{avgDaysSinceSignup.toFixed(0)} days</div>
            <p className="text-sm text-muted-foreground mt-1">
              Since signup
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Signup Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Signups Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="signups" fill="#3b82f6" name="New Signups" />
              <Line yAxisId="right" type="monotone" dataKey="cumulativeSignups" stroke="#10b981" name="Total Signups" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
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
              <label className="block text-sm font-medium mb-2">Search Name</label>
              <input
                type="text"
                placeholder="User name..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search Email</label>
              <input
                type="text"
                placeholder="Email address..."
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Athletes Filter</label>
              <select
                value={athleteFilter}
                onChange={(e) => setAthleteFilter(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Users</option>
                <option value="has">Has Athletes</option>
                <option value="none">No Athletes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Details ({sortedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Name
                      {sortField === 'name' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Email
                      {sortField === 'email' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Signup Date
                      {sortField === 'createdAt' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-center">
                    <button onClick={() => handleSort('athletes')} className="flex items-center justify-center gap-1 font-medium hover:text-primary mx-auto">
                      Athletes
                      {sortField === 'athletes' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">Athlete Names</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{user.name}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{user.email}</td>
                    <td className="p-3 text-muted-foreground">{user.phoneNumber || '-'}</td>
                    <td className="p-3">
                      <div className="font-medium">{format(user.createdAt, 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.daysSinceSignup} days ago
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        user.athleteCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.athleteCount}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {user.athleteNames.length > 0 ? user.athleteNames.join(', ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {sortedUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching your filters
            </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
