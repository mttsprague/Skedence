'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Calendar, 
  DollarSign, 
  Package, 
  UserPlus, 
  XCircle, 
  Clock,
  Users,
  Activity as ActivityIcon,
  GraduationCap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  type: 'booking_created' | 'booking_canceled' | 'pass_purchased' | 'class_purchased' | 'availability_created' | 'client_added' | 'trainer_added';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function loadActivities() {
      try {
        setLoading(true);
        
        // For now, we'll construct activity logs from existing data
        // In production, you'd want a dedicated activity_logs collection
        const logs: ActivityLog[] = [];
        
        // Get recent bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          orderBy('bookedAt', 'desc'),
          limit(50)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        
        for (const doc of bookingsSnap.docs) {
          const data = doc.data();
          const status = data.status || 'confirmed';
          
          // Fetch client name
          let clientName = 'Unknown Client';
          if (data.clientId) {
            try {
              const clientDoc = await getDocs(
                query(collection(db, 'users'), where('__name__', '==', data.clientId), limit(1))
              );
              if (!clientDoc.empty) {
                const clientData = clientDoc.docs[0].data();
                clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Client';
              }
            } catch (e) {
              console.error('Error fetching client:', e);
            }
          }
          
          // Fetch trainer name
          let trainerName = 'Trainer';
          if (data.trainerId) {
            try {
              const trainerDoc = await getDocs(
                query(collection(db, 'trainers'), where('__name__', '==', data.trainerId), limit(1))
              );
              if (!trainerDoc.empty) {
                const trainerData = trainerDoc.docs[0].data();
                trainerName = trainerData.displayName || trainerData.firstName || 'Trainer';
              }
            } catch (e) {
              console.error('Error fetching trainer:', e);
            }
          }
          
          const timestamp = data.bookedAt?.toDate() || new Date();
          
          if (status === 'cancelled') {
            logs.push({
              id: doc.id,
              type: 'booking_canceled',
              actorId: data.clientId || 'unknown',
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
              actorId: data.clientId || 'unknown',
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
        
        // Sort all logs by timestamp
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setActivities(logs);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [orgId]);

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'booking_created':
        return <Calendar className="h-5 w-5 text-green-600" />;
      case 'booking_canceled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pass_purchased':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'class_purchased':
        return <GraduationCap className="h-5 w-5 text-purple-600" />;
      case 'availability_created':
        return <Clock className="h-5 w-5 text-indigo-600" />;
      case 'client_added':
        return <Users className="h-5 w-5 text-teal-600" />;
      case 'trainer_added':
        return <UserPlus className="h-5 w-5 text-orange-600" />;
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

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors ${
                      index !== activities.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Content */}
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

        {/* Future Enhancement Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <ActivityIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Activity Tracking</h3>
                <p className="text-sm text-blue-800">
                  This feed currently shows booking activity. In future updates, it will include:
                </p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Pass and class purchases</li>
                  <li>Trainer availability changes</li>
                  <li>New client and trainer registrations</li>
                  <li>Payment transactions</li>
                  <li>Profile updates and more</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
