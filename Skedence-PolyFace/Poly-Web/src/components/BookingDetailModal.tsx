'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Booking } from '@/types';
import { resolveDisplayStatus, resolveAthleteNames, isValidDate, statusMeta } from '@/lib/bookingUtils';
import { cancelBooking } from '@/lib/firestore';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onCancelled?: () => void;
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-pva-navy/5 flex items-center justify-center flex-shrink-0 text-pva-navy mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-pva-navy font-bold text-sm mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function BookingDetailModal({ booking, onClose, onCancelled }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!booking) return;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [booking]);

  if (!booking) return null;

  const displayStatus = resolveDisplayStatus(booking);
  const { label, isCheck, bg, text } = statusMeta(displayStatus);
  const athletes = resolveAthleteNames(booking);
  const canCancel = displayStatus === 'confirmed' && booking.startTime > new Date();

  async function handleCancel() {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelBooking(booking!.id, booking!);
      onCancelled?.();
      onClose();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel. Please try again.');
      setCancelling(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-pva-navy px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                Lesson Details
              </p>
              <h2 className="text-white font-black text-xl leading-tight">
                {isValidDate(booking.startTime)
                  ? format(booking.startTime, 'EEEE, MMMM d')
                  : 'Training Session'}
              </h2>
              {isValidDate(booking.startTime) && (
                <p className="text-gray-400 text-sm mt-0.5">
                  {format(booking.startTime, 'yyyy')}
                </p>
              )}
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close lesson details"
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Status chip */}
          <div className={`inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>
            {isCheck ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {label}
          </div>
        </div>

        {/* Detail rows */}
        <div className="px-6 py-2 divide-y divide-gray-100">
          {isValidDate(booking.startTime) && isValidDate(booking.endTime) && (
            <Row
              icon={<Clock size={15} />}
              label="Time"
              value={`${format(booking.startTime, 'h:mm a')} – ${format(booking.endTime, 'h:mm a')}`}
            />
          )}

          {isValidDate(booking.startTime) && (
            <Row
              icon={<Calendar size={15} />}
              label="Date"
              value={format(booking.startTime, 'EEEE, MMMM d, yyyy')}
            />
          )}

          {booking.trainerName && (
            <Row
              icon={<User size={15} />}
              label="Coach"
              value={booking.trainerName}
            />
          )}

          {booking.location && (
            <Row
              icon={<MapPin size={15} />}
              label="Location"
              value={booking.location}
            />
          )}

          {athletes.length > 0 && (
            <Row
              icon={athletes.length > 1 ? <Users size={15} /> : <User size={15} />}
              label={athletes.length > 1 ? 'Athletes' : 'Athlete'}
              value={athletes.join(', ')}
            />
          )}

          {(booking.packageName || booking.packageType) && (
            <Row
              icon={<Package size={15} />}
              label="Pass Used"
              value={booking.packageName ?? booking.packageType ?? 'Lesson Pass'}
            />
          )}

          {booking.lessonNotes && (
            <Row
              icon={<AlertCircle size={15} />}
              label="Notes"
              value={booking.lessonNotes}
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 space-y-2">
          {canCancel && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition"
            >
              Cancel Lesson
            </button>
          )}
          {confirmCancel && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-red-700 text-center">Cancel this booking?</p>
              <p className="text-xs text-red-500 text-center">The time slot will be freed for others.</p>
              {cancelError && <p className="text-xs text-red-600 text-center">{cancelError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition"
                >
                  Keep Lesson
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {cancelling
                    ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</>
                    : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-100 text-pva-navy font-bold hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
