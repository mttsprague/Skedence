'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileText, ExternalLink, Plus, ChevronDown, User, X, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchUserDocuments, fetchUserProfile, fetchOrgSettings, saveWaiver,
} from '@/lib/firestore';
import type { UserDocument, UserProfile, AthleteInfo } from '@/types';
import { resolveAthletes, athleteDisplayName } from '@/types';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import WaiverModal from '@/components/WaiverModal';

// ─── Document row (same as profile page) ─────────────────────────────────────
function DocumentRow({ doc }: { doc: UserDocument }) {
  const isWaiver = doc.type === 'waiver' || doc.type === 'waiver_agreement';
  const label = doc.displayName ?? doc.name;
  const dateStr = doc.uploadedAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

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
      <div className="flex items-center gap-2 shrink-0">
        {isWaiver && (
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
            Signed
          </span>
        )}
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="p-2 text-gray-400 hover:text-pva-navy transition-colors"
            title="View document"
          >
            <ExternalLink size={16} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ─── Athlete picker sheet ─────────────────────────────────────────────────────
interface AthletePickerProps {
  athletes: AthleteInfo[];
  guardianName: string;
  onGuardianNameChange: (v: string) => void;
  selectedAthlete: string;       // display name
  onSelectAthlete: (v: string) => void;
  onClose: () => void;
  onContinue: () => void;
}

type NewAthleteFields = { firstName: string; lastName: string };

function AthletePicker({
  athletes, guardianName, onGuardianNameChange,
  selectedAthlete, onSelectAthlete, onClose, onContinue,
}: AthletePickerProps) {
  const [showNewAthlete, setShowNewAthlete] = useState(false);
  const [newAthlete, setNewAthlete] = useState<NewAthleteFields>({ firstName: '', lastName: '' });

  const existingNames = athletes
    .map((a) => athleteDisplayName(a).trim())
    .filter(Boolean);

  function handleSelectExisting(name: string) {
    onSelectAthlete(name);
    setShowNewAthlete(false);
  }

  function handleNewAthleteConfirm() {
    const full = [newAthlete.firstName.trim(), newAthlete.lastName.trim()].filter(Boolean).join(' ');
    if (!full) return;
    onSelectAthlete(full);
    setShowNewAthlete(false);
  }

  const canContinue = selectedAthlete.trim() && guardianName.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-pva-navy">Sign New Waiver</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Choose the athlete and fill in guardian info</p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Guardian name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Parent / Guardian Name
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => onGuardianNameChange(e.target.value)}
              placeholder="Full name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30"
            />
          </div>

          {/* Athlete selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Athlete
            </label>
            <div className="space-y-2">
              {existingNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectExisting(name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left
                    ${selectedAthlete === name
                      ? 'border-pva-navy bg-pva-navy/5 text-pva-navy'
                      : 'border-gray-200 text-gray-700 hover:border-pva-navy/40'
                    }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                    ${selectedAthlete === name ? 'bg-pva-navy text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {name[0]?.toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm">{name}</span>
                  {selectedAthlete === name && (
                    <span className="ml-auto text-xs bg-pva-navy text-white px-2 py-0.5 rounded-full">Selected</span>
                  )}
                </button>
              ))}

              {/* New athlete toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowNewAthlete((v) => !v);
                  if (!showNewAthlete) onSelectAthlete('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left
                  ${showNewAthlete
                    ? 'border-pva-teal bg-pva-teal/5 text-pva-teal'
                    : 'border-dashed border-gray-300 text-gray-500 hover:border-pva-navy/40 hover:text-pva-navy'
                  }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                  ${showNewAthlete ? 'bg-pva-teal text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <Plus size={14} />
                </div>
                <span className="font-semibold text-sm">New Athlete</span>
                <ChevronDown
                  size={16}
                  className={`ml-auto transition-transform ${showNewAthlete ? 'rotate-180' : ''}`}
                />
              </button>

              {/* New athlete fields */}
              {showNewAthlete && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
                      <input
                        type="text"
                        value={newAthlete.firstName}
                        onChange={(e) => setNewAthlete((p) => ({ ...p, firstName: e.target.value }))}
                        placeholder="First"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={newAthlete.lastName}
                        onChange={(e) => setNewAthlete((p) => ({ ...p, lastName: e.target.value }))}
                        placeholder="Last"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pva-navy/30"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNewAthleteConfirm}
                    disabled={!newAthlete.firstName.trim() && !newAthlete.lastName.trim()}
                    className="w-full bg-pva-teal text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 transition hover:bg-pva-teal/90"
                  >
                    Use This Athlete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview of selected */}
          {selectedAthlete && (
            <div className="bg-pva-navy/5 rounded-xl px-4 py-3 flex items-center gap-3">
              <User size={16} className="text-pva-navy" />
              <div className="text-sm">
                <span className="text-gray-500">Signing for: </span>
                <span className="font-bold text-pva-navy">{selectedAthlete}</span>
              </div>
            </div>
          )}
        </div>

        {/* Continue button */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full bg-pva-navy text-white font-black py-4 rounded-2xl text-base
              hover:bg-pva-teal transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Review & Sign Waiver
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Standalone WaiverModal with custom guardian name ─────────────────────────
// We wrap WaiverModal but with a guardian name override fed through a temporary
// profile-like object so the modal's pre-fill logic works correctly.
interface StandaloneWaiverProps {
  waiverText: string;
  userProfile: UserProfile | null;
  userDocId: string;
  guardianName: string;
  athleteName: string;
  onSigned: () => void;
  onClose: () => void;
}

function StandaloneWaiver({
  waiverText, userProfile, userDocId, guardianName, athleteName, onSigned, onClose,
}: StandaloneWaiverProps) {
  // Build a synthetic profile override that injects the guardian name the user typed
  const nameParts = guardianName.trim().split(/\s+/);
  const overrideProfile: UserProfile | null = userProfile
    ? {
        ...userProfile,
        firstName: nameParts[0] ?? userProfile.firstName,
        lastName: nameParts.slice(1).join(' ') || userProfile.lastName,
      }
    : null;

  return (
    <WaiverModal
      waiverText={waiverText}
      userProfile={overrideProfile}
      userDocId={userDocId}
      specificAthlete={athleteName}
      onSigned={onSigned}
      confirmLabel="I Agree — Submit Waiver"
      onClose={onClose}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { userDocId, profile: authProfile } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [waiverText, setWaiverText] = useState('');
  const [loading, setLoading] = useState(true);

  // Sheet / modal state
  const [showPicker, setShowPicker] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [showWaiver, setShowWaiver] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!userDocId) return;
    try {
      const docs = await fetchUserDocuments(userDocId);
      setDocuments(docs);
    } catch {
      // non-fatal
    }
  }, [userDocId]);

  useEffect(() => {
    if (!userDocId) return;
    setLoading(true);

    Promise.all([
      fetchUserDocuments(userDocId).catch(() => [] as UserDocument[]),
      fetchUserProfile(userDocId),
      fetchOrgSettings(),
    ]).then(([docs, prof, settings]) => {
      setDocuments(docs);
      setProfile(prof);
      if (prof) {
        setAthletes(resolveAthletes(prof));
        // Pre-fill guardian name from profile
        const fullName = [prof.firstName, prof.lastName].filter(Boolean).join(' ');
        setGuardianName(fullName);
      }
      setWaiverText(settings.waiverText ?? '');
    }).finally(() => setLoading(false));
  }, [userDocId]);

  function handleOpenPicker() {
    setSelectedAthlete('');
    // Reset guardian name to profile default each time
    const fullName = profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      : '';
    setGuardianName(fullName);
    setShowPicker(true);
  }

  function handleContinueToWaiver() {
    setShowPicker(false);
    setShowWaiver(true);
  }

  function handleWaiverSigned() {
    setShowWaiver(false);
    // Reload documents so the new one appears immediately
    loadDocs();
  }

  function handleWaiverClose() {
    setShowWaiver(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-pva-navy">Documents & Waivers</h1>
        <p className="text-sm text-gray-500 mt-0.5">View signed waivers and sign new ones</p>
      </div>

      {/* Signed documents list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText size={16} className="text-pva-navy" />
          <h2 className="font-black text-pva-navy text-sm uppercase tracking-wide">Completed Documents</h2>
        </div>
        <div className="px-5">
          {documents.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<FileText size={40} className="text-gray-300" />}
                title="No Documents Yet"
                description="Signed waivers and uploaded documents will appear here."
              />
            </div>
          ) : (
            <div>
              {documents.map((d) => (
                <DocumentRow key={d.id} doc={d} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sign New Waiver button */}
      <button
        onClick={handleOpenPicker}
        className="w-full flex items-center justify-center gap-2 bg-pva-navy text-white font-black
          py-4 rounded-2xl hover:bg-pva-teal transition text-base shadow-sm"
      >
        <Plus size={20} />
        Sign New Waiver
      </button>

      {/* Athlete Picker sheet */}
      {showPicker && (
        <AthletePicker
          athletes={athletes}
          guardianName={guardianName}
          onGuardianNameChange={setGuardianName}
          selectedAthlete={selectedAthlete}
          onSelectAthlete={setSelectedAthlete}
          onClose={() => setShowPicker(false)}
          onContinue={handleContinueToWaiver}
        />
      )}

      {/* Waiver full-screen modal */}
      {showWaiver && (
        <StandaloneWaiver
          waiverText={waiverText}
          userProfile={profile}
          userDocId={userDocId ?? ''}
          guardianName={guardianName}
          athleteName={selectedAthlete}
          onSigned={handleWaiverSigned}
          onClose={handleWaiverClose}
        />
      )}
    </div>
  );
}
