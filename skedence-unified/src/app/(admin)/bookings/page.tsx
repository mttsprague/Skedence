'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, getDocs, doc, getDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Calendar, Clock, User, MapPin, DollarSign, Plus } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { Location } from '@/types/location';
import { toast } from '@/lib/toast';

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
  pricingTierId?: string;
  pricingTierName?: string;
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
  const { orgId, user, userData } = useAuth();
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
        // Load clients from orgMembers + users
        const membersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId),
          where('role', '==', 'client')
        );
        const membersSnapshot = await getDocs(membersQuery);
        const clientPromises = membersSnapshot.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data();
          const userDoc = await getDoc(doc(db, 'users', memberData.userId));
          if (!userDoc.exists()) return null;
          const userData = userDoc.data();
          return {
            id: memberData.userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.emailAddress || userData.email || '',
          } as Client;
        });
        const clientsData = (await Promise.all(clientPromises)).filter((c): c is Client => c !== null);
        setClients(clientsData);

        // Load trainers from trainers collection
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('orgId', '==', orgId)
        );
        const trainersSnapshot = await getDocs(trainersQuery);
        const trainersData = trainersSnapshot.docs.map(trainerDoc => {
          const data = trainerDoc.data();
          return {
            id: trainerDoc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            pricingTierId: data.pricingTierId || '',
            pricingTierName: data.pricingTierName || '',
          };
        }) as Trainer[];
        setTrainers(trainersData);

        if (clientsData.length > 0) {
          const firstClientId = clientsData[0].id;
          setSelectedClient(firstClientId);
        }
        if (trainersData.length > 0) {
          setSelectedTrainer(trainersData[0].id);
        }
      } catch (error) {
        // Error loading data
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  // Load packages when client changes
  useEffect(() => {
    if (!selectedClient) {
      setPackages([]);
      return;
    }
    if (!orgId) {
      setPackages([]);
      return;
    }

    async function loadPackages() {
      if (!orgId || !selectedClient) {
        setPackages([]);
        return;
      }
      
      // Type narrowing: TypeScript needs explicit assertion that orgId is string
      const validOrgId: string = orgId;
      const validClientId: string = selectedClient;
      
      try {
        // Query STANDARD path: organizations/{orgId}/users/{userId}/packages
        // This matches the iOS client app implementation
        const packagesQuery = query(
          collection(db, 'organizations', validOrgId, 'users', validClientId, 'packages'),
          orderBy('purchaseDate', 'desc')
        );
        
        const packagesSnapshot = await getDocs(packagesQuery);
        
        const packagesData = packagesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const totalLessons = data.totalLessons || 0;
            const lessonsUsed = data.lessonsUsed || 0;
            const remaining = totalLessons - lessonsUsed;
            
            return {
              id: doc.id,
              userId: validClientId,
              packageName: data.packageName || data.packageType || 'Unknown Package',
              packageType: data.packageType || 'unknown',
              remainingLessons: remaining,
              totalLessons: totalLessons,
              lessonsUsed: lessonsUsed,
              purchaseDate: data.purchaseDate,
              expirationDate: data.expirationDate,
            };
          })
          .filter(pkg => pkg.remainingLessons > 0); // Only show packages with lessons remaining
        
        setPackages(packagesData);
        if (packagesData.length > 0) {
          setSelectedPackage(packagesData[0].id);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
        setPackages([]);
      }
    }

    loadPackages();
  }, [selectedClient, orgId]);

  // Load slots when trainer or date changes
  useEffect(() => {
    if (!orgId || !selectedTrainer || !selectedDate) return;

    async function loadSlots() {
      try {
        const startOfDay = new Date(`${selectedDate}T00:00:00`);
        const endOfDay = new Date(`${selectedDate}T23:59:59`);

        // Query trainer schedules subcollection (matches iOS pattern)
        const slotsQuery = query(
          collection(db, 'trainers', selectedTrainer, 'schedules'),
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
        // Error loading slots
      }
    }

    loadSlots();
  }, [orgId, selectedTrainer, selectedDate]);

  const handleCreateBooking = async () => {
    if (!selectedClient || !selectedTrainer || !selectedSlot || !selectedPackage) {
      toast.error('Missing information', 'Please fill in all fields');
      return;
    }

    setCreating(true);
    setSuccess(false);

    try {
      const bookLesson = httpsCallable(functions, 'bookLesson');
      
      // Get admin info for activity logging
      const fullName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : '';
      const adminName = fullName || user?.email?.split('@')[0] || 'Admin';
      
      await bookLesson({
        trainerId: selectedTrainer,
        slotId: selectedSlot,
        lessonPackageId: selectedPackage,
        clientId: selectedClient, // ✅ Pass client document ID (firstName_lastName format)
        createdByAdminId: user?.uid, // Admin who created the booking
        createdByAdminName: adminName, // Admin name for activity feed
      });

      setSuccess(true);
      toast.success('Booking created successfully!');
      
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
      toast.error('Failed to create booking', error.message || 'Please try again');
    } finally {
      setCreating(false);
    }
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedTrainerData = trainers.find(t => t.id === selectedTrainer);
  const selectedPackageData = packages.find(p => p.id === selectedPackage);
  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  return (
    <SchedulingSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create Booking</h1>
            <p className="text-sm sm:text-base text-foreground/80 mt-1 sm:mt-2">Book sessions for clients</p>
          </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Booking Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Plus className="h-5 w-5 text-primary" />
                  New Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Client
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation text-base"
                  >
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pass Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Lesson Pass
                  </label>
                  {packages.length === 0 ? (
                    <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      No active passes available for this client
                    </div>
                  ) : (
                    <select
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation text-base"
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Trainer
                  </label>
                  <select
                    value={selectedTrainer}
                    onChange={(e) => setSelectedTrainer(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation text-base"
                  >
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}{trainer.pricingTierName ? ` — ${trainer.pricingTierName}` : ''}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const trainer = trainers.find(t => t.id === selectedTrainer);
                    return trainer?.pricingTierName ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          🏅 {trainer.pricingTierName}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation text-base"
                  />
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Available Time Slots
                  </label>
                  {slots.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      No available slots for this trainer on this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            selectedSlot === slot.id
                              ? 'border-primary bg-blue-50'
                              : 'border-gray-200 hover:border-input'
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {format(slot.startTime.toDate(), 'h:mm a')} - {format(slot.endTime.toDate(), 'h:mm a')}
                          </div>
                          {slot.location && (
                            <div className="text-xs text-foreground/80 mt-1">
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
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    <p className="text-sm font-medium text-muted-foreground">Client</p>
                    <p className="text-base font-semibold text-foreground">
                      {selectedClientData.firstName} {selectedClientData.lastName}
                    </p>
                    {selectedClientData.email && (
                      <p className="text-sm text-foreground/80">{selectedClientData.email}</p>
                    )}
                  </div>
                )}

                {selectedPackageData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pass</p>
                    <p className="text-base font-semibold text-foreground">
                      {selectedPackageData.packageName}
                    </p>
                    <p className="text-sm text-foreground/80">
                      {selectedPackageData.remainingLessons} of {selectedPackageData.totalLessons} lessons remaining
                    </p>
                  </div>
                )}

                {selectedTrainerData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Trainer</p>
                    <p className="text-base font-semibold text-foreground">
                      {selectedTrainerData.firstName} {selectedTrainerData.lastName}
                    </p>
                  </div>
                )}

                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-base font-semibold text-foreground">
                      {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {selectedSlotData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p className="text-base font-semibold text-foreground">
                      {format(selectedSlotData.startTime.toDate(), 'h:mm a')} - {format(selectedSlotData.endTime.toDate(), 'h:mm a')}
                    </p>
                    {selectedSlotData.location && (
                      <p className="text-sm text-foreground/80 flex items-center gap-1 mt-1">
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
      </div>
    </SchedulingSubmenu>
  );
}
