'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, Timestamp } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Calendar, Clock, User, MapPin, DollarSign, Plus } from 'lucide-react';
import { format, addHours } from 'date-fns';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface LessonPackage {
  id: string;
  userId: string;
  packageName: string;
  remainingLessons: number;
  totalLessons: number;
}

interface AvailabilitySlot {
  id: string;
  trainerId?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
  status: string; // 'open', 'booked', 'unavailable'
  title?: string;
}

export default function BookingsPage() {
  const { orgId } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!orgId) return;

    async function loadData() {
      try {
        // Load clients
        const clientsQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'client')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];
        setClients(clientsData);

        // Load trainers
        const trainersQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'trainer')
        );
        const trainersSnapshot = await getDocs(trainersQuery);
        const trainersData = trainersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainer[];
        setTrainers(trainersData);

        if (clientsData.length > 0) setSelectedClient(clientsData[0].id);
        if (trainersData.length > 0) setSelectedTrainer(trainersData[0].id);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  // Load packages when client changes
  useEffect(() => {
    if (!selectedClient) return;

    async function loadPackages() {
      try {
        const packagesQuery = query(
          collection(db, 'lessonPackages'),
          where('userId', '==', selectedClient),
          where('remainingLessons', '>', 0)
        );
        const snapshot = await getDocs(packagesQuery);
        const packagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as LessonPackage[];
        setPackages(packagesData);
        if (packagesData.length > 0) setSelectedPackage(packagesData[0].id);
      } catch (error) {
        console.error('Error loading packages:', error);
      }
    }

    loadPackages();
  }, [selectedClient]);

  // Load slots when trainer or date changes
  useEffect(() => {
    if (!orgId || !selectedTrainer || !selectedDate) return;

    async function loadSlots() {
      try {
        const startOfDay = new Date(`${selectedDate}T00:00:00`);
        const endOfDay = new Date(`${selectedDate}T23:59:59`);

        // Query trainer schedules subcollection (matches iOS pattern)
        const trainerRef = doc(db, 'trainers', selectedTrainer);
        const slotsQuery = query(
          collection(trainerRef, 'schedules'),
          where('startTime', '>=', Timestamp.fromDate(startOfDay)),
          where('startTime', '<=', Timestamp.fromDate(endOfDay)),
          where('status', '==', 'open')
        );
        const snapshot = await getDocs(slotsQuery);
        const slotsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as AvailabilitySlot[];
        setSlots(slotsData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
        if (slotsData.length > 0) setSelectedSlot(slotsData[0].id);
      } catch (error) {
        console.error('Error loading slots:', error);
      }
    }

    loadSlots();
  }, [orgId, selectedTrainer, selectedDate]);

  const handleCreateBooking = async () => {
    if (!selectedClient || !selectedTrainer || !selectedSlot || !selectedPackage) {
      alert('Please fill in all fields');
      return;
    }

    setCreating(true);
    setSuccess(false);

    try {
      const bookLesson = httpsCallable(functions, 'bookLesson');
      await bookLesson({
        trainerId: selectedTrainer,
        slotId: selectedSlot,
        lessonPackageId: selectedPackage,
      });

      setSuccess(true);
      
      // Reload slots to remove the booked one
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);
      const trainerRef = doc(db, 'trainers', selectedTrainer);
      const slotsQuery = query(
        collection(trainerRef, 'schedules'),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay)),
        where('status', '==', 'open')
      );
      const snapshot = await getDocs(slotsQuery);
      const slotsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AvailabilitySlot[];
      setSlots(slotsData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      if (slotsData.length > 0) setSelectedSlot(slotsData[0].id);

      // Reload packages to update remaining lessons
      const packagesQuery = query(
        collection(db, 'lessonPackages'),
        where('userId', '==', selectedClient),
        where('remainingLessons', '>', 0)
      );
      const packagesSnapshot = await getDocs(packagesQuery);
      const packagesData = packagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as LessonPackage[];
      setPackages(packagesData);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Error creating booking');
    } finally {
      setCreating(false);
    }
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedTrainerData = trainers.find(t => t.id === selectedTrainer);
  const selectedPackageData = packages.find(p => p.id === selectedPackage);
  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Booking</h1>
          <p className="text-gray-600 mt-2">Book sessions for clients</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Booking Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[#3258A3]" />
                  New Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Client
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                  >
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Lesson Package
                  </label>
                  {packages.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      No active packages available for this client
                    </div>
                  ) : (
                    <select
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                    >
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.packageName} ({pkg.remainingLessons} of {pkg.totalLessons} remaining)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Trainer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Trainer
                  </label>
                  <select
                    value={selectedTrainer}
                    onChange={(e) => setSelectedTrainer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                  >
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                  />
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Available Time Slots
                  </label>
                  {slots.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      No available slots for this trainer on this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            selectedSlot === slot.id
                              ? 'border-[#3258A3] bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {format(slot.startTime.toDate(), 'h:mm a')} - {format(slot.endTime.toDate(), 'h:mm a')}
                          </div>
                          {slot.location && (
                            <div className="text-xs text-gray-600 mt-1">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {slot.location}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleCreateBooking}
                  disabled={creating || packages.length === 0 || slots.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Booking...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Create Booking
                    </>
                  )}
                </button>

                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    ✓ Booking created successfully!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClientData && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedClientData.firstName} {selectedClientData.lastName}
                    </p>
                    {selectedClientData.email && (
                      <p className="text-sm text-gray-600">{selectedClientData.email}</p>
                    )}
                  </div>
                )}

                {selectedPackageData && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Package</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedPackageData.packageName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedPackageData.remainingLessons} of {selectedPackageData.totalLessons} lessons remaining
                    </p>
                  </div>
                )}

                {selectedTrainerData && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Trainer</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedTrainerData.firstName} {selectedTrainerData.lastName}
                    </p>
                  </div>
                )}

                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {selectedSlotData && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Time</p>
                    <p className="text-base font-semibold text-gray-900">
                      {format(selectedSlotData.startTime.toDate(), 'h:mm a')} - {format(selectedSlotData.endTime.toDate(), 'h:mm a')}
                    </p>
                    {selectedSlotData.location && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {selectedSlotData.location}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
