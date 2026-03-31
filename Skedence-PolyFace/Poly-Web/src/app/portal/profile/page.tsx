'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  User, Phone, AlertCircle, FileText, ChevronDown, ChevronUp,
  Plus, Trash2, Save, Pencil, X, CheckCircle, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchUserProfile, saveUserProfile, fetchUserDocuments,
} from '@/lib/firestore';
import type { UserProfile, AthleteInfo, UserDocument } from '@/types';
import { resolveAthletes, athleteDisplayName } from '@/types';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

// ─── Experience level options (mirrors iOS picker) ────────────────────────────
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];

// ─── Athlete card (expandable edit) ──────────────────────────────────────────
function AthleteCard({
  athlete, index, total, onChange, onRemove,
}: {
  athlete: AthleteInfo;
  index: number;
  total: number;
  onChange: (updated: AthleteInfo) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  const heading = athleteDisplayName(athlete).trim() || `${ordinals[index] ?? `Athlete ${index + 1}`} Athlete`;

  function update(key: keyof AthleteInfo, value: string) {
    onChange({ ...athlete, [key]: value });
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-pva-navy/10 flex items-center justify-center shrink-0">
          <User size={16} className="text-pva-navy" />
        </div>
        <span className="flex-1 text-left font-semibold text-pva-navy text-sm">{heading}</span>
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-red-400 hover:text-red-600 rounded transition-colors mr-1"
            aria-label="Remove athlete"
          >
            <Trash2 size={15} />
          </button>
        )}
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" value={athlete.firstName} onChange={(v) => update('firstName', v)} />
          <Field label="Last Name" value={athlete.lastName} onChange={(v) => update('lastName', v)} />
          <Field
            label="Birthday (MM/DD/YYYY)"
            value={athlete.birthday ?? ''}
            onChange={(v) => update('birthday', v)}
            placeholder="MM/DD/YYYY"
          />
          <Field label="School / Club Team" value={athlete.schoolClubTeam ?? ''} onChange={(v) => update('schoolClubTeam', v)} />
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Experience Level</label>
            <select
              value={athlete.experienceLevel ?? 'Beginner'}
              onChange={(e) => update('experienceLevel', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pva-navy/30 bg-white"
            >
              {EXPERIENCE_LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <Field label="Position (optional)" value={athlete.position ?? ''} onChange={(v) => update('position', v)} />
        </div>
      )}
    </div>
  );
}

// ─── Simple labelled input ────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, disabled, type,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pva-navy/30 disabled:bg-gray-100 disabled:text-gray-400"
      />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-pva-navy/10 flex items-center justify-center text-pva-navy">
          {icon}
        </div>
        <h2 className="font-bold text-pva-navy text-base">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────
function DocumentRow({ doc }: { doc: UserDocument }) {
  const isWaiver = doc.type === 'waiver' || doc.type === 'waiver_agreement';
  const label = doc.displayName ?? doc.name;
  const dateStr = doc.uploadedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-pva-navy/10 flex items-center justify-center shrink-0">
        <FileText size={18} className="text-pva-navy" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-pva-navy truncate">{label}</p>
        <p className="text-xs text-gray-500">
          {isWaiver ? 'Signed' : 'Uploaded'} {dateStr}
          {doc.athleteName ? ` · ${doc.athleteName}` : ''}
        </p>
      </div>
      {doc.url ? (
        <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-pva-navy transition-colors">
          <ExternalLink size={16} />
        </a>
      ) : (
        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Signed</span>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { userDocId, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [referredBy, setReferredBy] = useState('');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    if (!userDocId) return;
    setLoading(true);
    try {
      const [prof, docs] = await Promise.all([
        fetchUserProfile(userDocId),
        fetchUserDocuments(userDocId).catch(() => [] as UserDocument[]),
      ]);
      if (prof) {
        setProfile(prof);
        setFirstName(prof.firstName);
        setLastName(prof.lastName);
        setPhone(prof.phoneNumber ?? '');
        setEmergencyName(prof.emergencyContactName ?? '');
        setEmergencyPhone(prof.emergencyContactNumber ?? '');
        setNotes(prof.notesForCoach ?? '');
        setReferredBy(prof.referredBy ?? '');
        setAthletes(resolveAthletes(prof).length > 0 ? resolveAthletes(prof) : [{ firstName: '', lastName: '' }]);
      }
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  }, [userDocId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!userDocId) return;
    setSaving(true);
    try {
      const validAthletes = athletes.filter((a) => a.firstName.trim() || a.lastName.trim());
      await saveUserProfile(userDocId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        emergencyContactName: emergencyName.trim(),
        emergencyContactNumber: emergencyPhone.trim(),
        notesForCoach: notes.trim(),
        referredBy: referredBy.trim(),
        athletes: validAthletes,
      });
      showToast('success', 'Profile saved successfully!');
    } catch {
      showToast('error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function addAthlete() {
    if (athletes.length >= 4) return; // max 4 per iOS app
    setAthletes((prev) => [...prev, { firstName: '', lastName: '' }]);
  }

  function updateAthlete(index: number, updated: AthleteInfo) {
    setAthletes((prev) => prev.map((a, i) => (i === index ? updated : a)));
  }

  function removeAthlete(index: number) {
    setAthletes((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const email = profile?.email ?? authProfile?.email ?? '';

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-pva-navy">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account information and athletes</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Parent / Guardian */}
      <Section title="Parent / Guardian Information" icon={<User size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" value={firstName} onChange={setFirstName} />
          <Field label="Last Name" value={lastName} onChange={setLastName} />
          <div className="sm:col-span-2">
            <Field label="Email Address" value={email} onChange={() => {}} disabled />
          </div>
          <div className="sm:col-span-2">
            <Field label="Phone Number" value={phone} onChange={setPhone} type="tel" placeholder="(555) 000-0000" />
          </div>
        </div>
      </Section>

      {/* Emergency Contact */}
      <Section title="Emergency Contact" icon={<Phone size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label="Contact Name" value={emergencyName} onChange={setEmergencyName} placeholder="Full name" />
          </div>
          <div className="sm:col-span-2">
            <Field label="Contact Phone Number" value={emergencyPhone} onChange={setEmergencyPhone} type="tel" placeholder="(555) 000-0000" />
          </div>
        </div>
      </Section>

      {/* Athletes */}
      <Section title={`Athletes (${athletes.filter(a => a.firstName.trim() || a.lastName.trim()).length || athletes.length})`} icon={<User size={16} />}>
        <div className="space-y-3">
          {athletes.map((a, i) => (
            <AthleteCard
              key={i}
              athlete={a}
              index={i}
              total={athletes.length}
              onChange={(updated) => updateAthlete(i, updated)}
              onRemove={() => removeAthlete(i)}
            />
          ))}
          {athletes.length < 4 && (
            <button
              type="button"
              onClick={addAthlete}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-pva-navy/30 rounded-xl text-pva-navy/70 hover:text-pva-navy hover:border-pva-navy/50 transition-colors text-sm font-semibold"
            >
              <Plus size={16} />
              Add Athlete to Profile
            </button>
          )}
        </div>
      </Section>

      {/* Additional Info */}
      <Section title="Additional Information" icon={<Pencil size={16} />}>
        <div className="space-y-3">
          <Field label="Referred By" value={referredBy} onChange={setReferredBy} placeholder="Who referred you?" />
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes for Coach (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything you'd like your coach to know..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pva-navy/30 resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Documents & Waivers */}
      <Section title="Documents & Waivers" icon={<FileText size={16} />}>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} className="text-gray-300" />}
            title="No Documents Yet"
            description="Signed waivers and other documents will appear here."
          />
        ) : (
          <div>{documents.map((d) => <DocumentRow key={d.id} doc={d} />)}</div>
        )}
      </Section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-pva-navy text-white font-bold py-4 rounded-2xl hover:bg-pva-navy/90 disabled:opacity-50 transition-colors text-base shadow-sm"
      >
        {saving ? <Spinner size="sm" /> : <Save size={18} />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
