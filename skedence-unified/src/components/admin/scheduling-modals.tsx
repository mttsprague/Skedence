'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface LessonPackage {
  id: string;
  packageName: string;
  lessonsRemaining: number;
  lessonsTotal: number;
  isExpired: boolean;
}

interface Location {
  id: string;
  name: string;
}

// Book Lesson Modal - for available time slots
interface BookLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotDate: Date;
  slotHour: number;
  slotId: string; // Actual slot document ID from database
  trainerId: string;
  trainerName: string;
  orgId: string | undefined;
  onSuccess: () => void;
}

export function BookLessonModal({
  isOpen,
  onClose,
  slotDate,
  slotHour,
  slotId,
  trainerId,
  trainerName,
  orgId,
  onSuccess,
}: BookLessonModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && orgId) {
      loadClients();
      // Set default times based on slot hour
      setStartTime(`${slotHour.toString().padStart(2, '0')}:00`);
      setEndTime(`${(slotHour + 1).toString().padStart(2, '0')}:00`);
    }
  }, [isOpen, orgId, slotHour]);

  useEffect(() => {
    if (selectedClientId && orgId) {
      loadPackages();
    } else {
      setPackages([]);
      setSelectedPackageId('');
    }
  }, [selectedClientId, orgId]);

  const loadClients = async () => {
    if (!orgId) return;
    
    setLoadingClients(true);
    try {
      const clientsRef = collection(db, 'users');
      const q = query(clientsRef, where('orgId', '==', orgId));
      const snapshot = await getDocs(q);
      
      const clientsList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          firstName: doc.data().firstName || '',
          lastName: doc.data().lastName || '',
          email: doc.data().email || doc.data().emailAddress || '',
        }))
        .filter(client => client.email);
      
      setClients(clientsList);
    } catch (err) {
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const loadPackages = async () => {
    if (!orgId || !selectedClientId) return;
    
    setLoadingPackages(true);
    try {
      // Try new path first
      let packagesRef = collection(db, 'organizations', orgId, 'users', selectedClientId, 'packages');
      let snapshot = await getDocs(packagesRef);
      
      // If empty, try old path
      if (snapshot.empty) {
        packagesRef = collection(db, 'users', selectedClientId, 'lessonPackages');
        snapshot = await getDocs(packagesRef);
      }
      
      const allPackages = snapshot.docs.map(doc => {
        const data = doc.data();
        // Support both old field names (lessonsRemaining/lessonsTotal) and new (lessonsUsed/totalLessons)
        const totalLessons = data.totalLessons || data.lessonsTotal || 0;
        const lessonsUsed = data.lessonsUsed || 0;
        const lessonsRemaining = data.lessonsRemaining !== undefined 
          ? data.lessonsRemaining 
          : (totalLessons - lessonsUsed);
        
        return {
          id: doc.id,
          packageName: data.packageName || 'Unnamed Package',
          lessonsRemaining,
          lessonsTotal: totalLessons,
          isExpired: data.expirationDate ? data.expirationDate.toDate() < new Date() : false,
          packageType: data.packageType,
          packageCategory: data.packageCategory,
        };
      });
      
      // Filter out class packages and expired/empty packages
      const packagesList = allPackages.filter(pkg => {
        const isClassPackage = pkg.packageType === 'class_pass' || 
                               pkg.packageType === 'class' || 
                               pkg.packageCategory === 'classPass';
        const hasLessons = pkg.lessonsRemaining > 0;
        const notExpired = !pkg.isExpired;
        
        return !isClassPackage && hasLessons && notExpired;
      });
      
      setPackages(packagesList);
    } catch (err) {
      setError('Failed to load packages');
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleBook = async () => {
    if (!selectedClientId || !selectedPackageId || !trainerId || !orgId) {
      setError('Please select a client and package');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the actual slot ID from the database
      const bookLessonFunc = httpsCallable(functions, 'bookLesson');
      await bookLessonFunc({
        trainerId,
        slotId, // Use the slot ID passed from the parent (actual document ID)
        lessonPackageId: selectedPackageId,
        clientId: selectedClientId, // ✅ Passes client document ID (firstName_lastName format)
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to book lesson');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Book Lesson</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-foreground/80 mb-1">
              <User className="h-4 w-4" />
              Trainer
            </div>
            <div className="font-semibold text-foreground">{trainerName}</div>
          </div>

          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-foreground/80 mb-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </div>
            <div className="font-medium text-foreground mb-2">
              {format(slotDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-foreground/80 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/80 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Select Client</label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-foreground/80 py-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Loading clients...
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({client.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedClientId && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Pass</label>
              {loadingPackages ? (
                <div className="flex items-center gap-2 text-foreground/80 py-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Loading packages...
                </div>
              ) : packages.length === 0 ? (
                <div className="text-sm text-foreground/80 py-2">No available passes for this client</div>
              ) : (
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="">Choose a pass...</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.packageName} ({pkg.lessonsRemaining} left)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={loading || !selectedClientId || !selectedPackageId}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg transition-colors font-medium",
                loading || !selectedClientId || !selectedPackageId
                  ? "bg-gray-300 text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-white hover:bg-[#274785]"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Booking...
                </span>
              ) : (
                'Book Lesson'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Availability Modal - for empty time slots
interface CreateAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotDate: Date;
  slotHour: number;
  trainerId?: string;
  trainerName?: string;
  orgId?: string;
  onSuccess: () => void;
}

export function CreateAvailabilityModal({
  isOpen,
  onClose,
  slotDate,
  slotHour,
  trainerId,
  trainerName,
  orgId,
  onSuccess,
}: CreateAvailabilityModalProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'open' | 'unavailable'>('open');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringStartDate, setRecurringStartDate] = useState('');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [overlapConflicts, setOverlapConflicts] = useState<Array<{ name: string; type: string; time: string }>>([])

  useEffect(() => {
    if (isOpen && orgId) {
      setStartTime(`${slotHour.toString().padStart(2, '0')}:00`);
      setEndTime(`${(slotHour + 1).toString().padStart(2, '0')}:00`);
      // Set default recurring dates
      const startDate = new Date(slotDate);
      setRecurringStartDate(format(startDate, 'yyyy-MM-dd'));
      const defaultEndDate = new Date(slotDate);
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
      setRecurringEndDate(format(defaultEndDate, 'yyyy-MM-dd'));
      // Pre-select the day of week for the clicked slot
      setSelectedWeekdays([slotDate.getDay()]);
      // Load locations
      loadLocations();
    }
  }, [isOpen, orgId, slotHour, slotDate]);

  const loadLocations = async () => {
    if (!orgId) return;
    
    setLoadingLocations(true);
    try {
      const locationsRef = collection(db, 'locations');
      const q = query(
        locationsRef,
        where('orgId', '==', orgId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const locationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
      }));
      
      setLocations(locationsList);
    } catch (err) {
      // Error loading locations
    } finally {
      setLoadingLocations(false);
    }
  };

  // Check for overlapping sessions
  const checkForOverlaps = async (dates: string[], startHour: number, startMin: number, endHour: number, endMin: number): Promise<Array<{ name: string; type: string; time: string }>> => {
    // Guard: trainerId is required for overlap checking
    if (!trainerId) {
      console.warn('trainerId is undefined, skipping overlap check');
      return [];
    }
    
    const conflicts: Array<{ name: string; type: string; time: string }> = [];
    
    for (const dateStr of dates) {
      const checkStart = new Date(dateStr);
      checkStart.setHours(startHour, startMin, 0, 0);
      const checkEnd = new Date(dateStr);
      checkEnd.setHours(endHour, endMin, 0, 0);
      
      // Check for overlapping classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('trainerId', '==', trainerId),
        where('orgId', '==', orgId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        
        // Skip cancelled or deleted classes (soft-deleted by iOS app or other paths)
        if (classData.status === 'cancelled' || classData.status === 'deleted') continue;
        
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
        
        // Only flag booked lessons as real conflicts — open/unavailable slots can be overwritten
        if (scheduleData.status !== 'booked') continue;
        
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

  const handleCreate = async (skipOverlapCheck = false) => {
    if (!trainerId || !orgId) {
      setError('Missing trainer or organization');
      return;
    }

    if (!location.trim()) {
      setError('Location is required');
      return;
    }

    if (isRecurring && selectedWeekdays.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }

    // Check for overlaps before creating (skip if already confirmed via skipOverlapCheck parameter)
    if (!skipOverlapCheck) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      // Generate list of dates to check
      const datesToCheck: string[] = [];
      if (isRecurring && recurringStartDate && recurringEndDate) {
        const start = new Date(recurringStartDate);
        const end = new Date(recurringEndDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (selectedWeekdays.length === 0 || selectedWeekdays.includes(d.getDay())) {
            datesToCheck.push(format(d, 'yyyy-MM-dd'));
          }
        }
      } else {
        datesToCheck.push(format(slotDate, 'yyyy-MM-dd'));
      }
      
      const conflicts = await checkForOverlaps(datesToCheck, startHour, startMin, endHour, endMin);
      
      if (conflicts.length > 0) {
        setOverlapConflicts(conflicts);
        setShowOverlapDialog(true);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(startHour, startMin, 0, 0);
      
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      // JavaScript getTimezoneOffset() returns positive for west of UTC (which is what backend expects)
      const timezoneOffsetMinutes = startDateTime.getTimezoneOffset();

      // Determine end date for the availability range
      let endDateStr: string;
      let daysOfWeek: number[] | undefined;
      
      if (isRecurring && recurringEndDate) {
        endDateStr = recurringEndDate;
        daysOfWeek = selectedWeekdays.length > 0 ? selectedWeekdays : undefined;
      } else {
        endDateStr = format(slotDate, 'yyyy-MM-dd');
      }

      const processAvailability = httpsCallable(functions, 'processTrainerAvailability');
      const result = await processAvailability({
        trainerId,
        startDate: isRecurring ? recurringStartDate : format(slotDate, 'yyyy-MM-dd'),
        endDate: endDateStr,
        dailyStartHour: startHour,
        dailyEndHour: endHour,
        slotDurationMinutes: 60,
        timezoneOffsetMinutes,
        daysOfWeek,
        status,
        location,
      });

      // Mark "Create Trainer Availability" as complete in onboarding checklist
      if (orgId) {
        try {
          const { doc, setDoc, getDoc, getFirestore } = await import('firebase/firestore');
          const db = getFirestore();
          const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
          const onboardingDoc = await getDoc(onboardingRef);
          const currentProgress = onboardingDoc.exists() ? onboardingDoc.data() : {};
          await setDoc(onboardingRef, { ...currentProgress, hasAvailability: true }, { merge: true });
        } catch (error) {
          console.error('Error marking onboarding step complete:', error);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create availability');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOverlap = async () => {
    setShowOverlapDialog(false);
    setOverlapConflicts([]);
    await handleCreate(true); // pass skipOverlapCheck=true to bypass the re-check
  };

  const handleCancelOverlap = () => {
    setShowOverlapDialog(false);
    setOverlapConflicts([]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlap Confirmation Dialog */}
      {showOverlapDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
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
                  This availability overlaps with existing session(s):
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
              Do you want to create this availability anyway? Both sessions will appear side-by-side on the schedule.
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
        
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Create Availability</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {trainerName && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-foreground/80 mb-1">
                <User className="h-4 w-4" />
                Trainer
              </div>
              <div className="font-semibold text-foreground">{trainerName}</div>
            </div>
          )}

          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-foreground/80 mb-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </div>
            <div className="font-medium text-foreground mb-2">
              {format(slotDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-foreground/80 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/80 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStatus('open')}
                className={cn(
                  "p-3 border-2 rounded-lg transition-colors",
                  status === 'open'
                    ? "border-green-500 bg-green-50 text-green-900"
                    : "border-input hover:border-gray-400"
                )}
              >
                <div className="font-medium">Available</div>
                <div className="text-xs text-foreground/80 mt-1">Open for booking</div>
              </button>
              <button
                onClick={() => setStatus('unavailable')}
                className={cn(
                  "p-3 border-2 rounded-lg transition-colors",
                  status === 'unavailable'
                    ? "border-red-500 bg-red-50 text-red-900"
                    : "border-input hover:border-gray-400"
                )}
              >
                <div className="font-medium">Unavailable</div>
                <div className="text-xs text-foreground/80 mt-1">Blocked time</div>
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
              />
              <span className="text-sm font-medium text-foreground">Recurring</span>
            </label>
            {isRecurring && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedWeekdays(prev => 
                            prev.includes(index) 
                              ? prev.filter(d => d !== index)
                              : [...prev, index].sort((a, b) => a - b)
                          );
                        }}
                        className={cn(
                          "px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors",
                          selectedWeekdays.includes(index)
                            ? "border-primary bg-primary text-white"
                            : "border-input text-foreground hover:border-gray-400"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-foreground/80 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={recurringStartDate}
                      onChange={(e) => setRecurringStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground/80 mb-1">End Date</label>
                    <input
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      min={recurringStartDate}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Create {status === 'open' ? 'available' : 'unavailable'} slots on {selectedWeekdays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') || 'selected days'} from {recurringStartDate ? format(new Date(recurringStartDate), 'MMM d') : 'start date'} to {recurringEndDate ? format(new Date(recurringEndDate), 'MMM d, yyyy') : 'end date'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            {loadingLocations ? (
              <div className="flex items-center gap-2 text-foreground/80 py-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Loading locations...
              </div>
            ) : locations.length === 0 ? (
              <div className="text-sm text-foreground/80 py-2">
                No locations found. Please add locations in Business Settings.
              </div>
            ) : (
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">Select location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
            {!location && !loadingLocations && (
              <p className="text-xs text-red-600 mt-1">⚠️ Location is required</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate()}
              disabled={loading || !location.trim() || (isRecurring && selectedWeekdays.length === 0)}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg transition-colors font-medium",
                (loading || !location.trim() || (isRecurring && selectedWeekdays.length === 0))
                  ? "bg-gray-300 text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-white hover:bg-[#274785]"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
