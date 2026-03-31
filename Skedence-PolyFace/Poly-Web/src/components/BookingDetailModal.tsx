'use client';

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
} from 'lucide-react';
import type { Booking } from '@/types';

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  confirmed: {
    label: 'Confirmed',
    icon: <CheckCircle size={15} />,
    bg: 'bg-green-100',
    text: 'text-green-700',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle size={15} />,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle size={15} />,
    bg: 'bg-red-100',
    text: 'text-red-600',
  },
};

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

export default function BookingDetailModal({ booking, onClose }: Props) {
  if (!booking) return null;

  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.confirmed;

  // Resolve athlete list — combine all sources
  const athletes: string[] = [];
  if (booking.athleteNames && booking.athleteNames.length > 0) {
    athletes.push(...booking.athleteNames);
  } else {
    if (booking.athleteName) athletes.push(booking.athleteName);
    if (booking.secondAthleteName) athletes.push(booking.secondAthleteName);
  }

  const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());

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
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Status chip */}
          <div className={`inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
            {cfg.icon}
            {cfg.label}
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

        {/* Close button */}
        <div className="px-6 pb-6 pt-3">
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
