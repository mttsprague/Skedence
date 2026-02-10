'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Download, ArrowUpDown, UserPlus } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  phoneNumber?: string;
  athletes?: Array<{
    firstName?: string;
    lastName?: string;
  }>;
}

interface ChartData {
  date: string;
  signups: number;
}

type SortField = 'name' | 'email' | 'createdAt' | 'athletes';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filters
  const [dateRange, setDateRange] = useState(format(new Date(), 'yyyy-MM'));
  
  // Generate month options: current + all past months + "All"
  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Add "All" option
    options.push({ value: 'all', label: 'All Time' });
    
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
    loadUsers();
  }, [orgId, dateRange]);

  async function loadUsers() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      // Handle date range filtering
      if (dateRange !== 'all') {
        startDate = startOfMonth(parseISO(`${dateRange}-01`));
        endDate = endOfMonth(startDate);
      }

      // Query users from orgMembers collection
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const userIds = orgMembersSnapshot.docs.map(doc => doc.data().userId);

      if (userIds.length === 0) {
        setUsers([]);
        setChartData([]);
        setLoading(false);
        return;
      }

      // Load user details
      const loadedUsers: User[] = [];
      
      // Firestore 'in' queries can only handle 30 items at a time
      const chunkSize = 30;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const usersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', chunk)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt || Date.now());

          // Filter by date range if specified
          if (dateRange !== 'all') {
            if (startDate && endDate) {
              if (createdAt < startDate || createdAt > endDate) {
                return; // Skip this user
              }
            }
          }

          loadedUsers.push({
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber,
            createdAt,
            athletes: data.athletes || []
          });
        });
      }

      // Sort users by createdAt descending by default
      loadedUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setUsers(loadedUsers);
      
      // Generate chart data
      if (dateRange !== 'all' && startDate && endDate) {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyData: ChartData[] = days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const signups = loadedUsers.filter(user => 
            format(user.createdAt, 'yyyy-MM-dd') === dayStr
          ).length;
          
          return {
            date: format(day, 'MMM d'),
            signups
          };
        });
        setChartData(dailyData);
      } else {
        // For "All Time", group by month
        const monthlyMap = new Map<string, number>();
        loadedUsers.forEach(user => {
          const month = format(user.createdAt, 'MMM yyyy');
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
        });
        
        const monthlyData: ChartData[] = Array.from(monthlyMap.entries())
          .map(([month, signups]) => ({ date: month, signups }))
          .sort((a, b) => {
            const dateA = parseISO(a.date.replace(' ', '-01-'));
            const dateB = parseISO(b.date.replace(' ', '-01-'));
            return dateA.getTime() - dateB.getTime();
          });
        
        setChartData(monthlyData);
      }
      
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'athletes':
        comparison = (a.athletes?.length || 0) - (b.athletes?.length || 0);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  function exportToCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Athletes', 'Sign Up Date'];
    const rows = sortedUsers.map(user => [
      `${user.firstName} ${user.lastName}`,
      user.email,
      user.phoneNumber || '',
      user.athletes?.map(a => `${a.firstName || ''} ${a.lastName || ''}`).join(', ') || '0',
      format(user.createdAt, 'yyyy-MM-dd HH:mm')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${dateRange}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Sign-ups</h1>
          <p className="text-gray-600 mt-1">Track new client registrations</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2a4a8a] transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
              >
                {monthOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Sign-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Athletes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users.reduce((sum, user) => sum + (user.athletes?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Avg Athletes per User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users.length > 0 
                ? (users.reduce((sum, user) => sum + (user.athletes?.length || 0), 0) / users.length).toFixed(1)
                : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sign-ups Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="#3258A3" 
                  strokeWidth={2}
                  name="New Sign-ups"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No sign-up data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({sortedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 font-semibold hover:text-[#3258A3]"
                    >
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 font-semibold hover:text-[#3258A3]"
                    >
                      Email
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('athletes')}
                      className="flex items-center gap-2 font-semibold hover:text-[#3258A3]"
                    >
                      Athletes
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-2 font-semibold hover:text-[#3258A3]"
                    >
                      Sign Up Date
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4 text-gray-600">{user.phoneNumber || '-'}</td>
                    <td className="py-3 px-4">
                      {user.athletes && user.athletes.length > 0 ? (
                        <div className="text-sm">
                          {user.athletes.map((athlete, idx) => (
                            <div key={idx}>
                              {athlete.firstName} {athlete.lastName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No athletes</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(user.createdAt, 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
