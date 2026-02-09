'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Clock, User, MapPin, Users, Plus, Edit2, Trash2, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Location } from '@/types/location';
import { logClassCreated, logClassUpdated, logClassDeleted } from '@/lib/activity-logger';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface GroupClass {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  trainerId: string;
  trainerName: string; // Added to match iOS schema
  startTime: Timestamp;
  endTime: Timestamp;
  location: string; // Location name string, not locationId
  maxParticipants: number; // Changed from maxCapacity to match iOS
  currentParticipants: number;
  isOpenForRegistration: boolean; // Added to match iOS schema
  createdBy: string; // Admin user ID
  createdAt: Timestamp; // Added to match iOS schema
  priceInCents: number; // Added to match iOS schema
  isRecurring: boolean;
  recurringPattern?: string;
  eligiblePackageIds?: string[]; // Package IDs that can be used to register for this class
}

interface Participant {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  registeredAt: Timestamp;
  classPassPackageId?: string;
}

interface PackageOption {
  id: string;
  title: string;
  packageCategory: string;
  active: boolean;
}

export default function ClassesPage() {
  const { orgId, user, userData } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<GroupClass[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<GroupClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingParticipants, setViewingParticipants] = useState<GroupClass | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    trainerId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    locationId: '',
    maxCapacity: 10,
    isRecurring: false,
    recurringPattern: 'weekly',
  });

  // Load active class pass packages
  useEffect(() => {
    if (!orgId) return;

    async function loadPackages() {
      try {
        const orgDoc = await getDocs(query(collection(db, 'organizations'), where('__name__', '==', orgId)));
        if (!orgDoc.empty) {
          const pricingStructure = orgDoc.docs[0].data().pricingStructure;
          if (pricingStructure && pricingStructure.tiers) {
            const allPackages: PackageOption[] = [];
            pricingStructure.tiers.forEach((tier: any) => {
              tier.packages.forEach((pkg: any) => {
                if (pkg.packageCategory === 'classPass' && pkg.active !== false) {
                  allPackages.push({
                    id: pkg.id,
                    title: pkg.title,
                    packageCategory: pkg.packageCategory,
                    active: pkg.active !== false,
                  });
                }
              });
            });
            setPackages(allPackages);
          }
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      }
    }

    loadPackages();
  }, [orgId, showForm]); // Reload when form opens to get latest packages

  useEffect(() => {
    if (!orgId) return;

    async function loadData() {
      try {
        // Load trainers from trainers collection
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('orgId', '==', orgId!),
          where('active', '==', true) // Only load active trainers
        );
        const trainersSnapshot = await getDocs(trainersQuery);
        const trainersData = trainersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainer[];
        setTrainers(trainersData);
        if (trainersData.length > 0 && !form.trainerId) {
          setForm(prev => ({ ...prev, trainerId: trainersData[0].id }));
        }

        const locationsQuery = query(
          collection(db, 'locations'),
          where('orgId', '==', orgId!),
          where('isActive', '==', true)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Location[];
        setLocations(locationsData);

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('orgId', '==', orgId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupClass[];
        // Sort chronologically - earliest (next upcoming) first
        setClasses(classesData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  const handleSubmit = async () => {
    if (!orgId || !form.title || !form.trainerId || !form.locationId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const startDateTime = new Date(`${form.date}T${form.startTime}`);
      const endDateTime = new Date(`${form.date}T${form.endTime}`);
      
      // Get trainer name and location name
      const trainer = trainers.find(t => t.id === form.trainerId);
      const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
      const location = locations.find(l => l.id === form.locationId);
      const locationName = location ? location.name : '';

      // Match iOS AdminService.createClass schema exactly
      const classData = {
        orgId,
        title: form.title,
        description: form.description || '',
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        maxParticipants: form.maxCapacity,
        currentParticipants: 0,
        location: locationName, // Location name string, not ID
        isOpenForRegistration: true,
        trainerId: form.trainerId,
        trainerName: trainerName,
        createdBy: orgId, // Using orgId as placeholder for current user
        createdAt: Timestamp.fromDate(new Date()),
        priceInCents: 0, // Default to free
        isRecurring: form.isRecurring || false,
        recurringPattern: form.isRecurring ? form.recurringPattern : null,
        eligiblePackageIds: selectedPackageIds, // Add eligible package IDs
      };

      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), classData);
        
        // Log activity
        if (orgId && user && userData) {
          const trainer = trainers.find(t => t.id === form.trainerId);
          const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown Trainer';
          await logClassUpdated({
            orgId: orgId,
            actorId: user.uid,
            actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
            actorRole: 'admin',
            classId: editingClass.id,
            className: form.title,
            trainerId: form.trainerId,
            trainerName: trainerName,
            startTime: startDateTime,
            fields: ['time', 'details'], // Could be more specific
          });
        }
        
        // Reload classes
        const classesQuery = query(collection(db, 'classes'), where('orgId', '==', orgId));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupClass[];
        // Sort chronologically - earliest (next upcoming) first
        setClasses(classesData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      } else {
        // Create class document(s)
        if (form.isRecurring && form.recurringPattern === 'weekly') {
          // Generate 12 weeks of recurring classes
          const classesToCreate = [];
          const scheduleSlots = [];
          
          for (let week = 0; week < 12; week++) {
            const weekStartDateTime = new Date(startDateTime);
            weekStartDateTime.setDate(weekStartDateTime.getDate() + (week * 7));
            const weekEndDateTime = new Date(endDateTime);
            weekEndDateTime.setDate(weekEndDateTime.getDate() + (week * 7));
            
            classesToCreate.push({
              ...classData,
              startTime: Timestamp.fromDate(weekStartDateTime),
              endTime: Timestamp.fromDate(weekEndDateTime),
            });
            
            scheduleSlots.push({
              startTime: Timestamp.fromDate(weekStartDateTime),
              endTime: Timestamp.fromDate(weekEndDateTime),
              status: 'booked',
              clientId: 'CLASS',
              clientName: form.title,
              isClassBooking: true,
              bookedAt: Timestamp.fromDate(new Date()),
              orgId: orgId
            });
          }
          
          // Create all class instances
          for (let i = 0; i < classesToCreate.length; i++) {
            const docRef = await addDoc(collection(db, 'classes'), classesToCreate[i]);
            // Link the schedule slot to the class
            await addDoc(
              collection(db, 'trainers', form.trainerId, 'schedules'),
              { ...scheduleSlots[i], classId: docRef.id }
            );
          }
          
          // Log activity for recurring class series
          if (orgId && user && userData) {
            const trainer = trainers.find(t => t.id === form.trainerId);
            const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown Trainer';
            await logClassCreated({
              orgId: orgId,
              actorId: user.uid,
              actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
              actorRole: 'admin',
              classId: 'recurring',
              className: `${form.title} (12-week series)`,
              trainerId: form.trainerId,
              trainerName: trainerName,
              startTime: startDateTime,
              maxParticipants: form.maxCapacity,
              location: locationName,
            });
          }
        } else {
          // Single class
          const docRef = await addDoc(collection(db, 'classes'), classData);
          
          // Log activity
          if (orgId && user && userData) {
            const trainer = trainers.find(t => t.id === form.trainerId);
            const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown Trainer';
            await logClassCreated({
              orgId: orgId,
              actorId: user.uid,
              actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
              actorRole: 'admin',
              classId: docRef.id,
              className: form.title,
              trainerId: form.trainerId,
              trainerName: trainerName,
              startTime: startDateTime,
              maxParticipants: form.maxCapacity,
              location: locationName,
            });
          }
          
          // Create trainer schedule slot to block off time (matching iOS)
          const bookingData = {
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            status: 'booked',
            clientId: 'CLASS',
            clientName: form.title,
            classId: docRef.id,
            isClassBooking: true,
            bookedAt: Timestamp.fromDate(new Date()),
            orgId: orgId
          };
          
          await addDoc(
            collection(db, 'trainers', form.trainerId, 'schedules'),
            bookingData
          );
        }
        
        // Reload classes
        const classesQuery = query(collection(db, 'classes'), where('orgId', '==', orgId));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupClass[];
        // Sort chronologically - earliest (next upcoming) first
        setClasses(classesData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
      }

      resetForm();
    } catch (error) {
      console.error('Error saving class:', error);
      alert(`Error saving class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cls: GroupClass) => {
    // Find location ID from location name
    const location = locations.find(l => l.name === cls.location);
    const locationId = location?.id || '';
    
    setEditingClass(cls);
    setForm({
      title: cls.title,
      description: cls.description || '',
      trainerId: cls.trainerId,
      date: format(cls.startTime.toDate(), 'yyyy-MM-dd'),
      startTime: format(cls.startTime.toDate(), 'HH:mm'),
      endTime: format(cls.endTime.toDate(), 'HH:mm'),
      locationId: locationId,
      maxCapacity: cls.maxParticipants, // Use maxParticipants, not maxCapacity
      isRecurring: cls.isRecurring,
      recurringPattern: cls.recurringPattern || 'weekly',
    });
    // Load eligible package IDs if they exist
    setSelectedPackageIds(cls.eligiblePackageIds || []);
    // DON'T set showForm(true) - edit inline instead
  };

  const handleDelete = async (classId: string) => {
    const classToDelete = classes.find(c => c.id === classId);
    if (!classToDelete) return;
    
    const trainer = trainers.find(t => t.id === classToDelete.trainerId);
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown Trainer';
    
    if (!confirm('Are you sure you want to delete this class? This will cancel the class for all registered participants.')) return;

    try {
      // Get all participants first
      const participantsQuery = query(collection(db, 'classes', classId, 'participants'));
      const participantsSnapshot = await getDocs(participantsQuery);
      const participantCount = participantsSnapshot.size;
      
      // Delete participant registrations and update user bookings
      for (const participantDoc of participantsSnapshot.docs) {
        const participantData = participantDoc.data();
        
        // Remove from user's bookings if they have any related booking
        if (participantData.userId) {
          // Query bookings that reference this class
          const userBookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', participantData.userId),
            where('classId', '==', classId)
          );
          const userBookingsSnapshot = await getDocs(userBookingsQuery);
          
          // Delete or cancel related bookings
          for (const bookingDoc of userBookingsSnapshot.docs) {
            await updateDoc(doc(db, 'bookings', bookingDoc.id), {
              status: 'cancelled',
              cancelledAt: Timestamp.now(),
              cancelReason: 'Class was deleted by administrator'
            });
          }
        }
        
        // Delete participant document
        await deleteDoc(participantDoc.ref);
      }
      
      // Log activity
      if (orgId && user && userData) {
        await logClassDeleted({
          orgId: orgId,
          actorId: user.uid,
          actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
          actorRole: 'admin',
          classId: classId,
          className: classToDelete.title,
          trainerId: classToDelete.trainerId,
          trainerName: trainerName,
          startTime: classToDelete.startTime.toDate(),
          participantCount: participantCount,
        });
      }
      
      // Finally, delete the class itself
      await deleteDoc(doc(db, 'classes', classId));
      setClasses(classes.filter(c => c.id !== classId));
      alert('Class deleted and all participants have been notified of the cancellation.');
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Error deleting class. Please try again.');
    }
  };

  const handleViewParticipants = async (cls: GroupClass) => {
    setViewingParticipants(cls);
    setLoadingParticipants(true);
    
    try {
      // Query participants subcollection (schema uses auto-generated IDs with userId field)
      const participantsQuery = query(collection(db, 'classes', cls.id, 'participants'));
      const participantsSnapshot = await getDocs(participantsQuery);
      const participantsData = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];
      
      setParticipants(participantsData.sort((a, b) => 
        b.registeredAt.seconds - a.registeredAt.seconds
      ));
    } catch (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      trainerId: trainers.length > 0 ? trainers[0].id : '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      locationId: '',
      maxCapacity: 10,
      isRecurring: false,
      recurringPattern: 'weekly',
    });
    setEditingClass(null);
    setShowForm(false);
    setSelectedPackageIds([]); // Reset selected packages
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown';
  };

  // Location is now stored as name string directly in class document
  const getLocationName = (locationName?: string) => {
    return locationName || 'No location';
  };

  // Filter classes by upcoming/completed
  const now = new Date();
  const upcomingClasses = classes.filter(cls => cls.endTime.toDate() > now);
  const completedClasses = classes.filter(cls => cls.endTime.toDate() <= now);
  const displayedClasses = activeTab === 'upcoming' ? upcomingClasses : completedClasses;

  return (
    <SchedulingSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
            <p className="text-gray-600 mt-2">Create and manage group classes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] transition-colors"
          >
            {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showForm ? 'Cancel' : 'New Class'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Class Form */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Class Title *
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., Morning Yoga"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Optional class description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trainer *
                      </label>
                      <select
                        value={form.trainerId}
                        onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      >
                        {trainers.map(trainer => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.firstName} {trainer.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Capacity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.maxCapacity}
                        onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location *
                      </label>
                      {locations.length === 0 ? (
                        <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          No locations found. Please add a location in Settings first.
                        </div>
                      ) : (
                        <select
                          value={form.locationId}
                          onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          required
                        >
                          <option value="">Select a location</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Eligible Class Passes *
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Select which class pass types can be used to register for this class
                      </p>
                      {packages.length === 0 ? (
                        <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          No active class pass packages found. Please create class passes in Pricing first.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {packages.map(pkg => (
                            <label key={pkg.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPackageIds.includes(pkg.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPackageIds([...selectedPackageIds, pkg.id]);
                                  } else {
                                    setSelectedPackageIds(selectedPackageIds.filter(id => id !== pkg.id));
                                  }
                                }}
                                className="w-4 h-4 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                              />
                              <span className="text-sm font-medium text-gray-700">{pkg.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {selectedPackageIds.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-medium text-blue-800 mb-2">Selected Class Passes ({selectedPackageIds.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPackageIds.map(id => {
                              const pkg = packages.find(p => p.id === id);
                              return pkg ? (
                                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {pkg.title}
                                  <button
                                    onClick={() => setSelectedPackageIds(selectedPackageIds.filter(pid => pid !== id))}
                                    className="hover:text-blue-600"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isRecurring}
                          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                          className="w-4 h-4 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                        />
                        <span className="text-sm font-medium text-gray-700">Recurring</span>
                      </label>
                      {form.isRecurring && (
                        <select
                          value={form.recurringPattern}
                          onChange={(e) => setForm({ ...form, recurringPattern: e.target.value })}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] disabled:opacity-50 transition-colors"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          {editingClass ? 'Update Class' : 'Create Class'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Upcoming/Completed */}
            <div className="border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'upcoming'
                      ? 'border-[#3258A3] text-[#3258A3]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upcoming Classes ({upcomingClasses.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'completed'
                      ? 'border-[#3258A3] text-[#3258A3]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Completed Classes ({completedClasses.length})
                </button>
              </div>
            </div>

            {/* Classes List */}
            <div className="grid grid-cols-1 gap-4">
              {displayedClasses.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {activeTab === 'upcoming' ? 'No upcoming classes scheduled' : 'No completed classes'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {activeTab === 'upcoming' && 'Click "New Class" to create one'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                displayedClasses.map((cls) => (
                  <Card key={cls.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      {editingClass?.id === cls.id ? (
                        /* Inline Edit Form */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Edit Class</h3>
                            <button
                              onClick={resetForm}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Class Title *</label>
                              <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Trainer *</label>
                              <select
                                value={form.trainerId}
                                onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                              >
                                <option value="">Select trainer</option>
                                {trainers.map(trainer => (
                                  <option key={trainer.id} value={trainer.id}>
                                    {trainer.firstName} {trainer.lastName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                              <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                <input
                                  type="time"
                                  value={form.startTime}
                                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                <input
                                  type="time"
                                  value={form.endTime}
                                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                              <select
                                value={form.locationId}
                                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                              >
                                <option value="">Select a location</option>
                                {locations.map(location => (
                                  <option key={location.id} value={location.id}>{location.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity *</label>
                              <input
                                type="number"
                                min="1"
                                value={form.maxCapacity}
                                onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                              <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Eligible Class Passes *
                              </label>
                              <p className="text-xs text-gray-500 mb-2">
                                Select which class pass types can be used to register for this class
                              </p>
                              {packages.length === 0 ? (
                                <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                                  No active class pass packages found. Please create class passes in Pricing first.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {packages.map(pkg => (
                                    <label key={pkg.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedPackageIds.includes(pkg.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedPackageIds([...selectedPackageIds, pkg.id]);
                                          } else {
                                            setSelectedPackageIds(selectedPackageIds.filter(id => id !== pkg.id));
                                          }
                                        }}
                                        className="w-4 h-4 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                                      />
                                      <span className="text-sm font-medium text-gray-700">{pkg.title}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {selectedPackageIds.length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-xs font-medium text-blue-800 mb-2">Selected Class Passes ({selectedPackageIds.length}):</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedPackageIds.map(id => {
                                      const pkg = packages.find(p => p.id === id);
                                      return pkg ? (
                                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                          {pkg.title}
                                          <button
                                            onClick={() => setSelectedPackageIds(selectedPackageIds.filter(pid => pid !== id))}
                                            className="hover:text-blue-600"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                              onClick={resetForm}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmit}
                              disabled={saving}
                              className="px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] transition-colors disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{cls.title}</h3>
                              {cls.description && (
                                <p className="text-sm text-gray-600 mt-1">{cls.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-4 mt-3">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <User className="h-4 w-4" />
                                  {cls.trainerName || getTrainerName(cls.trainerId)}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  {format(cls.startTime.toDate(), 'EEE, MMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  {format(cls.startTime.toDate(), 'h:mm a')} - {format(cls.endTime.toDate(), 'h:mm a')}
                                </div>
                                {cls.location && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    {cls.location}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Users className="h-4 w-4" />
                                  {cls.currentParticipants} / {cls.maxParticipants}
                                </div>
                              </div>

                              {cls.isRecurring && (
                                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  Recurring ({cls.recurringPattern})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewParticipants(cls)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View Participants"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(cls)}
                            className="p-2 text-gray-400 hover:text-[#3258A3] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Participants Dialog */}
      {viewingParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Class Participants</h2>
                <p className="text-sm text-gray-600 mt-1">{viewingParticipants.title}</p>
                <p className="text-sm text-gray-500">
                  {format(viewingParticipants.startTime.toDate(), 'EEE, MMM d, yyyy • h:mm a')}
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

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {loadingParticipants ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3258A3] mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading participants...</p>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No participants registered yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#3258A3] text-white flex items-center justify-center font-semibold">
                          {participant.firstName?.charAt(0)}{participant.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {participant.firstName} {participant.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Registered {format(participant.registeredAt.toDate(), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Participants:</span>
                  <span className="text-lg font-bold text-[#3258A3]">
                    {participants.length} / {viewingParticipants.maxParticipants}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </SchedulingSubmenu>
  );
}
