'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, query, where, getDocs, getDoc, doc, limit, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackPageView } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import { 
  Calendar, 
  XCircle, 
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  X as XIcon,
  X,
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
import { OnboardingChecklist } from '@/components/admin/onboarding-checklist';
import { OnboardingCelebration } from '@/components/admin/onboarding-celebration';
import { TrialBanner } from '@/components/admin/trial-banner';
import { useRealTimeCount } from '@/hooks/useRealTimeIndicators';
import { RealTimeStatsCard } from '@/components/ui/real-time-indicators';
import { ErrorBoundarySection } from '@/components/error-boundary';

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

interface Participant {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  registeredAt: Timestamp;
  classPassPackageId?: string;
  athleteName?: string;
  email?: string;
  phoneNumber?: string;
}

interface BookingSnapshot {
  id: string;
  trainerId: string;
  trainerName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientUID?: string;
  clientId?: string;
  startTime: Date;
  endTime: Date;
  location: string;
  lessonNotes?: string;
  athleteName?: string;
  secondAthleteName?: string;
  athleteNames?: string[];
  athletes?: any[];
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  referredBy?: string;
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

  // Track page view
  useEffect(() => {
    trackPageView('/activity', 'Activity Feed');
  }, []);
  
  // Real-time indicators
  const todayStart = useMemo(() => Timestamp.fromDate(startOfDay(new Date())), []);
  const todayEnd = useMemo(() => Timestamp.fromDate(endOfDay(new Date())), []);
  
  // Memoize constraints arrays to prevent infinite loops in useRealTimeCount
  const todayBookingsConstraints = useMemo(() => [
    where('orgId', '==', orgId || ''),
    where('startTime', '>=', todayStart),
    where('startTime', '<=', todayEnd),
    where('status', 'in', ['confirmed', 'scheduled'])
  ], [orgId, todayStart, todayEnd]);
  
  const upcomingClassesConstraints = useMemo(() => [
    where('orgId', '==', orgId || ''),
    where('startTime', '>=', Timestamp.now()),
    where('isOpenForRegistration', '==', true)
  ], [orgId]);
  
  const activeClientsConstraints = useMemo(() => [
    where('orgId', '==', orgId || ''),
    where('role', '==', 'client'),
    where('isActive', '==', true)
  ], [orgId]);
  
  const activeTrainersConstraints = useMemo(() => [
    where('orgId', '==', orgId || ''),
    where('active', '==', true)
  ], [orgId]);
  
  const todayBookingsLive = useRealTimeCount('bookings', todayBookingsConstraints, !!orgId);
  const upcomingClassesLive = useRealTimeCount('classes', upcomingClassesConstraints, !!orgId);
  const activeClientsLive = useRealTimeCount('orgMembers', activeClientsConstraints, !!orgId);
  const activeTrainersLive = useRealTimeCount('trainers', activeTrainersConstraints, !!orgId);
  
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
  const [selectedBooking, setSelectedBooking] = useState<BookingSnapshot | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassSnapshot | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<'early' | 'late' | null>(null);
  
  // Classes Snapshot data (next 3 upcoming)
  const [upcomingClassesSnapshot, setUpcomingClassesSnapshot] = useState<ClassSnapshot[]>([]);
  const [viewingParticipants, setViewingParticipants] = useState<ClassSnapshot | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
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
        cancellations: range1.filter(a => a.type === 'lesson_canceled' || a.type === 'lesson_cancelled' || a.type === 'booking_canceled').length,
        revenue: 0,
        enrollments: range1.filter(a => a.type === 'class_enrollment' || a.type === 'class_registered').length,
      },
      range2Stats: {
        bookings: range2.filter(a => a.type === 'lesson_booked' || a.type === 'booking_created').length,
        cancellations: range2.filter(a => a.type === 'lesson_canceled' || a.type === 'lesson_cancelled' || a.type === 'booking_canceled').length,
        revenue: 0,
        enrollments: range2.filter(a => a.type === 'class_enrollment' || a.type === 'class_registered').length,
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
          a.type === 'lesson_canceled' || a.type === 'lesson_cancelled' || a.type === 'booking_canceled'
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
          a.type === 'lesson_canceled' || a.type === 'lesson_cancelled' || a.type === 'booking_canceled'
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
        
        // Enrich activities with actual user names
        const logs: ActivityLog[] = await Promise.all(
          activitiesSnap.docs.map(async (activityDoc) => {
            const data = activityDoc.data();
            let actorName = data.actorName;
            const originalActorName = data.actorName; // Store original for description replacement
            
            // Try to get full name from multiple sources
            if (data.actorId) {
              try {
                // First try users collection
                let userDoc = await getDoc(doc(db, 'users', data.actorId));
                
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  const firstName = userData?.firstName || '';
                  const lastName = userData?.lastName || '';
                  if (firstName || lastName) {
                    actorName = `${firstName} ${lastName}`.trim();
                  }
                } else {
                  // Try trainers collection
                  const trainerDoc = await getDoc(doc(db, 'trainers', data.actorId));
                  
                  if (trainerDoc.exists()) {
                    const trainerData = trainerDoc.data();
                    const firstName = trainerData?.firstName || '';
                    const lastName = trainerData?.lastName || '';
                    if (firstName || lastName) {
                      actorName = `${firstName} ${lastName}`.trim();
                    }
                  } else if (orgId) {
                    // Try orgMembers to find the user
                    const orgMembersSnap = await getDocs(
                      query(
                        collection(db, 'orgMembers'),
                        where('authUserId', '==', data.actorId),
                        where('orgId', '==', orgId)
                      )
                    );
                    
                    if (!orgMembersSnap.empty) {
                      const memberData = orgMembersSnap.docs[0].data();
                      const userId = memberData?.userId;
                      
                      if (userId) {
                        // userId in orgMembers could be either:
                        // - trainer document ID (for trainers/admins/owners)
                        // - user document ID (for clients)
                        // Try trainers collection first (most likely for admin actions)
                        const trainerDoc2 = await getDoc(doc(db, 'trainers', userId));
                        
                        if (trainerDoc2.exists()) {
                          const trainerData = trainerDoc2.data();
                          const firstName = trainerData?.firstName || '';
                          const lastName = trainerData?.lastName || '';
                          if (firstName || lastName) {
                            actorName = `${firstName} ${lastName}`.trim();
                          }
                        } else {
                          // Fall back to users collection (for client actions)
                          const userDoc2 = await getDoc(doc(db, 'users', userId));
                          
                          if (userDoc2.exists()) {
                            const userData = userDoc2.data();
                            const firstName = userData?.firstName || '';
                            const lastName = userData?.lastName || '';
                            if (firstName || lastName) {
                              actorName = `${firstName} ${lastName}`.trim();
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (err) {
                // Silent fail - use stored actorName
              }
            }
            
            // Replace old actorName in description with resolved full name
            let description = data.description;
            if (actorName !== originalActorName && originalActorName) {
              description = description.replace(originalActorName, actorName);
            }
            
            return {
              id: activityDoc.id,
              type: data.type as ActivityType,
              actorId: data.actorId,
              actorName: actorName,
              actorRole: data.actorRole,
              targetId: data.targetId,
              targetName: data.targetName,
              targetType: data.targetType,
              description: description,
              timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
              metadata: data.metadata,
              orgId: data.orgId,
            };
          })
        );
        
        setActivities(logs);
      } catch (error) {
        // Silent fail - show empty state
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
        // Silent fail - show empty state
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
          orderBy('startTime', 'asc')
        );
        
        const bookingsSnap = await getDocs(bookingsQuery);
        
        const bookings: BookingSnapshot[] = bookingsSnap.docs
          .filter(doc => {
            const data = doc.data();
            // Filter for confirmed bookings in code instead of query
            return data.status === 'confirmed';
          })
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              trainerId: data.trainerId || '',
              trainerName: data.trainerName || 'Unknown Trainer',
              clientName: data.clientName || 'Unknown Client',
              clientEmail: data.clientEmail,
              clientPhone: data.clientPhone,
              clientUID: data.clientUID,
              clientId: data.clientId,
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate() || new Date(),
              location: data.location || 'TBD',
              lessonNotes: data.lessonNotes,
              athleteName: data.athleteName,
              secondAthleteName: data.secondAthleteName,
              athleteNames: data.athleteNames,
              athletes: data.athletes,
              emergencyContactName: data.emergencyContactName,
              emergencyContactNumber: data.emergencyContactNumber,
              referredBy: data.referredBy,
            };
          });
        
        setTodayBookings(bookings);
      } catch (error) {
        // Silent fail - show empty state
      }
    }

    loadTodayBookings();
  }, [orgId, happeningDate]);

  // Load next 3 upcoming classes snapshot
  useEffect(() => {
    if (!orgId) return;

    async function loadUpcomingClassesSnapshot() {
      try {
        const now = Timestamp.fromDate(new Date());
        
        const classesQuery = query(
          collection(db, 'classes'),
          where('orgId', '==', orgId),
          where('startTime', '>=', now),
          orderBy('startTime', 'asc'),
          limit(3)
        );
        
        const classesSnap = await getDocs(classesQuery);
        
        const classes: ClassSnapshot[] = await Promise.all(
          classesSnap.docs.map(async (doc) => {
            const data = doc.data();
            
            // Count participants for this class
            const participantsQuery = query(collection(db, 'classes', doc.id, 'participants'));
            const participantsSnap = await getDocs(participantsQuery);
            
            return {
              id: doc.id,
              title: data.title || 'Untitled Class',
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate() || new Date(),
              capacity: data.maxParticipants || data.capacity || 10,
              enrolled: participantsSnap.docs.length,
              location: data.location || 'TBD',
            };
          })
        );
        
        setUpcomingClassesSnapshot(classes);
      } catch (error) {
        // Silent fail - show empty state
      }
    }

    loadUpcomingClassesSnapshot();
  }, [orgId]);

  // Handle viewing participants (similar to classes page)
  const handleViewParticipants = async (cls: ClassSnapshot) => {
    setViewingParticipants(cls);
    setLoadingParticipants(true);
    
    try {
      // Query participants subcollection
      const participantsQuery = query(collection(db, 'classes', cls.id, 'participants'));
      const participantsSnapshot = await getDocs(participantsQuery);
      const participantsData = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];
      
      // Fetch full user details for each participant (phone and email)
      const enrichedParticipants = await Promise.all(
        participantsData.map(async (participant) => {
          try {
            // Fetch user details from users collection
            const userQuery = query(
              collection(db, 'users'),
              where('__name__', '==', participant.userId)
            );
            const userDoc = await getDocs(userQuery);
            
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              return {
                ...participant,
                email: userData.email || userData.emailAddress,
                phoneNumber: userData.phoneNumber || userData.phone,
              };
            }
            
            return participant;
          } catch (error) {
            // Silent fail - use registration data only
            return participant;
          }
        })
      );
      
      setParticipants(enrichedParticipants.sort((a, b) => 
        b.registeredAt.seconds - a.registeredAt.seconds
      ));
    } catch (error) {
      // Silent fail - show empty participants
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

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
      filtered = filtered.filter(activity => {
        // Handle both new and legacy cancellation types (American and British spelling)
        if (selectedActivityType === 'lesson_canceled') {
          return activity.type === 'lesson_canceled' || 
                 activity.type === 'lesson_cancelled' || 
                 activity.type === 'booking_canceled';
        }
        // Handle both new and legacy booking types
        if (selectedActivityType === 'lesson_booked') {
          return activity.type === 'lesson_booked' || activity.type === 'booking_created';
        }
        // Handle class enrollment - includes both naming conventions
        if (selectedActivityType === 'class_enrollment') {
          return activity.type === 'class_enrollment' || activity.type === 'class_registered';
        }
        // Handle pass purchases
        if (selectedActivityType === 'pass_purchased') {
          return activity.type === 'pass_purchased' || activity.type === 'package_created';
        }
        // Handle client registration
        if (selectedActivityType === 'client_registered') {
          return activity.type === 'client_registered' || activity.type === 'client_created';
        }
        // Handle trainer creation
        if (selectedActivityType === 'trainer_created') {
          return activity.type === 'trainer_created' || activity.type === 'trainer_invited';
        }
        return activity.type === selectedActivityType;
      });
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

  // Helper function to format athlete names
  const formatAthleteNames = (booking: BookingSnapshot): string => {
    if (booking.athleteNames && booking.athleteNames.length > 0) {
      return booking.athleteNames.join(', ');
    }
    // Fallback to legacy fields
    const names: string[] = [];
    if (booking.athleteName) names.push(booking.athleteName);
    if (booking.secondAthleteName) names.push(booking.secondAthleteName);
    return names.join(', ');
  };

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
        athleteNames: formatAthleteNames(booking),
        startTime: booking.startTime,
        location: booking.location
      });
      return acc;
    }, {} as Record<string, { trainerName: string; clients: Array<{ clientName: string; athleteNames: string; startTime: Date; location: string }> }>);
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

  const handleCancelBooking = async (refundPass: boolean) => {
    if (!selectedBooking || !orgId) return;

    setCancellingBooking(true);
    setShowCancelConfirm(null);

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const adminCancelLesson = httpsCallable(functions, 'adminCancelLesson');
      
      await adminCancelLesson({
        bookingId: selectedBooking.id,
        orgId: orgId,
        clientId: selectedBooking.clientUID || selectedBooking.clientId,
        refundPass: refundPass
      });

      // Close dialog and show success
      setSelectedBooking(null);
      toast.success(
        'Session cancelled',
        refundPass 
          ? "The client's pass has been refunded." 
          : "The client's pass was not refunded."
      );
      
      // Reload the bookings to reflect the cancellation
      const dayStart = Timestamp.fromDate(startOfDay(happeningDate));
      const dayEnd = Timestamp.fromDate(endOfDay(happeningDate));
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('orgId', '==', orgId),
        where('startTime', '>=', dayStart),
        where('startTime', '<=', dayEnd),
        orderBy('startTime', 'asc')
      );
      
      const bookingsSnap = await getDocs(bookingsQuery);
      const bookings: BookingSnapshot[] = bookingsSnap.docs
        .filter(doc => doc.data().status === 'confirmed')
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            trainerId: data.trainerId || '',
            trainerName: data.trainerName || 'Unknown Trainer',
            clientName: data.clientName || 'Unknown Client',
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone,
            clientUID: data.clientUID,
            clientId: data.clientId,
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            location: data.location || 'TBD',
            lessonNotes: data.lessonNotes,
            athleteName: data.athleteName,
            secondAthleteName: data.secondAthleteName,
            athleteNames: data.athleteNames,
            athletes: data.athletes,
            emergencyContactName: data.emergencyContactName,
            emergencyContactNumber: data.emergencyContactNumber,
            referredBy: data.referredBy,
          };
        });
      setTodayBookings(bookings);
    } catch (error: any) {
      console.error('Failed to cancel session:', error);
      toast.error('Failed to cancel session', error.message || 'Please try again');
    } finally {
      setCancellingBooking(false);
    }
  };

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
        return <ActivityIcon className="h-5 w-5 text-foreground/80" />;
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
    return <Minus className="h-4 w-4 text-foreground/80" />;
  }, []);

  const getTrendColor = useCallback((current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-foreground/80';
  }, []);

  const getPercentageChange = useCallback((current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        
        {/* What's Happening Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Feed</h1>
        <p className="mt-2 text-foreground/80">
          View all recent actions and events in your organization
        </p>
      </div>

      {/* Trial Status Banner */}
      <ErrorBoundarySection sectionName="Trial Banner">
        <TrialBanner orgId={orgId} />
      </ErrorBoundarySection>

      {/* Onboarding Checklist - Shows for new users */}
      <ErrorBoundarySection sectionName="Onboarding Checklist">
        <OnboardingChecklist />
      </ErrorBoundarySection>

      {/* Onboarding Celebration - Shows when setup is complete */}
      <ErrorBoundarySection sectionName="Onboarding Celebration">
        <OnboardingCelebration />
      </ErrorBoundarySection>

      {/* Real-Time Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RealTimeStatsCard
          title="Today's Bookings"
          count={todayBookingsLive.count}
          isLive={todayBookingsLive.isLive}
          lastUpdate={todayBookingsLive.lastUpdate}
          icon={<Calendar className="w-5 h-5" />}
        />
        <RealTimeStatsCard
          title="Upcoming Classes"
          count={upcomingClassesLive.count}
          isLive={upcomingClassesLive.isLive}
          lastUpdate={upcomingClassesLive.lastUpdate}
          icon={<GraduationCap className="w-5 h-5" />}
        />
        <RealTimeStatsCard
          title="Active Clients"
          count={activeClientsLive.count}
          isLive={activeClientsLive.isLive}
          lastUpdate={activeClientsLive.lastUpdate}
          icon={<Users className="w-5 h-5" />}
        />
        <RealTimeStatsCard
          title="Active Trainers"
          count={activeTrainersLive.count}
          isLive={activeTrainersLive.isLive}
          lastUpdate={activeTrainersLive.lastUpdate}
          icon={<UserPlus className="w-5 h-5" />}
        />
      </div>

      {/* What's Happening Section - Moved to Top */}
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
            <div className="flex items-center justify-between bg-background p-3 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHappeningDate(prev => subDays(prev, 1))}
                className="w-10 h-10 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-lg font-semibold text-foreground">
                  {format(happeningDate, 'MMMM d, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
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
                <h3 className="text-sm font-semibold text-foreground mb-3">Classes on {format(happeningDate, 'MMM d')}</h3>
                {upcomingClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No classes scheduled for this day</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingClasses.map(cls => {
                      const percentage = (cls.enrolled / cls.capacity) * 100;
                      return (
                        <div 
                          key={cls.id} 
                          onClick={() => setSelectedClass(cls)}
                          className="p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border"
                        >
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
                              <div className={`text-sm font-medium ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-gray-700'}`}>
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
                <h3 className="text-sm font-semibold text-foreground mb-3">Private Lessons on {format(happeningDate, 'MMM d')}</h3>
                {todayBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No private lessons scheduled for this day</p>
                ) : (
                  <div className="space-y-2">
                    {todayBookings.map(booking => {
                      const athleteNames = formatAthleteNames(booking);
                      return (
                      <div 
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.clientName}
                              {athleteNames && (
                                <span className="text-gray-600 font-normal"> - {athleteNames}</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(booking.startTime, 'h:mm a')}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {booking.location}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700">
                            {booking.trainerName}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Trainers & Their Clients on {format(happeningDate, 'MMM d')}</h3>
                {Object.keys(trainerSchedules).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trainers scheduled for this day</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(trainerSchedules).map(([trainerId, schedule]) => (
                      <div key={trainerId} className="p-3 bg-white rounded-lg border border-teal-200">
                        <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-teal-600" />
                          {schedule.trainerName}
                        </div>
                        <div className="space-y-1 ml-6">
                          {schedule.clients.map((client, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                const booking = todayBookings.find(b => 
                                  b.clientName === client.clientName && 
                                  format(b.startTime, 'h:mm a') === format(client.startTime, 'h:mm a')
                                );
                                if (booking) setSelectedBooking(booking);
                              }}
                              className="text-sm text-gray-700 flex items-center justify-between hover:bg-gray-50 p-1 rounded cursor-pointer transition-colors"
                            >
                              <span>
                                {client.clientName}
                                {client.athleteNames && (
                                  <span className="text-gray-500"> - {client.athleteNames}</span>
                                )}
                              </span>
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
                <div className="text-lg font-semibold text-foreground">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-foreground/80"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {isSearching && (
              <p className="mt-2 text-sm text-foreground/80">
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
              <label className="block text-sm font-medium text-foreground mb-1">Activity Type</label>
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
              <label className="block text-sm font-medium text-foreground mb-1">Client</label>
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
              <label className="block text-sm font-medium text-foreground mb-1">Trainer</label>
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
              <label className="block text-sm font-medium text-foreground mb-1">Role</label>
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
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-foreground/80">
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
                  className={`flex gap-4 p-4 rounded-lg hover:bg-background transition-colors ${
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
                          <span className="font-semibold text-foreground">
                            {activity.actorName}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(activity.actorRole)}`}>
                            {activity.actorRole}
                          </span>
                        </div>
                        <p className="mt-1 text-foreground">
                          {activity.description}
                        </p>
                        {activity.metadata?.startTime && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Session time: {typeof activity.metadata.startTime.toDate === 'function' 
                              ? activity.metadata.startTime.toDate().toLocaleString() 
                              : new Date(activity.metadata.startTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-sm text-muted-foreground whitespace-nowrap">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background rounded-lg">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Range 1</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-foreground/80 mb-1">Start Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange1Start, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange1Start(new Date(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/80 mb-1">End Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange1End, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange1End(new Date(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Range 2</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-foreground/80 mb-1">Start Date</label>
                    <Input 
                      type="date" 
                      value={format(customRange2Start, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomRange2Start(new Date(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/80 mb-1">End Date</label>
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
            <div className="p-4 bg-background rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground/80">Bookings</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(range1Stats.bookings, range2Stats.bookings)}
                  <span className={`text-xs font-medium ${getTrendColor(range1Stats.bookings, range2Stats.bookings)}`}>
                    {getPercentageChange(range1Stats.bookings, range2Stats.bookings)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{range1Stats.bookings}</div>
              <div className="text-xs text-muted-foreground mt-1">{range1Label} vs {range2Stats.bookings} ({range2Label})</div>
            </div>

            <div className="p-4 bg-background rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground/80">Cancellations</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(range2Stats.cancellations, range1Stats.cancellations)}
                  <span className={`text-xs font-medium ${getTrendColor(range2Stats.cancellations, range1Stats.cancellations)}`}>
                    {getPercentageChange(range2Stats.cancellations, range1Stats.cancellations)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{range1Stats.cancellations}</div>
              <div className="text-xs text-muted-foreground mt-1">{range1Label} vs {range2Stats.cancellations} ({range2Label})</div>
            </div>

            <div className="p-4 bg-background rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground/80">Class Enrollments</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(range1Stats.enrollments, range2Stats.enrollments)}
                  <span className={`text-xs font-medium ${getTrendColor(range1Stats.enrollments, range2Stats.enrollments)}`}>
                    {getPercentageChange(range1Stats.enrollments, range2Stats.enrollments)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{range1Stats.enrollments}</div>
              <div className="text-xs text-muted-foreground mt-1">{range1Label} vs {range2Stats.enrollments} ({range2Label})</div>
            </div>

            <div className="p-4 bg-background rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground/80">Total Activity</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(activities.length, Math.max(1, activities.length - 10))}
                  <span className="text-xs font-medium text-foreground/80">--</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{activities.length}</div>
              <div className="text-xs text-muted-foreground mt-1">all-time activities</div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Activity Trends Comparison</h3>
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
                        <div className="bg-card p-3 border border-border rounded shadow-lg text-foreground">
                          <p className="font-semibold mb-2">{data.day}</p>
                          <div className="space-y-1 text-sm">
                            <p className="text-emerald-500 font-medium">
                              {range1Label} ({data.date1}): {data.range1Bookings} bookings
                            </p>
                            <p className="text-blue-500 font-medium">
                              {range2Label} ({data.date2}): {data.range2Bookings} bookings
                            </p>
                            <p className="text-amber-500 font-medium">
                              {range1Label}: {data.range1Cancellations} cancellations
                            </p>
                            <p className="text-red-500 font-medium">
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
                  stroke="#10b981" 
                  strokeWidth={3}
                  name={`${range1Label} Bookings`}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="range2Bookings" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name={`${range2Label} Bookings`}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="range1Cancellations" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  name={`${range1Label} Cancellations`}
                  dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                  strokeDasharray="8 4"
                />
                <Line 
                  type="monotone" 
                  dataKey="range2Cancellations" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  name={`${range2Label} Cancellations`}
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                  strokeDasharray="8 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Classes Snapshot */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Classes Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {upcomingClassesSnapshot.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No upcoming classes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingClassesSnapshot.map((classItem) => {
                const percentage = Math.round((classItem.enrolled / classItem.capacity) * 100);
                return (
                  <div
                    key={classItem.id}
                    onClick={() => handleViewParticipants(classItem)}
                    className="flex items-center justify-between p-3 bg-background hover:bg-accent/50 rounded-lg cursor-pointer transition-colors border border-gray-100 hover:border-primary/30"
                  >
                    <div className="flex-1">
                      <div className="text-base font-medium text-foreground">{classItem.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(classItem.startTime, 'EEE, MMM d • h:mm a')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {classItem.enrolled}/{classItem.capacity}
                        </div>
                        <div className={`text-base font-semibold ${
                          percentage >= 80 ? 'text-green-600' : 
                          percentage >= 50 ? 'text-yellow-600' : 
                          'text-gray-700'
                        }`}>
                          ({percentage.toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-5 py-4">
              {/* Client Header */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl">
                  {selectedBooking.clientName?.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-xl font-semibold">{selectedBooking.clientName}</div>
                  <div className="text-sm text-foreground/80 mt-1">
                    {format(selectedBooking.startTime, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-foreground/80">
                    {format(selectedBooking.startTime, 'h:mm a')} - {format(selectedBooking.endTime, 'h:mm a')}
                  </div>
                </div>
              </div>
              
              {/* Trainer & Location */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Session Details</h3>
                <div className="text-sm">
                  <span className="text-foreground/80">Trainer:</span> {selectedBooking.trainerName}
                </div>
                <div className="text-sm">
                  <span className="text-foreground/80">Location:</span> {selectedBooking.location}
                </div>
              </div>

              {/* Contact Information */}
              {(selectedBooking.clientEmail || selectedBooking.clientPhone) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Contact Information</h3>
                  {selectedBooking.clientEmail && (
                    <div className="text-sm">
                      <span className="text-foreground/80">Email:</span> {selectedBooking.clientEmail}
                    </div>
                  )}
                  {selectedBooking.clientPhone && (
                    <div className="text-sm">
                      <span className="text-foreground/80">Phone:</span> {selectedBooking.clientPhone}
                    </div>
                  )}
                </div>
              )}
              
              {/* Cancel Session Buttons */}
              {!showCancelConfirm && !cancellingBooking && (
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-700 mb-3">Cancel This Session</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowCancelConfirm('early')}
                      variant="outline"
                      className="border-orange-500 text-orange-700 hover:bg-orange-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Early Cancel
                      <div className="text-xs text-muted-foreground ml-2">(Refund)</div>
                    </Button>
                    <Button
                      onClick={() => setShowCancelConfirm('late')}
                      variant="outline"
                      className="border-red-500 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Late Cancel
                      <div className="text-xs text-muted-foreground ml-2">(No Refund)</div>
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Participants - Booked Athletes */}
              {((selectedBooking.athleteNames && selectedBooking.athleteNames.length > 0) || selectedBooking.athleteName || selectedBooking.secondAthleteName) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Participants</h3>
                  <div className="space-y-3">
                    {selectedBooking.athleteNames && selectedBooking.athleteNames.length > 0 ? (
                      selectedBooking.athleteNames.map((name, idx) => {
                        const matchedAthlete = selectedBooking.athletes?.find(athlete => 
                          `${athlete.firstName} ${athlete.lastName}` === name
                        );
                        return (
                          <div key={idx} className="bg-blue-50 p-3 rounded-lg space-y-1">
                            <div className="font-medium text-foreground">{name}</div>
                            {matchedAthlete && (
                              <>
                                {matchedAthlete.birthday && (
                                  <div className="text-sm text-foreground/80">DOB: {matchedAthlete.birthday}</div>
                                )}
                                {matchedAthlete.schoolClubTeam && (
                                  <div className="text-sm text-foreground/80">Team: {matchedAthlete.schoolClubTeam}</div>
                                )}
                                {matchedAthlete.experienceLevel && (
                                  <div className="text-sm text-foreground/80">Experience: {matchedAthlete.experienceLevel}</div>
                                )}
                                {matchedAthlete.position && (
                                  <div className="text-sm text-foreground/80">Position: {matchedAthlete.position}</div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {selectedBooking.athleteName && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-foreground">{selectedBooking.athleteName}</div>
                          </div>
                        )}
                        {selectedBooking.secondAthleteName && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-foreground">{selectedBooking.secondAthleteName}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* All Athletes on File */}
              {selectedBooking.athletes && selectedBooking.athletes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">All Athletes on File</h3>
                  <div className="space-y-3">
                    {selectedBooking.athletes.map((athlete, idx) => (
                      <div key={idx} className="bg-background p-3 rounded-lg space-y-1">
                        <div className="font-medium text-foreground">
                          {athlete.firstName} {athlete.lastName}
                        </div>
                        {athlete.birthday && (
                          <div className="text-sm text-foreground/80">DOB: {athlete.birthday}</div>
                        )}
                        {athlete.schoolClubTeam && (
                          <div className="text-sm text-foreground/80">Team: {athlete.schoolClubTeam}</div>
                        )}
                        {athlete.experienceLevel && (
                          <div className="text-sm text-foreground/80">Experience: {athlete.experienceLevel}</div>
                        )}
                        {athlete.position && (
                          <div className="text-sm text-foreground/80">Position: {athlete.position}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Emergency Contact */}
              {selectedBooking.emergencyContactName && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Emergency Contact</h3>
                  <div className="text-sm">
                    <div className="text-foreground">{selectedBooking.emergencyContactName}</div>
                    {selectedBooking.emergencyContactNumber && (
                      <div className="text-foreground/80">{selectedBooking.emergencyContactNumber}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Referral */}
              {selectedBooking.referredBy && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Referred By</h3>
                  <div className="text-sm text-foreground">{selectedBooking.referredBy}</div>
                </div>
              )}
              
              {/* Session Notes */}
              {selectedBooking.lessonNotes && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Session Notes</h3>
                  <div className="text-sm text-foreground/80 bg-blue-50 p-3 rounded-lg">
                    {selectedBooking.lessonNotes}
                  </div>
                </div>
              )}

              {/* Confirmation Step */}
              {showCancelConfirm && !cancellingBooking && (
                <div className="pt-4 border-t space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Confirm {showCancelConfirm === 'early' ? 'Early' : 'Late'} Cancel
                    </p>
                    <p className="text-sm text-yellow-800">
                      {showCancelConfirm === 'early' 
                        ? 'The client\'s pass will be refunded and returned to their account.' 
                        : 'The client\'s pass will NOT be refunded. This cannot be undone.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCancelBooking(showCancelConfirm === 'early')}
                      variant="destructive"
                      className="flex-1"
                    >
                      Confirm Cancellation
                    </Button>
                    <Button
                      onClick={() => setShowCancelConfirm(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Go Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancelling State */}
              {cancellingBooking && (
                <div className="pt-4 border-t text-center text-foreground/80">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    Cancelling session...
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Class Detail Dialog */}
      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedClass?.title}</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-4 py-4">
              <div>
                <div className="text-sm text-foreground/80">Date & Time</div>
                <div className="font-medium">{format(selectedClass.startTime, 'EEEE, MMMM d, yyyy')}</div>
                <div>{format(selectedClass.startTime, 'h:mm a')} - {format(selectedClass.endTime, 'h:mm a')}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/80">Location</div>
                <div className="font-medium">{selectedClass.location}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/80">Enrollment</div>
                <div className="text-2xl font-bold">
                  {selectedClass.enrolled} / {selectedClass.capacity}
                </div>
                <div className="text-sm text-muted-foreground">
                  {((selectedClass.enrolled / selectedClass.capacity) * 100).toFixed(0)}% full
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      {viewingParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground">Class Participants</h2>
                  <p className="text-sm text-foreground/80 mt-1">{viewingParticipants.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(viewingParticipants.startTime, 'EEE, MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setViewingParticipants(null);
                    setParticipants([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {loadingParticipants ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading participants...</p>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">No participants registered yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="p-4 bg-background rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold flex-shrink-0">
                            {participant.firstName?.charAt(0)}{participant.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {participant.firstName} {participant.lastName}
                            </p>
                            {participant.email && (
                              <p className="text-sm text-muted-foreground">
                                📧 {participant.email}
                              </p>
                            )}
                            {participant.phoneNumber && (
                              <p className="text-sm text-muted-foreground">
                                📱 {participant.phoneNumber}
                              </p>
                            )}
                            {participant.athleteName && (
                              <p className="text-sm text-blue-600 font-medium">
                                🏃 Athlete: {participant.athleteName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Registered {format(participant.registeredAt.toDate(), 'MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                          #{index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Total Participants:</span>
                  <span className="text-lg font-bold text-primary">
                    {participants.length} / {viewingParticipants.capacity}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
