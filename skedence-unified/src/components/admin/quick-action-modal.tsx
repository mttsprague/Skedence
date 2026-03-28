'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, functions } from '@/lib/firebase';
import {
  collection, query, where, getDocs, getDoc, orderBy, doc, addDoc, Timestamp,
} from 'firebase/firestore';
import { logPassIssued } from '@/lib/activity-logger';
import { httpsCallable } from 'firebase/functions';
import { format, addDays } from 'date-fns';
import { X, CalendarPlus, BookOpen, Package, Check, ChevronRight, Loader2, Plus, Minus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface PackageOption {
  id: string;
  title: string;
  priceInCents: number;
  packageType: string;
  packageCategory: string;
  lessonCount: number;
  expirationDays: number;
  pricingTierId?: string;
  pricingTierName?: string;
}

interface LessonPackage {
  id: string;
  packageName: string;
  remainingLessons: number;
  totalLessons: number;
}

interface AvailabilitySlot {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
}

interface Location {
  id: string;
  name: string;
}

type Mode = 'pick' | 'book' | 'availability' | 'pass';

interface QuickActionModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function SelectField({
  label, value, onChange, children, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-150',
        )}
      >
        {children}
      </select>
    </div>
  );
}

function InputField({
  label, type = 'text', value, onChange, disabled,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-150',
        )}
      />
    </div>
  );
}

// ─── Book a Lesson Form ───────────────────────────────────────────────────────
function BookLessonForm({
  orgId, user, userData, onSuccess, onBack,
}: {
  orgId: string;
  user: any;
  userData: any;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load clients + trainers once
  useEffect(() => {
    async function load() {
      try {
        // Clients via orgMembers
        const membersSnap = await getDocs(
          query(collection(db, 'orgMembers'), where('orgId', '==', orgId), where('role', '==', 'client'))
        );
        const ids: string[] = membersSnap.docs
          .map(d => d.data().userId as string)
          .filter(Boolean);

        const directClients = await Promise.all(
          ids.map(async uid => {
            try {
              const userDoc = await getDoc(doc(db, 'users', uid));
              if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                  id: userDoc.id,
                  firstName: data.firstName || '',
                  lastName: data.lastName || '',
                  email: data.emailAddress || data.email || '',
                } as Client;
              }
            } catch { /* skip */ }
            return null;
          })
        );
        const clientList = directClients.filter((c): c is Client => c !== null)
          .sort((a, b) => a.firstName.localeCompare(b.firstName));
        setClients(clientList);
        if (clientList.length > 0) setSelectedClient(clientList[0].id);

        // Trainers
        const trainerSnap = await getDocs(
          query(collection(db, 'trainers'), where('orgId', '==', orgId))
        );
        const trainerList = trainerSnap.docs.map(d => ({
          id: d.id,
          firstName: d.data().firstName || '',
          lastName: d.data().lastName || '',
        })).sort((a, b) => a.firstName.localeCompare(b.firstName));
        setTrainers(trainerList);
        if (trainerList.length > 0) setSelectedTrainer(trainerList[0].id);
      } catch (err) {
        console.error('Error loading form data:', err);
      } finally {
        setLoadingInit(false);
      }
    }
    load();
  }, [orgId]);

  // Load packages when client changes
  useEffect(() => {
    if (!selectedClient || !orgId) { setPackages([]); return; }
    setLoadingPackages(true);
    async function loadPkgs() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'organizations', orgId, 'users', selectedClient, 'packages'),
            orderBy('purchaseDate', 'desc')
          )
        );
        const list = snap.docs
          .map(d => {
            const data = d.data();
            const total = data.totalLessons || 0;
            const used = data.lessonsUsed || 0;
            return {
              id: d.id,
              packageName: data.packageName || data.packageType || 'Package',
              remainingLessons: total - used,
              totalLessons: total,
            };
          })
          .filter(p => p.remainingLessons > 0);
        setPackages(list);
        setSelectedPackage(list.length > 0 ? list[0].id : '');
      } catch {
        setPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    }
    loadPkgs();
  }, [selectedClient, orgId]);

  // Load slots when trainer or date changes
  useEffect(() => {
    if (!selectedTrainer || !selectedDate || !orgId) { setSlots([]); return; }
    setLoadingSlots(true);
    async function loadSlots() {
      try {
        const start = new Date(`${selectedDate}T00:00:00`);
        const end = new Date(`${selectedDate}T23:59:59`);
        const snap = await getDocs(
          query(
            collection(db, 'trainers', selectedTrainer, 'schedules'),
            where('startTime', '>=', Timestamp.fromDate(start)),
            where('startTime', '<=', Timestamp.fromDate(end)),
            where('status', '==', 'open')
          )
        );
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as AvailabilitySlot))
          .sort((a, b) => a.startTime.seconds - b.startTime.seconds);
        setSlots(list);
        setSelectedSlot(list.length > 0 ? list[0].id : '');
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedTrainer, selectedDate, orgId]);

  const handleSubmit = async () => {
    if (!selectedClient || !selectedTrainer || !selectedSlot || !selectedPackage) {
      toast.error('Missing information', 'Please select all fields');
      return;
    }
    setSubmitting(true);
    try {
      const fullName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        : '';
      const adminName = fullName || user?.email?.split('@')[0] || 'Admin';

      const bookLesson = httpsCallable(functions, 'bookLesson');
      await bookLesson({
        trainerId: selectedTrainer,
        slotId: selectedSlot,
        lessonPackageId: selectedPackage,
        clientId: selectedClient,
        createdByAdminId: user?.uid,
        createdByAdminName: adminName,
      });

      toast.success('Booking created!');
      // Broadcast so real-time + one-shot pages can react
      window.dispatchEvent(new CustomEvent('skedence:quick-action', {
        detail: { type: 'booking-created' },
      }));
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create booking', err.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  return (
    <div className="space-y-4">
      {/* Client */}
      <SelectField label="Client" value={selectedClient} onChange={setSelectedClient} disabled={submitting}>
        {clients.length === 0
          ? <option value="">No clients found</option>
          : clients.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))
        }
      </SelectField>

      {/* Package */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Lesson Pass
          {loadingPackages && <Loader2 className="inline h-3 w-3 animate-spin ml-1.5" />}
        </label>
        <select
          value={selectedPackage}
          onChange={e => setSelectedPackage(e.target.value)}
          disabled={submitting || loadingPackages || packages.length === 0}
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
          )}
        >
          {packages.length === 0
            ? <option value="">No passes with remaining lessons</option>
            : packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.packageName} ({p.remainingLessons} left)
                </option>
              ))
          }
        </select>
      </div>

      {/* Trainer */}
      <SelectField label="Trainer" value={selectedTrainer} onChange={setSelectedTrainer} disabled={submitting}>
        {trainers.map(t => (
          <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
        ))}
      </SelectField>

      {/* Date */}
      <InputField
        label="Date"
        type="date"
        value={selectedDate}
        onChange={setSelectedDate}
        disabled={submitting}
      />

      {/* Slot */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Time Slot
          {loadingSlots && <Loader2 className="inline h-3 w-3 animate-spin ml-1.5" />}
        </label>
        <select
          value={selectedSlot}
          onChange={e => setSelectedSlot(e.target.value)}
          disabled={submitting || loadingSlots || slots.length === 0}
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
          )}
        >
          {slots.length === 0
            ? <option value="">No open slots on this date</option>
            : slots.map(s => (
                <option key={s.id} value={s.id}>
                  {format(s.startTime.toDate(), 'h:mm a')} – {format(s.endTime.toDate(), 'h:mm a')}
                  {s.location ? ` · ${s.location}` : ''}
                </option>
              ))
          }
        </select>
      </div>

      {/* Summary */}
      {selectedClientData && selectedSlotData && selectedPackage && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-0.5">
          <div className="font-semibold">Summary</div>
          <div>{selectedClientData.firstName} {selectedClientData.lastName}</div>
          <div>{format(selectedSlotData.startTime.toDate(), 'EEEE, MMM d')} · {format(selectedSlotData.startTime.toDate(), 'h:mm a')} – {format(selectedSlotData.endTime.toDate(), 'h:mm a')}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedClient || !selectedTrainer || !selectedSlot || !selectedPackage}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white',
            'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
            'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitting ? 'Booking...' : 'Book Lesson'}
        </button>
      </div>
    </div>
  );
}

// ─── Add Availability Form ────────────────────────────────────────────────────
function AddAvailabilityForm({
  orgId, onSuccess, onBack,
}: {
  orgId: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    location: '',
    recurring: false,
    endDate: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
  });

  const setField = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    async function load() {
      try {
        const trainerSnap = await getDocs(
          query(collection(db, 'trainers'), where('orgId', '==', orgId))
        );
        const list = trainerSnap.docs
          .map(d => ({ id: d.id, firstName: d.data().firstName || '', lastName: d.data().lastName || '' }))
          .sort((a, b) => a.firstName.localeCompare(b.firstName));
        setTrainers(list);
        if (list.length > 0) setSelectedTrainer(list[0].id);

        const locSnap = await getDocs(
          query(collection(db, 'locations'), where('orgId', '==', orgId), where('isActive', '==', true))
        );
        const locs = locSnap.docs.map(d => ({ id: d.id, name: d.data().name || '' }));
        setLocations(locs);
        if (locs.length > 0) setField('location', locs[0].name);
      } catch (err) {
        console.error('Error loading trainers/locations:', err);
      } finally {
        setLoadingInit(false);
      }
    }
    load();
  }, [orgId]);

  const handleSubmit = async () => {
    if (!selectedTrainer) { toast.error('Select a trainer'); return; }
    if (!form.location.trim()) { toast.error('Location required'); return; }

    const startH = parseInt(form.startTime.split(':')[0]);
    const endH = parseInt(form.endTime.split(':')[0]);
    if (endH <= startH) { toast.error('End time must be after start time'); return; }

    setSubmitting(true);
    try {
      const dt = new Date(`${form.date}T${form.startTime}`);
      const timezoneOffsetMinutes = -dt.getTimezoneOffset();

      const params: any = {
        trainerId: selectedTrainer,
        startDate: form.date,
        endDate: form.recurring ? form.endDate : form.date,
        dailyStartHour: startH,
        dailyEndHour: endH,
        slotDurationMinutes: 60,
        timezoneOffsetMinutes,
        status: 'open',
        location: form.location.trim(),
      };

      const processAvailability = httpsCallable(functions, 'processTrainerAvailability');
      await processAvailability(params);

      toast.success('Availability added!');
      window.dispatchEvent(new CustomEvent('skedence:quick-action', {
        detail: { type: 'availability-added' },
      }));
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add availability', err.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trainer */}
      <SelectField label="Trainer" value={selectedTrainer} onChange={setSelectedTrainer} disabled={submitting}>
        {trainers.map(t => (
          <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
        ))}
      </SelectField>

      {/* Date */}
      <InputField
        label={form.recurring ? 'Start Date' : 'Date'}
        type="date"
        value={form.date}
        onChange={v => setField('date', v)}
        disabled={submitting}
      />

      {/* Recurring toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.recurring}
          onClick={() => setField('recurring', !form.recurring)}
          disabled={submitting}
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
            form.recurring ? 'bg-blue-600' : 'bg-gray-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
            'disabled:opacity-50',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
              form.recurring ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">Recurring (multiple days)</span>
      </div>

      {form.recurring && (
        <InputField
          label="End Date"
          type="date"
          value={form.endDate}
          onChange={v => setField('endDate', v)}
          disabled={submitting}
        />
      )}

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Start Time"
          type="time"
          value={form.startTime}
          onChange={v => setField('startTime', v)}
          disabled={submitting}
        />
        <InputField
          label="End Time"
          type="time"
          value={form.endTime}
          onChange={v => setField('endTime', v)}
          disabled={submitting}
        />
      </div>

      {/* Location */}
      {locations.length > 0 ? (
        <SelectField label="Location" value={form.location} onChange={v => setField('location', v)} disabled={submitting}>
          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </SelectField>
      ) : (
        <InputField
          label="Location"
          value={form.location}
          onChange={v => setField('location', v)}
          disabled={submitting}
        />
      )}

      {/* Summary */}
      {selectedTrainer && trainers.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-0.5">
          <div className="font-semibold">Summary</div>
          <div>{trainers.find(t => t.id === selectedTrainer)?.firstName} {trainers.find(t => t.id === selectedTrainer)?.lastName}</div>
          <div>
            {form.recurring
              ? `${form.date} → ${form.endDate}`
              : format(new Date(`${form.date}T12:00`), 'EEEE, MMM d')
            } · {form.startTime} – {form.endTime}
          </div>
          {form.location && <div>{form.location}</div>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedTrainer || !form.location.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white',
            'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
            'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitting ? 'Adding...' : 'Add Availability'}
        </button>
      </div>
    </div>
  );
}

// ─── Add Pass Form ────────────────────────────────────────────────────────────
function AddPassForm({
  orgId, user, userData, onSuccess, onBack,
}: {
  orgId: string;
  user: any;
  userData: any;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [clients, setClients] = useState<(Client & { userId: string })[]>([]);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Load clients + pricing structure once
  useEffect(() => {
    async function load() {
      try {
        // Clients via orgMembers (active only)
        const membersSnap = await getDocs(
          query(
            collection(db, 'orgMembers'),
            where('orgId', '==', orgId),
            where('role', '==', 'client'),
            where('isActive', '==', true)
          )
        );
        const clientList: (Client & { userId: string })[] = [];
        await Promise.all(
          membersSnap.docs.map(async memberDoc => {
            const userId = memberDoc.data().userId as string;
            if (!userId) return;
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const d = userDoc.data();
                clientList.push({
                  id: memberDoc.id,
                  userId,
                  firstName: d.firstName || '',
                  lastName: d.lastName || '',
                  email: d.emailAddress || d.email || '',
                });
              }
            } catch { /* skip */ }
          })
        );
        clientList.sort((a, b) => a.lastName.localeCompare(b.lastName));
        setClients(clientList);
        if (clientList.length > 0) setSelectedClientId(clientList[0].userId);

        // Pricing structure from org doc
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          const pricingData = orgDoc.data().pricingStructure;
          if (pricingData?.tiers && Array.isArray(pricingData.tiers)) {
            const allPkgs: PackageOption[] = [];
            pricingData.tiers.forEach((tier: any) => {
              (tier.packages || []).forEach((pkg: any) => {
                allPkgs.push({
                  id: pkg.id || `${tier.id}-${pkg.packageType}`,
                  title: pkg.title || pkg.packageType,
                  priceInCents: pkg.priceInCents || 0,
                  packageType: pkg.packageType,
                  packageCategory: pkg.packageCategory || 'pass',
                  lessonCount: pkg.lessonCount || 1,
                  expirationDays: pkg.expirationDays || 365,
                  pricingTierId: tier.id,
                  pricingTierName: tier.tierName,
                });
              });
            });
            setPackageOptions(allPkgs);
            if (allPkgs.length > 0) setSelectedPackageId(allPkgs[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading pass data:', err);
      } finally {
        setLoadingInit(false);
      }
    }
    load();
  }, [orgId]);

  const selectedClient = clients.find(c => c.userId === selectedClientId);
  const selectedPkg = packageOptions.find(p => p.id === selectedPackageId);

  const handleSubmit = async () => {
    if (!selectedClient || !selectedPkg || !orgId) {
      toast.error('Missing information', 'Please select a client and pass type');
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + (selectedPkg.expirationDays || 365));
      const totalLessons = (selectedPkg.lessonCount || 1) * quantity;

      const passData = {
        packageType: selectedPkg.packageType,
        packageCategory: selectedPkg.packageCategory,
        packageName: selectedPkg.title,
        totalLessons,
        lessonsUsed: 0,
        purchaseDate: Timestamp.fromDate(now),
        expirationDate: Timestamp.fromDate(expirationDate),
        transactionId: `ADMIN_ADDED_${Date.now()}`,
        amountPaid: 0,
        orgId,
      };

      // Write to standard path: organizations/{orgId}/users/{userId}/packages
      await addDoc(
        collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages'),
        passData
      );

      // Log to activity feed
      const fullName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        : '';
      const actorName = fullName || user?.email?.split('@')[0] || 'Admin';

      await logPassIssued({
        orgId,
        actorId: user?.uid,
        actorName,
        actorRole: 'admin',
        clientId: selectedClient.userId,
        clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
        passType: selectedPkg.packageType,
        passTitle: selectedPkg.title,
        quantity,
        totalSessions: totalLessons,
      });

      // Broadcast for pages that need to refresh
      window.dispatchEvent(new CustomEvent('skedence:quick-action', {
        detail: { type: 'pass-added' },
      }));

      toast.success('Pass added!');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add pass', err.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Client */}
      <SelectField
        label="Client"
        value={selectedClientId}
        onChange={setSelectedClientId}
        disabled={submitting}
      >
        {clients.length === 0
          ? <option value="">No clients found</option>
          : clients.map(c => (
              <option key={c.userId} value={c.userId}>
                {c.firstName} {c.lastName}
              </option>
            ))
        }
      </SelectField>

      {/* Pass Type */}
      <SelectField
        label="Pass Type"
        value={selectedPackageId}
        onChange={setSelectedPackageId}
        disabled={submitting}
      >
        {packageOptions.length === 0
          ? <option value="">No passes configured</option>
          : packageOptions.map(p => (
              <option key={p.id} value={p.id}>
                {p.pricingTierName ? `${p.pricingTierName} — ` : ''}{p.title}
                {p.lessonCount && p.lessonCount > 1 ? ` (${p.lessonCount} sessions)` : ''}
              </option>
            ))
        }
      </SelectField>

      {/* Quantity */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={submitting || quantity <= 1}
            className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <Minus className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900 w-8 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(q => q + 1)}
            disabled={submitting}
            className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm text-gray-500 ml-1">pass{quantity !== 1 ? 'es' : ''}</span>
        </div>
      </div>

      {/* Summary */}
      {selectedClient && selectedPkg && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-800 space-y-0.5">
          <div className="font-semibold">Summary</div>
          <div>{selectedClient.firstName} {selectedClient.lastName}</div>
          <div>
            {quantity}× {selectedPkg.title}
            {selectedPkg.lessonCount && selectedPkg.lessonCount > 1
              ? ` (${(selectedPkg.lessonCount * quantity)} total sessions)`
              : ''
            }
          </div>
          <div className="text-purple-600 text-xs">Added for free (admin add)</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedClientId || !selectedPackageId}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white',
            'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
            'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitting ? 'Adding...' : 'Add Pass'}
        </button>
      </div>
    </div>
  );
}

// ─── Action Picker ────────────────────────────────────────────────────────────
function ActionPicker({ onSelect }: { onSelect: (mode: Mode) => void }) {
  const actions = [
    {
      mode: 'book' as Mode,
      icon: BookOpen,
      title: 'Book a Lesson',
      description: 'Schedule a session for a client',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      mode: 'availability' as Mode,
      icon: CalendarPlus,
      title: 'Add Availability',
      description: 'Open time slots for a trainer',
      color: 'text-green-600 bg-green-50',
    },
    {
      mode: 'pass' as Mode,
      icon: Package,
      title: 'Add Pass',
      description: 'Issue a lesson pass to a client',
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="space-y-3">
      {actions.map(({ mode, icon: Icon, title, description, color }) => (
        <button
          key={mode}
          onClick={() => onSelect(mode)}
          className={cn(
            'w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200',
            'hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100',
            'transition-all duration-150 text-left group',
          )}
        >
          <div className={cn('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0', color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{description}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
        </button>
      ))}
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <div className="h-16 w-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <div className="text-center">
        <div className="text-base font-semibold text-gray-900">{message}</div>
        <div className="text-sm text-gray-500 mt-1">Closing automatically…</div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function QuickActionModal({ open, onClose }: QuickActionModalProps) {
  const { orgId, user, userData } = useAuth();
  const [mode, setMode] = useState<Mode>('pick');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setMode('pick');
      setSuccessMsg(null);
    }
  }, [open]);

  const handleSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
  }, []);

  const handleSuccessClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;
  if (!orgId) return null;

  const titles: Record<Mode, string> = {
    pick: 'Quick Action',
    book: 'Book a Lesson',
    availability: 'Add Availability',
    pass: 'Add Pass',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-50 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto',
          'left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2',
          'top-1/2 -translate-y-1/2',
          'max-h-[90vh] flex flex-col',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={titles[mode]}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {mode !== 'pick' && !successMsg && (
              <button
                onClick={() => setMode('pick')}
                className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Back"
              >
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-base font-semibold text-gray-900">{successMsg ? 'Done' : titles[mode]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {successMsg ? (
            <SuccessScreen
              message={successMsg}
              onClose={handleSuccessClose}
            />
          ) : mode === 'pick' ? (
            <ActionPicker onSelect={setMode} />
          ) : mode === 'book' ? (
            <BookLessonForm
              orgId={orgId}
              user={user}
              userData={userData}
              onSuccess={() => handleSuccess('Lesson booked!')}
              onBack={() => setMode('pick')}
            />
          ) : mode === 'pass' ? (
            <AddPassForm
              orgId={orgId}
              user={user}
              userData={userData}
              onSuccess={() => handleSuccess('Pass added!')}
              onBack={() => setMode('pick')}
            />
          ) : (
            <AddAvailabilityForm
              orgId={orgId}
              onSuccess={() => handleSuccess('Availability added!')}
              onBack={() => setMode('pick')}
            />
          )}
        </div>
      </div>
    </>
  );
}
