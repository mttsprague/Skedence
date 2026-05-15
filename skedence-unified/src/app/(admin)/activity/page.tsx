'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, query, where, getDocs, getDoc, doc, limit, orderBy, Timestamp, documentId, onSnapshot, updateDoc } from 'firebase/firestore';
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
  UserMinus,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays, addDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ActivityType } from '@/lib/activity-logger';
import dynamic from 'next/dynamic';
const ActivityLineChart = dynamic(() => import('@/components/charts/activity-line-chart'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-md bg-muted" />,
});
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
  checkedIn?: boolean;
  checkedInAt?: Timestamp;
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
  notesForCoach?: string;
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
  
  // Date range filtering
  const [dateRangeMode, setDateRangeMode] = useState<'today' | 'yesterday' | 'week' | 'last-week' | 'month' | 'last-month' | 'all' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [fieldLabels, setFieldLabels] = useState({ birthday: 'Birthday', schoolClubTeam: 'School / Club Team', experienceLevel: 'Experience Level', position: 'Position' });

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
  const activeTrainersLive = useRealTimeCount('trainers', activeTrainersConstraints, !!orgId);

  // Joined client count: orgMembers cross-checked against users docs (matches /clients page logic)
  const [activeClientCount, setActiveClientCount] = useState<number>(0);
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    async function computeClientCount() {
      const membersSnap = await getDocs(query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('isActive', '==', true)
      ));
      const clientIds = membersSnap.docs
        .map(d => d.data())
        .filter((m: any) => m.role === 'client' && !!m.userId)
        .map((m: any) => m.userId as string);
      if (clientIds.length === 0) { if (!cancelled) setActiveClientCount(0); return; }
      const BATCH = 30;
      let count = 0;
      for (let i = 0; i < clientIds.length; i += BATCH) {
        const batch = clientIds.slice(i, i + BATCH);
        const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)));
        usersSnap.docs.forEach(d => {
          const data = d.data();
          if (data.isActive !== false) count++;
        });
      }
      if (!cancelled) setActiveClientCount(count);
    }
    computeClientCount();
    return () => { cancelled = true; };
  }, [orgId]);
  
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
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleTrainerId, setRescheduleTrainerId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  
  // Classes Snapshot data (next 3 upcoming)
  const [upcomingClassesSnapshot, setUpcomingClassesSnapshot] = useState<ClassSnapshot[]>([]);
  const [viewingParticipants, setViewingParticipants] = useState<ClassSnapshot | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const participantsUnsubRef = useRef<(() => void) | null>(null);
  
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

    // Load field labels from org's intake form config
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'organizations', orgId)).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        const fields: any[] = data.intakeFormFieldsPrivate || data.intakeFormFields || [];
        const getLabel = (id: string, def: string) => fields.find((f: any) => f.id === id)?.label || def;
        const posField = fields.find((f: any) => typeof f.label === 'string' && f.label.toLowerCase().includes('position'));
        setFieldLabels({
          birthday: getLabel('athleteBirthday', 'Birthday'),
          schoolClubTeam: getLabel('schoolTeam', 'School / Club Team'),
          experienceLevel: getLabel('experienceLevel', 'Experience Level'),
          position: posField?.label || 'Position',
        });
      }).catch(() => {});
    });

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
        
        const classesSnap = await getDocs(query(
          collection(db, 'classes'),
          where('orgId', '==', orgId),
          where('startTime', '>=', dayStart),
          where('startTime', '<=', dayEnd),
          orderBy('startTime', 'asc')
        ));

        // Count participants from the authoritative subcollection (same source as the participants modal)
        const classes: ClassSnapshot[] = await Promise.all(
          classesSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const participantsSnap = await getDocs(collection(db, 'classes', docSnap.id, 'participants'));
            return {
              id: docSnap.id,
              title: data.title || 'Untitled Class',
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate() || new Date(),
              capacity: data.maxParticipants || data.capacity || 10,
              enrolled: participantsSnap.docs.length,
              location: data.location || 'TBD',
            };
          })
        );
        
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

        const confirmedDocs = bookingsSnap.docs.filter(doc => doc.data().status === 'confirmed');

        // Enrich bookings: resolve trainerName and location from source docs when missing/corrupted
        const bookings: BookingSnapshot[] = await Promise.all(
          confirmedDocs.map(async (docSnap) => {
            const data = docSnap.data();
            const trainerId: string = data.trainerId || '';

            // Resolve trainer name — treat single-word values like "trainer" as missing
            let trainerName: string = data.trainerName || '';
            const nameIsSuspect = !trainerName || !trainerName.includes(' ');
            if (nameIsSuspect && trainerId) {
              try {
                const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
                if (trainerDoc.exists()) {
                  const td = trainerDoc.data();
                  const resolved = `${td.firstName || ''} ${td.lastName || ''}`.trim();
                  if (resolved) trainerName = resolved;
                }
              } catch {
                // keep whatever we have
              }
            }
            if (!trainerName) trainerName = 'Unknown Trainer';

            // Resolve location — look up the schedule slot when missing
            let location: string = data.location || '';
            if (!location && trainerId && data.slotId) {
              try {
                const slotDoc = await getDoc(doc(db, 'trainers', trainerId, 'schedules', data.slotId));
                if (slotDoc.exists()) {
                  location = slotDoc.data().location || '';
                }
              } catch {
                // keep whatever we have
              }
            }
            if (!location) location = 'TBD';

            return {
              id: docSnap.id,
              trainerId,
              trainerName,
              clientName: data.clientName || 'Unknown Client',
              clientEmail: data.clientEmail,
              clientPhone: data.clientPhone,
              clientUID: data.clientUID,
              clientId: data.clientId,
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate() || new Date(),
              location,
              lessonNotes: data.lessonNotes,
              athleteName: data.athleteName,
              secondAthleteName: data.secondAthleteName,
              athleteNames: data.athleteNames,
              athletes: data.athletes,
              emergencyContactName: data.emergencyContactName,
              emergencyContactNumber: data.emergencyContactNumber,
              referredBy: data.referredBy,
              notesForCoach: data.notesForCoach,
            };
          })
        );
        
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
  const handleViewParticipants = useCallback((cls: ClassSnapshot) => {
    if (participantsUnsubRef.current) { participantsUnsubRef.current(); participantsUnsubRef.current = null; }
    setViewingParticipants(cls);
    setLoadingParticipants(true);
    setParticipants([]);

    const participantsRef = collection(db, 'classes', cls.id, 'participants');
    const unsub = onSnapshot(participantsRef, async (snapshot) => {
      const participantsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Participant[];
      const enriched = await Promise.all(
        participantsData.map(async (participant) => {
          try {
            const userQuery = query(collection(db, 'users'), where('__name__', '==', participant.userId));
            const userDoc = await getDocs(userQuery);
            if (!userDoc.empty) {
              const ud = userDoc.docs[0].data();
              return { ...participant, email: ud.email || ud.emailAddress, phoneNumber: ud.phoneNumber || ud.phone };
            }
          } catch { /* silent */ }
          return participant;
        })
      );
      setParticipants(enriched.sort((a, b) => {
        const as_ = (a.registeredAt as any)?.seconds ?? 0;
        const bs_ = (b.registeredAt as any)?.seconds ?? 0;
        return as_ - bs_;
      }));
      setLoadingParticipants(false);
    }, () => { setParticipants([]); setLoadingParticipants(false); });
    participantsUnsubRef.current = unsub;
  }, []);

  const handleCheckIn = async (participant: Participant) => {
    if (!viewingParticipants || checkingIn === participant.id) return;
    setCheckingIn(participant.id);
    try {
      const ref = doc(db, 'classes', viewingParticipants.id, 'participants', participant.id);
      if (participant.checkedIn) {
        await updateDoc(ref, { checkedIn: false, checkedInAt: null });
      } else {
        await updateDoc(ref, { checkedIn: true, checkedInAt: Timestamp.now() });
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
    } finally {
      setCheckingIn(null);
    }
  };

  // Memoized filtering logic
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];
    
    // Date filter (only if not searching)
    if (!isSearching) {
      let rangeStart: Date;
      let rangeEnd: Date;
      
      switch (dateRangeMode) {
        case 'today':
          rangeStart = startOfDay(new Date());
          rangeEnd = endOfDay(new Date());
          break;
        case 'yesterday':
          rangeStart = startOfDay(subDays(new Date(), 1));
          rangeEnd = endOfDay(subDays(new Date(), 1));
          break;
        case 'week':
          rangeStart = startOfWeek(new Date());
          rangeEnd = endOfWeek(new Date());
          break;
        case 'last-week':
          rangeStart = startOfWeek(subDays(new Date(), 7));
          rangeEnd = endOfWeek(subDays(new Date(), 7));
          break;
        case 'month':
          rangeStart = startOfMonth(new Date());
          rangeEnd = endOfMonth(new Date());
          break;
        case 'last-month':
          rangeStart = startOfMonth(addMonths(new Date(), -1));
          rangeEnd = endOfMonth(addMonths(new Date(), -1));
          break;
        case 'all':
          // No date filtering for 'all'
          rangeStart = new Date(0); // Beginning of time
          rangeEnd = new Date(9999, 11, 31); // Far future
          break;
        case 'custom':
          rangeStart = startOfDay(new Date(customStartDate));
          rangeEnd = endOfDay(new Date(customEndDate));
          break;
      }
      
      filtered = filtered.filter(activity => {
        const activityTime = activity.timestamp.getTime();
        return activityTime >= rangeStart.getTime() && activityTime <= rangeEnd.getTime();
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
  }, [activities, selectedDate, searchQuery, isSearching, selectedActivityType, selectedClient, selectedTrainer, selectedRole, dateRangeMode, customStartDate, customEndDate]);

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
  const hasActiveFilters = useMemo(() => 
    selectedActivityType !== 'all' || selectedClient !== 'all' || selectedTrainer !== 'all' || selectedRole !== 'all',
    [selectedActivityType, selectedClient, selectedTrainer, selectedRole]
  );

  // Memoized callbacks
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

  const handleReschedule = async () => {
    if (!selectedBooking || !orgId || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleTrainerId) return;
    setRescheduling(true);
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const adminRescheduleLesson = httpsCallable(functions, 'adminRescheduleLesson');
      const [year, month, day] = rescheduleDate.split('-').map(Number);
      const [startHour, startMin] = rescheduleStartTime.split(':').map(Number);
      const [endHour, endMin] = rescheduleEndTime.split(':').map(Number);
      const newStartDate = new Date(year, month - 1, day, startHour, startMin, 0, 0);
      const newEndDate = new Date(year, month - 1, day, endHour, endMin, 0, 0);
      await adminRescheduleLesson({
        bookingId: selectedBooking.id,
        orgId,
        newTrainerId: rescheduleTrainerId,
        newStartTime: newStartDate.toISOString(),
        newEndTime: newEndDate.toISOString(),
      });
      setSelectedBooking(null);
      setShowReschedule(false);
      toast.success('Session rescheduled', 'The booking has been moved to the new time.');
    } catch (error: any) {
      console.error('Failed to reschedule:', error);
      toast.error('Failed to reschedule', error.message || 'Please try again');
    } finally {
      setRescheduling(false);
    }
  };

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
      const confirmedCancelDocs = bookingsSnap.docs.filter(d => d.data().status === 'confirmed');
      const bookings: BookingSnapshot[] = await Promise.all(
        confirmedCancelDocs.map(async (docSnap) => {
          const data = docSnap.data();
          const trainerId: string = data.trainerId || '';
          let trainerName: string = data.trainerName || '';
          const nameIsSuspect = !trainerName || !trainerName.includes(' ');
          if (nameIsSuspect && trainerId) {
            try {
              const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
              if (trainerDoc.exists()) {
                const td = trainerDoc.data();
                const resolved = `${td.firstName || ''} ${td.lastName || ''}`.trim();
                if (resolved) trainerName = resolved;
              }
            } catch { /* keep */ }
          }
          if (!trainerName) trainerName = 'Unknown Trainer';
          let location: string = data.location || '';
          if (!location && trainerId && data.slotId) {
            try {
              const slotDoc = await getDoc(doc(db, 'trainers', trainerId, 'schedules', data.slotId));
              if (slotDoc.exists()) location = slotDoc.data().location || '';
            } catch { /* keep */ }
          }
          if (!location) location = 'TBD';
          return {
            id: docSnap.id,
            trainerId,
            trainerName,
            clientName: data.clientName || 'Unknown Client',
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone,
            clientUID: data.clientUID,
            clientId: data.clientId,
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            location,
            lessonNotes: data.lessonNotes,
            athleteName: data.athleteName,
            secondAthleteName: data.secondAthleteName,
            athleteNames: data.athleteNames,
            athletes: data.athletes,
            emergencyContactName: data.emergencyContactName,
            emergencyContactNumber: data.emergencyContactNumber,
            referredBy: data.referredBy,
            notesForCoach: data.notesForCoach,
          };
        })
      );
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
      case 'class_registered':
      case 'class_enrollment':
        return <GraduationCap className="h-5 w-5 text-teal-600" />;
      case 'class_unenrollment':
        return <UserMinus className="h-5 w-5 text-orange-600" />;
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
          count={activeClientCount}
          isLive={true}
          lastUpdate={new Date()}
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

      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <Select value={dateRangeMode} onValueChange={(value: any) => setDateRangeMode(value)} disabled={isSearching}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search Activities</label>
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
            </div>
          </CardContent>
        </Card>
      </div>
      
      {dateRangeMode === 'custom' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <SelectItem value="class_unenrollment">Class Removals</SelectItem>
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
            {isSearching ? 'Search Results' : (
              dateRangeMode === 'today' ? format(new Date(), 'MMMM d, yyyy') :
              dateRangeMode === 'yesterday' ? format(subDays(new Date(), 1), 'MMMM d, yyyy') :
              dateRangeMode === 'week' ? 'This Week' :
              dateRangeMode === 'last-week' ? 'Last Week' :
              dateRangeMode === 'month' ? 'This Month' :
              dateRangeMode === 'last-month' ? 'Last Month' :
              dateRangeMode === 'all' ? 'All Activity' :
              `${format(new Date(customStartDate), 'MMM d')} - ${format(new Date(customEndDate), 'MMM d, yyyy')}`
            )}
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
                  : dateRangeMode === 'all'
                  ? 'No activity recorded yet'
                  : 'No activity in this date range'
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
            <ActivityLineChart data={comparisonChartData} range1Label={range1Label} range2Label={range2Label} />
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
      <Dialog open={!!selectedBooking} onOpenChange={() => { setSelectedBooking(null); setShowReschedule(false); setShowCancelConfirm(null); }}>
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
              
              {/* Admin Actions: Reschedule + Cancel */}
              <div className="space-y-3 pt-2 border-t">
                <h3 className="font-semibold text-foreground">Admin Actions</h3>
                {!showReschedule && !showCancelConfirm && !cancellingBooking && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        const dt = selectedBooking.startTime;
                        const et = selectedBooking.endTime;
                        setRescheduleTrainerId(selectedBooking.trainerId);
                        setRescheduleDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
                        setRescheduleStartTime(`${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`);
                        setRescheduleEndTime(`${String(et.getHours()).padStart(2,'0')}:${String(et.getMinutes()).padStart(2,'0')}`);
                        setShowReschedule(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => setShowCancelConfirm('early')}
                    >
                      Early Cancel (Refund)
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setShowCancelConfirm('late')}
                    >
                      Late Cancel (No Refund)
                    </Button>
                  </div>
                )}

                {/* Reschedule panel */}
                {showReschedule && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-blue-900">Reschedule Session</h4>
                      <button
                        onClick={() => setShowReschedule(false)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">Trainer</p>
                      <Select value={rescheduleTrainerId} onValueChange={setRescheduleTrainerId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select trainer" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainers.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900">Date</p>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={e => setRescheduleDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-blue-900">Start Time</p>
                          <input
                            type="time"
                            value={rescheduleStartTime}
                            onChange={e => setRescheduleStartTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-blue-900">End Time</p>
                          <input
                            type="time"
                            value={rescheduleEndTime}
                            onChange={e => setRescheduleEndTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleReschedule}
                      disabled={!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleTrainerId || rescheduling}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {rescheduling ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Rescheduling...
                        </span>
                      ) : 'Confirm Reschedule'}
                    </Button>
                  </div>
                )}
              </div>
              
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
                                  <div className="text-sm text-foreground/80">{fieldLabels.birthday}: {matchedAthlete.birthday}</div>
                                )}
                                {matchedAthlete.schoolClubTeam && (
                                  <div className="text-sm text-foreground/80">{fieldLabels.schoolClubTeam}: {matchedAthlete.schoolClubTeam}</div>
                                )}
                                {matchedAthlete.experienceLevel && (
                                  <div className="text-sm text-foreground/80">{fieldLabels.experienceLevel}: {matchedAthlete.experienceLevel}</div>
                                )}
                                {matchedAthlete.position && (
                                  <div className="text-sm text-foreground/80">{fieldLabels.position}: {matchedAthlete.position}</div>
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
                          <div className="text-sm text-foreground/80">{fieldLabels.birthday}: {athlete.birthday}</div>
                        )}
                        {athlete.schoolClubTeam && (
                          <div className="text-sm text-foreground/80">{fieldLabels.schoolClubTeam}: {athlete.schoolClubTeam}</div>
                        )}
                        {athlete.experienceLevel && (
                          <div className="text-sm text-foreground/80">{fieldLabels.experienceLevel}: {athlete.experienceLevel}</div>
                        )}
                        {athlete.position && (
                          <div className="text-sm text-foreground/80">{fieldLabels.position}: {athlete.position}</div>
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
              
              {/* Notes for Coach */}
              {selectedBooking.notesForCoach && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Notes for Coach</h3>
                  <div className="text-sm text-foreground/80 bg-amber-50 border border-amber-100 p-3 rounded-lg">
                    {selectedBooking.notesForCoach}
                  </div>
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
                    if (participantsUnsubRef.current) { participantsUnsubRef.current(); participantsUnsubRef.current = null; }
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
              {/* Attendance summary */}
              {participants.length > 0 && (() => {
                const checkedInCount = participants.filter(p => p.checkedIn).length;
                return (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Checked In</span>
                    <span className="text-lg font-bold text-green-700">{checkedInCount} / {participants.length}</span>
                  </div>
                );
              })()}

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
                      className={`p-4 rounded-lg border transition-colors ${
                        participant.checkedIn
                          ? 'bg-green-50 border-green-200'
                          : 'bg-background border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                            participant.checkedIn ? 'bg-green-600 text-white' : 'bg-primary text-white'
                          }`}>
                            {participant.firstName?.charAt(0)}{participant.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {participant.firstName} {participant.lastName}
                            </p>
                            {participant.email && (
                              <p className="text-sm text-muted-foreground">📧 {participant.email}</p>
                            )}
                            {participant.phoneNumber && (
                              <p className="text-sm text-muted-foreground">📱 {participant.phoneNumber}</p>
                            )}
                            {participant.athleteName && participant.athleteName.trim() !== `${participant.firstName} ${participant.lastName}`.trim() && (
                              <p className="text-sm text-blue-600 font-medium">🏃 Athlete: {participant.athleteName}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Registered {format(participant.registeredAt.toDate(), 'MMM d, yyyy • h:mm a')}
                            </p>
                            {participant.checkedIn && participant.checkedInAt && (
                              <p className="text-xs text-green-600 font-medium mt-0.5">
                                ✓ Checked in {format((participant.checkedInAt as Timestamp).toDate(), 'h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <button
                            onClick={() => handleCheckIn(participant)}
                            disabled={checkingIn === participant.id}
                            title={participant.checkedIn ? 'Undo check-in' : 'Check in'}
                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              participant.checkedIn
                                ? 'text-green-700 border-green-300 bg-green-100 hover:bg-green-200'
                                : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {checkingIn === participant.id ? (
                              <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                            ) : participant.checkedIn ? (
                              <>✓ In</>
                            ) : (
                              <>Check In</>
                            )}
                          </button>
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
