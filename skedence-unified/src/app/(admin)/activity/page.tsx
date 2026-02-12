'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, where, getDocs, limit, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Calendar, 
  XCircle, 
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  X as XIcon,
  UserPlus,
  Users,
  Package,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  GraduationCap,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays, addDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ActivityType } from '@/lib/activity-logger';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ActivityLog {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin' | 'trainer' | 'client' | 'system';
  targetId?: string;
  targetName?: string;
  targetType?: 'trainer' | 'client' | 'lesson' | 'class' | 'pass' | 'location';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  orgId?: string;
}

interface ClassSnapshot {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  enrolled: number;
  location: string;
}

interface BookingSnapshot {
  id: string;
  trainerId: string;
  trainerName: string;
  clientName: string;
  startTime: Date;
  endTime: Date;
  location: string;
}

interface WeeklyStats {
  bookings: number;
  cancellations: number;
  revenue: number;
  enrollments: number;
}

export default function ActivityPage() {
  const { orgId } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Advanced filters
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  // "Happening Today" data
  const [upcomingClasses, setUpcomingClasses] = useState<ClassSnapshot[]>([]);
  const [todayBookings, setTodayBookings] = useState<BookingSnapshot[]>([]);
  const [showHappeningToday, setShowHappeningToday] = useState(true);
  const [happeningDate, setHappeningDate] = useState(new Date());
  
  // Compare time frames
  const [compareMode, setCompareMode] = useState<'week' | 'month' | 'custom'>('week');
  const [customRange1Start, setCustomRange1Start] = useState<Date>(startOfWeek(new Date()));
  const [customRange1End, setCustomRange1End] = useState<Date>(endOfWeek(new Date()));
  const [customRange2Start, setCustomRange2Start] = useState<Date>(startOfWeek(addWeeks(new Date(), -1)));
  const [customRange2End, setCustomRange2End] = useState<Date>(endOfWeek(addWeeks(new Date(), -1)));

  // Memoized extraction of clients and trainers
  const { clients, trainers } = useMemo(() => {
    const uniqueClients = new Map<string, string>();
    const uniqueTrainers = new Map<string, string>();
    
    activities.forEach(log => {
      if (log.actorRole === 'client' && log.actorId) {
        uniqueClients.set(log.actorId, log.actorName);
      }
      if (log.actorRole === 'trainer' && log.actorId) {
        uniqueTrainers.set(log.actorId, log.actorName);
      }
      if (log.targetType === 'client' && log.targetId) {
        uniqueClients.set(log.targetId, log.targetName || 'Unknown');
      }
      if (log.targetType === 'trainer' && log.targetId) {
        uniqueTrainers.set(log.targetId, log.targetName || 'Unknown');
      }
    });
    
    return {
      clients: Array.from(uniqueClients, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      trainers: Array.from(uniqueTrainers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [activities]);

  // Memoized weekly stats calculation
  const { range1Stats, range2Stats, range1Label, range2Label } = useMemo(() => {
    const now = new Date();
    let r1Start: Date, r1End: Date, r2Start: Date, r2End: Date;
    let label1: string, label2: string;
    
    if (compareMode === 'week') {
      r1Start = startOfWeek(now);
      r1End = endOfWeek(now);
      r2Start = startOfWeek(addWeeks(now, -1));
      r2End = endOfWeek(addWeeks(now, -1));
      label1 = 'This Week';
      label2 = 'Last Week';
    } else if (compareMode === 'month') {
      r1Start = startOfMonth(now);
      r1End = endOfMonth(now);
      r2Start = startOfMonth(addMonths(now, -1));
      r2End = endOfMonth(addMonths(now, -1));
      label1 = 'This Month';
      label2 = 'Last Month';
    } else {
      r1Start = customRange1Start;
      r1End = customRange1End;
      r2Start = customRange2Start;
      r2End = customRange2End;
      label1 = `${format(r1Start, 'MMM d')} - ${format(r1End, 'MMM d')}`;
      label2 = `${format(r2Start, 'MMM d')} - ${format(r2End, 'MMM d')}`;
    }
    
    const range1 = activities.filter(log => 
      log.timestamp >= r1Start && log.timestamp <= r1End
    );
    
    const range2 = activities.filter(log => 
      log.timestamp >= r2Start && log.timestamp <= r2End
    );
    
    return {
      range1Stats: {
        bookings: range1.filter(a => a.type === 'lesson_booked' || a.type === 'booking_created').length,
        cancellations: range1.filter(a => a.type === 'lesson_canceled' || a.type === 'booking_canceled').length,
        revenue: 0,
        enrollments: range1.filter(a => a.type === 'class_enrollment').length,
      },
      range2Stats: {
        bookings: range2.filter(a => a.type === 'lesson_booked' || a.type === 'booking_created').length,
        cancellations: range2.filter(a => a.type === 'lesson_canceled' || a.type === 'booking_canceled').length,
        revenue: 0,
        enrollments: range2.filter(a => a.type === 'class_enrollment').length,
      },
      range1Label: label1,
      range2Label: label2
    };
  }, [activities, compareMode, customRange1Start, customRange1End, customRange2Start, customRange2End]);

  // Memoized chart data for line graph
  const comparisonChartData = useMemo(() => {
    const now = new Date();
    let r1Start: Date, r1End: Date, r2Start: Date, r2End: Date;
    
    if (compareMode === 'week') {
      r1Start = startOfWeek(now);
      r1End = endOfWeek(now);
      r2Start = startOfWeek(addWeeks(now, -1));
      r2End = endOfWeek(addWeeks(now, -1));
    } else if (compareMode === 'month') {
      r1Start = startOfMonth(now);
      r1End = endOfMonth(now);
      r2Start = startOfMonth(addMonths(now, -1));
      r2End = endOfMonth(addMonths(now, -1));
    } else {
      r1Start = customRange1Start;
      r1End = customRange1End;
      r2Start = customRange2Start;
      r2End = customRange2End;
    }

    // Generate day-by-day data for both ranges
    const getDaysInRange = (start: Date, end: Date) => {
      const days = [];
      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
      return days;
    };

    const range1Days = getDaysInRange(r1Start, r1End);
    const range2Days = getDaysInRange(r2Start, r2End);
    const maxDays = Math.max(range1Days.length, range2Days.length);

    const chartData = [];
    for (let i = 0; i < maxDays; i++) {
      const day1 = range1Days[i];
      const day2 = range2Days[i];
      
      let range1Bookings = 0;
      let range1Cancellations = 0;
      let range2Bookings = 0;
      let range2Cancellations = 0;

      if (day1) {
        const dayStart = startOfDay(day1);
        const dayEnd = endOfDay(day1);
        const dayActivities = activities.filter(a => 
          a.timestamp >= dayStart && a.timestamp <= dayEnd
        );
        range1Bookings = dayActivities.filter(a => 
          a.type === 'lesson_booked' || a.type === 'booking_created'
        ).length;
        range1Cancellations = dayActivities.filter(a => 
          a.type === 'lesson_canceled' || a.type === 'booking_canceled'
        ).length;
      }

      if (day2) {
        const dayStart = startOfDay(day2);
        const dayEnd = endOfDay(day2);
        const dayActivities = activities.filter(a => 
          a.timestamp >= dayStart && a.timestamp <= dayEnd
        );
        range2Bookings = dayActivities.filter(a => 
          a.type === 'lesson_booked' || a.type === 'booking_created'
        ).length;
        range2Cancellations = dayActivities.filter(a => 
          a.type === 'lesson_canceled' || a.type === 'booking_canceled'
        ).length;
      }

      chartData.push({
        day: `Day ${i + 1}`,
        date1: day1 ? format(day1, 'MMM d') : '',
        date2: day2 ? format(day2, 'MMM d') : '',
        range1Bookings,
        range2Bookings,
        range1Cancellations,
        range2Cancellations
      });
    }

    return chartData;
  }, [activities, compareMode, customRange1Start, customRange1End, customRange2Start, customRange2End]);

  // Load activities and static data
  useEffect(() => {
    if (!orgId) return;

    async function loadActivities() {
      try {
        setLoading(true);
        
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('orgId', '==', orgId),
          orderBy('timestamp', 'desc'),
          limit(1000)
        );
        
        const activitiesSnap = await getDocs(activitiesQuery);
        
        const logs: ActivityLog[] = activitiesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.type as ActivityType,
            actorId: data.actorId,
            actorName: data.actorName,
            actorRole: data.actorRole,
            targetId: data.targetId,
            targetName: data.targetName,
            targetType: data.targetType,
            description: data.description,
            timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
            metadata: data.metadata,
            orgId: data.orgId,
          };
        });
        
        setActivities(logs);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [orgId]);

  // Load upcoming classes - optimized with single batch query
  useEffect(() => {
    if (!orgId) return;

    async function loadUpcomingClasses() {
      try {
        const dayStart = Timestamp.fromDate(startOfDay(happeningDate));
        const dayEnd = Timestamp.fromDate(endOfDay(happeningDate));
        
        // Fetch classes and all registrations in parallel
        const [classesSnap, registrationsSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'classes'),
            where('orgId', '==', orgId),
            where('startTime', '>=', dayStart),
            where('startTime', '<=', dayEnd),
            orderBy('startTime', 'asc')
          )),
          getDocs(query(
            collection(db, 'classRegistrations'),
            where('orgId', '==', orgId)
          ))
        ]);
        
        // Group registrations by classId
        const registrationsByClass = new Map<string, number>();
        registrationsSnap.docs.forEach(doc => {
          const classId = doc.data().classId;
          registrationsByClass.set(classId, (registrationsByClass.get(classId) || 0) + 1);
        });
        
        const classes: ClassSnapshot[] = classesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Class',
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            capacity: data.capacity || 10,
            enrolled: registrationsByClass.get(doc.id) || 0,
            location: data.location || 'TBD',
          };
        });
        
        setUpcomingClasses(classes);
      } catch (error) {
        console.error('Error loading upcoming classes:', error);
      }
    }

    loadUpcomingClasses();
  }, [orgId, happeningDate]);

  // Load today's bookings
  useEffect(() => {
    if (!orgId) return;
    
    async function loadTodayBookings() {
      try {
        const dayStart = Timestamp.fromDate(startOfDay(happeningDate));
        const dayEnd = Timestamp.fromDate(endOfDay(happeningDate));
        
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', dayStart),
          where('startTime', '<=', dayEnd),
          where('status', '==', 'confirmed'),
          orderBy('startTime', 'asc')
        );
        
        const bookingsSnap = await getDocs(bookingsQuery);
        
        const bookings: BookingSnapshot[] = bookingsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            trainerId: data.trainerId || '',
            trainerName: data.trainerName || 'Unknown Trainer',
            clientName: data.clientName || 'Unknown Client',
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            location: data.location || 'TBD',
          };
        });
        
        setTodayBookings(bookings);
      } catch (error) {
        console.error('Error loading today bookings:', error);
      }
    }

    loadTodayBookings();
  }, [orgId, happeningDate]);

  // Memoized filtering logic
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];
    
    // Date filter (only if not searching)
    if (!isSearching) {
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);
      filtered = filtered.filter(activity => {
        const activityTime = activity.timestamp.getTime();
        return activityTime >= dayStart.getTime() && activityTime <= dayEnd.getTime();
      });
    }
    
    // Search filter
    if (isSearching && searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.actorName.toLowerCase().includes(query) ||
        activity.targetName?.toLowerCase().includes(query) ||
        activity.description.toLowerCase().includes(query)
      );
    }
    
    // Activity type filter
    if (selectedActivityType !== 'all') {
      filtered = filtered.filter(activity => activity.type === selectedActivityType);
    }
    
    // Client filter
    if (selectedClient !== 'all') {
      filtered = filtered.filter(activity => 
        (activity.actorRole === 'client' && activity.actorId === selectedClient) ||
        (activity.targetType === 'client' && activity.targetId === selectedClient)
      );
    }
    
    // Trainer filter
    if (selectedTrainer !== 'all') {
      filtered = filtered.filter(activity => 
        (activity.actorRole === 'trainer' && activity.actorId === selectedTrainer) ||
        (activity.targetType === 'trainer' && activity.targetId === selectedTrainer)
      );
    }
    
    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(activity => activity.actorRole === selectedRole);
    }
    
    return filtered;
  }, [activities, selectedDate, searchQuery, isSearching, selectedActivityType, selectedClient, selectedTrainer, selectedRole]);

  // Memoized trainer schedules
  const trainerSchedules = useMemo(() => {
    return todayBookings.reduce((acc, booking) => {
      if (!acc[booking.trainerId]) {
        acc[booking.trainerId] = {
          trainerName: booking.trainerName,
          clients: []
        };
      }
      acc[booking.trainerId].clients.push({
        clientName: booking.clientName,
        startTime: booking.startTime,
        location: booking.location
      });
      return acc;
    }, {} as Record<string, { trainerName: string; clients: Array<{ clientName: string; startTime: Date; location: string }> }>);
  }, [todayBookings]);

  // Memoized computed values
  const isToday = useMemo(() => 
    format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    [selectedDate]
  );
  
  const hasActiveFilters = useMemo(() => 
    selectedActivityType !== 'all' || selectedClient !== 'all' || selectedTrainer !== 'all' || selectedRole !== 'all',
    [selectedActivityType, selectedClient, selectedTrainer, selectedRole]
  );

  // Memoized callbacks
  const handlePreviousDay = useCallback(() => {
    setSelectedDate(prev => subDays(prev, 1));
    setIsSearching(false);
    setSearchQuery('');
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => addDays(prev, 1));
    setIsSearching(false);
    setSearchQuery('');
  }, []);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
    setIsSearching(false);
    setSearchQuery('');
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(query.length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedActivityType('all');
    setSelectedClient('all');
    setSelectedTrainer('all');
    setSelectedRole('all');
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  // Memoized helper functions
  const getActivityIcon = useCallback((type: ActivityType) => {
    switch (type) {
      case 'lesson_booked':
      case 'booking_created':
        return <Calendar className="h-5 w-5 text-green-600" />;
      case 'lesson_canceled':
      case 'booking_canceled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'trainer_created':
      case 'trainer_activated':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'client_registered':
        return <Users className="h-5 w-5 text-green-600" />;
      case 'pass_purchased':
        return <Package className="h-5 w-5 text-purple-600" />;
      case 'availability_opened':
        return <Clock className="h-5 w-5 text-teal-600" />;
      case 'availability_closed':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'class_created':
        return <GraduationCap className="h-5 w-5 text-indigo-600" />;
      case 'location_created':
        return <MapPin className="h-5 w-5 text-blue-600" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'lesson_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <ActivityIcon className="h-5 w-5 text-gray-600" />;
    }
  }, []);

  const getRoleBadgeColor = useCallback((role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'trainer':
        return 'bg-teal-100 text-teal-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getTrendIcon = useCallback((current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  }, []);

  const getTrendColor = useCallback((current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  }, []);

  const getPercentageChange = useCallback((current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3258A3] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
        <p className="mt-2 text-gray-600">
          View all recent actions and events in your organization
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousDay}
                disabled={isSearching}
                className="w-10 h-10 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
                <div className="text-sm text-gray-500">
                  {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                disabled={isSearching}
                className="w-10 h-10 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {!isToday && !isSearching && (
              <div className="mt-4 text-center">
                <Button variant="ghost" size="sm" onClick={handleToday}>
                  Jump to Today
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {isSearching && (
              <p className="mt-2 text-sm text-gray-600">
                Found {filteredActivities.length} result{filteredActivities.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="lesson_booked">Lessons Booked</SelectItem>
                  <SelectItem value="lesson_canceled">Lessons Canceled</SelectItem>
                  <SelectItem value="class_enrollment">Class Registrations</SelectItem>
                  <SelectItem value="pass_purchased">Pass Purchases</SelectItem>
                  <SelectItem value="client_registered">New Clients</SelectItem>
                  <SelectItem value="trainer_created">New Trainers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
              <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                <SelectTrigger>
                  <SelectValue placeholder="All Trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.map(trainer => (
                    <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            {isSearching ? 'Search Results' : format(selectedDate, 'MMMM d, yyyy')}
            <span className="text-sm font-normal text-gray-500">
              ({filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {isSearching 
                  ? 'No activities match your search' 
                  : `No activity on ${format(selectedDate, 'MMMM d, yyyy')}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors ${
                    index !== filteredActivities.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {activity.actorName}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(activity.actorRole)}`}>
                            {activity.actorRole}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-700">
                          {activity.description}
                        </p>
                        {activity.metadata?.startTime && (
                          <p className="mt-1 text-sm text-gray-500">
                            Session time: {new Date(activity.metadata.startTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compare Time Periods
            </CardTitle>
            <Select value={compareMode} onValueChange={(value: 'week' | 'month' | 'custom') => setCompareMode(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week Comparison</SelectItem>
                <SelectItem value="month">Month Comparison</SelectItem>
                <SelectItem value="custom">Custom Ranges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {compareMode === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Range 1</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange1Start, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange1Start(new Date(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange1End, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange1End(new Date(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Range 2</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange2Start, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange2Start(new Date(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange2End, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange2End(new Date(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Bookings</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(range1Stats.bookings, range2Stats.bookings)}
                  <span className={`text-xs font-medium ${getTrendColor(range1Stats.bookings, range2Stats.bookings)}`}>
                    {getPercentageChange(range1Stats.bookings, range2Stats.bookings)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{range1Stats.bookings}</div>
              <div className="text-xs text-gray-500 mt-1">{range1Label} vs {range2Stats.bookings} ({range2Label})</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Cancellations</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(range2Stats.cancellations, range1Stats.cancellations)}
                  <span className={`text-xs font-medium ${getTrendColor(range2Stats.cancellations, range1Stats.cancellations)}`}>
                    {getPercentageChange(range2Stats.cancellations, range1Stats.cancellations)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{range1Stats.cancellations}</div>
              <div className="text-xs text-gray-500 mt-1">{range1Label} vs {range2Stats.cancellations} ({range2Label})</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Class Enrollments</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(range1Stats.enrollments, range2Stats.enrollments)}
                  <span className={`text-xs font-medium ${getTrendColor(range1Stats.enrollments, range2Stats.enrollments)}`}>
                    {getPercentageChange(range1Stats.enrollments, range2Stats.enrollments)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{range1Stats.enrollments}</div>
              <div className="text-xs text-gray-500 mt-1">{range1Label} vs {range2Stats.enrollments} ({range2Label})</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Activity</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(activities.length, Math.max(1, activities.length - 10))}
                  <span className="text-xs font-medium text-gray-600">--</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{activities.length}</div>
              <div className="text-xs text-gray-500 mt-1">all-time activities</div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Trends Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold mb-2">{data.day}</p>
                          <div className="space-y-1 text-sm">
                            <p className="text-blue-600">
                              {range1Label} ({data.date1}): {data.range1Bookings} bookings
                            </p>
                            <p className="text-purple-600">
                              {range2Label} ({data.date2}): {data.range2Bookings} bookings
                            </p>
                            <p className="text-red-600">
                              {range1Label}: {data.range1Cancellations} cancellations
                            </p>
                            <p className="text-orange-600">
                              {range2Label}: {data.range2Cancellations} cancellations
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="range1Bookings" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name={`${range1Label} Bookings`}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="range2Bookings" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  name={`${range2Label} Bookings`}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="range1Cancellations" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name={`${range1Label} Cancellations`}
                  dot={{ r: 3 }}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="range2Cancellations" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name={`${range2Label} Cancellations`}
                  dot={{ r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              What's Happening
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHappeningToday(!showHappeningToday)}
            >
              {showHappeningToday ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showHappeningToday && (
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHappeningDate(prev => subDays(prev, 1))}
                className="w-10 h-10 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {format(happeningDate, 'MMMM d, yyyy')}
                </div>
                <div className="text-sm text-gray-500">
                  {format(happeningDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                    ? 'Today' 
                    : format(happeningDate, 'EEEE')}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHappeningDate(prev => addDays(prev, 1))}
                className="w-10 h-10 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {format(happeningDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={() => setHappeningDate(new Date())}>
                  Jump to Today
                </Button>
              </div>
            )}
            
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Classes on {format(happeningDate, 'MMM d')}</h3>
                {upcomingClasses.length === 0 ? (
                  <p className="text-sm text-gray-500">No classes scheduled for this day</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingClasses.map(cls => {
                      const percentage = (cls.enrolled / cls.capacity) * 100;
                      return (
                        <div key={cls.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{cls.title}</div>
                              <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(cls.startTime, 'h:mm a')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {cls.location}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {cls.enrolled}/{cls.capacity}
                              </div>
                              <div className={`text-sm font-medium ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                ({percentage.toFixed(0)}%)
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Private Lessons on {format(happeningDate, 'MMM d')}</h3>
                {todayBookings.length === 0 ? (
                  <p className="text-sm text-gray-500">No private lessons scheduled for this day</p>
                ) : (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Lessons</span>
                      <span className="text-2xl font-bold text-gray-900">{todayBookings.length}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {todayBookings.length === 1 ? '1 lesson' : `${todayBookings.length} lessons`} scheduled
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Trainers & Their Clients on {format(happeningDate, 'MMM d')}</h3>
                {Object.keys(trainerSchedules).length === 0 ? (
                  <p className="text-sm text-gray-500">No trainers scheduled for this day</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(trainerSchedules).map(([trainerId, schedule]) => (
                      <div key={trainerId} className="p-3 bg-teal-50 rounded-lg">
                        <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-teal-600" />
                          {schedule.trainerName}
                        </div>
                        <div className="space-y-1 ml-6">
                          {schedule.clients.map((client, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex items-center justify-between">
                              <span>{client.clientName}</span>
                              <span className="text-xs text-gray-500">
                                {format(client.startTime, 'h:mm a')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
    </div>
  );
}
