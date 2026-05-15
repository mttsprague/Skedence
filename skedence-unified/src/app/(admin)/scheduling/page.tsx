'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, deleteDoc, arrayRemove, increment, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { Users, Clock, GraduationCap, Plus, X, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookLessonModal, CreateAvailabilityModal } from '@/components/admin/scheduling-modals';
import { startOfDay, endOfDay, addWeeks } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  userId?: string;
  authUserId?: string;
  email?: string;
}

interface ScheduleItem {
  id: string;
  type: 'lesson' | 'class' | 'shift';
  startTime: Date;
  endTime: Date;
  trainerName: string;
  trainerId?: string;
  clientName?: string;
  className?: string;
  studentsCount?: number;
  participants?: string[];
  location?: string;
  status?: string; // For shifts: 'open', 'unavailable'
  createdByRole?: string; // 'admin' | 'trainer' — who created this slot
  createdById?: string;   // Firebase Auth UID of the creator
  isOrgWide?: boolean;    // True when applied to all trainers
  // Booking details
  clientUID?: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  referredBy?: string;
  notesForCoach?: string;
  athletes?: AthleteInfo[];
  athleteName?: string; // Legacy
  secondAthleteName?: string; // Legacy
  athleteNames?: string[]; // New array format
  lessonNotes?: string;
  packageId?: string; // Lesson package ID
  packageType?: string; // Package type display (e.g., "1 Athlete Private", "2 Athlete Private")
  isFirstLesson?: boolean; // True if this is the client's very first lesson in this org
}

interface AthleteInfo {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  schoolClubTeam?: string;
  experienceLevel?: string;
  position?: string;
}

export default function SchedulingPage() {
  const { orgId, user, userData } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [allTrainersSchedule, setAllTrainersSchedule] = useState<Map<string, ScheduleItem[]>>(new Map());
  const [viewMode, setViewMode] = useState<'individual' | 'all-trainers'>('individual');
  const [allTrainersDate, setAllTrainersDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null); // Start as null to avoid hydration mismatch
  const [today, setToday] = useState<Date | null>(null); // Start as null to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal states
  const [showBookLessonModal, setShowBookLessonModal] = useState(false);
  const [showCreateAvailabilityModal, setShowCreateAvailabilityModal] = useState(false);
  const [showSlotActionDialog, setShowSlotActionDialog] = useState(false);
  const [modalSlotDate, setModalSlotDate] = useState<Date | null>(null);
  const [modalSlotHour, setModalSlotHour] = useState<number>(9);
  const [modalSlotId, setModalSlotId] = useState<string>(''); // Actual slot document ID
  const [modalTrainerId, setModalTrainerId] = useState<string>('');
  const [modalTrainerName, setModalTrainerName] = useState<string>('');
  const [modalSlotStatus, setModalSlotStatus] = useState<string>('open');
  const [modalIsOrgWide, setModalIsOrgWide] = useState<boolean>(false);
  const [modalCreatedById, setModalCreatedById] = useState<string>('');
  const [applyToAllTrainers, setApplyToAllTrainers] = useState<boolean>(false);
  
  // Cancel booking states
  const [showCancelConfirm, setShowCancelConfirm] = useState<'early' | 'late' | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleTrainerId, setRescheduleTrainerId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [fieldLabels, setFieldLabels] = useState({ birthday: 'Birthday', schoolClubTeam: 'School / Club Team', experienceLevel: 'Experience Level', position: 'Position' });

  // Live class participants (loaded when class is selected)
  const [liveParticipants, setLiveParticipants] = useState<Array<{ id: string; firstName: string; lastName: string; athleteName?: string; userId?: string; classPassPackageId?: string | null; parentFirstName?: string; parentLastName?: string; checkedIn?: boolean; checkedInAt?: Date }>>([]);
  const [loadingLiveParticipants, setLoadingLiveParticipants] = useState(false);
  const [removingLiveParticipant, setRemovingLiveParticipant] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const participantsUnsubRef = useRef<(() => void) | null>(null);
  // Register client for class state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerTab, setRegisterTab] = useState<'existing' | 'manual'>('existing');
  const [allClients, setAllClients] = useState<Array<{ id: string; firstName: string; lastName: string; email?: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [registerClientId, setRegisterClientId] = useState('');
  const [registerClientPasses, setRegisterClientPasses] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [registerPassId, setRegisterPassId] = useState('');
  const [registerAthleteNameExisting, setRegisterAthleteNameExisting] = useState('');
  const [registerClientAthletes, setRegisterClientAthletes] = useState<string[]>([]);
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registering, setRegistering] = useState(false);

  // Touch swipe state for calendar navigation
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Set mounted state and initialize current time on client
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setCurrentTime(now);
    setToday(now);
    setSelectedDate(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 0 }));
    setAllTrainersDate(now);
    setModalSlotDate(now);
  }, []);

  // Update current time every minute for timeline
  useEffect(() => {
    if (!isMounted) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [isMounted]);

  // Load field labels from org's intake form config
  useEffect(() => {
    if (!orgId) return;
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
  }, [orgId]);

  // Set initial trainer to current user or first trainer
  useEffect(() => {
    if (trainers.length > 0 && !selectedTrainer) {
      if (userData) {
        // Match by auth UID (userId or authUserId) or email (case-insensitive)
        const userEmail = userData.email?.toLowerCase().trim();
        const userIsTrainer = trainers.find(t =>
          (userData.id && (t.userId === userData.id || t.authUserId === userData.id)) ||
          (userEmail && t.email?.toLowerCase().trim() === userEmail)
        );
        if (userIsTrainer) {
          setSelectedTrainer(`${userIsTrainer.firstName} ${userIsTrainer.lastName}`);
          return;
        }
      }
      // Fall back to first trainer if user not found
      const firstTrainer = trainers[0];
      setSelectedTrainer(`${firstTrainer.firstName} ${firstTrainer.lastName}`);
    }
  }, [trainers, userData, selectedTrainer]);

  // Update week when date changes
  useEffect(() => {
    if (selectedDate) {
      setWeekStart(startOfWeek(selectedDate, { weekStartsOn: 0 }));
    }
  }, [selectedDate]);

  // Helper: load participants subcollection and enrich with parent name from users collection
  const startParticipantsListener = useCallback((classId: string) => {
    participantsUnsubRef.current?.();
    setLoadingLiveParticipants(true);

    const unsub = onSnapshot(
      collection(db, 'classes', classId, 'participants'),
      async (snap) => {
        const base = snap.docs.map(d => ({
          id: d.id,
          firstName: d.data().firstName || '',
          lastName: d.data().lastName || '',
          athleteName: d.data().athleteName as string | undefined,
          userId: d.data().userId as string | undefined,
          classPassPackageId: d.data().classPassPackageId as string | null | undefined,
          parentFirstName: undefined as string | undefined,
          parentLastName: undefined as string | undefined,
          checkedIn: d.data().checkedIn as boolean | undefined,
          checkedInAt: (d.data().checkedInAt as Timestamp | undefined)?.toDate(),
        }));
        // Fetch parent name for each participant that has a userId
        await Promise.all(base.map(async (p) => {
          if (p.userId) {
            try {
              const userSnap = await getDoc(doc(db, 'users', p.userId));
              if (userSnap.exists()) {
                p.parentFirstName = userSnap.data().firstName || '';
                p.parentLastName = userSnap.data().lastName || '';
              }
            } catch { /* non-fatal */ }
          }
        }));
        setLiveParticipants(base);
        setLoadingLiveParticipants(false);
      },
      () => { setLiveParticipants([]); setLoadingLiveParticipants(false); }
    );
    participantsUnsubRef.current = unsub;
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Load live participants when a class is selected
  useEffect(() => {
    if (!selectedItem || selectedItem.type !== 'class') {
      participantsUnsubRef.current?.();
      participantsUnsubRef.current = null;
      setLiveParticipants([]);
      return;
    }
    startParticipantsListener(selectedItem.id);
    return () => { participantsUnsubRef.current?.(); participantsUnsubRef.current = null; };
  }, [selectedItem, startParticipantsListener]);

  const handleCheckIn = async (participant: typeof liveParticipants[0], classId: string) => {
    if (checkingIn) return;
    setCheckingIn(participant.id);
    try {
      const ref = doc(db, 'classes', classId, 'participants', participant.id);
      if (participant.checkedIn) {
        await updateDoc(ref, { checkedIn: false, checkedInAt: null });
      } else {
        await updateDoc(ref, { checkedIn: true, checkedInAt: Timestamp.now() });
      }
    } catch (e) {
      console.error('Check-in error:', e);
    } finally {
      setCheckingIn(null);
    }
  };

  // Load trainers
  useEffect(() => {
    if (!orgId || !userData) return;

    const loadTrainers = async () => {
      try {
        const trainersRef = collection(db, 'trainers');
        const q = query(trainersRef, where('orgId', '==', orgId), orderBy('firstName'));
        const snapshot = await getDocs(q);
        
        const trainersList = snapshot.docs.map(doc => ({
          id: doc.id,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          userId: doc.data().userId as string | undefined,
          authUserId: doc.data().authUserId as string | undefined,
          email: doc.data().email as string | undefined,
        }));
        
        // Sort: current admin/owner first (match by auth UID or email), then alphabetically
        const userEmail = userData?.email?.toLowerCase().trim();
        const sortedTrainers = trainersList.sort((a, b) => {
          const aIsCurrentUser = (userData?.id && (a.userId === userData.id || a.authUserId === userData.id)) || 
                                 (userEmail && a.email?.toLowerCase().trim() === userEmail);
          const bIsCurrentUser = (userData?.id && (b.userId === userData.id || b.authUserId === userData.id)) || 
                                 (userEmail && b.email?.toLowerCase().trim() === userEmail);
          
          if (aIsCurrentUser) return -1;
          if (bIsCurrentUser) return 1;
          
          // Otherwise alphabetically by first name
          return a.firstName.localeCompare(b.firstName);
        });
        
        setTrainers(sortedTrainers);
      } catch (error) {
        console.error('Error loading trainers:', error);
      }
    };

    loadTrainers();
  }, [orgId, userData]);

  // Load schedule for the week
  useEffect(() => {
    if (!orgId || !weekStart || !selectedTrainer || viewMode !== 'individual') {
      if (viewMode === 'individual') {
        setLoading(false);
      }
      return;
    }

    const loadSchedule = async () => {
      setLoading(true);
      try {
        const items: ScheduleItem[] = [];
        
        // Always load week view for specific trainer
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        const startDate = new Date(weekStart);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(weekEnd);
        endDate.setHours(23, 59, 59, 999);

        // Find the selected trainer's ID
        const selectedTrainerObj = trainers.find(t => 
          `${t.firstName} ${t.lastName}` === selectedTrainer
        );

        if (!selectedTrainerObj) {
          setLoading(false);
          return;
        }

        const trainerId = selectedTrainerObj.id;

        // Load lessons (bookings) - from root bookings collection, filtered by trainer
        const bookingsRef = collection(db, 'bookings');
        const bookingsQuery = query(
          bookingsRef,
          where('orgId', '==', orgId),
          where('trainerId', '==', trainerId),
          where('startTime', '>=', startDate),
          where('startTime', '<=', endDate)
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        // Cache: clientId -> id of their earliest booking
        const firstBookingIdCache = new Map<string, string>();
        async function getFirstBookingId(clientId: string): Promise<string | null> {
          if (firstBookingIdCache.has(clientId)) return firstBookingIdCache.get(clientId)!;
          try {
            // Web admin bookings use clientId; iOS/cloud-function bookings use clientUID
            // Query both fields in parallel so we don't miss anything
            const [snapByUID, snapByClientId] = await Promise.all([
              getDocs(query(collection(db, 'bookings'), where('clientUID', '==', clientId))),
              getDocs(query(collection(db, 'bookings'), where('clientId', '==', clientId))),
            ]);
            let minTime = Infinity;
            let firstId: string | null = null;
            const seen = new Set<string>();
            for (const d of [...snapByUID.docs, ...snapByClientId.docs]) {
              if (seen.has(d.id)) continue;
              seen.add(d.id);
              if (d.data().isClassBooking) continue;
              const t: number = (d.data().startTime as any)?.toMillis?.() ?? Infinity;
              if (t < minTime) { minTime = t; firstId = d.id; }
            }
            if (firstId) firstBookingIdCache.set(clientId, firstId);
            return firstId;
          } catch (err) {
            return null;
          }
        }

        for (const docSnap of bookingsSnapshot.docs) {
          const data = docSnap.data();
          // Skip class-registration bookings — shown as class items separately
          if (data.isClassBooking === true) continue;
          
          // Get client name and details
          let clientName = 'Unknown Client';
          let clientEmail: string | undefined;
          let clientPhone: string | undefined;
          let emergencyContactName: string | undefined;
          let emergencyContactNumber: string | undefined;
          let referredBy: string | undefined;
          let notesForCoach: string | undefined;
          let athletes: AthleteInfo[] | undefined;
          
          const actualClientId = data.clientUID || data.clientId;
          if (actualClientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', actualClientId));
              if (clientDoc.exists()) {
                const clientData = clientDoc.data();
                clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Unknown Client';
                clientEmail = clientData.emailAddress || clientData.email;
                clientPhone = clientData.phoneNumber;
                emergencyContactName = clientData.emergencyContactName;
                emergencyContactNumber = clientData.emergencyContactNumber;
                referredBy = clientData.referredBy;
                notesForCoach = clientData.notesForCoach;
                // Ensure athletes is an array
                athletes = Array.isArray(clientData.athletes) ? clientData.athletes : [];
              }
            } catch (err) {
              console.error('Error fetching client:', err);
            }
          }
          
          // Get trainer name
          let trainerName = 'Unknown Trainer';
          if (data.trainerId) {
            try {
              const trainerDoc = await getDoc(doc(db, 'trainers', data.trainerId));
              if (trainerDoc.exists()) {
                const trainerData = trainerDoc.data();
                trainerName = `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim() || 'Unknown Trainer';
              }
            } catch (err) {
              console.error('Error fetching trainer:', err);
            }
          }
          
          // Get package type
          let packageType: string | undefined;
          if (data.packageId && actualClientId) {
            try {
              // Try new path first
              let packageDoc = await getDoc(doc(db, 'organizations', orgId, 'users', actualClientId, 'packages', data.packageId));
              if (!packageDoc.exists()) {
                // Try legacy path
                packageDoc = await getDoc(doc(db, 'users', actualClientId, 'lessonPackages', data.packageId));
              }
              if (packageDoc.exists()) {
                const packageData = packageDoc.data();
                const packageName = packageData.packageName || packageData.packageType;
                const category = packageData.packageCategory;
                
                // Generate friendly display name
                if (category === 'oneAthlete') packageType = '1 Athlete Private';
                else if (category === 'twoAthlete') packageType = '2 Athlete Private';
                else if (category === 'threeAthlete') packageType = '3 Athlete Private';
                else if (category === 'fourAthlete') packageType = '4 Athlete Private';
                else if (category === 'classPass' || category === 'class') packageType = 'Class Pass';
                else packageType = packageName || 'Private Lesson';
              }
            } catch (err) {
              console.error('Error fetching package:', err);
            }
          }
          
          // Check first lesson
          let isFirstLesson = false;
          if (actualClientId) {
            const firstId = await getFirstBookingId(actualClientId);
            isFirstLesson = firstId === docSnap.id;
          }

          items.push({
            id: docSnap.id,
            type: 'lesson',
            startTime: data.startTime.toDate(),
            endTime: data.endTime.toDate(),
            trainerName,
            clientName,
            clientUID: data.clientUID,
            clientId: data.clientId,
            clientEmail,
            clientPhone,
            emergencyContactName,
            emergencyContactNumber,
            referredBy,
            notesForCoach,
            athletes,
            athleteName: data.athleteName, // Legacy
            secondAthleteName: data.secondAthleteName, // Legacy
            athleteNames: data.athleteNames, // New array format
            lessonNotes: data.lessonNotes,
            packageId: data.packageId,
            packageType,
            isFirstLesson,
          });
        }

        // Load classes - from root classes collection, filtered by trainer
        const classesRef = collection(db, 'classes');
        const classesQuery = query(
          classesRef,
          where('orgId', '==', orgId),
          where('trainerId', '==', trainerId),
          where('startTime', '>=', startDate),
          where('startTime', '<=', endDate)
        );
        
        const classesSnapshot = await getDocs(classesQuery);
        
        for (const docSnap of classesSnapshot.docs) {
          const data = docSnap.data();
          
          // Get trainer name
          let trainerName = 'Unknown Trainer';
          if (data.trainerId) {
            try {
              const trainerDoc = await getDoc(doc(db, 'trainers', data.trainerId));
              if (trainerDoc.exists()) {
                const trainerData = trainerDoc.data();
                trainerName = `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim() || 'Unknown Trainer';
              }
            } catch (err) {
              console.error('Error fetching trainer:', err);
            }
          }
          
          // Load participants from subcollection
          const participants: string[] = [];
          try {
            const participantsSnap = await getDocs(collection(db, 'classes', docSnap.id, 'participants'));
            for (const pDoc of participantsSnap.docs) {
              const pData = pDoc.data();
              const athleteName = pData.athleteName || `${pData.firstName || ''} ${pData.lastName || ''}`.trim();
              if (athleteName) participants.push(athleteName);
            }
          } catch (err) {
            console.error('Error fetching class participants:', err);
          }
          
          items.push({
            id: docSnap.id,
            type: 'class',
            startTime: data.startTime.toDate(),
            endTime: data.endTime.toDate(),
            trainerName,
            className: data.title || data.name || 'Untitled Class',
            studentsCount: participants.length,
            participants,
          });
        }

        // Load recurring shifts/availability - from selected trainer's schedules subcollection
        const schedulesRef = collection(db, 'trainers', trainerId, 'schedules');
        const schedulesQuery = query(
          schedulesRef,
          where('startTime', '>=', startDate),
          where('startTime', '<=', endDate)
        );
        
        const schedulesSnapshot = await getDocs(schedulesQuery);
        
        for (const scheduleDoc of schedulesSnapshot.docs) {
          const scheduleData = scheduleDoc.data();
          
          // Include both "open" and "unavailable" shifts
          const isAvailable = scheduleData.isBooked === false || scheduleData.status === 'open' || scheduleData.status === 'unavailable';
          if (!isAvailable) continue;

          const shiftStart = scheduleData.startTime.toDate().getTime();
          const shiftEnd = scheduleData.endTime.toDate().getTime();
          // Skip shift if a booking (lesson) already covers this time
          const hasOverlappingBooking = items.some(
            i => i.type === 'lesson' && i.startTime.getTime() === shiftStart && i.endTime.getTime() === shiftEnd
          );
          if (hasOverlappingBooking) continue;

          items.push({
            id: scheduleDoc.id,
            type: 'shift',
            startTime: scheduleData.startTime.toDate(),
            endTime: scheduleData.endTime.toDate(),
            trainerName: selectedTrainer,
            trainerId: trainerId,
            location: scheduleData.location,
            status: scheduleData.status,
            createdByRole: scheduleData.createdByRole,
            createdById: scheduleData.createdById,
            isOrgWide: scheduleData.isOrgWide,
          });
        }

        // Sort by start time
        items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        
        setScheduleItems(items);
      } catch (error) {
        console.error('Error loading schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [orgId, weekStart, selectedDate, selectedTrainer, trainers, viewMode]);

  // Load all trainers schedule for single day view
  useEffect(() => {
    if (!orgId || !allTrainersDate || viewMode !== 'all-trainers' || trainers.length === 0) {
      return;
    }

    const loadAllTrainersSchedule = async () => {
      setLoading(true);
      try {
        const scheduleMap = new Map<string, ScheduleItem[]>();
        const startDate = startOfDay(allTrainersDate);
        const endDate = endOfDay(allTrainersDate);

        // Load schedule for each active trainer
        for (const trainer of trainers) {
          const trainerId = trainer.id;
          const trainerName = `${trainer.firstName} ${trainer.lastName}`;
          const items: ScheduleItem[] = [];

          // Load bookings for this trainer
          const bookingsRef = collection(db, 'bookings');
          const bookingsQuery = query(
            bookingsRef,
            where('orgId', '==', orgId),
            where('trainerId', '==', trainerId),
            where('startTime', '>=', startDate),
            where('startTime', '<=', endDate)
          );
          
          const bookingsSnapshot = await getDocs(bookingsQuery);
          
          // Per-trainer first-booking cache
          const firstBookingIdCacheT = new Map<string, string>();
          async function getFirstBookingIdT(clientId: string): Promise<string | null> {
            if (firstBookingIdCacheT.has(clientId)) return firstBookingIdCacheT.get(clientId)!;
            try {
              const [snapByUID, snapByClientId] = await Promise.all([
                getDocs(query(collection(db, 'bookings'), where('clientUID', '==', clientId))),
                getDocs(query(collection(db, 'bookings'), where('clientId', '==', clientId))),
              ]);
              let minTime = Infinity;
              let firstId: string | null = null;
              const seen = new Set<string>();
              for (const d of [...snapByUID.docs, ...snapByClientId.docs]) {
                if (seen.has(d.id)) continue;
                seen.add(d.id);
                if (d.data().isClassBooking) continue;
                const t: number = (d.data().startTime as any)?.toMillis?.() ?? Infinity;
                if (t < minTime) { minTime = t; firstId = d.id; }
              }
              if (firstId) firstBookingIdCacheT.set(clientId, firstId);
              return firstId;
            } catch (err) {
              return null;
            }
          }

          for (const docSnap of bookingsSnapshot.docs) {
            const data = docSnap.data();
            // Skip class-registration bookings — shown as class items separately
            if (data.isClassBooking === true) continue;
            
            // Get client name
            let clientName = 'Unknown Client';
            const actualClientId = data.clientUID || data.clientId;
            if (actualClientId) {
              try {
                const clientDoc = await getDoc(doc(db, 'users', actualClientId));
                if (clientDoc.exists()) {
                  const clientData = clientDoc.data();
                  clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Unknown Client';
                }
              } catch (err) {
                console.error('Error fetching client:', err);
              }
            }
            
            // Get package type
            let packageType: string | undefined;
            if (data.packageId && actualClientId) {
              try {
                // Try new path first
                let packageDoc = await getDoc(doc(db, 'organizations', orgId, 'users', actualClientId, 'packages', data.packageId));
                if (!packageDoc.exists()) {
                  // Try legacy path
                  packageDoc = await getDoc(doc(db, 'users', actualClientId, 'lessonPackages', data.packageId));
                }
                if (packageDoc.exists()) {
                  const packageData = packageDoc.data();
                  const packageName = packageData.packageName || packageData.packageType;
                  const category = packageData.packageCategory;
                  
                  // Generate friendly display name
                  if (category === 'oneAthlete') packageType = '1 Athlete Private';
                  else if (category === 'twoAthlete') packageType = '2 Athlete Private';
                  else if (category === 'threeAthlete') packageType = '3 Athlete Private';
                  else if (category === 'fourAthlete') packageType = '4 Athlete Private';
                  else if (category === 'classPass' || category === 'class') packageType = 'Class Pass';
                  else packageType = packageName || 'Private Lesson';
                }
              } catch (err) {
                console.error('Error fetching package:', err);
              }
            }
            
            // Check first lesson for all-trainers view
            let isFirstLessonT = false;
            if (actualClientId) {
              const firstId = await getFirstBookingIdT(actualClientId);
              isFirstLessonT = firstId === docSnap.id;
            }

            items.push({
              id: docSnap.id,
              type: 'lesson',
              startTime: data.startTime.toDate(),
              endTime: data.endTime.toDate(),
              trainerName,
              trainerId,
              clientName,
              clientUID: data.clientUID,
              clientId: data.clientId,
              packageId: data.packageId,
              packageType,
              isFirstLesson: isFirstLessonT,
            });
          }

          // Load classes for this trainer
          const classesRef = collection(db, 'classes');
          const classesQuery = query(
            classesRef,
            where('orgId', '==', orgId),
            where('trainerId', '==', trainerId),
            where('startTime', '>=', startDate),
            where('startTime', '<=', endDate)
          );
          
          const classesSnapshot = await getDocs(classesQuery);
          
          for (const docSnap of classesSnapshot.docs) {
            const data = docSnap.data();
            
            // Load participants from subcollection
            const participants2: string[] = [];
            try {
              const participantsSnap2 = await getDocs(collection(db, 'classes', docSnap.id, 'participants'));
              for (const pDoc of participantsSnap2.docs) {
                const pData = pDoc.data();
                const athleteName = pData.athleteName || `${pData.firstName || ''} ${pData.lastName || ''}`.trim();
                if (athleteName) participants2.push(athleteName);
              }
            } catch (err) {
              console.error('Error fetching class participants:', err);
            }
            
            items.push({
              id: docSnap.id,
              type: 'class',
              startTime: data.startTime.toDate(),
              endTime: data.endTime.toDate(),
              trainerName,
              trainerId,
              className: data.title || data.name || 'Untitled Class',
              studentsCount: participants2.length,
              participants: participants2,
            });
          }

          // Load shifts for this trainer
          const schedulesRef = collection(db, 'trainers', trainerId, 'schedules');
          const schedulesQuery = query(
            schedulesRef,
            where('startTime', '>=', startDate),
            where('startTime', '<=', endDate)
          );
          
          const schedulesSnapshot = await getDocs(schedulesQuery);
          
          for (const scheduleDoc of schedulesSnapshot.docs) {
            const scheduleData = scheduleDoc.data();
            const isAvailable = scheduleData.isBooked === false || scheduleData.status === 'open' || scheduleData.status === 'unavailable';
            if (!isAvailable) continue;

            const shiftStart = scheduleData.startTime.toDate().getTime();
            const shiftEnd = scheduleData.endTime.toDate().getTime();
            const hasOverlappingBooking = items.some(
              i => i.type === 'lesson' && i.startTime.getTime() === shiftStart && i.endTime.getTime() === shiftEnd
            );
            if (hasOverlappingBooking) continue;

            items.push({
              id: scheduleDoc.id,
              type: 'shift',
              startTime: scheduleData.startTime.toDate(),
              endTime: scheduleData.endTime.toDate(),
              trainerName,
              trainerId,
              location: scheduleData.location,
              status: scheduleData.status,
              createdByRole: scheduleData.createdByRole,
              createdById: scheduleData.createdById,
              isOrgWide: scheduleData.isOrgWide,
            });
          }

          // Sort by start time
          items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          scheduleMap.set(trainerId, items);
        }

        setAllTrainersSchedule(scheduleMap);
      } catch (error) {
        console.error('Error loading all trainers schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllTrainersSchedule();
  }, [orgId, allTrainersDate, trainers, viewMode]);

  // Navigation functions for all trainers view
  const goToPreviousAllTrainersDay = () => {
    setAllTrainersDate(prev => prev ? addDays(prev, -1) : prev);
  };

  const goToNextAllTrainersDay = () => {
    setAllTrainersDate(prev => prev ? addDays(prev, 1) : prev);
  };

  const goToTodayAllTrainers = () => {
    setAllTrainersDate(new Date());
  };

  // Navigation functions
  const goToPreviousDay = () => {
    setSelectedDate(prev => prev ? addDays(prev, -1) : prev);
  };

  const goToNextDay = () => {
    setSelectedDate(prev => prev ? addDays(prev, 1) : prev);
  };

  const goToPreviousWeek = () => {
    setWeekStart(prev => prev ? addWeeks(prev, -1) : prev);
  };

  const goToNextWeek = () => {
    setWeekStart(prev => prev ? addWeeks(prev, 1) : prev);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  // Touch swipe handlers for calendar navigation.
  // NOTE: These functions exist but are intentionally NOT attached to the calendar grid divs.
  // When they were attached, horizontal swipe on mobile navigated weeks instead of scrolling
  // the wide calendar grid sideways. Native browser horizontal scroll handles this correctly.
  // DO NOT add onTouchStart/onTouchMove/onTouchEnd to the min-w-[900px] or style={{minWidth}}
  // inner grid divs — it breaks mobile scroll.
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const container = scrollContainerRef.current;
      if (container) {
        const atLeftEdge = container.scrollLeft <= 0;
        const atRightEdge = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;

        // Only change week/day when scrolled to the edge in that direction
        if (deltaX > 0 && atLeftEdge) {
          if (viewMode === 'individual') goToPreviousWeek();
          else goToPreviousAllTrainersDay();
        } else if (deltaX < 0 && atRightEdge) {
          if (viewMode === 'individual') goToNextWeek();
          else goToNextAllTrainersDay();
        }
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Optional: can add visual feedback during swipe here
  };

  // Reload schedule after modal actions - just re-trigger the useEffect
  const reloadSchedule = () => {
    if (weekStart) {
      setWeekStart(new Date(weekStart));
    }
    if (allTrainersDate) {
      setAllTrainersDate(new Date(allTrainersDate));
    }
  };

  // Handle empty slot click
  const handleEmptySlotClick = (day: Date, hour: number) => {
    // Find trainer if one is selected
    if (selectedTrainer) {
      const trainer = trainers.find(t => 
        `${t.firstName} ${t.lastName}` === selectedTrainer
      );
      if (trainer) {
        setModalSlotDate(day);
        setModalSlotHour(hour);
        setModalTrainerId(trainer.id);
        setModalTrainerName(selectedTrainer);
        setShowCreateAvailabilityModal(true);
      }
    }
  };

  // Handle clicking an available (green) or unavailable (red) shift
  const handleAvailableShiftClick = (item: ScheduleItem) => {
    if (item.type === 'shift' && item.trainerId) {
      setModalSlotDate(item.startTime);
      setModalSlotHour(item.startTime.getHours());
      setModalSlotId(item.id); // Pass the actual slot document ID
      setModalTrainerId(item.trainerId);
      setModalTrainerName(item.trainerName);
      setModalSlotStatus(item.status || 'open');
      setModalIsOrgWide(item.isOrgWide || false);
      setModalCreatedById(item.createdById || '');
      setApplyToAllTrainers(false);
      setShowSlotActionDialog(true);
    } else {
      setSelectedItem(item);
    }
  };

  // Build a deterministic schedule doc ID matching iOS format: "YYYY-MM-DDTHH"
  const buildScheduleDocId = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}`;
  };

  // Remove a participant from the selected class
  const handleRemoveLiveParticipant = async (participant: { id: string; firstName: string; lastName: string; userId?: string; classPassPackageId?: string | null }) => {
    if (!selectedItem || selectedItem.type !== 'class' || !orgId) return;
    const name = `${participant.firstName} ${participant.lastName}`;
    if (!confirm(`Remove ${name} from this class and refund their pass?`)) return;

    setRemovingLiveParticipant(participant.id);
    try {
      const classRef = doc(db, 'classes', selectedItem.id);
      const participantRef = doc(db, 'classes', selectedItem.id, 'participants', participant.id);

      // Refund the pass if one was used
      if (participant.classPassPackageId && participant.userId) {
        const stdPassRef = doc(db, 'organizations', orgId, 'users', participant.userId, 'packages', participant.classPassPackageId);
        const stdSnap = await getDocs(query(collection(db, 'organizations', orgId, 'users', participant.userId, 'packages'), where('__name__', '==', participant.classPassPackageId)));
        if (!stdSnap.empty) {
          await updateDoc(stdPassRef, { lessonsUsed: increment(-1) });
        } else {
          const legacyPassRef = doc(db, 'users', participant.userId, 'lessonPackages', participant.classPassPackageId);
          await updateDoc(legacyPassRef, { lessonsUsed: increment(-1) });
        }
      }

      const ops: Promise<any>[] = [deleteDoc(participantRef)];
      if (participant.userId) {
        const registrationRef = doc(db, 'classRegistrations', `${participant.userId}_${selectedItem.id}`);
        ops.push(deleteDoc(registrationRef));
        ops.push(updateDoc(classRef, {
          currentParticipants: increment(-1),
          participantIds: arrayRemove(participant.userId),
        }));
      } else {
        ops.push(updateDoc(classRef, { currentParticipants: increment(-1) }));
      }
      await Promise.all(ops);

      toast.success('Removed', `${name} has been removed from the class`);

      // onSnapshot handles the live participants update automatically
    } catch (error: any) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove participant', error?.message || 'Please try again');
    } finally {
      setRemovingLiveParticipant(null);
    }
  };

  // Register client for a class
  const handleOpenRegister = async () => {
    setShowRegisterModal(true);
    setRegisterTab('existing');
    setRegisterClientId('');
    setRegisterPassId('');
    setRegisterAthleteNameExisting('');
    setRegisterClientAthletes([]);
    setRegisterFirstName('');
    setRegisterLastName('');
    setRegisterEmail('');
    setRegisterClientPasses([]);

    setLoadingClients(true);
    try {
      // Query by orgId — no role filter since many clients don't have role field set.
      // All records in the users collection are clients (trainers are in the trainers collection).
      // Also query organizationId (legacy field) for older records.
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('orgId', '==', orgId))),
        getDocs(query(collection(db, 'users'), where('organizationId', '==', orgId))),
      ]);
      const seen = new Set<string>();
      const merged: Array<{ id: string; firstName: string; lastName: string; email?: string }> = [];
      for (const snap of [snap1, snap2]) {
        for (const d of snap.docs) {
          // Skip trainers/admins that may appear in users collection
          const role = d.data().role;
          if (role === 'trainer' || role === 'admin' || role === 'owner') continue;
          if (!seen.has(d.id)) {
            seen.add(d.id);
            merged.push({
              id: d.id,
              firstName: d.data().firstName || '',
              lastName: d.data().lastName || '',
              email: d.data().email || d.data().emailAddress || '',
            });
          }
        }
      }
      merged.sort((a, b) => a.lastName.localeCompare(b.lastName));
      setAllClients(merged);
    } catch (e) {
      console.error('Error loading clients:', e);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleClientSelected = async (clientId: string) => {
    setRegisterClientId(clientId);
    setRegisterPassId('');
    setRegisterClientPasses([]);
    setRegisterAthleteNameExisting('');
    setRegisterClientAthletes([]);
    if (!clientId || !orgId) return;

    // Fetch athletes from the client's user document
    try {
      const userSnap = await getDoc(doc(db, 'users', clientId));
      if (userSnap.exists()) {
        const d = userSnap.data();
        const names: string[] = [];
        if (Array.isArray(d.athletes)) {
          for (const a of d.athletes) {
            const name = `${a.firstName || ''} ${a.lastName || ''}`.trim();
            if (name) names.push(name);
          }
        }
        // Legacy flat fields
        const legacyPairs: [string | undefined, string | undefined][] = [
          [d.athleteFirstName, d.athleteLastName],
          [d.athlete2FirstName, d.athlete2LastName],
          [d.athlete3FirstName, d.athlete3LastName],
          [d.athlete4FirstName, d.athlete4LastName],
        ];
        for (const [f, l] of legacyPairs) {
          const name = `${f || ''} ${l || ''}`.trim();
          if (name && !names.includes(name)) names.push(name);
        }
        setRegisterClientAthletes(names);
      }
    } catch (e) {
      console.error('Error loading client athletes:', e);
    }

    setLoadingPasses(true);
    try {
      const newPath = collection(db, 'organizations', orgId, 'users', clientId, 'packages');
      const newSnap = await getDocs(query(newPath, where('packageCategory', 'in', ['class', 'classPass'])));
      let passes = newSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((p: any) => (p.totalLessons - (p.lessonsUsed || 0)) > 0);

      if (passes.length === 0) {
        const oldPath = collection(db, 'users', clientId, 'lessonPackages');
        const oldSnap = await getDocs(query(oldPath, where('packageCategory', 'in', ['class', 'classPass'])));
        const legacyPasses = oldSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((p: any) => (p.totalLessons - (p.lessonsUsed || 0)) > 0);
        passes = [...passes, ...legacyPasses];
      }

      setRegisterClientPasses(passes.map((p: any) => ({
        id: p.id,
        label: `${p.packageName || p.packageType || 'Class Pass'} — ${(p.totalLessons - (p.lessonsUsed || 0))} remaining`,
      })));
    } catch (e) {
      console.error('Error loading passes:', e);
    } finally {
      setLoadingPasses(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!selectedItem || selectedItem.type !== 'class') return;

    setRegistering(true);
    try {
      const manualRegisterForClass = httpsCallable(functions, 'manualRegisterForClass');
      let payload: any;

      if (registerTab === 'existing') {
        if (!registerClientId || !registerPassId) {
          toast.error('Missing info', 'Please select a client and a class pass');
          return;
        }
        payload = { classId: selectedItem.id, userId: registerClientId, classPassPackageId: registerPassId, athleteName: registerAthleteNameExisting.trim() || undefined };
      } else {
        if (!registerFirstName.trim() || !registerLastName.trim()) {
          toast.error('Missing info', 'Please enter first and last name');
          return;
        }
        payload = { classId: selectedItem.id, firstName: registerFirstName.trim(), lastName: registerLastName.trim(), email: registerEmail.trim() || undefined };
      }

      await manualRegisterForClass(payload);
      toast.success('Registered', 'Client has been registered for this class');
      setShowRegisterModal(false);

      // onSnapshot handles the live participants update automatically
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Registration failed', error?.message || 'Please try again');
    } finally {
      setRegistering(false);
    }
  };

  // Mark slot as unavailable
  const handleMarkUnavailable = async () => {
    if (!modalSlotDate || !modalTrainerId || !orgId) return;
    
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const isAdmin = userData?.role === 'admin' || userData?.role === 'owner';
      const slotData = {
        status: 'unavailable',
        isBooked: false,
        createdByRole: isAdmin ? 'admin' : 'trainer',
        createdById: user?.uid || '',
        isOrgWide: applyToAllTrainers,
        orgId,
        startTime: modalSlotDate,
        endTime: new Date(modalSlotDate.getTime() + 60 * 60 * 1000), // +1 hour
      };

      if (applyToAllTrainers) {
        // Write the slot to every active trainer
        const activeTrainers = trainers.filter(t => t.id);
        await Promise.all(activeTrainers.map(trainer => {
          const docId = buildScheduleDocId(modalSlotDate);
          const ref = doc(db, `trainers/${trainer.id}/schedules/${docId}`);
          return setDoc(ref, slotData, { merge: true });
        }));
      } else {
        const docId = modalSlotId || buildScheduleDocId(modalSlotDate);
        const scheduleRef = doc(db, `trainers/${modalTrainerId}/schedules/${docId}`);
        await setDoc(scheduleRef, slotData, { merge: true });
      }
      
      setShowSlotActionDialog(false);
      reloadSchedule();
    } catch (error) {
      console.error('Error marking slot unavailable:', error);
      alert('Failed to mark slot as unavailable. Please try again.');
    }
  };

  // Delete an unavailable slot entirely (restores slot to empty)
  const handleDeleteUnavailableSlot = async () => {
    if (!modalSlotId || !modalTrainerId || !orgId) return;
    
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const scheduleRef = doc(db, `trainers/${modalTrainerId}/schedules/${modalSlotId}`);
      await deleteDoc(scheduleRef);
      setShowSlotActionDialog(false);
      reloadSchedule();
    } catch (error) {
      console.error('Error deleting unavailable slot:', error);
      alert('Failed to delete slot. Please try again.');
    }
  };

  // Mark slot as open (re-open a previously unavailable slot)
  const handleMarkOpen = async () => {
    if (!modalSlotId || !modalTrainerId || !orgId) return;
    
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const scheduleRef = doc(db, `trainers/${modalTrainerId}/schedules/${modalSlotId}`);
      
      await updateDoc(scheduleRef, {
        status: 'open',
        isBooked: false
      });
      
      setShowSlotActionDialog(false);
      reloadSchedule();
    } catch (error) {
      console.error('Error marking slot open:', error);
      alert('Failed to mark slot as open. Please try again.');
    }
  };

  // Generate week days
  const weekDays = weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [];
  
  // Handle reschedule booking
  const handleReschedule = async () => {
    if (!selectedItem || !orgId || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleTrainerId) return;
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
        bookingId: selectedItem.id,
        orgId,
        newTrainerId: rescheduleTrainerId,
        newStartTime: newStartDate.toISOString(),
        newEndTime: newEndDate.toISOString(),
      });
      setSelectedItem(null);
      setShowReschedule(false);
      toast.success('Session rescheduled', 'The booking has been moved to the new time.');
    } catch (error: any) {
      console.error('Failed to reschedule:', error);
      toast.error('Failed to reschedule', error.message || 'Please try again');
    } finally {
      setRescheduling(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async (refundPass: boolean) => {
    if (!selectedItem || selectedItem.type !== 'lesson' || !orgId) return;
    
    setCancellingBooking(true);
    setShowCancelConfirm(null);
    
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const adminCancelLesson = httpsCallable(functions, 'adminCancelLesson');
      
      await adminCancelLesson({
        bookingId: selectedItem.id,
        orgId: orgId,
        clientId: selectedItem.clientUID || selectedItem.clientId || '',
        refundPass: refundPass
      });
      
      setSelectedItem(null);
      toast.success(
        'Session cancelled',
        refundPass 
          ? "The client's pass has been refunded." 
          : "The client's pass was not refunded."
      );
      reloadSchedule();
    } catch (error: any) {
      console.error('Failed to cancel session:', error);
      toast.error('Failed to cancel session', error.message || 'Please try again');
    } finally {
      setCancellingBooking(false);
    }
  };

  // Get items for a specific day
  const getItemsForDay = (day: Date) => {
    return scheduleItems.filter(item => isSameDay(item.startTime, day));
  };

  // Detect overlapping items and calculate their horizontal positioning
  const calculateItemPositions = (items: ScheduleItem[]) => {
    const positions = new Map<string, { left: number; width: number; column: number }>();
    
    // Helper: Check if two items overlap in time
    const itemsOverlap = (a: ScheduleItem, b: ScheduleItem): boolean => {
      return a.startTime < b.endTime && a.endTime > b.startTime;
    };
    
    // Find overlap groups - items that actually overlap with each other
    const processed = new Set<string>();
    const overlapGroups: ScheduleItem[][] = [];
    
    for (const item of items) {
      if (processed.has(item.id)) continue;
      
      // Find all items that overlap with this one
      const group: ScheduleItem[] = [item];
      processed.add(item.id);
      
      // Check all other unprocessed items
      for (const other of items) {
        if (processed.has(other.id)) continue;
        
        // Check if this item overlaps with any item in the current group
        const overlapsWithGroup = group.some(groupItem => itemsOverlap(groupItem, other));
        if (overlapsWithGroup) {
          group.push(other);
          processed.add(other.id);
        }
      }
      
      overlapGroups.push(group);
    }
    
    // Calculate positions for each overlap group
    for (const group of overlapGroups) {
      if (group.length === 1) {
        // Solo item - full width
        positions.set(group[0].id, {
          left: 0,
          width: 100,
          column: 0
        });
      } else {
        // Multiple overlapping items - arrange in columns
        const sortedGroup = [...group].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        const columns: ScheduleItem[][] = [];
        
        for (const item of sortedGroup) {
          // Find the first column where this item doesn't overlap with any item in that column
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const overlapsWithColumn = columns[i].some(colItem => itemsOverlap(item, colItem));
            if (!overlapsWithColumn) {
              columns[i].push(item);
              placed = true;
              break;
            }
          }
          
          if (!placed) {
            // Need a new column
            columns.push([item]);
          }
        }
        
        // Calculate positions based on columns
        const totalColumns = columns.length;
        const columnWidth = 100 / totalColumns;
        
        columns.forEach((column, columnIndex) => {
          column.forEach(item => {
            positions.set(item.id, {
              left: columnIndex * columnWidth,
              width: columnWidth,
              column: columnIndex
            });
          });
        });
      }
    }
    
    return positions;
  };

  // Time slots (6 AM to 10 PM)
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);

  // Helper: Calculate Y offset for absolute positioning
  const getItemYOffset = (startTime: Date): number => {
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const scheduleStartHour = 6;
    const hourOffset = hour - scheduleStartHour;
    const minuteFraction = minute / 60;
    const rowHeight = 70; // h-[70px]
    const borderHeight = 1; // border between rows
    return (hourOffset * (rowHeight + borderHeight)) + (minuteFraction * rowHeight);
  };

  // Helper: Calculate height based on duration
  const getItemHeight = (startTime: Date, endTime: Date): number => {
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const rowHeight = 70; // h-[70px] per hour
    return (durationMinutes / 60) * rowHeight;
  };

  // Helper: Check if item overlaps with a specific hour
  const itemOverlapsHour = (item: ScheduleItem, hour: number): boolean => {
    const itemHour = item.startTime.getHours();
    const itemMinute = item.startTime.getMinutes();
    const itemEndHour = item.endTime.getHours();
    const itemEndMinute = item.endTime.getMinutes();
    
    // Item starts before or during this hour AND ends after hour start
    const itemStart = itemHour + (itemMinute / 60);
    const itemEnd = itemEndHour + (itemEndMinute / 60);
    
    return itemStart < (hour + 1) && itemEnd > hour;
  };

  // Calculate timeline position (percentage from top of schedule)
  const calculateTimelinePosition = () => {
    if (!currentTime) return null; // Don't calculate until client-side mount
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // Schedule starts at 6 AM (hour 6)
    const scheduleStartHour = 6;
    const scheduleEndHour = 23; // 11 PM
    
    if (hours < scheduleStartHour || hours >= scheduleEndHour) {
      return null; // Don't show timeline outside schedule hours
    }
    
    // Calculate position: each hour is 70px (h-[70px]) + 1px border
    const hoursSinceStart = hours - scheduleStartHour;
    const minuteOffset = minutes / 60;
    // Add 1px per hour for the borders between rows
    const position = (hoursSinceStart + minuteOffset) * 70 + hoursSinceStart;
    
    return position;
  };

  const timelinePosition = calculateTimelinePosition();

  // Don't render until dates are initialized client-side
  if (!isMounted || !weekStart || !selectedDate) {
    return <div className="h-full flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>;
  }

  return (
    <SchedulingSubmenu selectedDate={selectedDate} onDateSelect={setSelectedDate}>
      <div className="h-full bg-white flex relative">
        {/* Main Schedule Content */}
        <div className={cn("flex-1 flex flex-col transition-all duration-300", selectedItem ? "sm:mr-[600px]" : "")}>
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={viewMode === 'individual' ? goToPreviousWeek : goToPreviousAllTrainersDay}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                  title={viewMode === 'individual' ? "Previous Week" : "Previous Day"}
                >
                  <ChevronLeft className="h-5 w-5 text-foreground/80" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {viewMode === 'individual' 
                      ? `Week of ${format(weekStart, 'MMMM d, yyyy')}`
                      : format(allTrainersDate!, 'EEEE, MMMM d, yyyy')
                    }
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    {viewMode === 'individual' ? (() => {
                      const bookings = scheduleItems.filter(i => i.type === 'lesson').length;
                      const opens = scheduleItems.filter(i => i.type === 'shift' && i.status === 'open').length;
                      const classes = scheduleItems.filter(i => i.type === 'class').length;
                      return (
                        <>
                          {bookings > 0 && <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{bookings} {bookings === 1 ? 'booking' : 'bookings'}</span>}
                          {opens > 0 && <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{opens} open</span>}
                          {classes > 0 && <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{classes} {classes === 1 ? 'class' : 'classes'}</span>}
                          {bookings === 0 && opens === 0 && classes === 0 && <span className="text-xs text-foreground/60">No slots this week</span>}
                        </>
                      );
                    })() : (() => {
                      const allItems = Array.from(allTrainersSchedule.values()).flat();
                      const bookings = allItems.filter(i => i.type === 'lesson').length;
                      const opens = allItems.filter(i => i.type === 'shift' && i.status === 'open').length;
                      const classes = allItems.filter(i => i.type === 'class').length;
                      return (
                        <>
                          {bookings > 0 && <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{bookings} {bookings === 1 ? 'booking' : 'bookings'}</span>}
                          {opens > 0 && <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{opens} open</span>}
                          {classes > 0 && <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{classes} {classes === 1 ? 'class' : 'classes'}</span>}
                          {bookings === 0 && opens === 0 && classes === 0 && <span className="text-xs text-foreground/60">No slots today</span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <button
                  onClick={viewMode === 'individual' ? goToNextWeek : goToNextAllTrainersDay}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                  title={viewMode === 'individual' ? "Next Week" : "Next Day"}
                >
                  <ChevronRight className="h-5 w-5 text-foreground/80" />
                </button>
                <button
                  onClick={viewMode === 'individual' ? goToToday : goToTodayAllTrainers}
                  className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-background transition-colors"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-4">
                {/* Trainer Filter */}
                <select
                  id="trainer-filter"
                  value={viewMode === 'all-trainers' ? 'ALL_TRAINERS' : selectedTrainer}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'ALL_TRAINERS') {
                      setViewMode('all-trainers');
                    } else {
                      setViewMode('individual');
                      setSelectedTrainer(value);
                    }
                  }}
                  className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                >
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={`${trainer.firstName} ${trainer.lastName}`}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                  <option value="ALL_TRAINERS">All Trainers</option>
                </select>

                <Link
                  href="/bookings"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#274785] transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add New
                </Link>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : viewMode === 'individual' ? (
              /* Week View (Individual Trainer) */
              <div 
                className="min-w-[900px]"
              >
                {/* NOTE: No onTouchStart/onTouchMove/onTouchEnd on this div intentionally — native scroll handles mobile swipe. Attaching them broke horizontal scroll on mobile. See handleTouchStart comment. */}
                {/* Week Days Header */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-white sticky top-0" style={{ zIndex: 10 }}>
                  <div className="p-3 text-xs font-medium text-gray-600">Time</div>
                  {weekDays.map(day => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'p-3 text-center border-l border-gray-200',
                        today && isSameDay(day, today) && 'bg-blue-50'
                      )}
                    >
                      <div className="text-xs font-medium text-gray-600">
                        {format(day, 'EEE')}
                      </div>
                      <div className={cn(
                        'text-2xl font-bold mt-1',
                        today && isSameDay(day, today) ? 'text-blue-600' : 'text-gray-900'
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Grid */}
                <div className="relative">
                  {/* Current Time Indicator */}
                  {isMounted && timelinePosition !== null && currentTime && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: `${timelinePosition}px` }}
                    >
                      <div className="flex items-center">
                        <div className="w-16 h-4 bg-red-500 rounded-r flex items-center justify-center">
                          <div className="text-[10px] text-white font-bold">
                            {format(currentTime, 'h:mm')}
                          </div>
                        </div>
                        <div className="flex-1 h-0.5 bg-red-500"></div>
                      </div>
                    </div>
                  )}
                  {timeSlots.map(hour => {
                    const hourLabel = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
                    
                    return (
                      <div key={hour} className="grid grid-cols-8 border-b border-gray-200">
                        <div className="p-3 text-xs text-gray-600 font-medium border-r border-gray-200">
                          {hourLabel}
                        </div>
                        {weekDays.map(day => {
                          const dayItems = getItemsForDay(day);
                          const hasItemsInThisHour = dayItems.some(item => itemOverlapsHour(item, hour));
                          const itemPositions = calculateItemPositions(dayItems);
                          
                          return (
                            <div
                              key={`${day.toISOString()}-${hour}`}
                              className="h-[70px] border-l border-gray-200 hover:bg-gray-50 relative"
                            >
                              {/* Background cell for empty area clicks */}
                              <div 
                                className="absolute inset-0 cursor-pointer"
                                onClick={() => !hasItemsInThisHour && handleEmptySlotClick(day, hour)}
                              />
                              {/* Absolutely positioned items (only render on first hour) */}
                              {hour === 6 && dayItems.map(item => {
                                const isCompleted = currentTime && item.type === 'lesson' && item.endTime < currentTime;
                                const yOffset = getItemYOffset(item.startTime);
                                const height = getItemHeight(item.startTime, item.endTime);
                                const position = itemPositions.get(item.id) || { left: 0, width: 100, column: 0 };
                                
                                return (
                                  <button
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (item.type === 'shift') {
                                        handleAvailableShiftClick(item);
                                      } else {
                                        setSelectedItem(item);
                                      }
                                    }}
                                    className={cn(
                                      'absolute text-left text-xs p-1.5 rounded transition-all hover:shadow-md flex flex-col justify-center pointer-events-auto',
                                      item.type === 'class' && 'bg-orange-100 border border-orange-300 hover:bg-orange-200',
                                      item.type === 'lesson' && !isCompleted && 'bg-blue-100 border border-blue-300 hover:bg-blue-200',
                                      item.type === 'lesson' && isCompleted && 'bg-purple-100 border border-purple-300 hover:bg-purple-200',
                                      item.type === 'shift' && item.status === 'open' && 'bg-green-100 border border-green-300 hover:bg-green-200',
                                      item.type === 'shift' && item.status === 'unavailable' && !item.isOrgWide && item.createdByRole !== 'admin' && 'bg-gray-100 border border-gray-300 hover:bg-gray-200',
                                      item.type === 'shift' && item.status === 'unavailable' && (item.isOrgWide || item.createdByRole === 'admin') && 'bg-gray-400 border border-gray-500 hover:bg-gray-500'
                                    )}
                                    style={{
                                      top: `${yOffset}px`,
                                      height: `${Math.max(height - 2, 30)}px`, // Min height 30px, subtract 2px for margin
                                      left: `${position.left}%`,
                                      width: `${position.width}%`,
                                      paddingLeft: position.column > 0 ? '2px' : undefined,
                                      paddingRight: position.width < 100 ? '2px' : undefined,
                                      zIndex: 1 + position.column
                                    }}
                                  >
                                    {item.isFirstLesson && (
                                      <div className="absolute top-0 right-0 bg-red-500 text-white font-bold leading-none px-1 py-px rounded-bl rounded-tr" style={{ fontSize: '8px' }}>
                                        1st Visit
                                      </div>
                                    )}
                                    <div className="font-semibold truncate">
                                      {format(item.startTime, 'h:mm a')}
                                    </div>
                                    <div className="truncate text-gray-900">
                                      {item.type === 'class' ? item.className : item.type === 'lesson' ? item.clientName : item.status === 'open' ? 'Available' : 'Unavailable'}
                                    </div>
                                    <div className="text-gray-600 truncate">
                                      {item.trainerName}
                                    </div>
                                    {item.location && height > 50 && (
                                      <div className="text-gray-400 text-[10px] truncate">
                                        {item.location}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* All Trainers Day View */
              <div 
                style={{ minWidth: `${200 + trainers.length * 240}px` }}
              >
                {/* NOTE: No onTouchStart/onTouchMove/onTouchEnd on this div intentionally — native scroll handles mobile swipe. Attaching them broke horizontal scroll on mobile. See handleTouchStart comment. */}
                {/* Trainers Header */}
                <div className="flex border-b border-gray-200 bg-white sticky top-0" style={{ zIndex: 10 }}>
                  <div className="w-[200px] flex-shrink-0 p-3 text-xs font-medium text-gray-600 border-r border-gray-200">Time</div>
                    {trainers.map(trainer => (
                      <div
                        key={trainer.id}
                        className="w-[240px] flex-shrink-0 p-3 text-center border-l border-gray-200"
                      >
                        <div className="font-medium text-gray-900">
                          {trainer.firstName} {trainer.lastName}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {allTrainersSchedule.get(trainer.id)?.length || 0} appointments
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Grid */}
                  <div className="relative">
                    {/* Current Time Indicator */}
                    {isMounted && timelinePosition !== null && currentTime && allTrainersDate && isSameDay(currentTime, allTrainersDate) && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${timelinePosition}px` }}
                      >
                        <div className="flex items-center">
                          <div className="w-[200px] flex-shrink-0 flex justify-end pr-2">
                            <div className="w-16 h-4 bg-red-500 rounded flex items-center justify-center">
                              <div className="text-[10px] text-white font-bold">
                                {format(currentTime, 'h:mm')}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 h-0.5 bg-red-500"></div>
                        </div>
                      </div>
                    )}
                    {timeSlots.map(hour => {
                      const hourLabel = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
                      
                      return (
                        <div key={hour} className="flex border-b border-gray-200">
                          <div className="w-[200px] flex-shrink-0 p-3 text-xs text-gray-600 font-medium border-r border-gray-200">
                            {hourLabel}
                          </div>
                          {trainers.map(trainer => {
                            const trainerItems = allTrainersSchedule.get(trainer.id) || [];
                            const hasItemsInThisHour = trainerItems.some(item => itemOverlapsHour(item, hour));
                            const itemPositions = calculateItemPositions(trainerItems);
                            
                            return (
                              <div
                                key={`${trainer.id}-${hour}`}
                                className="w-[240px] flex-shrink-0 h-[70px] border-l border-gray-200 hover:bg-gray-50 relative"
                              >
                                {/* Background cell for empty area clicks */}
                                <div 
                                  className="absolute inset-0 cursor-pointer"
                                  onClick={() => !hasItemsInThisHour && handleEmptySlotClick(allTrainersDate!, hour)}
                                />
                                {/* Absolutely positioned items (only render on first hour) */}
                                {hour === 6 && trainerItems.map(item => {
                                  const isCompleted = currentTime && item.type === 'lesson' && item.endTime < currentTime;
                                  const yOffset = getItemYOffset(item.startTime);
                                  const height = getItemHeight(item.startTime, item.endTime);
                                  const position = itemPositions.get(item.id) || { left: 0, width: 100, column: 0 };
                                  
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.type === 'shift') {
                                          handleAvailableShiftClick(item);
                                        } else {
                                          setSelectedItem(item);
                                        }
                                      }}
                                      className={cn(
                                        'absolute text-left text-xs p-1.5 rounded transition-all hover:shadow-md flex flex-col justify-center pointer-events-auto',
                                        item.type === 'class' && 'bg-orange-100 border border-orange-300 hover:bg-orange-200',
                                        item.type === 'lesson' && !isCompleted && 'bg-blue-100 border border-blue-300 hover:bg-blue-200',
                                        item.type === 'lesson' && isCompleted && 'bg-purple-100 border border-purple-300 hover:bg-purple-200',
                                        item.type === 'shift' && item.status === 'open' && 'bg-green-100 border border-green-300 hover:bg-green-200',
                                        item.type === 'shift' && item.status === 'unavailable' && !item.isOrgWide && item.createdByRole !== 'admin' && 'bg-gray-100 border border-gray-300 hover:bg-gray-200',
                                        item.type === 'shift' && item.status === 'unavailable' && (item.isOrgWide || item.createdByRole === 'admin') && 'bg-gray-400 border border-gray-500 hover:bg-gray-500'
                                      )}
                                      style={{
                                        top: `${yOffset}px`,
                                        height: `${Math.max(height - 2, 30)}px`,
                                        left: `${position.left}%`,
                                        width: `${position.width}%`,
                                        paddingLeft: position.column > 0 ? '2px' : undefined,
                                        paddingRight: position.width < 100 ? '2px' : undefined,
                                        zIndex: 1 + position.column
                                      }}
                                    >
                                      {item.isFirstLesson && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white font-bold leading-none px-1 py-px rounded-bl rounded-tr" style={{ fontSize: '8px' }}>
                                          1st Visit
                                        </div>
                                      )}
                                      <div className="font-semibold truncate">
                                        {format(item.startTime, 'h:mm a')}
                                      </div>
                                      <div className="truncate text-foreground">
                                        {item.type === 'class' ? item.className : item.type === 'lesson' ? item.clientName : item.status === 'open' ? 'Available' : 'Unavailable'}
                                      </div>
                                      {item.location && height > 50 && (
                                        <div className="text-gray-400 text-[10px] truncate">
                                          {item.location}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* Right Side Detail Panel */}
        {selectedItem && (
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-white border-l border-border shadow-2xl overflow-y-auto z-50 animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-foreground">
                {selectedItem.type === 'class' ? 'Class Details' : 'Session Details'}
              </h2>
              <button
                onClick={() => { setSelectedItem(null); setShowReschedule(false); setShowCancelConfirm(null); }}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {selectedItem.type === 'lesson' ? (
                <>
                  {/* Client Header */}
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl">
                      {selectedItem.clientName?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-semibold text-foreground">{selectedItem.clientName}</div>
                        {selectedItem.isFirstLesson && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                            🎉 First Visit
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-foreground/80 mt-1">
                        {format(selectedItem.startTime, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-foreground/80">
                        {format(selectedItem.startTime, 'h:mm a')} - {format(selectedItem.endTime, 'h:mm a')}
                      </div>
                    </div>
                  </div>

                  {/* Trainer Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Trainer
                    </h3>
                    <div className="text-sm text-foreground">{selectedItem.trainerName}</div>
                  </div>

                  {/* Package Type */}
                  {selectedItem.packageType && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Pass Type
                      </h3>
                      <div className="text-sm text-foreground bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        {selectedItem.packageType}
                      </div>
                    </div>
                  )}

                  {/* Contact Information */}
                  {(selectedItem.clientEmail || selectedItem.clientPhone) && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Contact Information</h3>
                      {selectedItem.clientEmail && (
                        <div className="text-sm">
                          <span className="text-foreground/80">Email:</span>{' '}
                          <a href={`mailto:${selectedItem.clientEmail}`} className="text-blue-600 hover:underline">
                            {selectedItem.clientEmail}
                          </a>
                        </div>
                      )}
                      {selectedItem.clientPhone && (
                        <div className="text-sm">
                          <span className="text-foreground/80">Phone:</span>{' '}
                          <a href={`tel:${selectedItem.clientPhone}`} className="text-blue-600 hover:underline">
                            {selectedItem.clientPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Athlete Names from Booking */}
                  {(selectedItem.athleteNames && selectedItem.athleteNames.length > 0) || selectedItem.athleteName || selectedItem.secondAthleteName ? (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Participants</h3>
                      <div className="space-y-2">
                        {/* Use new athleteNames array if available */}
                        {selectedItem.athleteNames && selectedItem.athleteNames.length > 0 ? (
                          selectedItem.athleteNames.map((name, idx) => {
                            // Match athlete name to profile data
                            const matchedAthlete = selectedItem.athletes?.find(athlete => 
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
                          /* Legacy format: display first two athletes */
                          <>
                            {selectedItem.athleteName && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="font-medium text-foreground">{selectedItem.athleteName}</div>
                              </div>
                            )}
                            {selectedItem.secondAthleteName && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="font-medium text-foreground">{selectedItem.secondAthleteName}</div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Athletes from Profile */}
                  {selectedItem.athletes && selectedItem.athletes.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Athletes on File</h3>
                      <div className="space-y-3">
                        {selectedItem.athletes.map((athlete, idx) => (
                          <div key={idx} className="bg-background p-4 rounded-lg space-y-2">
                            <div className="font-medium text-foreground">
                              {athlete.firstName} {athlete.lastName}
                            </div>
                            {athlete.birthday && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">{fieldLabels.birthday}:</span> {athlete.birthday}
                              </div>
                            )}
                            {athlete.schoolClubTeam && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">{fieldLabels.schoolClubTeam}:</span> {athlete.schoolClubTeam}
                              </div>
                            )}
                            {athlete.experienceLevel && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">{fieldLabels.experienceLevel}:</span> {athlete.experienceLevel}
                              </div>
                            )}
                            {athlete.position && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">{fieldLabels.position}:</span> {athlete.position}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {selectedItem.emergencyContactName && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Emergency Contact</h3>
                      <div className="bg-red-50 p-4 rounded-lg space-y-1">
                        <div className="font-medium text-foreground">{selectedItem.emergencyContactName}</div>
                        {selectedItem.emergencyContactNumber && (
                          <div className="text-sm text-foreground/80">
                            <a href={`tel:${selectedItem.emergencyContactNumber}`} className="text-blue-600 hover:underline">
                              {selectedItem.emergencyContactNumber}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Referral */}
                  {selectedItem.referredBy && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Referred By</h3>
                      <div className="text-sm text-foreground">{selectedItem.referredBy}</div>
                    </div>
                  )}

                  {/* Lesson Notes from Booking */}
                  {selectedItem.lessonNotes && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Lesson Notes</h3>
                      <div className="text-sm text-foreground bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        {selectedItem.lessonNotes}
                      </div>
                    </div>
                  )}

                  {/* Notes for Coach */}
                  {selectedItem.notesForCoach && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Notes for Coach</h3>
                      <div className="text-sm text-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
                        {selectedItem.notesForCoach}
                      </div>
                    </div>
                  )}

                  {/* Admin Actions: Reschedule + Cancel */}
                  <div className="pt-6 border-t space-y-3">
                    <h3 className="font-semibold text-foreground">Admin Actions</h3>
                    {!showReschedule && !showCancelConfirm && !cancellingBooking && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            const dt = selectedItem.startTime;
                            const et = selectedItem.endTime;
                            setRescheduleTrainerId(selectedItem.trainerId ?? '');
                            setRescheduleDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
                            setRescheduleStartTime(`${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`);
                            setRescheduleEndTime(`${String(et.getHours()).padStart(2,'0')}:${String(et.getMinutes()).padStart(2,'0')}`);
                            setShowReschedule(true);
                          }}
                          className="w-full px-4 py-3 bg-card border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-500/10 text-blue-700 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Reschedule Session
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setShowCancelConfirm('early')}
                            className="px-4 py-3 bg-card border-2 border-input hover:border-orange-500 hover:bg-orange-500/10 text-foreground rounded-lg transition-colors font-medium"
                          >
                            <div className="text-sm font-semibold">Early Cancel</div>
                            <div className="text-xs text-foreground/80 mt-1">Refund pass to client</div>
                          </button>
                          <button
                            onClick={() => setShowCancelConfirm('late')}
                            className="px-4 py-3 bg-card border-2 border-input hover:border-red-500 hover:bg-red-500/10 text-foreground rounded-lg transition-colors font-medium"
                          >
                            <div className="text-sm font-semibold">Late Cancel</div>
                            <div className="text-xs text-foreground/80 mt-1">No pass refund</div>
                          </button>
                        </div>
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
                          <select
                            value={rescheduleTrainerId}
                            onChange={e => setRescheduleTrainerId(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select trainer</option>
                            {trainers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                              </option>
                            ))}
                          </select>
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
                        <button
                          onClick={handleReschedule}
                          disabled={!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleTrainerId || rescheduling}
                          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {rescheduling ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Rescheduling...
                            </>
                          ) : 'Confirm Reschedule'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirmation Step */}
                  {showCancelConfirm && !cancellingBooking && (
                    <div className="pt-6 border-t space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-900 mb-2">
                          Confirm {showCancelConfirm === 'early' ? 'Early' : 'Late'} Cancellation
                        </h3>
                        <p className="text-sm text-amber-800">
                          {showCancelConfirm === 'early' 
                            ? 'The client\'s pass will be refunded and returned to their account.' 
                            : 'The client\'s pass will NOT be refunded. This action cannot be undone.'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleCancelBooking(showCancelConfirm === 'early')}
                          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                        >
                          Confirm Cancellation
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(null)}
                          className="flex-1 px-4 py-2.5 bg-card border-2 border-input hover:bg-background text-foreground font-medium rounded-lg transition-colors"
                        >
                          Go Back
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cancelling in progress */}
                  {cancellingBooking && (
                    <div className="pt-6 border-t text-center text-foreground/80 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">Cancelling session...</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Class Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Class Name</h3>
                      <div className="text-lg text-foreground">{selectedItem.className}</div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Schedule</h3>
                      <div className="text-sm text-foreground">
                        {format(selectedItem.startTime, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-foreground">
                        {format(selectedItem.startTime, 'h:mm a')} - {format(selectedItem.endTime, 'h:mm a')}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Trainer</h3>
                      <div className="text-sm text-foreground">{selectedItem.trainerName}</div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-foreground">
                          Participants ({loadingLiveParticipants ? '…' : liveParticipants.length})
                        </h3>
                        <button
                          onClick={handleOpenRegister}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Register Client
                        </button>
                      </div>
                      {/* Attendance summary */}
                      {!loadingLiveParticipants && liveParticipants.length > 0 && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 px-2 py-1 rounded-md w-fit ${
                          liveParticipants.filter(p => p.checkedIn).length === liveParticipants.length
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {liveParticipants.filter(p => p.checkedIn).length} / {liveParticipants.length} checked in
                        </div>
                      )}
                      {loadingLiveParticipants ? (
                        <div className="space-y-2">
                          <div className="h-10 bg-gray-100 rounded animate-pulse" />
                          <div className="h-10 bg-gray-100 rounded animate-pulse" />
                        </div>
                      ) : liveParticipants.length > 0 ? (
                        <div className="space-y-2">
                          {liveParticipants.map((participant, idx) => (
                            <div key={idx} className={`p-3 rounded-lg flex items-center justify-between gap-2 ${participant.checkedIn ? 'bg-green-50 border border-green-200' : 'bg-background'}`}>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground">
                                  {participant.parentFirstName
                                    ? `${participant.parentFirstName} ${participant.parentLastName}`
                                    : `${participant.firstName} ${participant.lastName}`}
                                </div>
                                {/* Show athlete name if it differs from the account holder */}
                                {(() => {
                                  const athleteDisplay = participant.athleteName || `${participant.firstName} ${participant.lastName}`;
                                  const parentDisplay = participant.parentFirstName ? `${participant.parentFirstName} ${participant.parentLastName}` : null;
                                  if (parentDisplay && athleteDisplay !== parentDisplay) {
                                    return <div className="text-xs text-muted-foreground mt-0.5">🏃 Athlete: {athleteDisplay}</div>;
                                  }
                                  return null;
                                })()}
                                {participant.checkedIn && participant.checkedInAt && (
                                  <div className="text-xs text-green-600 mt-0.5">
                                    ✓ Checked in {participant.checkedInAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleCheckIn(participant, selectedItem.id)}
                                  disabled={checkingIn === participant.id}
                                  title={participant.checkedIn ? 'Mark as not checked in' : 'Check in'}
                                  className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                                    participant.checkedIn
                                      ? 'text-green-700 border border-green-300 bg-green-50 hover:bg-green-100'
                                      : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  {participant.checkedIn
                                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> In</>
                                    : <><Circle className="h-3.5 w-3.5" /> Check In</>}
                                </button>
                                <button
                                  onClick={() => handleRemoveLiveParticipant(participant)}
                                  disabled={removingLiveParticipant === participant.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {removingLiveParticipant === participant.id ? 'Removing…' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No participants registered</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slot Action Choice Dialog */}
      {showSlotActionDialog && modalSlotDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">What would you like to do?</h2>
            <p className="text-sm text-gray-600 mb-6">
              {format(modalSlotDate, 'EEEE, MMMM d, yyyy')} at {format(modalSlotDate, 'h:mm a')}
              <br />
              <span className="font-medium">{modalTrainerName}</span>
            </p>
            
            <div className="space-y-3">
              {modalSlotStatus === 'open' && (
                <button
                  onClick={() => {
                    setShowSlotActionDialog(false);
                    setShowBookLessonModal(true);
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v4"/>
                    <path d="M16 2v4"/>
                    <rect width="18" height="18" x="3" y="4" rx="2"/>
                    <path d="M3 10h18"/>
                    <path d="m9 16 2 2 4-4"/>
                  </svg>
                  Book Lesson for Client
                </button>
              )}
              
              {modalSlotStatus === 'open' && (
                <button
                  onClick={handleMarkUnavailable}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m15 9-6 6"/>
                    <path d="m9 9 6 6"/>
                  </svg>
                  Mark as Unavailable
                </button>
              )}

              {modalSlotStatus === 'open' && (userData?.role === 'admin' || userData?.role === 'owner') && (
                <label className="flex items-center gap-3 px-2 py-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyToAllTrainers}
                    onChange={e => setApplyToAllTrainers(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 accent-gray-700"
                  />
                  <span className="text-sm text-gray-700">Apply to all trainers</span>
                  {applyToAllTrainers && (
                    <span className="text-xs text-gray-500 italic">(org-wide, dark gray)</span>
                  )}
                </label>
              )}

              {(modalSlotStatus === 'unavailable' || modalSlotStatus === 'booked') && (
                !(modalIsOrgWide && userData?.role !== 'admin' && userData?.role !== 'owner') &&
                <button
                  onClick={handleMarkOpen}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  {modalSlotStatus === 'booked' ? 'Reset to Open (Fix Stuck Slot)' : 'Mark as Open'}
                </button>
              )}

              {modalSlotStatus === 'unavailable' && (
                !(modalIsOrgWide && userData?.role !== 'admin' && userData?.role !== 'owner') &&
                <button
                  onClick={handleDeleteUnavailableSlot}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                  Delete Unavailability
                </button>
              )}
              
              <button
                onClick={() => { setShowSlotActionDialog(false); setApplyToAllTrainers(false); }}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalSlotDate && (
        <BookLessonModal
          isOpen={showBookLessonModal}
          onClose={() => setShowBookLessonModal(false)}
          slotDate={modalSlotDate}
          slotHour={modalSlotHour}
          slotId={modalSlotId}
          trainerId={modalTrainerId}
          trainerName={modalTrainerName}
          orgId={orgId || undefined}
          onSuccess={reloadSchedule}
        />
      )}
      
      {modalSlotDate && (
        <CreateAvailabilityModal
          isOpen={showCreateAvailabilityModal}
          onClose={() => setShowCreateAvailabilityModal(false)}
          slotDate={modalSlotDate}
          slotHour={modalSlotHour}
          trainerId={modalTrainerId}
          trainerName={modalTrainerName}
          orgId={orgId || undefined}
          onSuccess={reloadSchedule}
          isAdmin={userData?.role === 'admin' || userData?.role === 'owner'}
          allTrainers={trainers}
          currentUserId={user?.uid || ''}
        />
      )}

      {/* Register Client for Class Modal */}
      {showRegisterModal && selectedItem && selectedItem.type === 'class' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Register Client</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedItem.className}</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setRegisterTab('existing')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${registerTab === 'existing' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Existing Client
              </button>
              <button
                onClick={() => setRegisterTab('manual')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${registerTab === 'manual' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Manual Entry
              </button>
            </div>

            <div className="p-6 space-y-4">
              {registerTab === 'existing' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Select Client</label>
                    {loadingClients ? (
                      <div className="h-9 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      <select
                        value={registerClientId}
                        onChange={e => handleClientSelected(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">— Choose a client —</option>
                        {allClients.map(c => (
                          <option key={c.id} value={c.id}>{c.lastName}, {c.firstName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {registerClientId && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Select Class Pass</label>
                      {loadingPasses ? (
                        <div className="h-9 bg-gray-100 rounded animate-pulse" />
                      ) : registerClientPasses.length === 0 ? (
                        <p className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                          This client has no remaining class passes.
                        </p>
                      ) : (
                        <select
                          value={registerPassId}
                          onChange={e => setRegisterPassId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">— Choose a pass —</option>
                          {registerClientPasses.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {registerClientId && registerClientAthletes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Athlete</label>
                      <select
                        value={registerAthleteNameExisting}
                        onChange={e => setRegisterAthleteNameExisting(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">— Same as account holder —</option>
                        {registerClientAthletes.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
                      <input
                        type="text"
                        value={registerFirstName}
                        onChange={e => setRegisterFirstName(e.target.value)}
                        placeholder="First"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                      <input
                        type="text"
                        value={registerLastName}
                        onChange={e => setRegisterLastName(e.target.value)}
                        placeholder="Last"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={e => setRegisterEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowRegisterModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-foreground rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRegisterSubmit}
                disabled={registering || (registerTab === 'existing' && (!registerClientId || !registerPassId))}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SchedulingSubmenu>
  );
}
