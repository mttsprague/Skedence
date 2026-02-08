'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { WeekScheduleGrid } from '@/components/admin/schedule/WeekScheduleGrid';
import { AllTrainersDayGrid } from '@/components/admin/schedule/AllTrainersDayGrid';
import { collection, query, where, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, deleteDoc, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { User, Users } from 'lucide-react';

interface AthleteInfo {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  schoolClubTeam?: string;
  experienceLevel?: string;
  position?: string;
}

interface Booking {
  id: string;
  clientId?: string;
  clientUID?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  referredBy?: string;
  notesForCoach?: string;
  athletes?: AthleteInfo[];
  athleteName?: string; // Participant name for this lesson (legacy)
  secondAthleteName?: string; // Second participant name (legacy)
  athleteNames?: string[]; // All participant names (new format)
  lessonNotes?: string; // Lesson-specific notes from client
  trainerId: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'canceled';
}

interface GroupClass {
  id: string;
  title: string;
  currentParticipants: number;
  maxParticipants: number;
  startTime: Date;
  endTime: Date;
  isOpenForRegistration: boolean;
}

interface AvailabilitySlot {
  id: string;
  trainerId: string;
  startTime: Date;
  endTime: Date;
  status: 'open' | 'unavailable';
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function SchedulePage() {
  const { orgId, user, userData } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<GroupClass[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const trainersRef = useRef<Trainer[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'allTrainersDay'>('week');
  
  // Availability editor
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ day: Date; hour: number; existingSlot?: AvailabilitySlot; targetTrainerId?: string } | null>(null);
  const [slotDuration, setSlotDuration] = useState<number>(1);
  const [slotStatus, setSlotStatus] = useState<'open' | 'unavailable'>('open');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState<number>(4);

  // Booking/class detail dialogs
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedClass, setSelectedClass] = useState<GroupClass | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<'early' | 'late' | null>(null);
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());

  // Set initial trainer to current user
  useEffect(() => {
    if (user && !selectedTrainerId) {
      setSelectedTrainerId(user.uid);
    }
  }, [user]);

  // Load required fields from org settings
  useEffect(() => {
    if (!orgId) return;
    
    async function loadRequiredFields() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          const fields = orgData.intakeFormFieldsPrivate || orgData.intakeFormFields || [];
          const required = new Set<string>(
            fields
              .filter((field: any) => field.required === true)
              .map((field: any) => field.id as string)
          );
          setRequiredFields(required);
        }
      } catch (error) {
        console.error('Error loading required fields:', error);
      }
    }

    loadRequiredFields();
  }, [orgId]);

  // Load trainers if admin
  useEffect(() => {
    if (!orgId || !userData) return;

    async function loadTrainers() {
      try {
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('orgId', '==', orgId)
        );
        const trainersSnap = await getDocs(trainersQuery);
        const trainersData = trainersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainer[];
        setTrainers(trainersData);
        trainersRef.current = trainersData;
      } catch (error) {
        console.error('Error loading trainers:', error);
      }
    }

    // Only load trainers if user is owner
    if (userData.role === 'owner') {
      loadTrainers();
    }
  }, [orgId, userData?.role]);

  // Load schedule data with real-time listeners
  useEffect(() => {
    if (!orgId) return;
    if (viewMode === 'week' && !selectedTrainerId) return;
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 7);
    
    setLoading(true);

    // Real-time listener for bookings
    const bookingsQuery = viewMode === 'week'
      ? query(
          collection(db, 'bookings'),
          where('trainerId', '==', selectedTrainerId),
          where('startTime', '>=', Timestamp.fromDate(weekStart)),
          where('startTime', '<', Timestamp.fromDate(weekEnd))
        )
      : query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(weekStart)),
          where('startTime', '<', Timestamp.fromDate(weekEnd))
        );
    
    const unsubBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      const bookingsData: Booking[] = [];
      
      for (const bookingDoc of snapshot.docs) {
        const data = bookingDoc.data() as any;
        const actualClientId = data.clientUID || data.clientId;
        
        let clientName = 'Unknown Client';
        let clientEmail: string | undefined;
        let clientPhone: string | undefined;
        let emergencyContactName: string | undefined;
        let emergencyContactNumber: string | undefined;
        let referredBy: string | undefined;
        let notesForCoach: string | undefined;
        let athletes: AthleteInfo[] | undefined;
        
        if (actualClientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', actualClientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
              clientEmail = clientData.emailAddress || clientData.email;
              clientPhone = clientData.phoneNumber;
              emergencyContactName = clientData.emergencyContactName;
              emergencyContactNumber = clientData.emergencyContactNumber;
              referredBy = clientData.referredBy;
              notesForCoach = clientData.notesForCoach;
              athletes = clientData.athletes;
            }
          } catch (err) {
            console.error('Error fetching client:', err);
          }
        }

        bookingsData.push({
          id: bookingDoc.id,
          clientUID: data.clientUID,
          clientId: data.clientId,
          trainerId: data.trainerId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          status: data.status || 'confirmed',
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
      setBookings(bookingsData);
      setLoading(false);
    });

    // Real-time listener for classes (only for this trainer)
    const classesQuery = viewMode === 'week'
      ? query(
          collection(db, 'classes'),
          where('trainerId', '==', selectedTrainerId),
          where('startTime', '>=', Timestamp.fromDate(weekStart)),
          where('startTime', '<', Timestamp.fromDate(weekEnd))
        )
      : query(
          collection(db, 'classes'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(weekStart)),
          where('startTime', '<', Timestamp.fromDate(weekEnd))
        );
    
    const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      })) as GroupClass[];
      console.log(`Classes loaded for trainer ${selectedTrainerId}:`, classesData.length, 'classes');
      classesData.forEach(c => console.log(`  - ${c.title} (trainerId: ${(c as any).trainerId})`));
      setClasses(classesData);
    });

    // Real-time listener for availability slots
    let unsubAvailability: () => void;
    
    if (viewMode === 'week') {
      // Single trainer mode
      const availabilityQuery = query(
        collection(db, 'trainers', selectedTrainerId, 'schedules'),
        where('startTime', '>=', Timestamp.fromDate(weekStart)),
        where('startTime', '<', Timestamp.fromDate(weekEnd)),
        orderBy('startTime', 'asc')
      );
      
      unsubAvailability = onSnapshot(availabilityQuery, (snapshot) => {
        const availabilityData = snapshot.docs.map(doc => ({
          id: doc.id,
          trainerId: selectedTrainerId,
          ...doc.data(),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime.toDate(),
        })) as AvailabilitySlot[];
        setAvailabilitySlots(availabilityData);
      });
    } else {
      // All trainers mode - load availability for all trainers
      const loadAllAvailability = async () => {
        const allAvailability: AvailabilitySlot[] = [];
        
        for (const trainer of trainersRef.current) {
          const availabilityQuery = query(
            collection(db, 'trainers', trainer.id, 'schedules'),
            where('startTime', '>=', Timestamp.fromDate(weekStart)),
            where('startTime', '<', Timestamp.fromDate(weekEnd)),
            orderBy('startTime', 'asc')
          );
          
          const snapshot = await getDocs(availabilityQuery);
          const trainerAvailability = snapshot.docs.map(doc => ({
            id: doc.id,
            trainerId: trainer.id,
            ...doc.data(),
            startTime: doc.data().startTime.toDate(),
            endTime: doc.data().endTime.toDate(),
          })) as AvailabilitySlot[];
          
          allAvailability.push(...trainerAvailability);
        }
        
        setAvailabilitySlots(allAvailability);
      };
      
      loadAllAvailability();
      unsubAvailability = () => {}; // No-op for all trainers mode
    }

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      unsubBookings();
      unsubClasses();
      unsubAvailability();
    };
  }, [orgId, selectedTrainerId, viewMode]);

  const handleAddAvailability = (day: Date, hour: number, trainerId?: string) => {
    setEditingSlot({ day, hour, targetTrainerId: trainerId });
    setSlotDuration(1);
    setSlotStatus('open');
    setShowAvailabilityDialog(true);
  };

  const handleAvailabilityClick = (slot: AvailabilitySlot) => {
    const startDate = new Date(slot.startTime);
    setEditingSlot({
      day: startDate,
      hour: startDate.getHours(),
      existingSlot: slot,
      targetTrainerId: slot.trainerId,
    });
    setSlotDuration(Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60 * 60)));
    setSlotStatus(slot.status);
    setShowAvailabilityDialog(true);
  };

  const handleSaveAvailability = async () => {
    const targetTrainerId = editingSlot?.targetTrainerId || selectedTrainerId;
    if (!editingSlot || !targetTrainerId) return;

    try {
      const startTime = setMinutes(setHours(editingSlot.day, editingSlot.hour), 0);
      const endTime = new Date(startTime.getTime() + slotDuration * 60 * 60 * 1000);

      console.log('Schedule: Creating slot for trainer:', targetTrainerId);
      console.log('Schedule: Start time:', startTime);
      console.log('Schedule: End time:', endTime);
      console.log('Schedule: Status:', slotStatus);

      // Helper function to generate deterministic slot ID (matches iOS/Cloud Functions)
      const generateScheduleDocId = (date: Date): string => {
        const utcDate = new Date(date);
        utcDate.setUTCMinutes(0, 0, 0); // normalize to top of the hour
        const year = utcDate.getUTCFullYear();
        const month = (utcDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = utcDate.getUTCDate().toString().padStart(2, '0');
        const hour = utcDate.getUTCHours().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hour}`;
      };

      // Get trainer name
      const trainerDoc = await getDoc(doc(db, 'trainers', targetTrainerId));
      const trainerData = trainerDoc.data();
      const trainerFirstName = trainerData?.firstName || '';
      const trainerLastName = trainerData?.lastName || '';
      const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || 'Unknown Trainer';

      if (editingSlot.existingSlot) {
        // Update existing slot
        console.log('Schedule: Updating existing slot:', editingSlot.existingSlot.id);
        await updateDoc(doc(db, 'trainers', targetTrainerId, 'schedules', editingSlot.existingSlot.id), {
          startTime: Timestamp.fromDate(startTime),
          endTime: Timestamp.fromDate(endTime),
          status: slotStatus,
          trainerName: trainerFullName,
          updatedAt: Timestamp.now(),
        });
      } else if (isRecurring) {
        // Create recurring slots
        console.log('Schedule: Creating recurring slots for', recurringWeeks, 'weeks');
        const batch = [];
        for (let week = 0; week < recurringWeeks; week++) {
          const weekOffset = week * 7 * 24 * 60 * 60 * 1000;
          const slotStart = new Date(startTime.getTime() + weekOffset);
          const slotEnd = new Date(endTime.getTime() + weekOffset);
          const slotId = generateScheduleDocId(slotStart);
          
          console.log('Schedule: Creating slot with ID:', slotId);
          batch.push(
            setDoc(doc(db, 'trainers', selectedTrainerId, 'schedules', slotId), {
              trainerId: selectedTrainerId,
              orgId: orgId,
              startTime: Timestamp.fromDate(slotStart),
              endTime: Timestamp.fromDate(slotEnd),
              status: slotStatus,
              clientId: null,
              clientName: null,
              trainerName: trainerFullName,
              createdAt: Timestamp.now(),
            }, { merge: true })
          );
        }
        await Promise.all(batch);
        console.log('Schedule: Recurring slots created successfully');
      } else {
        // Create single slot with deterministic ID
        const slotId = generateScheduleDocId(startTime);
        console.log('Schedule: Creating single slot with ID:', slotId);
        console.log('Schedule: Full path: trainers/' + targetTrainerId + '/schedules/' + slotId);
        
        await setDoc(doc(db, 'trainers', targetTrainerId, 'schedules', slotId), {
          trainerId: targetTrainerId,
          orgId: orgId,
          startTime: Timestamp.fromDate(startTime),
          endTime: Timestamp.fromDate(endTime),
          status: slotStatus,
          clientId: null,
          clientName: null,
          trainerName: trainerFullName,
          createdAt: Timestamp.now(),
        }, { merge: true });
        
        console.log('Schedule: Single slot created successfully');
      }

      setShowAvailabilityDialog(false);
      setEditingSlot(null);
      setIsRecurring(false);
      setRecurringWeeks(4);
      // Real-time listener will update automatically
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  const handleDeleteAvailability = async () => {
    if (!editingSlot?.existingSlot) return;

    try {
      await deleteDoc(doc(db, 'trainers', selectedTrainerId, 'schedules', editingSlot.existingSlot.id));
      setShowAvailabilityDialog(false);
      setEditingSlot(null);
      // Real-time listener will update automatically
    } catch (error) {
      console.error('Error deleting availability:', error);
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
      alert(refundPass 
        ? 'Session cancelled successfully! The client\'s pass has been refunded.' 
        : 'Session cancelled successfully. The client\'s pass was not refunded.');
    } catch (error: any) {
      alert(error.message || 'Failed to cancel session');
    } finally {
      setCancellingBooking(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading schedule...</div>
        </div>
      </>
    );
  }

  const isAdmin = userData?.role === 'owner';

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white border-b">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Manage availability, bookings, and classes</p>
          </div>

          {isAdmin && trainers.length > 1 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {viewMode === 'week' && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="trainer-select" className="text-sm font-medium whitespace-nowrap">
                    Viewing:
                  </Label>
                  <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
                    <SelectTrigger id="trainer-select" className="w-full sm:w-[200px] touch-manipulation">
                      <SelectValue placeholder="Select trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.firstName} {trainer.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button
                variant={viewMode === 'allTrainersDay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(viewMode === 'week' ? 'allTrainersDay' : 'week')}
                className="touch-manipulation whitespace-nowrap"
              >
                {viewMode === 'week' ? (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    All Trainers
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Single Trainer
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {viewMode === 'week' ? (
          <WeekScheduleGrid
            trainerId={selectedTrainerId}
            bookings={bookings}
            classes={classes}
            availabilitySlots={availabilitySlots}
            onAddAvailability={(day, hour) => handleAddAvailability(day, hour)}
            onBookingClick={(booking) => setSelectedBooking(booking)}
            onClassClick={(classItem) => setSelectedClass(classItem)}
            onAvailabilityClick={handleAvailabilityClick}
          />
        ) : (
          <AllTrainersDayGrid
            trainers={trainers}
            bookings={bookings}
            classes={classes}
            availabilitySlots={availabilitySlots}
            onAddAvailability={(trainerId, day, hour) => handleAddAvailability(day, hour, trainerId)}
            onBookingClick={(booking) => setSelectedBooking(booking)}
            onClassClick={(classItem) => setSelectedClass(classItem)}
            onAvailabilityClick={handleAvailabilityClick}
          />
        )}
      </div>

      {/* Availability Editor Dialog */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlot?.existingSlot ? 'Edit Availability' : 'Add Availability'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Duration (hours)</Label>
              <Select value={slotDuration.toString()} onValueChange={(v) => setSlotDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h} hour{h > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={slotStatus} onValueChange={(v: any) => setSlotStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!editingSlot?.existingSlot && (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="recurring" className="font-normal cursor-pointer">
                    Repeat weekly
                  </Label>
                </div>

                {isRecurring && (
                  <div>
                    <Label>Number of weeks</Label>
                    <Select value={recurringWeeks.toString()} onValueChange={(v) => setRecurringWeeks(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 8, 10, 12].map((w) => (
                          <SelectItem key={w} value={w.toString()}>
                            {w} weeks
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveAvailability} className="flex-1">
                {editingSlot?.existingSlot ? 'Update' : 'Create'}
              </Button>
              {editingSlot?.existingSlot && (
                <Button onClick={handleDeleteAvailability} variant="destructive">
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <div className="text-sm text-gray-600 mt-1">
                    {new Date(selectedBooking.startTime).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Contact Information</h3>
                {selectedBooking.clientEmail && (
                  <div className="text-sm">
                    <span className="text-gray-600">Email:</span> {selectedBooking.clientEmail}
                  </div>
                )}
                {selectedBooking.clientPhone && (
                  <div className="text-sm">
                    <span className="text-gray-600">Phone:</span> {selectedBooking.clientPhone}
                  </div>
                )}
              </div>
              
              {/* Participants - Booked Athletes */}
              {((selectedBooking.athleteNames && selectedBooking.athleteNames.length > 0) || selectedBooking.athleteName || selectedBooking.secondAthleteName) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Participants</h3>
                  <div className="space-y-3">
                    {/* Use new athleteNames array if available */}
                    {selectedBooking.athleteNames && selectedBooking.athleteNames.length > 0 ? (
                      selectedBooking.athleteNames.map((name, idx) => {
                        // Match athlete name to profile data
                        const matchedAthlete = selectedBooking.athletes?.find(athlete => 
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
                        {selectedBooking.athleteName && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-gray-900">{selectedBooking.athleteName}</div>
                          </div>
                        )}
                        {selectedBooking.secondAthleteName && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-gray-900">{selectedBooking.secondAthleteName}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Athletes on File */}
              {selectedBooking.athletes && selectedBooking.athletes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">All Athletes on File</h3>
                  <div className="space-y-3">
                    {selectedBooking.athletes.map((athlete, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg space-y-1">
                        <div className="font-medium text-gray-900">
                          {athlete.firstName} {athlete.lastName}
                        </div>
                        {athlete.birthday && (
                          <div className="text-sm text-gray-600">DOB: {athlete.birthday}</div>
                        )}
                        {athlete.schoolClubTeam && (
                          <div className="text-sm text-gray-600">Team: {athlete.schoolClubTeam}</div>
                        )}
                        {athlete.experienceLevel && (
                          <div className="text-sm text-gray-600">Experience: {athlete.experienceLevel}</div>
                        )}
                        {athlete.position && (
                          <div className="text-sm text-gray-600">Position: {athlete.position}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Emergency Contact */}
              {requiredFields.has('emergencyContactName') && selectedBooking.emergencyContactName && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
                  <div className="text-sm">
                    <div className="text-gray-900">{selectedBooking.emergencyContactName}</div>
                    {selectedBooking.emergencyContactNumber && (
                      <div className="text-gray-600">{selectedBooking.emergencyContactNumber}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Referral */}
              {requiredFields.has('referredBy') && selectedBooking.referredBy && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Referred By</h3>
                  <div className="text-sm text-gray-900">{selectedBooking.referredBy}</div>
                </div>
              )}
              
              {/* Session Notes - Show whenever present */}
              {selectedBooking.lessonNotes && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Session Notes</h3>
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    {selectedBooking.lessonNotes}
                  </div>
                </div>
              )}

              {/* Cancel Options - Only show for future bookings */}
              {new Date(selectedBooking.startTime) > new Date() && !showCancelConfirm && !cancellingBooking && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Cancel Session</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowCancelConfirm('early')}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      Early Cancel
                      <span className="block text-xs font-normal mt-1">Refund Pass</span>
                    </Button>
                    <Button
                      onClick={() => setShowCancelConfirm('late')}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Late Cancel
                      <span className="block text-xs font-normal mt-1">No Refund</span>
                    </Button>
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
                <div className="pt-4 border-t text-center text-gray-600">
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
                <div className="text-sm text-gray-600">Participants</div>
                <div className="text-2xl font-bold">
                  {selectedClass.currentParticipants} / {selectedClass.maxParticipants}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Time</div>
                <div>{new Date(selectedClass.startTime).toLocaleString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
