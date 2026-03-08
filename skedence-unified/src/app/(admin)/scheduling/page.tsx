'use client';

import { useState, useEffect } from 'react';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { Users, Clock, GraduationCap, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookLessonModal, CreateAvailabilityModal } from '@/components/admin/scheduling-modals';
import { startOfDay, endOfDay, addWeeks } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
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
  const [modalSlotDate, setModalSlotDate] = useState<Date | null>(null);
  const [modalSlotHour, setModalSlotHour] = useState<number>(9);
  const [modalSlotId, setModalSlotId] = useState<string>(''); // Actual slot document ID
  const [modalTrainerId, setModalTrainerId] = useState<string>('');
  const [modalTrainerName, setModalTrainerName] = useState<string>('');
  
  // Cancel booking states
  const [showCancelConfirm, setShowCancelConfirm] = useState<'early' | 'late' | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  // Touch swipe state for calendar navigation
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

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

  // Set initial trainer to current user or first trainer
  useEffect(() => {
    if (trainers.length > 0 && !selectedTrainer) {
      if (userData) {
        const currentUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        // Check if current user is in trainers list
        const userIsTrainer = trainers.find(t => 
          `${t.firstName} ${t.lastName}` === currentUserName
        );
        if (userIsTrainer) {
          setSelectedTrainer(currentUserName);
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
        }));
        
        // Sort: Owner first, then alphabetically by first name
        const currentUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        const sortedTrainers = trainersList.sort((a, b) => {
          const aFullName = `${a.firstName} ${a.lastName}`;
          const bFullName = `${b.firstName} ${b.lastName}`;
          
          // Owner goes first
          if (aFullName === currentUserName) return -1;
          if (bFullName === currentUserName) return 1;
          
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
        
        for (const docSnap of bookingsSnapshot.docs) {
          const data = docSnap.data();
          
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
          
          // Get participant names
          const participants: string[] = [];
          const registeredStudents = data.registeredStudents || [];
          for (const studentId of registeredStudents) {
            try {
              const studentDoc = await getDoc(doc(db, 'users', studentId));
              if (studentDoc.exists()) {
                const studentData = studentDoc.data();
                const fullName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
                if (fullName) {
                  participants.push(fullName);
                }
              }
            } catch (err) {
              console.error('Error fetching student:', err);
            }
          }
          
          items.push({
            id: docSnap.id,
            type: 'class',
            startTime: data.startTime.toDate(),
            endTime: data.endTime.toDate(),
            trainerName,
            className: data.title || data.name || 'Untitled Class',
            studentsCount: registeredStudents.length || 0,
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
          if (isAvailable) {
            items.push({
              id: scheduleDoc.id,
              type: 'shift',
              startTime: scheduleData.startTime.toDate(),
              endTime: scheduleData.endTime.toDate(),
              trainerName: selectedTrainer,
              trainerId: trainerId,
              location: scheduleData.location,
              status: scheduleData.status,
            });
          }
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
          
          for (const docSnap of bookingsSnapshot.docs) {
            const data = docSnap.data();
            
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
            
            items.push({
              id: docSnap.id,
              type: 'class',
              startTime: data.startTime.toDate(),
              endTime: data.endTime.toDate(),
              trainerName,
              trainerId,
              className: data.title || data.name || 'Untitled Class',
              studentsCount: (data.registeredStudents || []).length,
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
            if (isAvailable) {
              items.push({
                id: scheduleDoc.id,
                type: 'shift',
                startTime: scheduleData.startTime.toDate(),
                endTime: scheduleData.endTime.toDate(),
                trainerName,
                trainerId,
                location: scheduleData.location,
                status: scheduleData.status,
              });
            }
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

  // Touch swipe handlers for calendar navigation
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
    // This prevents conflicts with vertical scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous week/day
        if (viewMode === 'individual') {
          goToPreviousWeek();
        } else {
          goToPreviousAllTrainersDay();
        }
      } else {
        // Swipe left - go to next week/day
        if (viewMode === 'individual') {
          goToNextWeek();
        } else {
          goToNextAllTrainersDay();
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

  // Handle clicking an available (green) shift to book
  const handleAvailableShiftClick = (item: ScheduleItem) => {
    if (item.type === 'shift' && item.status === 'open' && item.trainerId) {
      setModalSlotDate(item.startTime);
      setModalSlotHour(item.startTime.getHours());
      setModalSlotId(item.id); // Pass the actual slot document ID
      setModalTrainerId(item.trainerId);
      setModalTrainerName(item.trainerName);
      setShowBookLessonModal(true);
    } else {
      setSelectedItem(item);
    }
  };

  // Generate week days
  const weekDays = weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [];
  
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
        <div className={cn("flex-1 flex flex-col transition-all duration-300", selectedItem ? "mr-[600px]" : "")}>
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
                  <p className="text-sm text-foreground/80 mt-1">
                    {viewMode === 'individual' 
                      ? `${scheduleItems.length} appointments`
                      : `${Array.from(allTrainersSchedule.values()).reduce((sum, items) => sum + items.length, 0)} appointments`
                    }
                  </p>
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
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : viewMode === 'individual' ? (
              /* Week View (Individual Trainer) */
              <div 
                className="min-w-[900px]"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Week Days Header */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-white sticky top-0 z-10">
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
                                
                                return (
                                  <button
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (item.type === 'shift' && item.status === 'open') {
                                        handleAvailableShiftClick(item);
                                      } else {
                                        setSelectedItem(item);
                                      }
                                    }}
                                    className={cn(
                                      'absolute left-0 right-0 mx-1 text-left text-xs p-1.5 rounded transition-all hover:shadow-md flex flex-col justify-center pointer-events-auto z-10',
                                      item.type === 'class' && 'bg-orange-100 border border-orange-300 hover:bg-orange-200',
                                      item.type === 'lesson' && !isCompleted && 'bg-blue-100 border border-blue-300 hover:bg-blue-200',
                                      item.type === 'lesson' && isCompleted && 'bg-purple-100 border border-purple-300 hover:bg-purple-200',
                                      item.type === 'shift' && item.status === 'open' && 'bg-green-100 border border-green-300 hover:bg-green-200',
                                      item.type === 'shift' && item.status === 'unavailable' && 'bg-red-100 border border-red-300 hover:bg-red-200'
                                    )}
                                    style={{
                                      top: `${yOffset}px`,
                                      height: `${Math.max(height - 2, 30)}px` // Min height 30px, subtract 2px for margin
                                    }}
                                  >
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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Trainers Header */}
                <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
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
                                  
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.type === 'shift' && item.status === 'open') {
                                          handleAvailableShiftClick(item);
                                        } else {
                                          setSelectedItem(item);
                                        }
                                      }}
                                      className={cn(
                                        'absolute left-0 right-0 mx-1 text-left text-xs p-1.5 rounded transition-all hover:shadow-md flex flex-col justify-center pointer-events-auto z-10',
                                        item.type === 'class' && 'bg-orange-100 border border-orange-300 hover:bg-orange-200',
                                        item.type === 'lesson' && !isCompleted && 'bg-blue-100 border border-blue-300 hover:bg-blue-200',
                                        item.type === 'lesson' && isCompleted && 'bg-purple-100 border border-purple-300 hover:bg-purple-200',
                                        item.type === 'shift' && item.status === 'open' && 'bg-green-100 border border-green-300 hover:bg-green-200',
                                        item.type === 'shift' && item.status === 'unavailable' && 'bg-red-100 border border-red-300 hover:bg-red-200'
                                      )}
                                      style={{
                                        top: `${yOffset}px`,
                                        height: `${Math.max(height - 2, 30)}px`
                                      }}
                                    >
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
          <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-card border-l border-border shadow-2xl overflow-y-auto z-50 animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-foreground">
                {selectedItem.type === 'class' ? 'Class Details' : 'Session Details'}
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
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
                      <div className="text-xl font-semibold text-foreground">{selectedItem.clientName}</div>
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
                                <span className="font-medium">DOB:</span> {athlete.birthday}
                              </div>
                            )}
                            {athlete.schoolClubTeam && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">Team:</span> {athlete.schoolClubTeam}
                              </div>
                            )}
                            {athlete.experienceLevel && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">Experience:</span> {athlete.experienceLevel}
                              </div>
                            )}
                            {athlete.position && (
                              <div className="text-sm text-foreground/80">
                                <span className="font-medium">Position:</span> {athlete.position}
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

                  {/* Cancel Session Actions */}
                  {!showCancelConfirm && !cancellingBooking && (
                    <div className="pt-6 border-t space-y-3">
                      <h3 className="font-semibold text-foreground">Cancel Session</h3>
                      <p className="text-sm text-foreground/80 mb-4">
                        Choose whether to refund the client's pass or not.
                      </p>
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
                      <h3 className="font-semibold text-foreground mb-2">Participants ({selectedItem.studentsCount || 0})</h3>
                      {selectedItem.participants && selectedItem.participants.length > 0 ? (
                        <div className="space-y-2">
                          {selectedItem.participants.map((participant, idx) => (
                            <div key={idx} className="bg-background p-3 rounded-lg">
                              <div className="font-medium text-foreground">{participant}</div>
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
        />
      )}
    </SchedulingSubmenu>
  );
}
