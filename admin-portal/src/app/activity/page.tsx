'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Calendar, 
  XCircle, 
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  X as XIcon
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';

interface ActivityLog {
  id: string;
  type: 'booking_created' | 'booking_canceled';
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'trainer' | 'client';
  targetId?: string;
  targetName?: string;
  details: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export default function ActivityPage() {
  const { orgId } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    async function loadActivities() {
      try {
        setLoading(true);
        const logs: ActivityLog[] = [];
        
        console.log('🔍 Fetching bookings for orgId:', orgId);
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          limit(200)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        console.log('📊 Found bookings:', bookingsSnap.size);
        
        for (const doc of bookingsSnap.docs) {
          const data = doc.data();
          const status = data.status || 'confirmed';
          
          const clientName = data.clientName || 'Unknown Client';
          const trainerName = data.trainerName || 'Trainer';
          const timestamp = data.bookedAt?.toDate() || data.createdAt?.toDate() || data.timestamp?.toDate() || new Date();
          
          if (status === 'cancelled') {
            logs.push({
              id: doc.id,
              type: 'booking_canceled',
              actorId: data.clientId || data.clientUID || 'unknown',
              actorName: clientName,
              actorRole: 'client',
              targetId: data.trainerId,
              targetName: trainerName,
              details: `Booking canceled with ${trainerName}`,
              timestamp,
              metadata: { 
                startTime: data.startTime?.toDate(),
                packageType: data.packageType 
              }
            });
          } else {
            logs.push({
              id: doc.id,
              type: 'booking_created',
              actorId: data.clientId || data.clientUID || 'unknown',
              actorName: clientName,
              actorRole: 'client',
              targetId: data.trainerId,
              targetName: trainerName,
              details: `Booked session with ${trainerName}`,
              timestamp,
              metadata: { 
                startTime: data.startTime?.toDate(),
                packageType: data.packageType 
              }
            });
          }
        }
        
        console.log('✅ Created activity logs:', logs.length);
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(logs);
        filterActivitiesByDate(logs, selectedDate);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [orgId]);

  useEffect(() => {
    if (isSearching && searchQuery) {
      const query = searchQuery.toLowerCase();
      const results = activities.filter(activity => 
        activity.actorName.toLowerCase().includes(query) ||
        activity.targetName?.toLowerCase().includes(query) ||
        activity.details.toLowerCase().includes(query)
      );
      setFilteredActivities(results);
    } else {
      filterActivitiesByDate(activities, selectedDate);
    }
  }, [selectedDate, searchQuery, isSearching, activities]);

  const filterActivitiesByDate = (logs: ActivityLog[], date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const filtered = logs.filter(activity => {
      const activityTime = activity.timestamp.getTime();
      return activityTime >= dayStart.getTime() && activityTime <= dayEnd.getTime();
    });
    
    setFilteredActivities(filtered);
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleToday = () => {
    setSelectedDate(new Date());
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(query.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'booking_created':
        return <Calendar className="h-5 w-5 text-green-600" />;
      case 'booking_canceled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <ActivityIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'trainer':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3258A3] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading activity feed...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
          <p className="mt-2 text-gray-600">
            View all recent actions and events in your organization
          </p>
        </div>

        {/* Date Navigation & Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Navigation */}
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
                  disabled={isToday || isSearching}
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

          {/* Search */}
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

        {/* Stats Summary */}
        {!isSearching && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredActivities.filter(a => a.type === 'booking_created').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cancellations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredActivities.filter(a => a.type === 'booking_canceled').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <ActivityIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Activity</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredActivities.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              {isSearching ? 'Search Results' : format(selectedDate, 'MMMM d, yyyy')}
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
                            {activity.details}
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
      </div>
    </DashboardLayout>
  );
}
