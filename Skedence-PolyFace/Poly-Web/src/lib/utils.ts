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

/** Generate a name-based Firestore document ID matching iOS IDGenerator.sanitizeName.
 *  Keeps alphanumeric, spaces, and hyphens; replaces spaces with underscores; lowercases.
 *  e.g. "Mary-Jane Watson" → "mary-jane_watson" (matches iOS output) */
export function generateUserDocId(firstName: string, lastName: string): string {
  const sanitize = (s: string) =>
    s.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').toLowerCase().trim();
  return `${sanitize(firstName)}_${sanitize(lastName)}`;
}

/** Generate a sequential reference code matching iOS ReferenceCodeGenerator.generateUserCode.
 *  Format: LASTNAME-F-### (e.g. SMITH-J-001, GARCIA-M-042) */
export async function generateReferenceCode(
  firstName: string,
  lastName: string,
  db: import('firebase/firestore').Firestore
): Promise<string> {
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const lastInitial = lastName.slice(0, 5).toUpperCase().replace(/[ '-]/g, '');
  const firstInitial = firstName.slice(0, 1).toUpperCase();
  const baseCode = `${lastInitial}-${firstInitial}`;

  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('referenceCode', '>=', baseCode),
      where('referenceCode', '<', baseCode + '~')
    )
  );

  let highest = 0;
  snap.docs.forEach(d => {
    const code = d.data().referenceCode as string | undefined;
    if (code) {
      const parts = code.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num)) highest = Math.max(highest, num);
      }
    }
  });

  return `${baseCode}-${String(highest + 1).padStart(3, '0')}`;
}
