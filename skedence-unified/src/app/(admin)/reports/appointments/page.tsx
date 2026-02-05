'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Download, ArrowUpDown } from 'lucide-react';

interface Appointment {
  id: string;
  type: string;
  cost: number;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'cancelled' | 'no-show';
  duration: number;
  trainerId?: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface ChartData {
  date: string;
  scheduled: number;
  cancelled: number;
  noShow: number;
}

interface TableData {
  type: string;
  cost: number;
  quantity: number;
  total: number;
  totalHours: number;
}

type SortField = 'type' | 'cost' | 'quantity' | 'total' | 'totalHours';
type SortDirection = 'asc' | 'desc';

export default function AppointmentsPage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [sortField, setSortField] = useState<SortField>('type');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState(format(new Date(), 'yyyy-MM'));
  const [showFilter, setShowFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  
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

  // Load trainers on mount
  useEffect(() => {
    if (!orgId) return;
    loadTrainers();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    loadAppointments();
  }, [orgId, dateRange, showFilter, trainerFilter]);

  async function loadTrainers() {
    if (!orgId) return;
    try {
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId),
        where('active', '==', true)
      );
      const snapshot = await getDocs(trainersQuery);
      const loadedTrainers = snapshot.docs.map(doc => ({
        id: doc.id,
        firstName: doc.data().firstName || '',
        lastName: doc.data().lastName || ''
      }));
      setTrainers(loadedTrainers);
    } catch (error) {
      console.error('Error loading trainers:', error);
    }
  }

  async function loadAppointments() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      
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

      const loadedAppointments: Appointment[] = [];

      // Load 1-on-1 bookings from bookings collection
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('orgId', '==', orgId),
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      for (const docSnap of bookingsSnapshot.docs) {
        const data = docSnap.data();
        const startTime = data.startTime.toDate();
        const endTime = data.endTime.toDate();
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
        
        // Determine status - check both status field and boolean flags
        let status: 'scheduled' | 'cancelled' | 'no-show' = 'scheduled';
        if (data.status === 'cancelled' || data.cancelled === true) {
          status = 'cancelled';
        } else if (data.status === 'no-show' || data.noShow === true) {
          status = 'no-show';
        }
        
        // Determine type based on athletes array
        const athleteCount = Array.isArray(data.athletes) ? data.athletes.length : 1;
        const type = athleteCount > 1 ? `${athleteCount}-Athlete Session` : 'Private Session (1 Athlete)';
        
        // Use cost from booking or default based on athlete count
        const cost = data.cost || (athleteCount > 1 ? 80 + (athleteCount - 1) * 20 : 80);
        
        // Filter by trainer if specified
        if (trainerFilter !== 'all' && data.trainerId !== trainerFilter) {
          continue;
        }
        
        loadedAppointments.push({
          id: docSnap.id,
          type,
          cost,
          startTime,
          endTime,
          status,
          duration,
          trainerId: data.trainerId
        });
      }

      // Load group class registrations from classes collection
      const classesQuery = query(
        collection(db, 'classes'),
        where('orgId', '==', orgId),
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );
      
      const classesSnapshot = await getDocs(classesQuery);
      
      // For each class, get its participants to count registrations
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        const startTime = classData.startTime.toDate();
        const endTime = classData.endTime.toDate();
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        // Filter by trainer if specified
        if (trainerFilter !== 'all' && classData.trainerId !== trainerFilter) {
          continue;
        }
        
        // Query participants subcollection
        const participantsQuery = query(
          collection(db, `classes/${classDoc.id}/participants`)
        );
        const participantsSnapshot = await getDocs(participantsQuery);
        
        // Each participant is one registration
        for (const participantDoc of participantsSnapshot.docs) {
          const participantData = participantDoc.data();
          
          // Determine status for this registration
          let status: 'scheduled' | 'cancelled' | 'no-show' = 'scheduled';
          if (participantData.cancelled === true || participantData.status === 'cancelled') {
            status = 'cancelled';
          } else if (participantData.noShow === true || participantData.status === 'no-show') {
            status = 'no-show';
          }
          
          // Class registrations
          const cost = classData.priceInCents ? classData.priceInCents / 100 : 45;
          
          loadedAppointments.push({
            id: `${classDoc.id}-${participantDoc.id}`,
            type: 'Group Class',
            cost,
            startTime,
            endTime,
            status,
            duration,
            trainerId: classData.trainerId
          });
        }
      }
      
      setAppointments(loadedAppointments);
      processChartData(loadedAppointments, startDate, endDate);
      processTableData(loadedAppointments);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  function processChartData(appointments: Appointment[], startDate: Date, endDate: Date) {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data: ChartData[] = days.map(day => {
      const dayStr = format(day, 'MMM d');
      const dayAppointments = appointments.filter(apt => 
        format(apt.startTime, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      
      return {
        date: dayStr,
        scheduled: dayAppointments.filter(a => a.status === 'scheduled').length,
        cancelled: dayAppointments.filter(a => a.status === 'cancelled').length,
        noShow: dayAppointments.filter(a => a.status === 'no-show').length,
      };
    });
    
    setChartData(data);
  }

  function processTableData(appointments: Appointment[]) {
    // Filter based on showFilter
    let filtered = appointments;
    if (showFilter === 'scheduled') {
      filtered = appointments.filter(a => a.status === 'scheduled');
    } else if (showFilter === 'cancelled') {
      filtered = appointments.filter(a => a.status === 'cancelled');
    } else if (showFilter === 'no-show') {
      filtered = appointments.filter(a => a.status === 'no-show');
    }
    
    // Group by type
    const grouped = filtered.reduce((acc, apt) => {
      if (!acc[apt.type]) {
        acc[apt.type] = {
          type: apt.type,
          cost: apt.cost,
          quantity: 0,
          total: 0,
          totalHours: 0
        };
      }
      acc[apt.type].quantity += 1;
      acc[apt.type].total += apt.cost;
      acc[apt.type].totalHours += apt.duration;
      return acc;
    }, {} as Record<string, TableData>);
    
    setTableData(Object.values(grouped));
  }

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
      ['Type', 'Cost', 'Quantity', 'Total', 'Total Hours'],
      ...getSortedTableData().map(row => [
        row.type,
        `$${row.cost.toFixed(2)}`,
        row.quantity,
        `$${row.total.toFixed(2)}`,
        row.totalHours.toFixed(3)
      ]),
      [
        'Total',
        '',
        tableData.reduce((sum, r) => sum + r.quantity, 0),
        `$${tableData.reduce((sum, r) => sum + r.total, 0).toFixed(2)}`,
        `${tableData.reduce((sum, r) => sum + r.totalHours, 0).toFixed(3)} hours`
      ]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${dateRange}.csv`;
    a.click();
  }

  const totalQuantity = tableData.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = tableData.reduce((sum, row) => sum + row.total, 0);
  const totalHours = tableData.reduce((sum, row) => sum + row.totalHours, 0);

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
              ? 'Report for All Time (Past)' 
              : `Report for ${format(parseISO(`${dateRange}-01`), 'MMMM yyyy')}`
            }
          </h1>
        </div>

        {/* Line Chart */}
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  label={{ value: 'Number of Appointments', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="scheduled" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Scheduled"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cancelled" 
                  stroke="#000000" 
                  strokeWidth={2}
                  name="Cancelled"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="noShow" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="No Show"
                  dot={{ r: 3 }}
                />
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

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar:
                </label>
                <select
                  value={trainerFilter}
                  onChange={(e) => setTrainerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                >
                  <option value="all">All</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show:
                </label>
                <select
                  value={showFilter}
                  onChange={(e) => setShowFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                >
                  <option value="all">All scheduled appointments</option>
                  <option value="scheduled">Scheduled only</option>
                  <option value="cancelled">Cancelled only</option>
                  <option value="no-show">No show only</option>
                </select>
              </div>

              <button
                onClick={loadAppointments}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                SHOW
              </button>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={exportToSpreadsheet}
                className="text-sm text-[#3258A3] hover:text-[#2a4a8a] font-medium inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Want to Export to a spreadsheet?
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('cost')}
                    >
                      <div className="flex items-center gap-2">
                        Cost
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center gap-2">
                        Quantity
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center gap-2">
                        Total
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('totalHours')}
                    >
                      <div className="flex items-center gap-2">
                        Total Hours
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedTableData().map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{row.type}</td>
                      <td className="py-3 px-4">${row.cost.toFixed(2)}</td>
                      <td className="py-3 px-4">{row.quantity}</td>
                      <td className="py-3 px-4">${row.total.toFixed(2)}</td>
                      <td className="py-3 px-4">{row.totalHours.toFixed(3)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                    <td className="py-3 px-4">Total:</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4">{totalQuantity}</td>
                    <td className="py-3 px-4">${totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-4">{totalHours.toFixed(3)} hours</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-center">
              <button className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                View Appointments▼
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
