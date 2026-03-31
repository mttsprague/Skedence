'use client';

import { useState } from 'react';
import { FileText, User, Mail, Phone, CheckSquare, Square, X } from 'lucide-react';
import Spinner from '@/components/Spinner';
import type { UserProfile } from '@/types';
import { saveWaiver } from '@/lib/firestore';

interface Props {
  waiverText: string;
  userProfile: UserProfile | null;
  userDocId: string;
  /** The specific athlete this waiver is being signed for */
  specificAthlete: string;
  onSigned: () => void;
}

/**
 * Waiver modal — mirrors WaiverAgreementCheckboxView.swift.
 * Per-athlete: shown when a specific athlete doesn't yet have a signed waiver.
 * Pre-fills parent/guardian info from UserProfile.
 * Saves to users/{userId}/documents on submit.
 */
export default function WaiverModal({ waiverText, userProfile, userDocId, specificAthlete, onSigned }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from user profile (read-only display — matches iOS pre-fill pattern)
  const parentName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ');
  const parentEmail = userProfile?.email ?? '';
  const parentPhone = userProfile?.phoneNumber ?? '';
  const primaryAthlete = specificAthlete;

  async function handleSubmit() {
    if (!agreed) return;
    setSaving(true);
    setError('');
    try {
      // Split name back to first/last for the signature record
      const nameParts = parentName.trim().split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || firstName;
      await saveWaiver(userDocId, {
        firstName,
        lastName,
        email: parentEmail,
        phoneNumber: parentPhone,
        athleteName: primaryAthlete || undefined,
      });
      onSigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save waiver. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const displayText = waiverText.trim() ||
    `RELEASE OF LIABILITY AND INDEMNIFICATION AGREEMENT\n\nBy participating in any athletic training sessions, programs, or activities organized or facilitated by PolyFace Volleyball Academy ("the Organization"), the participant (or parent/guardian, if participant is a minor) acknowledges the inherent risks involved in athletic training, including but not limited to physical injury, and voluntarily assumes all such risks.\n\nThe participant/guardian agrees to release, indemnify, and hold harmless the Organization, its owners, trainers, employees, and agents from any and all claims, damages, losses, or expenses arising out of or related to participation in any activities.\n\nThis agreement shall be binding upon the participant, their heirs, executors, and assigns.`;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-pva-navy text-white px-5 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black">Liability Waiver</h1>
            {primaryAthlete && (
              <p className="text-pva-teal font-semibold mt-0.5">For {primaryAthlete}</p>
            )}
            <p className="text-white/60 text-sm mt-1">Please read and agree to continue booking</p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-white" />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">

          {/* Waiver text */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Release of Liability and Indemnification Agreement
              </p>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{displayText}</p>
            </div>
          </div>

          {/* Parent/Guardian info card — mirrors iOS WaiverAgreementCheckboxView parent card */}
          {(parentName || parentEmail || parentPhone) && (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                <User size={16} className="text-pva-navy" />
                <p className="text-sm font-bold text-pva-navy">Parent / Guardian Information</p>
              </div>
              <div className="p-4 space-y-3">
                {parentName && (
                  <div className="flex items-start gap-3">
                    <User size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Name</p>
                      <p className="text-sm font-semibold text-gray-800">{parentName}</p>
                    </div>
                  </div>
                )}
                {parentEmail && (
                  <>
                    <div className="border-t border-blue-100" />
                    <div className="flex items-start gap-3">
                      <Mail size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Email</p>
                        <p className="text-sm font-semibold text-gray-800">{parentEmail}</p>
                      </div>
                    </div>
                  </>
                )}
                {parentPhone && (
                  <>
                    <div className="border-t border-blue-100" />
                    <div className="flex items-start gap-3">
                      <Phone size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Phone</p>
                        <p className="text-sm font-semibold text-gray-800">{parentPhone}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Agreement checkbox — mirrors iOS checkbox pattern */}
          <button
            onClick={() => setAgreed((v) => !v)}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3 text-left active:scale-[0.99] transition"
          >
            {agreed ? (
              <CheckSquare size={22} className="text-pva-navy flex-shrink-0 mt-0.5" />
            ) : (
              <Square size={22} className="text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-snug">
                I have read, understood, and agree to the terms above.
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">
                By checking this box, I confirm the above information is correct and I agree
                on behalf of the participant(s).
              </p>
            </div>
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
              <X size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom action */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-5 py-4 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!agreed || saving}
            className="w-full bg-pva-navy text-white py-4 rounded-2xl font-black text-base
              hover:bg-pva-teal transition disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {saving ? (
              <Spinner size="sm" className="border-white" />
            ) : (
              <>
                <CheckSquare size={18} />
                I Agree — Continue Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
