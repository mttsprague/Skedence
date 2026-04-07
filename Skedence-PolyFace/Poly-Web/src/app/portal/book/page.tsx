'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  Ticket,
  Search,
  X,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { db, ORG_ID } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchOrgTrainers,
  fetchSlotsForMonth,
  fetchSlotsForDay,
  fetchUserPackages,
  fetchGroupClasses,
  fetchUserAthletes,
  fetchOrgSettings,
  fetchSignedWaiverAthletes,
  type OrgSettings,
} from '@/lib/firestore';
import type { Trainer, TrainerScheduleSlot, LessonPackage, GroupClass } from '@/types';
import {
  canBookLessons,
  canBookClasses,
  isValidForTrainer,
  isPassUsable,
  athleteCountForCategory,
  getCategoryDisplayName,
  athleteDisplayName,
} from '@/types';
import type { AthleteInfo } from '@/types';
import { saveUserProfile } from '@/lib/firestore';
import Spinner from '@/components/Spinner';
import WaiverModal from '@/components/WaiverModal';
import Image from 'next/image';
import { format } from 'date-fns';

type PrivateStep = 'trainer' | 'slot' | 'pass' | 'athletes' | 'confirm' | 'done';
type Mode = 'privates' | 'classes';

// ─── CLASS REGISTRATION MODAL ─────────────────────────────────────────────────

function ClassModal({
  cls, passes, athletes, userDocId, onClose, onBooked,
}: {
  cls: GroupClass; passes: LessonPackage[]; athletes: AthleteInfo[];
  userDocId: string; onClose: () => void; onBooked: () => void;
}) {
  const athleteNames = athletes.map(athleteDisplayName);
  const eligiblePasses = passes.filter((p) => {
    if (!isPassUsable(p)) return false;
    if (!canBookClasses(p)) return false;
    if (cls.eligiblePackageIds.length > 0) return cls.eligiblePackageIds.includes(p.packageType);
    return true;
  });

  const passByType = new Map<string, LessonPackage>();
  for (const p of eligiblePasses.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())) {
    if (!passByType.has(p.packageType)) passByType.set(p.packageType, p);
  }
  const uniquePasses = Array.from(passByType.values());
  const totalRemaining = (t: string) => eligiblePasses.filter((p) => p.packageType === t).reduce((s, p) => s + p.remainingLessons, 0);

  const [selectedPass, setSelectedPass] = useState<LessonPackage | null>(uniquePasses[0] ?? null);
  const [selectedAthlete, setSelectedAthlete] = useState(athleteNames[0] ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleRegister() {
    if (!selectedPass) return;
    setLoading(true); setError('');
    try {
      const classRef = doc(db, 'classes', cls.id);
      const passRef = doc(db, 'organizations', ORG_ID, 'users', userDocId, 'packages', selectedPass.id);
      await runTransaction(db, async (tx) => {
        const [classSnap, passSnap] = await Promise.all([tx.get(classRef), tx.get(passRef)]);
        if (!classSnap.exists()) throw new Error('Class no longer available');
        const cd = classSnap.data();
        if (!cd.isOpenForRegistration) throw new Error('Class is no longer open');
        if (cd.currentParticipants >= cd.maxParticipants) throw new Error('Class is now full');
        if (!passSnap.exists()) throw new Error('Pass not found');
        const pd = passSnap.data();
        if ((pd.totalLessons as number) - (pd.lessonsUsed as number) <= 0) throw new Error('No lessons remaining');
        tx.update(classRef, { currentParticipants: increment(1), participantIds: arrayUnion(userDocId) });
        tx.update(passRef, { lessonsUsed: (pd.lessonsUsed as number) + 1 });
        tx.set(doc(collection(db, 'classRegistrations')), {
          classId: cls.id, clientId: userDocId, orgId: ORG_ID,
          athleteName: selectedAthlete || null, registeredAt: serverTimestamp(),
        });
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-pva-navy rounded-t-2xl p-5 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={20} /></button>
          <h2 className="text-xl font-black pr-8">{cls.title}</h2>
          <p className="text-white/70 text-sm mt-1">{cls.trainerName}</p>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h3 className="text-xl font-black text-pva-navy mb-2">You&apos;re Registered! 🎉</h3>
            <p className="text-gray-500 text-sm mb-6">See you on {format(cls.startTime, 'MMMM d')}!</p>
            <button onClick={onBooked} className="w-full bg-pva-navy text-white py-3 rounded-xl font-bold hover:bg-pva-teal transition">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Calendar size={14} className="text-pva-teal" />{format(cls.startTime, 'EEEE, MMMM d, yyyy')}</div>
              <div className="flex items-center gap-2"><Clock size={14} className="text-pva-teal" />{format(cls.startTime, 'h:mm a')} – {format(cls.endTime, 'h:mm a')}</div>
              {cls.location && <div className="flex items-center gap-2"><MapPin size={14} className="text-pva-teal" />{cls.location}</div>}
              <div className="flex items-center gap-2"><Users size={14} className="text-pva-teal" />{cls.maxParticipants - cls.currentParticipants} spots remaining</div>
            </div>
            {cls.description && <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{cls.description}</p>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
            {uniquePasses.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-bold mb-1">No eligible class passes</p>
                <p>Visit My Passes to purchase a class pass.</p>
                <a href="/portal/passes" className="inline-block mt-2 text-pva-navy font-bold underline">Go to My Passes →</a>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Pass</label>
                  <div className="space-y-2">
                    {uniquePasses.map((p) => {
                      const sel = selectedPass?.id === p.id;
                      return (
                        <button key={p.id} onClick={() => setSelectedPass(p)}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${sel ? 'border-pva-navy bg-pva-navy/5' : 'border-gray-100 hover:border-pva-teal/50'}`}>
                          <Ticket size={16} className={sel ? 'text-pva-navy' : 'text-gray-400'} />
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-sm truncate ${sel ? 'text-pva-navy' : 'text-gray-700'}`}>{p.packageName ?? p.packageType}</div>
                            <div className="text-xs text-gray-400">{totalRemaining(p.packageType)} remaining · expires {format(p.expirationDate, 'MMM d')}</div>
                          </div>
                          {sel && <Check size={15} className="text-pva-navy flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {athleteNames.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Athlete</label>
                    <select value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 text-base font-medium text-gray-700 focus:border-pva-teal focus:outline-none">
                      {athleteNames.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={handleRegister} disabled={loading || !selectedPass}
                  className="w-full bg-pva-navy text-white py-4 rounded-xl font-black hover:bg-pva-teal transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Spinner size="sm" className="border-white" /> : 'Confirm Registration'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADD ATHLETE MODAL ────────────────────────────────────────────────────────

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];

function AddAthleteModal({ userDocId, existingAthletes, onSaved, onClose }: {
  userDocId: string;
  existingAthletes: AthleteInfo[];
  onSaved: (updated: AthleteInfo[]) => void;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [club, setClub] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!firstName.trim() && !lastName.trim()) { setError('Please enter at least a first or last name.'); return; }
    if (existingAthletes.length >= 4) { setError('Maximum of 4 athletes allowed.'); return; }
    setSaving(true); setError('');
    try {
      const newAthlete: AthleteInfo = { firstName: firstName.trim(), lastName: lastName.trim(), birthday: birthday || undefined, schoolClubTeam: club.trim() || undefined, experienceLevel: level };
      const updated = [...existingAthletes, newAthlete];
      await saveUserProfile(userDocId, { athletes: updated });
      onSaved(updated);
    } catch {
      setError('Failed to save athlete. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-pva-navy rounded-t-2xl px-5 py-4 flex items-center justify-between">
          <h3 className="text-white font-black text-lg">Add New Athlete</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Birthday (MM/DD/YYYY)</label>
            <input value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="MM/DD/YYYY" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">School / Club Team</label>
            <input value={club} onChange={(e) => setClub(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Experience Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30 bg-white">
              {EXPERIENCE_LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-pva-navy text-white py-3 rounded-xl font-black hover:bg-pva-teal transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {saving ? <Spinner size="sm" /> : 'Add Athlete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRAINER BIO MODAL ───────────────────────────────────────────────────────

// ─── TRAINER AVATAR ──────────────────────────────────────────────────────────
function TrainerAvatar({ trainer, size = 'md' }: { trainer: Trainer; size?: 'sm' | 'md' | 'lg' }) {
  const imgUrl = trainer.profileImageUrl || trainer.photoURL || trainer.imageUrl;
  const [imgFailed, setImgFailed] = useState(false);
  const initials = `${trainer.firstName?.[0] ?? ''}${trainer.lastName?.[0] ?? ''}` || '?';
  const dims = size === 'sm' ? 'w-10 h-10 text-sm' : size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-14 h-14 text-lg';
  const sizePx = size === 'sm' ? 40 : size === 'lg' ? 80 : 56;
  if (imgUrl && !imgFailed) {
    return (
      <Image
        src={imgUrl}
        alt={`${trainer.firstName} ${trainer.lastName}`}
        width={sizePx}
        height={sizePx}
        unoptimized
        className={`${dims} rounded-full object-cover flex-shrink-0 ring-2 ring-white/40`}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className={`${dims} bg-gradient-to-br from-pva-navy to-pva-teal rounded-full flex items-center justify-center text-white font-black flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── TRAINER BIO MODAL ───────────────────────────────────────────────────────
function TrainerBioModal({ trainer, onClose }: { trainer: Trainer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header — fixed, never scrolls */}
        <div className="bg-gradient-to-br from-pva-navy to-pva-teal p-6 relative flex-shrink-0 sm:rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className="ring-2 ring-white/40 rounded-full flex-shrink-0">
              <TrainerAvatar trainer={trainer} size="lg" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-black text-xl leading-tight">
                {trainer.firstName} {trainer.lastName}
              </h3>
              {trainer.pricingTierName
                ? <div className="text-white/80 text-sm font-semibold mt-0.5">{trainer.pricingTierName}</div>
                : <div className="text-white/60 text-sm mt-0.5">PolyFace Coach</div>}
            </div>
          </div>
        </div>

        {/* Scrollable bio body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">About</h4>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
            {trainer.trainerDescription}
          </p>
        </div>

        {/* Footer — fixed at bottom */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-pva-navy text-white py-3 rounded-xl font-black hover:bg-pva-teal transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRAINER CARD ─────────────────────────────────────────────────────────────

function TrainerCard({ trainer, onSelect }: { trainer: Trainer; onSelect: () => void }) {
  const [showBio, setShowBio] = useState(false);
  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden transition hover:border-pva-teal/60">
        <button onClick={onSelect} aria-label={`Select coach ${trainer.firstName} ${trainer.lastName}`} className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition touch-manipulation">
          <TrainerAvatar trainer={trainer} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-black text-pva-navy text-base">
              {trainer.firstName} {trainer.lastName}
            </div>
            {trainer.pricingTierName
              ? <div className="text-xs font-bold text-pva-teal mt-0.5">{trainer.pricingTierName}</div>
              : <div className="text-xs text-gray-400 mt-0.5">PolyFace Coach</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {trainer.trainerDescription && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowBio(true); }}
                className="text-xs font-bold text-pva-teal bg-pva-teal/10 hover:bg-pva-teal/20 px-3 py-1.5 rounded-full transition">
                View Bio
              </button>
            )}
            <ChevronRight size={20} className="text-gray-300" />
          </div>
        </button>
      </div>
      {showBio && <TrainerBioModal trainer={trainer} onClose={() => setShowBio(false)} />}
    </>
  );
}

// ─── MONTH CALENDAR (mirrors iOS MonthCalendarView) ───────────────────────────

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function MonthCalendar({
  trainerId, selectedDate, onSelectDate,
}: {
  trainerId: string;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
}) {
  const today = new Date();
  const [monthStart, setMonthStart] = useState(() => startOfMonth(today));
  const [availByDay, setAvailByDay] = useState<Map<string, number>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Load slots for this month — mirrors iOS ScheduleService.loadMonthAvailability
  useEffect(() => {
    if (!trainerId) return;
    setLoadingMonth(true);
    fetchSlotsForMonth(trainerId, monthStart.getFullYear(), monthStart.getMonth())
      .then((slots) => {
        const map = new Map<string, number>();
        for (const s of slots) {
          const k = toDateKey(s.startTime);
          map.set(k, (map.get(k) ?? 0) + 1);
        }
        setAvailByDay(map);
      })
      .catch(console.error)
      .finally(() => setLoadingMonth(false));
  }, [trainerId, monthStart]);

  // Build grid
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDow + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(year, month, dayNum);
  });

  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function changeMonth(delta: number) {
    setMonthStart(m => startOfMonth(new Date(m.getFullYear(), m.getMonth() + delta, 1)));
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
          <ChevronLeft size={18} className="text-pva-navy" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-black text-pva-navy text-base">{monthLabel}</span>
          {loadingMonth && <div className="w-3 h-3 border-2 border-pva-navy/30 border-t-pva-navy rounded-full animate-spin" />}
        </div>
        <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
          <ChevronRight size={18} className="text-pva-navy" />
        </button>
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = toDateKey(day);
          const count = availByDay.get(key) ?? 0;
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isToday = isSameDay(day, today);
          const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const hasSlots = count > 0;
          return (
            <button key={i} disabled={!hasSlots || isPast} onClick={() => onSelectDate(day)}
              className="flex flex-col items-center py-1 rounded-xl transition disabled:cursor-default"
              style={{ opacity: isPast && !hasSlots ? 0.3 : 1 }}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition
                ${isSelected ? 'bg-pva-navy text-white' : isToday ? 'ring-2 ring-pva-navy/30 text-pva-navy' : hasSlots ? 'text-pva-navy hover:bg-pva-navy/10' : 'text-gray-300'}`}>
                {day.getDate()}
              </div>
              {/* Dot — mirrors iOS yellow dot for available days */}
              <div className={`w-1.5 h-1.5 rounded-full mt-0.5 transition ${hasSlots && !isPast ? (isSelected ? 'bg-pva-teal' : 'bg-amber-400') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN BOOK PAGE ────────────────────────────────────────────────────────────

export default function BookPage() {
  const { user, userDocId, profile } = useAuth();
  const [mode, setMode] = useState<Mode>('privates');
  const [step, setStep] = useState<PrivateStep>('trainer');

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [daySlots, setDaySlots] = useState<TrainerScheduleSlot[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [passes, setPasses] = useState<LessonPackage[]>([]);
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [classes, setClasses] = useState<GroupClass[]>([]);
  const [classSearch, setClassSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<GroupClass | null>(null);

  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TrainerScheduleSlot | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [selectedPass, setSelectedPass] = useState<LessonPackage | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Waiver state — per-athlete, mirrors iOS SettingsService.checkWaiverRequirement()
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [signedWaiverAthletes, setSignedWaiverAthletes] = useState<Set<string>>(new Set());
  const [showWaiver, setShowWaiver] = useState(false);
  const [pendingWaiverAthlete, setPendingWaiverAthlete] = useState<string>('');
  const waiverChecked = useRef(false);
  const passesLoaded = useRef(false);

  // Initial loads
  useEffect(() => {
    fetchOrgTrainers().then(setTrainers).catch(console.error);
  }, []);

  // Load org settings + pre-fetch signed waiver athletes once userDocId is known
  useEffect(() => {
    if (!userDocId || waiverChecked.current) return;
    waiverChecked.current = true;
    (async () => {
      try {
        const [settings, signed] = await Promise.all([
          fetchOrgSettings(),
          fetchSignedWaiverAthletes(userDocId),
        ]);
        setOrgSettings(settings);
        setSignedWaiverAthletes(new Set(signed));
      } catch (e) {
        console.error('Waiver check failed:', e);
      }
    })();
  }, [userDocId]);

  // Check if all selected athletes have waivers; return name of first unsigned one or null
  function firstUnsignedAthlete(): string | null {
    if (!orgSettings?.requireWaiver) return null;
    for (const name of selectedAthletes) {
      if (name && !signedWaiverAthletes.has(name.toLowerCase().trim())) return name;
    }
    return null;
  }

  // Called when advancing from athletes → confirm step
  function advanceToConfirm() {
    const unsigned = firstUnsignedAthlete();
    if (unsigned) {
      setPendingWaiverAthlete(unsigned);
      setShowWaiver(true);
    } else {
      setStep('confirm');
    }
  }

  useEffect(() => {
    if (!userDocId) return;
    fetchUserAthletes(userDocId).then(setAthletes).catch(console.error);
  }, [userDocId]);

  useEffect(() => {
    if (!selectedTrainer) return;
    setDaySlots([]); setCalendarDate(null);
  }, [selectedTrainer]);

  const loadPasses = useCallback(async () => {
    if (!userDocId || passesLoaded.current) return;
    passesLoaded.current = true; setLoading(true);
    try { setPasses(await fetchUserPackages(userDocId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userDocId]);

  useEffect(() => { if (step === 'pass') loadPasses(); }, [step, loadPasses]);

  useEffect(() => {
    if (mode !== 'classes' || classes.length > 0) return;
    // ensure passes are loaded for class modal
    loadPasses();
    setLoading(true);
    fetchGroupClasses().then(setClasses).catch(console.error).finally(() => setLoading(false));
  }, [mode, classes.length, loadPasses]);

  // Passes valid for selected trainer (tier + usability + canBookLessons)
  const validPasses = passes.filter((p) =>
    isPassUsable(p) && canBookLessons(p) && (!selectedTrainer || isValidForTrainer(p, selectedTrainer))
  );

  // Auto-select when only one valid pass
  useEffect(() => {
    if (step === 'pass' && validPasses.length === 1 && !selectedPass) setSelectedPass(validPasses[0]);
  }, [step, validPasses, selectedPass]);

  // Athlete slot count based on pass category
  const requiredAthletes = selectedPass ? athleteCountForCategory(selectedPass.packageCategory) : 1;
  const athleteNames = athletes.map(athleteDisplayName);
  useEffect(() => {
    setSelectedAthletes((prev) => {
      if (prev.length === requiredAthletes) return prev;
      const next = [...prev];
      while (next.length < requiredAthletes) next.push(athleteNames[0] ?? '');
      return next.slice(0, requiredAthletes);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredAthletes, athletes]);

  const allAthletesSelected = selectedAthletes.length === requiredAthletes && selectedAthletes.every(Boolean);

  // Filtered classes
  const filteredClasses = classes.filter((c) => {
    if (!classSearch) return true;
    const q = classSearch.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.trainerName.toLowerCase().includes(q);
  });

  // Book private lesson
  async function handleBook() {
    if (!user || !userDocId || !selectedTrainer || !selectedSlot || !selectedPass) return;
    // Defensive waiver gate — re-verify before committing transaction
    const unsigned = firstUnsignedAthlete();
    if (unsigned) {
      setPendingWaiverAthlete(unsigned);
      setShowWaiver(true);
      return;
    }
    setLoading(true); setError('');
    try {
      const clientName = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : userDocId.replace(/_/g, ' ');
      const trainerName = `${selectedTrainer.firstName} ${selectedTrainer.lastName}`.trim();
      const slotRef = doc(db, `trainers/${selectedTrainer.id}/schedules/${selectedSlot.id}`);
      const passRef = doc(db, 'organizations', ORG_ID, 'users', userDocId, 'packages', selectedPass.id);
      await runTransaction(db, async (tx) => {
        const [slotSnap, passSnap] = await Promise.all([tx.get(slotRef), tx.get(passRef)]);
        if (!slotSnap.exists()) throw new Error('Slot no longer exists');
        if (slotSnap.data()?.status !== 'open') throw new Error('This slot was just booked. Please pick another time.');
        if (!passSnap.exists()) throw new Error('Pass not found');
        const pd = passSnap.data();
        if ((pd.totalLessons as number) - (pd.lessonsUsed as number) <= 0) throw new Error('No lessons remaining on this pass');
        // Update slot: status + clientName so admin schedule shows the client name
        tx.update(slotRef, {
          status: 'booked',
          clientId: userDocId,
          clientName,
          bookedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.update(passRef, { lessonsUsed: (pd.lessonsUsed as number) + 1 });
        tx.set(doc(collection(db, 'bookings')), {
          clientId: userDocId, clientUID: userDocId,
          clientName,
          trainerUID: selectedTrainer.id, trainerId: selectedTrainer.id,
          trainerName,
          orgId: ORG_ID, lessonPackageId: selectedPass.id, packageId: selectedPass.id,
          scheduleSlotId: selectedSlot.id, scheduleId: selectedSlot.id, slotId: selectedSlot.id,
          startTime: Timestamp.fromDate(selectedSlot.startTime),
          endTime: Timestamp.fromDate(selectedSlot.endTime),
          status: 'confirmed', location: selectedSlot.location ?? '',
          athleteName: selectedAthletes[0] ?? null,
          secondAthleteName: selectedAthletes[1] ?? null,
          athleteNames: selectedAthletes.filter(Boolean),
          bookedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally { setLoading(false); }
  }

  function resetPrivate() {
    setStep('trainer'); setSelectedTrainer(null); setSelectedSlot(null);
    setCalendarDate(null); setDaySlots([]); setSelectedPass(null); setSelectedAthletes([]); setError('');
    passesLoaded.current = false;
  }

  // Done screen
  if (step === 'done') return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={40} className="text-green-500" />
      </div>
      <h1 className="text-3xl font-black text-pva-navy mb-3">You&apos;re Booked! 🎉</h1>
      <p className="text-gray-600 font-bold mb-1">{format(selectedSlot!.startTime, 'EEEE, MMMM d')}</p>
      <p className="text-gray-500 mb-2">{format(selectedSlot!.startTime, 'h:mm a')} – {format(selectedSlot!.endTime, 'h:mm a')}</p>
      {selectedSlot?.location && <p className="text-gray-400 text-sm mb-2 flex items-center justify-center gap-1"><MapPin size={13} />{selectedSlot.location}</p>}
      {selectedTrainer && <p className="text-gray-500 text-sm mb-6">with <span className="font-bold">{selectedTrainer.firstName} {selectedTrainer.lastName}</span></p>}
      <div className="flex flex-col gap-3">
        <a href="/portal/schedule" className="bg-pva-navy text-white py-4 rounded-xl font-bold text-sm hover:bg-pva-teal transition">View My Schedule</a>
        <button onClick={resetPrivate} className="bg-gray-100 text-gray-700 py-4 rounded-xl font-bold text-sm hover:bg-gray-200 transition">Book Another Session</button>
      </div>
    </div>
  );

  const PRIVATE_STEPS: PrivateStep[] = ['trainer', 'slot', 'pass', 'athletes', 'confirm'];
  const stepLabels: Record<string, string> = { trainer: 'Coach', slot: 'Time', pass: 'Pass', athletes: 'Athletes', confirm: 'Confirm' };
  const stepIndex = PRIVATE_STEPS.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Waiver modal — per-athlete, shown when an athlete hasn't signed yet */}
      {showWaiver && userDocId && (
        <WaiverModal
          waiverText={orgSettings?.waiverText ?? ''}
          userProfile={profile}
          userDocId={userDocId}
          specificAthlete={pendingWaiverAthlete}
          onSigned={() => {
            // Mark this athlete as signed and continue checking remaining athletes
            setSignedWaiverAthletes(prev => new Set(Array.from(prev).concat(pendingWaiverAthlete.toLowerCase().trim())));
            setShowWaiver(false);
            setPendingWaiverAthlete('');
            // Check if there are more unsigned athletes; advance when all are done
            const stillUnsigned = selectedAthletes.filter(
              n => n && n !== pendingWaiverAthlete
                && !signedWaiverAthletes.has(n.toLowerCase().trim())
            );
            if (stillUnsigned.length > 0) {
              setPendingWaiverAthlete(stillUnsigned[0]);
              setShowWaiver(true);
            } else {
              setStep('confirm');
            }
          }}
        />
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-black text-pva-navy">Book a Session</h1>
        <p className="text-gray-500 mt-1">Book a private or register for a class.</p>
      </div>

      {/* Waiver required banner — only show on confirm if a selected athlete is still unsigned */}
      {step === 'confirm' && firstUnsignedAthlete() && !showWaiver && (
        <button
          onClick={() => { const u = firstUnsignedAthlete(); if (u) { setPendingWaiverAthlete(u); setShowWaiver(true); } }}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-left hover:bg-amber-100 transition"
        >
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Waiver required for {firstUnsignedAthlete()}</p>
            <p className="text-xs text-amber-600 mt-0.5">Tap to review and sign the liability waiver</p>
          </div>
          <ChevronRight size={16} className="text-amber-400 flex-shrink-0" />
        </button>
      )}

      {/* Mode tabs — Privates | Classes */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {(['privates', 'classes'] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition capitalize ${mode === m ? 'bg-white text-pva-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {m === 'privates' ? 'Privates' : 'Classes'}
          </button>
        ))}
      </div>

      {/* ── PRIVATES ──────────────────────────────────────────── */}
      {mode === 'privates' && (
        <>
          {/* Progress indicator */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-7">
            {PRIVATE_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 sm:gap-1.5">
                <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  i < stepIndex ? 'bg-pva-teal/10 text-pva-teal' : i === stepIndex ? 'bg-pva-navy text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <span>{i < stepIndex ? <Check size={11} /> : i + 1}</span>
                  <span className="hidden sm:inline">{stepLabels[s]}</span>
                </div>
                {i < PRIVATE_STEPS.length - 1 && <div className={`h-px w-2 sm:w-3 ${i < stepIndex ? 'bg-pva-teal' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm font-medium">{error}</div>}

          {/* Step 1: Trainer */}
          {step === 'trainer' && (
            <div>
              <h2 className="text-xl font-black text-pva-navy mb-4">Choose Your Coach</h2>
              {trainers.length === 0 ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
                <div className="space-y-3">
                  {trainers.map((t) => (
                    <TrainerCard key={t.id} trainer={t} onSelect={() => {
                      setSelectedTrainer(t);
                      setCalendarDate(null);
                      setSelectedSlot(null);
                      setStep('slot');
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Slot — calendar with dots, times below on day tap */}
          {step === 'slot' && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setStep('trainer')} className="text-gray-400 hover:text-pva-navy transition"><ChevronLeft size={22} /></button>
                <div>
                  <h2 className="text-xl font-black text-pva-navy">Pick a Time with {selectedTrainer?.firstName}</h2>
                  {selectedTrainer?.pricingTierName && <p className="text-xs text-pva-teal font-bold">{selectedTrainer.pricingTierName}</p>}
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
              ) : (
                <div className="space-y-5">
                  <MonthCalendar
                    trainerId={selectedTrainer!.id}
                    selectedDate={calendarDate}
                    onSelectDate={(d) => {
                      setCalendarDate(d);
                      setSelectedSlot(null);
                      setDaySlots([]);
                      setLoadingDay(true);
                      fetchSlotsForDay(selectedTrainer!.id, d)
                        .then(setDaySlots)
                        .catch(console.error)
                        .finally(() => setLoadingDay(false));
                    }}
                  />

                  {/* Times for selected day — mirrors iOS ScheduleService.loadOpenSlots */}
                  {calendarDate && (
                      <div>
                        <h3 className="text-sm font-black text-pva-navy mb-3">
                          {calendarDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        {loadingDay ? (
                          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
                        ) : daySlots.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-4">No available slots on this day.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {daySlots.map((slot) => {
                              const isSelected = selectedSlot?.id === slot.id;
                              return (
                                <button key={slot.id}
                                  onClick={() => setSelectedSlot(isSelected ? null : slot)}
                                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${format(slot.startTime, 'h:mm a')} time slot`}
                                  className={`rounded-2xl border-2 p-4 transition text-left touch-manipulation ${
                                    isSelected ? 'border-pva-navy bg-pva-navy/5' : 'bg-white border-gray-100 hover:border-pva-teal hover:bg-pva-teal/5'
                                  }`}>
                                  <div className={`flex items-center gap-1.5 font-bold text-sm mb-1 ${isSelected ? 'text-pva-navy' : 'text-pva-navy'}`}>
                                    <Clock size={13} className="text-pva-teal" />
                                    {format(slot.startTime, 'h:mm a')}
                                  </div>
                                  <div className="text-xs text-gray-400">{format(slot.endTime, 'h:mm a')}</div>
                                  {slot.location && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                                      <MapPin size={11} />{slot.location}
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="mt-2 flex items-center gap-1 text-pva-teal">
                                      <Check size={13} /><span className="text-xs font-bold">Selected</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                  )}

                  {/* Continue button — only active when a slot is selected */}
                  {selectedSlot && (
                    <button
                      onClick={() => setStep('pass')}
                      className="w-full bg-pva-navy text-white py-4 rounded-2xl font-black hover:bg-pva-teal transition flex items-center justify-center gap-2">
                      Continue with {format(selectedSlot.startTime, 'h:mm a')}
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pass */}
          {step === 'pass' && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setStep('slot')} className="text-gray-400 hover:text-pva-navy transition"><ChevronLeft size={22} /></button>
                <h2 className="text-xl font-black text-pva-navy">Select Pass</h2>
              </div>
              {selectedSlot && (
                <div className="bg-pva-navy/5 border border-pva-navy/10 rounded-xl p-4 mb-5 flex items-center gap-3">
                  <Clock size={15} className="text-pva-teal flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold text-pva-navy">{format(selectedSlot.startTime, 'EEEE, MMM d')}</span>
                    <span className="text-gray-500"> · {format(selectedSlot.startTime, 'h:mm a')} – {format(selectedSlot.endTime, 'h:mm a')}</span>
                    {selectedSlot.location && <span className="text-gray-400"> · {selectedSlot.location}</span>}
                  </div>
                </div>
              )}
              {loading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : validPasses.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
                  <p className="font-black mb-1">No valid passes for this coach</p>
                  {selectedTrainer?.pricingTierName
                    ? <p>You need a <strong>{selectedTrainer.pricingTierName}</strong> pass to book with this coach.</p>
                    : <p>You have no lesson passes with remaining sessions.</p>}
                  <a href="/portal/passes" className="inline-block mt-3 text-pva-navy font-bold underline">Go to My Passes →</a>
                </div>
              ) : (
                <div className="space-y-3">
                  {validPasses.map((p) => {
                    const sel = selectedPass?.id === p.id;
                    const name = p.packageName ?? getCategoryDisplayName(p.packageCategory);
                    return (
                      <button key={p.id} onClick={() => { setSelectedPass(p); setStep('athletes'); }}
                        className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition text-left group ${sel ? 'border-pva-navy bg-pva-navy/5' : 'bg-white border-gray-100 hover:border-pva-teal'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${sel ? 'bg-pva-navy' : 'bg-pva-navy/10'}`}>
                          <Ticket size={20} className={sel ? 'text-white' : 'text-pva-navy'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-pva-navy text-sm">{name}</div>
                          {p.pricingTierName && <div className="text-xs font-bold text-pva-teal">{p.pricingTierName}</div>}
                          <div className="text-xs text-gray-400 mt-0.5">{p.remainingLessons} of {p.totalLessons} remaining · expires {format(p.expirationDate, 'MMM d, yyyy')}</div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-pva-teal transition flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Athletes */}
          {step === 'athletes' && selectedPass && (
            <div>
              {showAddAthlete && userDocId && (
                <AddAthleteModal
                  userDocId={userDocId}
                  existingAthletes={athletes}
                  onSaved={(updated) => {
                    setAthletes(updated);
                    setShowAddAthlete(false);
                  }}
                  onClose={() => setShowAddAthlete(false)}
                />
              )}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setStep('pass')} className="text-gray-400 hover:text-pva-navy transition"><ChevronLeft size={22} /></button>
                <div>
                  <h2 className="text-xl font-black text-pva-navy">{requiredAthletes === 1 ? 'Select Athlete' : `Select ${requiredAthletes} Athletes`}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{getCategoryDisplayName(selectedPass.packageCategory)} lesson</p>
                </div>
              </div>
              <div className="space-y-4">
                {Array.from({ length: requiredAthletes }, (_, i) => {
                  const takenInOtherSlots = selectedAthletes.filter((_, idx) => idx !== i);
                  const available = athletes.filter((a) => {
                    const name = athleteDisplayName(a);
                    return !takenInOtherSlots.includes(name);
                  });
                  return (
                    <div key={i}>
                      {requiredAthletes > 1 && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Athlete {i + 1}</label>}
                      <div className="space-y-2">
                        {available.map((a) => {
                          const name = athleteDisplayName(a);
                          const sel = selectedAthletes[i] === name;
                          return (
                            <div key={name}>
                              <button onClick={() => { const u = [...selectedAthletes]; u[i] = name; setSelectedAthletes(u); }}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${sel ? 'border-pva-navy bg-pva-navy/5' : 'border-gray-100 hover:border-pva-teal/50 bg-white'}`}>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${sel ? 'bg-pva-navy text-white' : 'bg-gray-100 text-gray-500'}`}>{(a.firstName || name)[0]}</div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-bold text-sm ${sel ? 'text-pva-navy' : 'text-gray-700'}`}>{name}</div>
                                  {(a.experienceLevel || a.schoolClubTeam) && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      {[a.experienceLevel, a.schoolClubTeam].filter(Boolean).join(' · ')}
                                    </div>
                                  )}
                                </div>
                                {sel ? <Check size={16} className="text-pva-navy flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
                              </button>
                              {/* Athlete detail card when selected */}
                              {sel && (
                                <div className="bg-pva-navy/5 border border-pva-navy/10 rounded-xl p-4 mt-2 text-sm space-y-1">
                                  {a.birthday && <div className="text-gray-500">🎂 <span className="font-medium">{a.birthday}</span></div>}
                                  {a.schoolClubTeam && <div className="text-gray-500">🏫 <span className="font-medium">{a.schoolClubTeam}</span></div>}
                                  {a.experienceLevel && <div className="text-gray-500">🏐 <span className="font-medium">{a.experienceLevel}</span></div>}
                                  <a href="/portal/profile" className="block text-xs text-pva-teal font-bold mt-2 hover:underline">Edit athlete info →</a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Add New Athlete option — hidden when at 4 athlete cap */}
                        {athletes.length < 4 && (
                          <button onClick={() => setShowAddAthlete(true)}
                            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-pva-navy/20 hover:border-pva-navy/40 bg-white transition text-left">
                            <div className="w-9 h-9 rounded-full bg-pva-navy/10 flex items-center justify-center flex-shrink-0">
                              <Plus size={16} className="text-pva-navy" />
                            </div>
                            <span className="font-bold text-sm text-pva-navy/70">Add New Athlete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={advanceToConfirm} disabled={!allAthletesSelected}
                className="w-full mt-6 bg-pva-navy text-white py-4 rounded-xl font-black hover:bg-pva-teal transition disabled:opacity-40 disabled:cursor-not-allowed">
                Continue to Confirm
              </button>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 'confirm' && selectedSlot && selectedTrainer && selectedPass && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setStep('athletes')} className="text-gray-400 hover:text-pva-navy transition"><ChevronLeft size={22} /></button>
                <h2 className="text-xl font-black text-pva-navy">Confirm Booking</h2>
              </div>
              <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden mb-5">
                <div className="bg-pva-navy p-5 text-white">
                  <div className="text-lg font-black">{format(selectedSlot.startTime, 'EEEE, MMMM d')}</div>
                  <div className="text-white/70 text-sm mt-0.5">{format(selectedSlot.startTime, 'h:mm a')} – {format(selectedSlot.endTime, 'h:mm a')}</div>
                </div>
                <div className="p-5 space-y-4 text-sm">
                  <DetailRow icon={<User size={14} />} label="Coach" value={`${selectedTrainer.firstName} ${selectedTrainer.lastName}`} />
                  {selectedSlot.location && <DetailRow icon={<MapPin size={14} />} label="Location" value={selectedSlot.location} />}
                  <DetailRow icon={<Ticket size={14} />} label="Pass" value={selectedPass.packageName ?? getCategoryDisplayName(selectedPass.packageCategory)} />
                  <DetailRow icon={<User size={14} />} label={selectedAthletes.length > 1 ? 'Athletes' : 'Athlete'} value={selectedAthletes.filter(Boolean).join(', ') || '—'} />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>}
              {/* Waiver gate on confirm step — per unsigned athlete */}
              {firstUnsignedAthlete() ? (
                <button
                  onClick={() => { const u = firstUnsignedAthlete(); if (u) { setPendingWaiverAthlete(u); setShowWaiver(true); } }}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-4 rounded-xl font-black hover:bg-amber-600 transition"
                >
                  <ShieldCheck size={18} />
                  Sign Waiver for {firstUnsignedAthlete()}
                </button>
              ) : (
                <button onClick={handleBook} disabled={loading}
                  className="w-full bg-pva-navy text-white py-4 rounded-xl font-black hover:bg-pva-teal transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Spinner size="sm" className="border-white" /> : <><Check size={18} /> Confirm Booking</>}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CLASSES ───────────────────────────────────────────── */}
      {mode === 'classes' && (
        <div>
          <div className="flex items-center gap-3 bg-white border-2 border-gray-100 rounded-xl px-4 py-3 mb-5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search classes…" value={classSearch} onChange={(e) => setClassSearch(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder-gray-400" />
            {classSearch && <button onClick={() => setClassSearch('')}><X size={14} className="text-gray-400" /></button>}
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : filteredClasses.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-10 text-center">
              <Calendar size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-bold mb-1">{classSearch ? 'No classes match your search' : 'No Upcoming Classes'}</p>
              <p className="text-gray-400 text-sm">Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClasses.map((cls) => {
                const spotsLeft = cls.maxParticipants - cls.currentParticipants;
                const isFull = spotsLeft <= 0;
                return (
                  <button key={cls.id} onClick={() => !isFull && setSelectedClass(cls)} disabled={isFull}
                    className={`w-full text-left bg-white rounded-2xl border-2 overflow-hidden transition group ${isFull ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-100 hover:border-pva-teal'}`}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-pva-navy text-base leading-tight">{cls.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{cls.trainerName}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${isFull ? 'bg-gray-100 text-gray-400' : spotsLeft <= 3 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                          {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-pva-teal" />{format(cls.startTime, 'MMM d, yyyy')}</div>
                        <div className="flex items-center gap-1.5"><Clock size={12} className="text-pva-teal" />{format(cls.startTime, 'h:mm a')} – {format(cls.endTime, 'h:mm a')}</div>
                        {cls.location && <div className="flex items-center gap-1.5"><MapPin size={12} className="text-pva-teal" />{cls.location}</div>}
                        <div className="flex items-center gap-1.5"><Users size={12} className="text-pva-teal" />{cls.currentParticipants}/{cls.maxParticipants}</div>
                      </div>
                      {cls.description && <p className="text-xs text-gray-400 mt-3 line-clamp-2">{cls.description}</p>}
                    </div>
                    {!isFull && (
                      <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-pva-teal">Register with a class pass</span>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-pva-teal transition" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Class registration modal */}
      {selectedClass && userDocId && (
        <ClassModal cls={selectedClass} passes={passes} athletes={athletes} userDocId={userDocId}
          onClose={() => setSelectedClass(null)}
          onBooked={() => { setSelectedClass(null); fetchGroupClasses().then(setClasses).catch(console.error); }} />
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-pva-teal mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <div className="text-gray-400 text-xs">{label}</div>
        <div className="font-bold text-pva-navy">{value}</div>
      </div>
    </div>
  );
}
