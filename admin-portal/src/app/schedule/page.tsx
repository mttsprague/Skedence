'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { WeekScheduleGrid } from '@/components/schedule/WeekScheduleGrid';
import { collection, query, where, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, deleteDoc, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { User } from 'lucide-react';

interface Booking {
  id: string;
  clientId?: string;
  clientUID?: string;
  clientName?: string;
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
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Availability editor
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ day: Date; hour: number; existingSlot?: AvailabilitySlot } | null>(null);
  const [slotDuration, setSlotDuration] = useState<number>(1);
  const [slotStatus, setSlotStatus] = useState<'open' | 'unavailable'>('open');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState<number>(4);

  // Booking/class detail dialogs
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedClass, setSelectedClass] = useState<GroupClass | null>(null);

  // Set initial trainer to current user
  useEffect(() => {
    if (user && !selectedTrainerId) {
      setSelectedTrainerId(user.uid);
    }
  }, [user, selectedTrainerId]);

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
      } catch (error) {
        console.error('Error loading trainers:', error);
      }
    }

    // Only load trainers if user is owner
    if (userData.role === 'owner') {
      loadTrainers();
    }
  }, [orgId, userData]);

  // Load schedule data with real-time listeners
  useEffect(() => {
    if (!orgId || !selectedTrainerId) return;
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 7);
    
    setLoading(true);

    // Real-time listener for bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('trainerId', '==', selectedTrainerId),
      where('startTime', '>=', Timestamp.fromDate(weekStart)),
      where('startTime', '<', Timestamp.fromDate(weekEnd))
    );
    
    const unsubBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      const bookingsData: Booking[] = [];
      
      for (const bookingDoc of snapshot.docs) {
        const data = bookingDoc.data() as any;
        const actualClientId = data.clientUID || data.clientId;
        
        let clientName = 'Unknown Client';
        if (actualClientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', actualClientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
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
        });
      }
      setBookings(bookingsData);
      setLoading(false);
    });

    // Real-time listener for classes (only for this trainer)
    const classesQuery = query(
      collection(db, 'classes'),
      where('trainerId', '==', selectedTrainerId),
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
    const availabilityQuery = query(
      collection(db, 'trainers', selectedTrainerId, 'schedules'),
      where('startTime', '>=', Timestamp.fromDate(weekStart)),
      where('startTime', '<', Timestamp.fromDate(weekEnd)),
      orderBy('startTime', 'asc')
    );
    
    const unsubAvailability = onSnapshot(availabilityQuery, (snapshot) => {
      const availabilityData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      })) as AvailabilitySlot[];
      setAvailabilitySlots(availabilityData);
    });

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      unsubBookings();
      unsubClasses();
      unsubAvailability();
    };
  }, [orgId, selectedTrainerId]);

  const handleAddAvailability = (day: Date, hour: number) => {
    setEditingSlot({ day, hour });
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
    });
    setSlotDuration(Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60 * 60)));
    setSlotStatus(slot.status);
    setShowAvailabilityDialog(true);
  };

  const handleSaveAvailability = async () => {
    if (!editingSlot || !selectedTrainerId) return;

    try {
      const startTime = setMinutes(setHours(editingSlot.day, editingSlot.hour), 0);
      const endTime = new Date(startTime.getTime() + slotDuration * 60 * 60 * 1000);

      console.log('Schedule: Creating slot for trainer:', selectedTrainerId);
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
      const trainerDoc = await getDoc(doc(db, 'trainers', selectedTrainerId));
      const trainerData = trainerDoc.data();
      const trainerFirstName = trainerData?.firstName || '';
      const trainerLastName = trainerData?.lastName || '';
      const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || 'Unknown Trainer';

      if (editingSlot.existingSlot) {
        // Update existing slot
        console.log('Schedule: Updating existing slot:', editingSlot.existingSlot.id);
        await updateDoc(doc(db, 'trainers', selectedTrainerId, 'schedules', editingSlot.existingSlot.id), {
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
        console.log('Schedule: Full path: trainers/' + selectedTrainerId + '/schedules/' + slotId);
        
        await setDoc(doc(db, 'trainers', selectedTrainerId, 'schedules', slotId), {
          trainerId: selectedTrainerId,
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading schedule...</div>
        </div>
      </DashboardLayout>
    );
  }

  const isAdmin = userData?.role === 'owner';

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white border-b">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Manage availability, bookings, and classes</p>
          </div>

          {isAdmin && trainers.length > 0 && (
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
        </div>

        <WeekScheduleGrid
          trainerId={selectedTrainerId}
          bookings={bookings}
          classes={classes}
          availabilitySlots={availabilitySlots}
          onAddAvailability={handleAddAvailability}
          onBookingClick={(booking) => setSelectedBooking(booking)}
          onClassClick={(classItem) => setSelectedClass(classItem)}
          onAvailabilityClick={handleAvailabilityClick}
        />
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
                <Button onClick={handleDeleteAvailability} variant="danger">
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{selectedBooking.clientName}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(selectedBooking.startTime).toLocaleString()}
                  </div>
                </div>
              </div>
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
    </DashboardLayout>
  );
}
