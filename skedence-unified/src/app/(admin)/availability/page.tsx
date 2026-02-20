'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, deleteDoc, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Calendar, Clock, Plus, Trash2, User, MapPin } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface AvailabilitySlot {
  id: string;
  trainerId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
  status: string; // 'open', 'booked', 'unavailable'
  title?: string;
}

export default function AvailabilityPage() {
  const { orgId } = useAuth();
  
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newSlot, setNewSlot] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    recurring: false,
    recurringType: 'daily',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri by default
  });

  useEffect(() => {
    if (!orgId) return;

    async function loadTrainers() {
      try {
        const trainersQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'trainer')
        );
        const snapshot = await getDocs(trainersQuery);
        const trainersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainer[];
        setTrainers(trainersData);
        if (trainersData.length > 0) {
          setSelectedTrainer(trainersData[0].id);
        }
      } catch (error) {
        console.error('Error loading trainers:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTrainers();
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !selectedTrainer) return;

    async function loadSlots() {
      try {
        // Query trainer schedules subcollection (matches iOS pattern)
        const trainerRef = doc(db, 'trainers', selectedTrainer);
        const slotsQuery = query(
          collection(trainerRef, 'schedules')
        );
        const snapshot = await getDocs(slotsQuery);
        const slotsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as AvailabilitySlot[];
        setSlots(slotsData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      } catch (error) {
        console.error('Error loading slots:', error);
      }
    }

    loadSlots();
  }, [orgId, selectedTrainer]);

  const handleAddSlot = async () => {
    if (!orgId || !selectedTrainer) return;

    setAdding(true);
    try {
      const startDateTime = new Date(`${newSlot.startDate}T${newSlot.startTime}`);

      // Calculate timezone offset (minutes to add to local time to get UTC, positive west of UTC)
      const timezoneOffsetMinutes = -startDateTime.getTimezoneOffset();

      const params: any = {
        trainerId: selectedTrainer,
        dailyStartHour: parseInt(newSlot.startTime.split(':')[0]),
        dailyEndHour: parseInt(newSlot.endTime.split(':')[0]),
        slotDurationMinutes: 60,
        timezoneOffsetMinutes,
        status: 'open',
      };

      if (newSlot.location) {
        params.location = newSlot.location;
      }

      if (newSlot.recurring) {
        // Recurring schedule
        params.startDate = newSlot.startDate;
        params.endDate = newSlot.endDate;
        if (newSlot.recurringType === 'weekly') {
          params.daysOfWeek = newSlot.daysOfWeek;
        }
      } else {
        // Single day
        params.startDate = newSlot.startDate;
        params.endDate = newSlot.startDate;
      }

      const processAvailability = httpsCallable(functions, 'processTrainerAvailability');
      await processAvailability(params);

      // Reload slots
      const trainerRef = doc(db, 'trainers', selectedTrainer);
      const slotsQuery = query(
        collection(trainerRef, 'schedules')
      );
      const snapshot = await getDocs(slotsQuery);
      const slotsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AvailabilitySlot[];
      setSlots(slotsData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      
      // Mark "Create Trainer Availability" as complete in onboarding checklist
      if (orgId) {
        try {
          const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
          const onboardingDoc = await getDoc(onboardingRef);
          const currentProgress = onboardingDoc.exists() ? onboardingDoc.data() : {};
          await setDoc(onboardingRef, { ...currentProgress, hasAvailability: true }, { merge: true });
        } catch (error) {
          console.error('Error marking onboarding step complete:', error);
        }
      }

      // Reset form
      setNewSlot({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        recurring: false,
        recurringType: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5],
      });
    } catch (error) {
      console.error('Error adding slot:', error);
      alert('Error adding availability slot');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;

    try {
      const trainerRef = doc(db, 'trainers', selectedTrainer);
      await deleteDoc(doc(trainerRef, 'schedules', slotId));
      setSlots(slots.filter(s => s.id !== slotId));
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Error deleting slot');
    }
  };

  const selectedTrainerData = trainers.find(t => t.id === selectedTrainer);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Availability Management</h1>
          <p className="text-foreground/80 mt-2">Set trainer availability and time slots</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trainer Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Select Trainer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>

                {selectedTrainerData && (
                  <div className="mt-4 p-4 bg-background rounded-lg">
                    <p className="text-sm font-medium text-foreground">
                      {selectedTrainerData.firstName} {selectedTrainerData.lastName}
                    </p>
                    {selectedTrainerData.email && (
                      <p className="text-sm text-foreground/80 mt-1">{selectedTrainerData.email}</p>
                    )}
                  </div>
                )}

                {/* Add New Slot Form */}
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold text-foreground">Add Availability</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newSlot.startDate}
                      onChange={(e) => setNewSlot({ ...newSlot, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Start</label>
                      <input
                        type="time"
                        value={newSlot.startTime}
                        onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">End</label>
                      <input
                        type="time"
                        value={newSlot.endTime}
                        onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Location</label>
                    <input
                      type="text"
                      value={newSlot.location}
                      onChange={(e) => setNewSlot({ ...newSlot, location: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Recurring Options */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSlot.recurring}
                        onChange={(e) => setNewSlot({ ...newSlot, recurring: e.target.checked })}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                      />
                      <span className="text-sm font-medium text-foreground">Recurring Schedule</span>
                    </label>

                    {newSlot.recurring && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                          <input
                            type="date"
                            value={newSlot.endDate}
                            onChange={(e) => setNewSlot({ ...newSlot, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Repeat Pattern</label>
                          <select
                            value={newSlot.recurringType}
                            onChange={(e) => setNewSlot({ ...newSlot, recurringType: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>

                        {newSlot.recurringType === 'weekly' && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Days of Week</label>
                            <div className="flex flex-wrap gap-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                <label key={day} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newSlot.daysOfWeek.includes(index)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewSlot({ ...newSlot, daysOfWeek: [...newSlot.daysOfWeek, index].sort() });
                                      } else {
                                        setNewSlot({ ...newSlot, daysOfWeek: newSlot.daysOfWeek.filter(d => d !== index) });
                                      }
                                    }}
                                    className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                                  />
                                  <span className="text-sm text-foreground">{day}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleAddSlot}
                    disabled={adding}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {adding ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        Add Slot
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Availability Slots */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Availability Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No availability slots set</p>
                    <p className="text-sm text-gray-400 mt-1">Add slots using the form on the left</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {slots.map(slot => (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-lg border ${
                          slot.status === 'booked'
                            ? 'bg-red-50 border-red-200'
                            : slot.status === 'unavailable'
                            ? 'bg-background border-gray-200'
                            : 'bg-white border-gray-200 hover:border-primary'
                        } transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-foreground/80 mb-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(slot.startTime.toDate(), 'EEE, MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(slot.startTime.toDate(), 'h:mm a')} - {format(slot.endTime.toDate(), 'h:mm a')}
                              </span>
                            </div>
                            {slot.location && (
                              <div className="flex items-center gap-2 text-sm text-foreground/80 mt-1">
                                <MapPin className="h-4 w-4" />
                                <span>{slot.location}</span>
                              </div>
                            )}
                            {slot.status === 'booked' && (
                              <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Booked
                              </span>
                            )}
                            {slot.status === 'unavailable' && (
                              <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-foreground text-xs font-medium rounded">
                                Unavailable
                              </span>
                            )}
                          </div>
                          {slot.status === 'open' && (
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
