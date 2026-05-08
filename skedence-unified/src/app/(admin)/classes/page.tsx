'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Clock, User, MapPin, Users, Plus, Edit2, Trash2, X, Eye, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Location } from '@/types/location';
import { logClassCreated, logClassUpdated, logClassDeleted } from '@/lib/activity-logger';
import { toast } from '@/lib/toast';

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
  seriesId?: string; // Links classes in a multi-day series
  isPartOfSeries?: boolean; // Indicates if part of a multi-day series
  totalSeriesClasses?: number; // Total number of classes in the series
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
}

interface PackageOption {
  id: string;
  title: string;
  packageType: string; // The type identifier used in user packages
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [overlapConflicts, setOverlapConflicts] = useState<Array<{ name: string; type: string; time: string }>>([]);
  const [pendingClassData, setPendingClassData] = useState<any>(null);

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

  // Multi-day selection state
  const [additionalDates, setAdditionalDates] = useState<string[]>([]);

  // Load active class pass packages
  useEffect(() => {
    if (!orgId) return;

    async function loadPackages() {
      try {
        const orgDoc = await getDocs(query(collection(db, 'organizations'), where('__name__', '==', orgId)));
        if (!orgDoc.empty) {
          const orgData = orgDoc.docs[0].data();
          const pricingStructure = orgData.pricingStructure;
          if (pricingStructure && pricingStructure.tiers) {
            const allPackages: PackageOption[] = [];
            pricingStructure.tiers.forEach((tier: any) => {
              tier.packages.forEach((pkg: any) => {
                if (pkg.packageCategory === 'class' && pkg.active !== false) {
                  allPackages.push({
                    id: pkg.id,
                    title: pkg.title,
                    packageType: pkg.packageType, // Add packageType
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

  // Check for overlapping sessions
  const checkForOverlaps = async (trainerId: string, dates: string[], startTime: string, endTime: string, locationName: string): Promise<Array<{ name: string; type: string; time: string }>> => {
    const conflicts: Array<{ name: string; type: string; time: string }> = [];
    
    for (const dateStr of dates) {
      const checkStart = new Date(`${dateStr}T${startTime}`);
      const checkEnd = new Date(`${dateStr}T${endTime}`);
      
      // Check for overlapping classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('trainerId', '==', trainerId),
        where('orgId', '==', orgId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        // Skip if different location
        if (locationName && classData.location && classData.location !== locationName) continue;
        const classStart = classData.startTime.toDate();
        const classEnd = classData.endTime.toDate();
        
        // Check if times overlap on the same day
        if (format(classStart, 'yyyy-MM-dd') === dateStr) {
          if (
            (checkStart >= classStart && checkStart < classEnd) ||
            (checkEnd > classStart && checkEnd <= classEnd) ||
            (checkStart <= classStart && checkEnd >= classEnd)
          ) {
            conflicts.push({
              name: classData.title,
              type: 'Class',
              time: `${format(classStart, 'h:mm a')} - ${format(classEnd, 'h:mm a')}`
            });
          }
        }
      }
      
      // Check for overlapping schedule slots (lessons/availability)
      const schedulesRef = collection(db, 'trainers', trainerId, 'schedules');
      const schedulesSnapshot = await getDocs(schedulesRef);
      
      for (const scheduleDoc of schedulesSnapshot.docs) {
        const scheduleData = scheduleDoc.data();
        // Skip if different location
        if (locationName && scheduleData.location && scheduleData.location !== locationName) continue;
        const scheduleStart = scheduleData.startTime.toDate();
        const scheduleEnd = scheduleData.endTime.toDate();
        
        // Check if times overlap on the same day
        if (format(scheduleStart, 'yyyy-MM-dd') === dateStr) {
          if (
            (checkStart >= scheduleStart && checkStart < scheduleEnd) ||
            (checkEnd > scheduleStart && checkEnd <= scheduleEnd) ||
            (checkStart <= scheduleStart && checkEnd >= scheduleEnd)
          ) {
            const conflictName = scheduleData.isClassBooking 
              ? scheduleData.clientName || 'Class'
              : scheduleData.status === 'booked'
                ? scheduleData.clientName || 'Lesson'
                : 'Available Time Slot';
            
            conflicts.push({
              name: conflictName,
              type: scheduleData.isClassBooking ? 'Class' : (scheduleData.status === 'booked' ? 'Lesson' : 'Availability'),
              time: `${format(scheduleStart, 'h:mm a')} - ${format(scheduleEnd, 'h:mm a')}`
            });
          }
        }
      }
    }
    
    return conflicts;
  };

  const handleSubmit = async () => {
    if (!orgId || !form.title || !form.trainerId || !form.locationId) {
      setNotification({ type: 'error', message: 'Please fill in all required fields' });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    // Check for overlaps before creating
    const allDates = [form.date, ...additionalDates].filter(Boolean);
    const selectedLocation = locations.find(l => l.id === form.locationId);
    const conflicts = await checkForOverlaps(form.trainerId, allDates, form.startTime, form.endTime, selectedLocation?.name ?? '');
    
    if (conflicts.length > 0 && !pendingClassData) {
      // Show confirmation dialog
      setOverlapConflicts(conflicts);
      setShowOverlapDialog(true);
      return;
    }

    setSaving(true);
    try {
      // Collect all dates (primary date + additional dates)
      const allDates = [form.date, ...additionalDates].filter(Boolean);
      
      // Get trainer name and location name
      const trainer = trainers.find(t => t.id === form.trainerId);
      const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
      const location = locations.find(l => l.id === form.locationId);
      const locationName = location ? location.name : '';

      if (editingClass) {
        // Collect all dates (primary date + additional dates)
        const allDates = [form.date, ...additionalDates].filter(Boolean);
        
        // Get existing series classes if part of a series
        let existingSeriesClassIds: string[] = [];
        let seriesId: string | null | undefined = editingClass.seriesId;
        
        if (seriesId && editingClass.isPartOfSeries) {
          const seriesQuery = query(
            collection(db, 'classes'),
            where('seriesId', '==', seriesId),
            where('orgId', '==', orgId)
          );
          const seriesSnapshot = await getDocs(seriesQuery);
          existingSeriesClassIds = seriesSnapshot.docs.map(doc => doc.id);
        }
        
        // If multiple dates now, ensure we have a seriesId
        if (allDates.length > 1 && !seriesId) {
          seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // If single date now, clear seriesId
        if (allDates.length === 1) {
          seriesId = null;
        }
        
        const updatedClassIds: string[] = [];
        
        // Update or create classes for each date
        for (let i = 0; i < allDates.length; i++) {
          const dateStr = allDates[i];
          const startDateTime = new Date(`${dateStr}T${form.startTime}`);
          const endDateTime = new Date(`${dateStr}T${form.endTime}`);
          
          const classData = {
            orgId,
            title: form.title,
            description: form.description || '',
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            maxParticipants: form.maxCapacity,
            location: locationName,
            isOpenForRegistration: true,
            trainerId: form.trainerId,
            trainerName: trainerName,
            createdBy: orgId,
            priceInCents: 0,
            isRecurring: form.isRecurring || false,
            recurringPattern: form.isRecurring ? form.recurringPattern : null,
            eligiblePackageIds: selectedPackageIds,
            seriesId: allDates.length > 1 ? seriesId : null,
            isPartOfSeries: allDates.length > 1,
            totalSeriesClasses: allDates.length,
          };
          
          // The first date always updates the existing class (even if the date changed)
          if (i === 0) {
            await updateDoc(doc(db, 'classes', editingClass.id), {
              ...classData,
              currentParticipants: editingClass.currentParticipants, // Preserve current count
              createdAt: editingClass.createdAt, // Preserve original creation time
            });
            updatedClassIds.push(editingClass.id);
          } else {
            // Check if this date already exists in the series
            const existingClass = existingSeriesClassIds.length > 0 ? 
              (await getDocs(query(
                collection(db, 'classes'),
                where('seriesId', '==', seriesId),
                where('orgId', '==', orgId)
              ))).docs.find(doc => 
                format(doc.data().startTime.toDate(), 'yyyy-MM-dd') === dateStr
              ) : null;
            
            if (existingClass) {
              // Update existing class in series
              await updateDoc(doc(db, 'classes', existingClass.id), classData);
              updatedClassIds.push(existingClass.id);
            } else {
              // Create new class for this date
              const docRef = await addDoc(collection(db, 'classes'), {
                ...classData,
                currentParticipants: 0,
                createdAt: Timestamp.fromDate(new Date()),
              });
              updatedClassIds.push(docRef.id);
              
              // Create trainer schedule slot
              const bookingData = {
                startTime: Timestamp.fromDate(startDateTime),
                endTime: Timestamp.fromDate(endDateTime),
                status: 'booked',
                clientId: 'CLASS',
                clientName: form.title,
                classId: docRef.id,
                isClassBooking: true,
                bookedAt: Timestamp.fromDate(new Date()),
                orgId: orgId,
                seriesId: allDates.length > 1 ? seriesId : null,
              };
              
              await addDoc(
                collection(db, 'trainers', form.trainerId, 'schedules'),
                bookingData
              );
            }
          }
        }
        
        // Delete classes that were removed from the series
        const classesToDelete = existingSeriesClassIds.filter(
          id => !updatedClassIds.includes(id)
        );
        
        for (const classId of classesToDelete) {
          const classDoc = await getDocs(query(
            collection(db, 'classes'),
            where('__name__', '==', classId)
          ));
          
          if (!classDoc.empty) {
            // Check if has participants - warn if so
            const participantsQuery = query(collection(db, 'classes', classId, 'participants'));
            const participantsSnapshot = await getDocs(participantsQuery);
            
            if (participantsSnapshot.size > 0) {
              console.warn(`Deleting class ${classId} with ${participantsSnapshot.size} participants`);
              // Cancel participant bookings
              for (const participantDoc of participantsSnapshot.docs) {
                const participantData = participantDoc.data();
                if (participantData.userId) {
                  const userBookingsQuery = query(
                    collection(db, 'bookings'),
                    where('userId', '==', participantData.userId),
                    where('classId', '==', classId)
                  );
                  const userBookingsSnapshot = await getDocs(userBookingsQuery);
                  for (const bookingDoc of userBookingsSnapshot.docs) {
                    await updateDoc(doc(db, 'bookings', bookingDoc.id), {
                      status: 'cancelled',
                      cancelledAt: Timestamp.now(),
                      cancelReason: 'Class date was removed by administrator'
                    });
                  }
                }
                await deleteDoc(participantDoc.ref);
              }
            }
            
            // Delete class document
            await deleteDoc(doc(db, 'classes', classId));
            
            // Delete trainer schedule slots
            const schedulesQuery = query(
              collection(db, 'trainers', form.trainerId, 'schedules'),
              where('classId', '==', classId)
            );
            const schedulesSnapshot = await getDocs(schedulesQuery);
            for (const scheduleDoc of schedulesSnapshot.docs) {
              await deleteDoc(scheduleDoc.ref);
            }
          }
        }
        
        // Log activity (non-blocking)
        if (orgId && user && userData) {
          try {
            const firstDateTime = new Date(`${form.date}T${form.startTime}`);
            const updateMessage = allDates.length > 1 
              ? `${form.title} (${allDates.length}-day series)` 
              : form.title;
            
            await logClassUpdated({
              orgId: orgId,
              actorId: user.uid,
              actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
              actorRole: 'admin',
              classId: editingClass.id,
              className: updateMessage,
              trainerId: form.trainerId,
              trainerName: trainerName,
              startTime: firstDateTime,
              fields: ['time', 'details'],
            });
          } catch (logError) {
            console.error('❌ Failed to log activity:', logError);
          }
        }
        
        // Reload classes
        const classesQuery = query(collection(db, 'classes'), where('orgId', '==', orgId));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupClass[];
        setClasses(classesData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
        
        const updateSuccessMessage = allDates.length > 1 
          ? `Successfully updated ${allDates.length} classes` 
          : 'Class successfully updated';
        
        setNotification({ type: 'success', message: updateSuccessMessage });
        setTimeout(() => setNotification(null), 5000);
      } else {
        // Creating new class(es)
        const createdClassIds: string[] = [];
        
        // Generate a unique series ID for linking all classes together
        const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create a class for each selected date
        for (const dateStr of allDates) {
          const startDateTime = new Date(`${dateStr}T${form.startTime}`);
          const endDateTime = new Date(`${dateStr}T${form.endTime}`);
          
          const classData = {
            orgId,
            title: form.title,
            description: form.description || '',
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            maxParticipants: form.maxCapacity,
            currentParticipants: 0,
            location: locationName,
            isOpenForRegistration: true,
            trainerId: form.trainerId,
            trainerName: trainerName,
            createdBy: orgId,
            createdAt: Timestamp.fromDate(new Date()),
            priceInCents: 0,
            isRecurring: false, // Multi-day is different from recurring
            recurringPattern: null,
            eligiblePackageIds: selectedPackageIds,
            seriesId: allDates.length > 1 ? seriesId : null, // Only add seriesId if multiple dates
            isPartOfSeries: allDates.length > 1,
            totalSeriesClasses: allDates.length,
          };

          // Create class document
          const docRef = await addDoc(collection(db, 'classes'), classData);
          createdClassIds.push(docRef.id);
          
          // Create trainer schedule slot
          const bookingData = {
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            status: 'booked',
            clientId: 'CLASS',
            clientName: form.title,
            classId: docRef.id,
            isClassBooking: true,
            bookedAt: Timestamp.fromDate(new Date()),
            orgId: orgId,
            seriesId: allDates.length > 1 ? seriesId : null, // Link schedule slots too
          };
          
          await addDoc(
            collection(db, 'trainers', form.trainerId, 'schedules'),
            bookingData
          );
        }
        
        // Log activity (non-blocking)
        if (orgId && user && userData) {
          try {
            const firstDate = new Date(`${allDates[0]}T${form.startTime}`);
            const className = allDates.length > 1 
              ? `${form.title} (${allDates.length}-day series)` 
              : form.title;
            
            await logClassCreated({
              orgId: orgId,
              actorId: user.uid,
              actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
              actorRole: 'admin',
              classId: createdClassIds[0],
              className: className,
              trainerId: form.trainerId,
              trainerName: trainerName,
              startTime: firstDate,
              maxParticipants: form.maxCapacity,
              location: locationName,
            });
          } catch (logError) {
            console.error('❌ Failed to log activity:', logError);
          }
        }
        
        // Reload classes
        const classesQuery = query(collection(db, 'classes'), where('orgId', '==', orgId));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupClass[];
        setClasses(classesData.sort((a, b) => a.startTime.seconds - b.startTime.seconds));
        
        const successMessage = allDates.length > 1 
          ? `Successfully created ${allDates.length} classes` 
          : 'Class successfully created';
        
        setNotification({ type: 'success', message: successMessage });
        setTimeout(() => setNotification(null), 5000);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving class:', error);
      setNotification({ 
        type: 'error', 
        message: `Error saving class: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOverlap = async () => {
    setShowOverlapDialog(false);
    setPendingClassData(true); // Flag to skip overlap check
    
    // Re-run handleSubmit which will now proceed with creation
    await handleSubmit();
    
    // Reset pending flag
    setPendingClassData(null);
    setOverlapConflicts([]);
  };

  const handleCancelOverlap = () => {
    setShowOverlapDialog(false);
    setOverlapConflicts([]);
    setPendingClassData(null);
  };

  const handleEdit = async (cls: GroupClass) => {
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
    
    // If editing a class that's part of a series, load the other dates
    if (cls.seriesId && cls.isPartOfSeries) {
      try {
        const seriesQuery = query(
          collection(db, 'classes'),
          where('seriesId', '==', cls.seriesId),
          where('orgId', '==', orgId)
        );
        const seriesSnapshot = await getDocs(seriesQuery);
        const seriesDates = seriesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              date: format(data.startTime.toDate(), 'yyyy-MM-dd')
            };
          })
          .filter(item => item.id !== cls.id) // Exclude current class
          .map(item => item.date);
        
        setAdditionalDates(seriesDates);
      } catch (error) {
        console.error('Error loading series dates:', error);
        setAdditionalDates([]);
      }
    } else {
      setAdditionalDates([]);
    }
    
    // Show the form for editing
    setShowForm(true);
  };

  const handleDelete = async (classId: string) => {
    const classToDelete = classes.find(c => c.id === classId);
    if (!classToDelete) return;
    
    const trainer = trainers.find(t => t.id === classToDelete.trainerId);
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown Trainer';
    
    // Check if this is a grouped/series class
    const isGroupedClass = classToDelete.seriesId && classToDelete.isPartOfSeries;
    const seriesClasses = isGroupedClass 
      ? classes.filter(c => c.seriesId === classToDelete.seriesId)
      : [classToDelete];
    
    const confirmMessage = isGroupedClass
      ? `Are you sure you want to delete this ENTIRE class series? This will delete ALL ${seriesClasses.length} classes in the series and cancel for all registered participants.`
      : 'Are you sure you want to delete this class? This will cancel the class for all registered participants.';
    
    if (!confirm(confirmMessage)) return;

    try {
      let totalParticipants = 0;
      
      // Delete all classes in the series (or just the single class)
      for (const classItem of seriesClasses) {
        // Get all participants first
        const participantsQuery = query(collection(db, 'classes', classItem.id, 'participants'));
        const participantsSnapshot = await getDocs(participantsQuery);
        totalParticipants += participantsSnapshot.size;

        // Cancel all bookings for this class (query by classId — correct field on booking docs)
        try {
          const classBookingsSnapshot = await getDocs(query(
            collection(db, 'bookings'),
            where('classId', '==', classItem.id)
          ));
          await Promise.all(classBookingsSnapshot.docs.map(bookingDoc =>
            updateDoc(doc(db, 'bookings', bookingDoc.id), {
              status: 'cancelled',
              cancelledAt: Timestamp.now(),
              cancelReason: isGroupedClass
                ? 'Class series was deleted by administrator'
                : 'Class was deleted by administrator',
            })
          ));
        } catch (err) {
          console.error('Error cancelling class bookings:', err);
        }

        // Delete all classRegistrations for this class
        try {
          const regsSnapshot = await getDocs(query(
            collection(db, 'classRegistrations'),
            where('classId', '==', classItem.id)
          ));
          await Promise.all(regsSnapshot.docs.map(r => deleteDoc(r.ref)));
        } catch (err) {
          console.error('Error deleting classRegistrations:', err);
        }

        // Delete the trainer schedule slot(s) for this class so the time opens up
        try {
          const slotSnapshot = await getDocs(query(
            collection(db, 'trainers', classItem.trainerId, 'schedules'),
            where('classId', '==', classItem.id)
          ));
          await Promise.all(slotSnapshot.docs.map(s => deleteDoc(s.ref)));
        } catch (err) {
          console.error('Error deleting class schedule slots:', err);
        }

        // Delete all participant subcollection docs
        await Promise.all(participantsSnapshot.docs.map(p => deleteDoc(p.ref)));
        
        // Log activity for each class deletion
        if (orgId && user && userData) {
          await logClassDeleted({
            orgId: orgId,
            actorId: user.uid,
            actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
            actorRole: 'admin',
            classId: classItem.id,
            className: classItem.title,
            trainerId: classItem.trainerId,
            trainerName: trainerName,
            startTime: classItem.startTime.toDate(),
            participantCount: participantsSnapshot.size,
          });
        }
        
        // Delete the class document
        await deleteDoc(doc(db, 'classes', classItem.id));
      }
      
      // Remove all deleted classes from state
      const deletedIds = seriesClasses.map(c => c.id);
      setClasses(classes.filter(c => !deletedIds.includes(c.id)));
      
      const successMessage = isGroupedClass
        ? `Class series deleted (${seriesClasses.length} classes). All participants have been notified.`
        : 'Class deleted. All participants have been notified of the cancellation.';
      
      toast.success(isGroupedClass ? 'Series deleted' : 'Class deleted', successMessage);
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class', 'Please try again');
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
      
      // Fetch full user details for each participant (phone and email)
      const enrichedParticipants = await Promise.all(
        participantsData.map(async (participant) => {
          try {
            // Fetch user details from users collection
            const userDocRef = doc(db, 'users', participant.userId);
            const userDoc = await getDocs(query(
              collection(db, 'users'),
              where('__name__', '==', participant.userId)
            ));
            
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              return {
                ...participant,
                email: userData.email || userData.emailAddress,
                phoneNumber: userData.phoneNumber || userData.phone,
              };
            }
            
            return participant;
          } catch (error) {
            console.error('Error fetching user details:', error);
            return participant;
          }
        })
      );
      
      setParticipants(enrichedParticipants.sort((a, b) => 
        b.registeredAt.seconds - a.registeredAt.seconds
      ));
    } catch (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleExportParticipants = () => {
    if (!viewingParticipants || participants.length === 0) return;

    // Prepare CSV content
    const headers = [
      'Class Name',
      'Date',
      'Time',
      'Trainer',
      'Location',
      'Participant Name',
      'Email',
      'Phone Number',
      'Athlete Name',
      'Registered Date',
      'Package Used'
    ];

    const rows = participants.map(participant => {
      const athleteName = participant.athleteName || `${participant.firstName} ${participant.lastName}`;
      const packageInfo = participant.classPassPackageId ? 'Class Pass' : 'Direct Registration';
      
      return [
        viewingParticipants.title,
        format(viewingParticipants.startTime.toDate(), 'MMM d, yyyy'),
        `${format(viewingParticipants.startTime.toDate(), 'h:mm a')} - ${format(viewingParticipants.endTime.toDate(), 'h:mm a')}`,
        viewingParticipants.trainerName || getTrainerName(viewingParticipants.trainerId),
        viewingParticipants.location || 'N/A',
        `${participant.firstName} ${participant.lastName}`,
        participant.email || 'N/A',
        participant.phoneNumber || 'N/A',
        athleteName,
        format(participant.registeredAt.toDate(), 'MMM d, yyyy h:mm a'),
        packageInfo
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell content
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = `${viewingParticipants.title.replace(/[^a-z0-9]/gi, '_')}_Participants_${format(viewingParticipants.startTime.toDate(), 'yyyy-MM-dd')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success notification
    setNotification({ type: 'success', message: `Exported ${participants.length} participants to CSV` });
    setTimeout(() => setNotification(null), 5000);
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
    setAdditionalDates([]); // Reset additional dates
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
  // Filter to only show first class of multi-day series (for display only, not admin calendar)
  const uniqueClasses = useMemo(() => {
    const seenSeries = new Set<string>();
    const filtered: GroupClass[] = [];
    
    for (const cls of displayedClasses) {
      if (cls.seriesId && cls.isPartOfSeries) {
        // This is part of a multi-day series
        if (!seenSeries.has(cls.seriesId)) {
          // First occurrence of this series - include it
          seenSeries.add(cls.seriesId);
          filtered.push(cls);
        }
        // Skip subsequent classes in the same series
      } else {
        // Single-day class or no series - always include
        filtered.push(cls);
      }
    }
    
    return filtered;
  }, [displayedClasses]);

  // Helper function to get all classes in a series
  const getSeriesClasses = (seriesId: string): GroupClass[] => {
    return classes
      .filter(cls => cls.seriesId === seriesId)
      .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
  };

  // Helper function to format series dates
  const formatSeriesDates = (seriesClasses: GroupClass[]): string => {
    if (seriesClasses.length <= 1) return '';
    
    const dates = seriesClasses.map(cls => 
      format(cls.startTime.toDate(), 'EEE, MMM d')
    );
    
    return dates.join(' • ');
  };
  
  // Filter by search term
  const filteredClasses = searchTerm.trim() === '' 
    ? uniqueClasses 
    : uniqueClasses.filter(cls => 
        cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.location && cls.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  return (
    <SchedulingSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Class Management</h1>
            <p className="text-foreground/80 mt-2">Create and manage group classes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showForm ? 'Cancel' : 'New Class'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Success/Error Notification */}
            {notification && (
              <div className={`fixed top-4 right-4 z-50 max-w-md rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-5 ${
                notification.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`flex-shrink-0 ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {notification.type === 'success' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className={`flex-shrink-0 ${notification.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Overlap Confirmation Dialog */}
            {showOverlapDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">Schedule Conflict Detected</h3>
                      <p className="text-sm text-foreground/80 mt-1">
                        This class overlaps with existing session(s):
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {overlapConflicts.map((conflict, index) => (
                      <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{conflict.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">
                                {conflict.type}
                              </span>
                              <span className="text-xs text-foreground/60">{conflict.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-foreground/70 mb-6">
                    Do you want to create this class anyway? Both sessions will appear side-by-side on the schedule.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelOverlap}
                      className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-background transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmOverlap}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Confirm & Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Class Form */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Class Title *
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., Morning Yoga"
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Optional class description"
                        rows={3}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Trainer *
                      </label>
                      <select
                        value={form.trainerId}
                        onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {trainers.map(trainer => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.firstName} {trainer.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Max Capacity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.maxCapacity}
                        onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    {/* Additional Dates Section */}
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-foreground">
                          Additional Dates (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            // Add a new date (defaults to tomorrow)
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setAdditionalDates([...additionalDates, format(tomorrow, 'yyyy-MM-dd')]);
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Day
                        </button>
                      </div>
                      
                      {additionalDates.length > 0 && (
                        <div className="space-y-2">
                          {additionalDates.map((date, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                  const newDates = [...additionalDates];
                                  newDates[index] = e.target.value;
                                  setAdditionalDates(newDates);
                                }}
                                className="flex-1 px-3 py-1 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setAdditionalDates(additionalDates.filter((_, i) => i !== index));
                                }}
                                className="flex-shrink-0 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Remove this date"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-medium text-blue-800">
                              📅 Total classes to create: <span className="font-bold">{1 + additionalDates.length}</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              All classes will use the same time ({form.startTime} - {form.endTime}) and settings.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {additionalDates.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Click "Add Day" to create a multi-day class series
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
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
                          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Eligible Class Passes *
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Select which class pass types can be used to register for this class
                      </p>
                      {packages.length === 0 ? (
                        <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          No active class pass packages found. Please create class passes in Pricing first.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {packages.map(pkg => (
                            <label key={pkg.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-background cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPackageIds.includes(pkg.packageType)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPackageIds([...selectedPackageIds, pkg.packageType]);
                                  } else {
                                    setSelectedPackageIds(selectedPackageIds.filter(id => id !== pkg.packageType));
                                  }
                                }}
                                className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                              />
                              <span className="text-sm font-medium text-foreground">{pkg.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {selectedPackageIds.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-medium text-blue-800 mb-2">Selected Class Passes ({selectedPackageIds.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPackageIds.map(id => {
                              const pkg = packages.find(p => p.packageType === id);
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
                          className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                        />
                        <span className="text-sm font-medium text-foreground">Recurring</span>
                      </label>
                      {form.isRecurring && (
                        <select
                          value={form.recurringPattern}
                          onChange={(e) => setForm({ ...form, recurringPattern: e.target.value })}
                          className="px-3 py-1 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
                      className="px-6 py-2 border border-input text-foreground rounded-lg hover:bg-background transition-colors"
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
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Upcoming Classes ({upcomingClasses.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'completed'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed Classes ({completedClasses.length})
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search classes by title, trainer, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Classes List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredClasses.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No classes found matching your search' : 
                        (activeTab === 'upcoming' ? 'No upcoming classes scheduled' : 'No completed classes')}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm ? 'Try a different search term' : 
                        (activeTab === 'upcoming' && 'Click "New Class" to create one')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredClasses.map((cls) => (
                  <Card key={cls.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      {editingClass?.id === cls.id ? (
                        /* Inline Edit Form */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Edit Class</h3>
                            <button
                              onClick={resetForm}
                              className="text-gray-400 hover:text-foreground/80"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">Class Title *</label>
                              <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">Trainer *</label>
                              <select
                                value={form.trainerId}
                                onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
                              <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                              <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Start Time *</label>
                                <input
                                  type="time"
                                  value={form.startTime}
                                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">End Time *</label>
                                <input
                                  type="time"
                                  value={form.endTime}
                                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">Location *</label>
                              <select
                                value={form.locationId}
                                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="">Select a location</option>
                                {locations.map(location => (
                                  <option key={location.id} value={location.id}>{location.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">Max Capacity *</label>
                              <input
                                type="number"
                                min="1"
                                value={form.maxCapacity}
                                onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                              <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Eligible Class Passes *
                              </label>
                              <p className="text-xs text-muted-foreground mb-2">
                                Select which class pass types can be used to register for this class
                              </p>
                              {packages.length === 0 ? (
                                <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                                  No active class pass packages found. Please create class passes in Pricing first.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {packages.map(pkg => (
                                    <label key={pkg.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-background cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedPackageIds.includes(pkg.packageType)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedPackageIds([...selectedPackageIds, pkg.packageType]);
                                          } else {
                                            setSelectedPackageIds(selectedPackageIds.filter(id => id !== pkg.packageType));
                                          }
                                        }}
                                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                                      />
                                      <span className="text-sm font-medium text-foreground">{pkg.title}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {selectedPackageIds.length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-xs font-medium text-blue-800 mb-2">Selected Class Passes ({selectedPackageIds.length}):</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedPackageIds.map(id => {
                                      const pkg = packages.find(p => p.packageType === id);
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
                              className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-background transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmit}
                              disabled={saving}
                              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                              <h3 className="text-lg font-semibold text-foreground">{cls.title}</h3>
                              {cls.description && (
                                <p className="text-sm text-foreground/80 mt-1">{cls.description}</p>
                              )}
                              
                              {/* Multi-day series badge */}
                              {cls.isPartOfSeries && cls.seriesId && (
                                <div className="mt-2">
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                    {cls.totalSeriesClasses}-Day Series
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap gap-4 mt-3">
                                <div className="flex items-center gap-1 text-sm text-foreground/80">
                                  <User className="h-4 w-4" />
                                  {cls.trainerName || getTrainerName(cls.trainerId)}
                                </div>
                                
                                {/* Show all dates if multi-day series */}
                                {cls.isPartOfSeries && cls.seriesId ? (
                                  <div className="flex items-center gap-1 text-sm text-foreground/80">
                                    <Calendar className="h-4 w-4" />
                                    <div className="flex flex-col">
                                      <span>{formatSeriesDates(getSeriesClasses(cls.seriesId))}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-sm text-foreground/80">
                                    <Calendar className="h-4 w-4" />
                                    {format(cls.startTime.toDate(), 'EEE, MMM d, yyyy')}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-1 text-sm text-foreground/80">
                                  <Clock className="h-4 w-4" />
                                  {format(cls.startTime.toDate(), 'h:mm a')} - {format(cls.endTime.toDate(), 'h:mm a')}
                                </div>
                                {cls.location && (
                                  <div className="flex items-center gap-1 text-sm text-foreground/80">
                                    <MapPin className="h-4 w-4" />
                                    {cls.location}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-sm text-foreground/80">
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
                            className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
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
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground">Class Participants</h2>
                  <p className="text-sm text-foreground/80 mt-1">{viewingParticipants.title}</p>
                  <p className="text-sm text-muted-foreground">
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
              
              {/* Export Button */}
              {participants.length > 0 && (
                <button
                  onClick={handleExportParticipants}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full justify-center"
                >
                  <Download className="h-4 w-4" />
                  Export Participants to CSV
                </button>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
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
                      className="p-4 bg-background rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold flex-shrink-0">
                            {participant.firstName?.charAt(0)}{participant.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {participant.firstName} {participant.lastName}
                            </p>
                            {participant.email && (
                              <p className="text-sm text-muted-foreground">
                                📧 {participant.email}
                              </p>
                            )}
                            {participant.phoneNumber && (
                              <p className="text-sm text-muted-foreground">
                                📱 {participant.phoneNumber}
                              </p>
                            )}
                            {participant.athleteName && (
                              <p className="text-sm text-blue-600 font-medium">
                                🏃 Athlete: {participant.athleteName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Registered {format(participant.registeredAt.toDate(), 'MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                          #{index + 1}
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
