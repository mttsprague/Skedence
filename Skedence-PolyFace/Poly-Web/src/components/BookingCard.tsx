'use client';

import { Clock, MapPin, User, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Booking } from '@/types';
import { resolveDisplayStatus, resolveAthleteNames, isValidDate, statusMeta } from '@/lib/bookingUtils';

/** Pulsing placeholder shown while bookings are loading. */
export function BookingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 flex gap-4 items-start animate-pulse">
      <div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  );
}

interface Props {
  booking: Booking;
  onClick: (booking: Booking) => void;
}

/** Clickable booking row — tap to see full lesson details. */
export default function BookingCard({ booking, onClick }: Props) {
  const displayStatus = resolveDisplayStatus(booking);
  const { label, isCheck, bg, text } = statusMeta(displayStatus);
  const athletes = resolveAthleteNames(booking);

  return (
    <button
      onClick={() => onClick(booking)}
      aria-label={`View lesson${booking.trainerName ? ` with ${booking.trainerName}` : ''}${isValidDate(booking.startTime) ? ` on ${format(booking.startTime, 'MMM d')}` : ''}`}
      className="w-full text-left bg-white rounded-2xl border-2 border-gray-100 hover:border-pva-teal active:scale-[0.99] transition-all p-5 flex gap-4 items-start touch-manipulation"
    >
      {/* Date badge */}
      <div className="w-14 h-14 bg-pva-navy rounded-xl flex flex-col items-center justify-center flex-shrink-0">
        {isValidDate(booking.startTime) ? (
          <>
            <span className="text-gray-400 text-[10px] font-black leading-none">
              {format(booking.startTime, 'MMM').toUpperCase()}
            </span>
            <span className="text-white text-xl font-black leading-snug">
              {format(booking.startTime, 'd')}
            </span>
            <span className="text-gray-400 text-[10px] leading-none">
              {format(booking.startTime, 'EEE')}
            </span>
          </>
        ) : (
          <span className="text-white text-xs font-black">—</span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <h3 className="font-black text-pva-navy text-base leading-tight">
            {booking.trainerName ? `With ${booking.trainerName}` : 'Training Session'}
          </h3>
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${bg} ${text}`}>
            {isCheck ? <CheckCircle size={13} /> : <XCircle size={13} />} {label}
          </span>
        </div>

        {/* Time */}
        {isValidDate(booking.startTime) && isValidDate(booking.endTime) && (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
            <Clock size={13} />
            <span>{format(booking.startTime, 'h:mm a')} – {format(booking.endTime, 'h:mm a')}</span>
          </div>
        )}

        {/* Location */}
        {booking.location && (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
            <MapPin size={13} />
            <span>{booking.location}</span>
          </div>
        )}

        {/* Athletes */}
        {athletes.length > 0 && (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <User size={13} />
            <span>{athletes.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Chevron hint */}
      <ChevronRight size={18} className="text-gray-300 flex-shrink-0 mt-1" />
    </button>
  );
}
