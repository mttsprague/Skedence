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

  // Set mounted state and initialize current time on client
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setCurrentTime(now);
    setToday(now);
    setSelectedDate(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 0 }));
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
    if (!orgId) return;

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
        
        setTrainers(trainersList);
      } catch (error) {
        console.error('Error loading trainers:', error);
      }
    };

    loadTrainers();
  }, [orgId]);

  // Load schedule for the week
  useEffect(() => {
    if (!orgId || !weekStart || !selectedTrainer) {
      setLoading(false);
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
          
          items.push({
            id: docSnap.id,
            type: 'lesson',
            startTime: data.startTime.toDate(),
            endTime: data.endTime.toDate(),
            trainerName,
            clientName,
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
  }, [orgId, weekStart, selectedDate, selectedTrainer, trainers]);

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

  // Reload schedule after modal actions - just re-trigger the useEffect
  const reloadSchedule = () => {
    if (weekStart) {
      setWeekStart(new Date(weekStart));
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

  // Get items for a specific day
  const getItemsForDay = (day: Date) => {
    return scheduleItems.filter(item => isSameDay(item.startTime, day));
  };

  // Time slots (6 AM to 10 PM)
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);

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
    
    // Calculate position: each hour is 80px (h-[80px])
    const hoursSinceStart = hours - scheduleStartHour;
    const minuteOffset = minutes / 60;
    const position = (hoursSinceStart + minuteOffset) * 80;
    
    return position;
  };

  const timelinePosition = calculateTimelinePosition();

  // Don't render until dates are initialized client-side
  if (!isMounted || !weekStart || !selectedDate) {
    return <div className="h-full flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;
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
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Week of {format(weekStart, 'MMMM d, yyyy')}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">{scheduleItems.length} appointments</p>
                </div>
                <button
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-4">
                {/* Trainer Filter */}
                <select
                  id="trainer-filter"
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-sm"
                >
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={`${trainer.firstName} ${trainer.lastName}`}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>

                <Link
                  href="/bookings"
                  className="flex items-center gap-2 px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#274785] transition-colors text-sm font-medium"
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
                <div className="w-12 h-12 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              /* Week View (Individual Trainer) */
              <div className="min-w-[900px]">
                {/* Week Days Header */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                  <div className="p-3 text-xs font-medium text-gray-500">Time</div>
                  {weekDays.map(day => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'p-3 text-center border-l border-gray-200',
                        today && isSameDay(day, today) && 'bg-blue-50'
                      )}
                    >
                      <div className="text-xs font-medium text-gray-500">
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
                        <div className="p-3 text-xs text-gray-500 font-medium border-r border-gray-200">
                          {hourLabel}
                        </div>
                        {weekDays.map(day => {
                          const dayItems = getItemsForDay(day).filter(item => 
                            item.startTime.getHours() === hour
                          );
                          
                          return (
                            <div
                              key={`${day.toISOString()}-${hour}`}
                              className="h-[80px] p-1 border-l border-gray-200 hover:bg-gray-50 relative cursor-pointer overflow-y-auto"
                              onClick={() => dayItems.length === 0 && handleEmptySlotClick(day, hour)}
                            >
                              {dayItems.map(item => {
                                const isCompleted = currentTime && item.type === 'lesson' && item.endTime < currentTime;
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
                                      'w-full text-left text-xs p-2 rounded mb-1 transition-all hover:shadow-md',
                                      item.type === 'class' && 'bg-purple-100 border border-purple-300 hover:bg-purple-200',
                                      item.type === 'lesson' && !isCompleted && 'bg-blue-100 border border-blue-300 hover:bg-blue-200',
                                      item.type === 'lesson' && isCompleted && 'bg-purple-100 border border-purple-300 hover:bg-purple-200',
                                      item.type === 'shift' && item.status === 'open' && 'bg-green-100 border border-green-300 hover:bg-green-200',
                                      item.type === 'shift' && item.status === 'unavailable' && 'bg-red-100 border border-red-300 hover:bg-red-200'
                                    )}
                                  >
                                    <div className="font-semibold truncate">
                                      {format(item.startTime, 'h:mm a')}
                                    </div>
                                    <div className="truncate text-gray-700">
                                      {item.type === 'class' ? item.className : item.type === 'lesson' ? item.clientName : item.status === 'open' ? 'Available' : 'Unavailable'}
                                    </div>
                                    <div className="text-gray-500 truncate">
                                      {item.trainerName}
                                    </div>
                                    {item.location && (
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
          <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white border-l border-gray-200 shadow-2xl overflow-y-auto z-50 animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedItem.type === 'class' ? 'Class Details' : 'Session Details'}
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
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
                      <div className="text-xl font-semibold text-gray-900">{selectedItem.clientName}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {format(selectedItem.startTime, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(selectedItem.startTime, 'h:mm a')} - {format(selectedItem.endTime, 'h:mm a')}
                      </div>
                    </div>
                  </div>

                  {/* Trainer Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Trainer
                    </h3>
                    <div className="text-sm text-gray-700">{selectedItem.trainerName}</div>
                  </div>

                  {/* Contact Information */}
                  {(selectedItem.clientEmail || selectedItem.clientPhone) && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Contact Information</h3>
                      {selectedItem.clientEmail && (
                        <div className="text-sm">
                          <span className="text-gray-600">Email:</span>{' '}
                          <a href={`mailto:${selectedItem.clientEmail}`} className="text-blue-600 hover:underline">
                            {selectedItem.clientEmail}
                          </a>
                        </div>
                      )}
                      {selectedItem.clientPhone && (
                        <div className="text-sm">
                          <span className="text-gray-600">Phone:</span>{' '}
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
                      <h3 className="font-semibold text-gray-900">Participants</h3>
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
                                <div className="font-medium text-gray-900">{name}</div>
                                {matchedAthlete && (
                                  <>
                                    {matchedAthlete.birthday && (
                                      <div className="text-sm text-gray-600">DOB: {matchedAthlete.birthday}</div>
                                    )}
                                    {matchedAthlete.schoolClubTeam && (
                                      <div className="text-sm text-gray-600">Team: {matchedAthlete.schoolClubTeam}</div>
                                    )}
                                    {matchedAthlete.experienceLevel && (
                                      <div className="text-sm text-gray-600">Experience: {matchedAthlete.experienceLevel}</div>
                                    )}
                                    {matchedAthlete.position && (
                                      <div className="text-sm text-gray-600">Position: {matchedAthlete.position}</div>
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
                                <div className="font-medium text-gray-900">{selectedItem.athleteName}</div>
                              </div>
                            )}
                            {selectedItem.secondAthleteName && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="font-medium text-gray-900">{selectedItem.secondAthleteName}</div>
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
                      <h3 className="font-semibold text-gray-900">Athletes on File</h3>
                      <div className="space-y-3">
                        {selectedItem.athletes.map((athlete, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div className="font-medium text-gray-900">
                              {athlete.firstName} {athlete.lastName}
                            </div>
                            {athlete.birthday && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">DOB:</span> {athlete.birthday}
                              </div>
                            )}
                            {athlete.schoolClubTeam && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Team:</span> {athlete.schoolClubTeam}
                              </div>
                            )}
                            {athlete.experienceLevel && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Experience:</span> {athlete.experienceLevel}
                              </div>
                            )}
                            {athlete.position && (
                              <div className="text-sm text-gray-600">
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
                      <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
                      <div className="bg-red-50 p-4 rounded-lg space-y-1">
                        <div className="font-medium text-gray-900">{selectedItem.emergencyContactName}</div>
                        {selectedItem.emergencyContactNumber && (
                          <div className="text-sm text-gray-600">
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
                      <h3 className="font-semibold text-gray-900">Referred By</h3>
                      <div className="text-sm text-gray-700">{selectedItem.referredBy}</div>
                    </div>
                  )}

                  {/* Lesson Notes from Booking */}
                  {selectedItem.lessonNotes && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Lesson Notes</h3>
                      <div className="text-sm text-gray-700 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        {selectedItem.lessonNotes}
                      </div>
                    </div>
                  )}

                  {/* Notes for Coach */}
                  {selectedItem.notesForCoach && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Notes for Coach</h3>
                      <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                        {selectedItem.notesForCoach}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Class Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Class Name</h3>
                      <div className="text-lg text-gray-900">{selectedItem.className}</div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Schedule</h3>
                      <div className="text-sm text-gray-700">
                        {format(selectedItem.startTime, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-700">
                        {format(selectedItem.startTime, 'h:mm a')} - {format(selectedItem.endTime, 'h:mm a')}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Trainer</h3>
                      <div className="text-sm text-gray-700">{selectedItem.trainerName}</div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Participants ({selectedItem.studentsCount || 0})</h3>
                      {selectedItem.participants && selectedItem.participants.length > 0 ? (
                        <div className="space-y-2">
                          {selectedItem.participants.map((participant, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                              <div className="font-medium text-gray-900">{participant}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No participants registered</div>
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
