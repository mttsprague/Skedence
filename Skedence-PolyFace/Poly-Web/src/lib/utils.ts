import { Timestamp } from 'firebase/firestore';

/** Convert a Firestore Timestamp, Date, or string to a JS Date. */
export function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val as string);
}

/** Compute remaining lessons — NOT stored in Firestore, always derived. */
export function computeRemaining(total: unknown, used: unknown): number {
  return ((total as number) ?? 0) - ((used as number) ?? 0);
}

/** Generate a name-based Firestore document ID matching iOS convention: firstname_lastname */
export function generateUserDocId(firstName: string, lastName: string): string {
  const clean = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `${clean(firstName)}_${clean(lastName)}`;
}
