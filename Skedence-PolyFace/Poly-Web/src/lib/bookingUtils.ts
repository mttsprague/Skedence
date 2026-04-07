import type { Booking } from '@/types';

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';

export function resolveDisplayStatus(booking: Booking): BookingStatus {
  if (booking.status === 'cancelled') return 'cancelled';
  const isPast = booking.startTime instanceof Date && booking.startTime < new Date();
  return isPast ? 'completed' : 'confirmed';
}

export function resolveAthleteNames(booking: Booking): string[] {
  if (booking.athleteNames?.length) return [...booking.athleteNames];
  const names: string[] = [];
  if (booking.athleteName) names.push(booking.athleteName);
  if (booking.secondAthleteName) names.push(booking.secondAthleteName);
  return names;
}

export function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

/** Non-JSX status metadata. Use <CheckCircle> if isCheck is true, <XCircle> if false. */
export function statusMeta(status: BookingStatus): { label: string; isCheck: boolean; bg: string; text: string } {
  switch (status) {
    case 'confirmed': return { label: 'Confirmed', isCheck: true,  bg: 'bg-green-100', text: 'text-green-700' };
    case 'completed': return { label: 'Completed', isCheck: true,  bg: 'bg-blue-100',  text: 'text-blue-700'  };
    case 'cancelled': return { label: 'Cancelled', isCheck: false, bg: 'bg-red-100',   text: 'text-red-600'   };
  }
}
