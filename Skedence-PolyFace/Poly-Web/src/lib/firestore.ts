/**
 * Shared Firestore data-fetch helpers.
 * All functions throw on error — callers should wrap in try/catch.
 */
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db, ORG_ID } from './firebase';
import type { Trainer, TrainerScheduleSlot, LessonPackage, Booking, GroupClass, UserProfile, UserDocument, AthleteInfo, BlogPost } from '@/types';
import { toDate, computeRemaining } from './utils';
import { athleteDisplayName } from '@/types';

/** Fetch all active trainers for the org, sorted by displayOrder then name. */
export async function fetchOrgTrainers(): Promise<Trainer[]> {
  // Single-field query — avoid composite index requirement
  const snap = await getDocs(
    query(collection(db, 'trainers'), where('orgId', '==', ORG_ID))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Trainer))
    .filter((t) => t.active !== false)
    .sort((a, b) => {
      const aOrder = (a as any).displayOrder ?? 999;
      const bOrder = (b as any).displayOrder ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
}

/** Decode a raw Firestore schedule doc into a TrainerScheduleSlot. */
function decodeSlot(id: string, data: Record<string, any>, trainerId: string): TrainerScheduleSlot {
  return {
    id,
    trainerId,
    ...data,
    startTime: toDate(data.startTime),
    endTime: toDate(data.endTime),
    location: typeof data.location === 'string' ? data.location.trim() || undefined : data.location,
  } as TrainerScheduleSlot;
}

/**
 * Fetch open slots for a trainer in a specific month.
 * Mirrors iOS ScheduleRepository.fetchInRange — range query on startTime (no status in
 * Firestore query), then filter status == 'open' client-side. No composite index needed.
 */
export async function fetchSlotsForMonth(
  trainerId: string,
  year: number,
  month: number // 0-indexed
): Promise<TrainerScheduleSlot[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const snap = await getDocs(
    query(
      collection(db, `trainers/${trainerId}/schedules`),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime')
    )
  );
  const now = new Date();
  return snap.docs
    .map((d) => decodeSlot(d.id, d.data(), trainerId))
    .filter((s) => s.status === 'open' && s.startTime > now && !!s.location);
}

/**
 * Fetch open slots for a trainer on a specific day.
 * Mirrors iOS ScheduleService.loadOpenSlots — startOfDay to endOfDay range query.
 */
export async function fetchSlotsForDay(
  trainerId: string,
  date: Date
): Promise<TrainerScheduleSlot[]> {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  const snap = await getDocs(
    query(
      collection(db, `trainers/${trainerId}/schedules`),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime')
    )
  );
  const now = new Date();
  return snap.docs
    .map((d) => decodeSlot(d.id, d.data(), trainerId))
    .filter((s) => s.status === 'open' && s.startTime > now && !!s.location);
}

/**
 * Fetch all lesson packages for a user.
 * `remainingLessons` is computed client-side (not stored in Firestore).
 */
export async function fetchUserPackages(userDocId: string): Promise<LessonPackage[]> {
  const snap = await getDocs(
    collection(db, 'organizations', ORG_ID, 'users', userDocId, 'packages')
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      remainingLessons: computeRemaining(data.totalLessons, data.lessonsUsed),
      purchaseDate: toDate(data.purchaseDate),
      expirationDate: toDate(data.expirationDate),
    } as LessonPackage;
  });
}

/** Module-level trainer map cache — avoids redundant Firestore reads across bookings fetches. */
let _trainerMapCache: { map: Map<string, string>; ts: number } | null = null;
const TRAINER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Build a map of trainerId → full name, with 5-minute in-memory cache. */
async function buildTrainerMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (_trainerMapCache && now - _trainerMapCache.ts < TRAINER_CACHE_TTL) {
    return _trainerMapCache.map;
  }
  const snap = await getDocs(
    query(collection(db, 'trainers'), where('orgId', '==', ORG_ID))
  );
  const map = new Map<string, string>();
  snap.docs.forEach((d) => {
    const data = d.data();
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
    if (name) map.set(d.id, name);
  });
  _trainerMapCache = { map, ts: now };
  return map;
}

/** Build a map of packageId → { packageName, packageType } from the user's packages. */
async function buildPackageMap(
  userDocId: string
): Promise<Map<string, { name: string; type: string }>> {
  const snap = await getDocs(
    collection(db, 'organizations', ORG_ID, 'users', userDocId, 'packages')
  );
  const map = new Map<string, { name: string; type: string }>();
  snap.docs.forEach((d) => {
    const data = d.data();
    const name =
      data.packageName ??
      data.title ??
      (data.packageType as string | undefined) ??
      'Lesson Pass';
    map.set(d.id, { name, type: data.packageType ?? '' });
  });
  return map;
}

/** Parse a raw Firestore booking doc into a typed Booking, enriched with trainer/package names. */
function parseBooking(
  id: string,
  data: Record<string, unknown>,
  trainerMap: Map<string, string>,
  packageMap: Map<string, { name: string; type: string }>
): Booking {
  const trainerId = (data.trainerUID ?? data.trainerId ?? '') as string;
  const packageId = (data.lessonPackageId ?? data.packageId ?? '') as string;
  const pkg = packageMap.get(packageId);
  return {
    id,
    ...data,
    startTime: toDate(data.startTime as Parameters<typeof toDate>[0]),
    endTime: toDate(data.endTime as Parameters<typeof toDate>[0]),
    createdAt: toDate(data.createdAt as Parameters<typeof toDate>[0]),
    trainerName: trainerMap.get(trainerId) ?? undefined,
    packageName: pkg?.name,
    packageType: pkg?.type,
  } as Booking;
}

/** Fetch class registrations for a user and convert them to Booking-shaped items. */
async function fetchClassRegistrationBookings(
  userDocId: string,
  trainerMap: Map<string, string>
): Promise<Booking[]> {
  const regSnap = await getDocs(
    query(collection(db, 'classRegistrations'), where('clientId', '==', userDocId))
  );
  if (regSnap.empty) return [];

  // Deduplicate classIds (series registers one doc per class)
  const classIdsRaw = regSnap.docs.map((d) => d.data().classId as string).filter(Boolean);
  const classIds = classIdsRaw.filter((id, idx) => classIdsRaw.indexOf(id) === idx);

  // Batch-fetch class documents (Firestore 'in' limit = 30)
  const classMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < classIds.length; i += 30) {
    const chunk = classIds.slice(i, i + 30);
    const classSnaps = await Promise.all(chunk.map((id) => getDoc(doc(db, 'classes', id))));
    classSnaps.forEach((s) => { if (s.exists()) classMap.set(s.id, s.data() as Record<string, unknown>); });
  }

  // Map each registration to a Booking-shaped object
  const items: Booking[] = [];
  const seen = new Set<string>();
  for (const reg of regSnap.docs) {
    const rd = reg.data();
    const classId = rd.classId as string;
    if (!classId || seen.has(classId)) continue;
    seen.add(classId);
    const cd = classMap.get(classId);
    if (!cd) continue;
    items.push({
      id: reg.id,
      clientId: userDocId,
      orgId: (cd.orgId ?? ORG_ID) as string,
      isClassBooking: true,
      classId,
      packageName: (cd.title ?? cd.className ?? 'Group Class') as string,
      trainerName: trainerMap.get(cd.trainerId as string) ?? (cd.trainerName as string | undefined),
      startTime: toDate(cd.startTime as Parameters<typeof toDate>[0]),
      endTime: toDate(cd.endTime as Parameters<typeof toDate>[0]),
      location: (cd.location ?? '') as string,
      status: 'confirmed',
      athleteName: rd.athleteName as string | undefined,
      createdAt: toDate(rd.registeredAt as Parameters<typeof toDate>[0]),
    });
  }
  return items;
}

/** Fetch all bookings for a user, enriched with trainer and package names. */
export async function fetchAllBookings(userDocId: string): Promise<Booking[]> {
  const [snap, trainerMap, packageMap] = await Promise.all([
    getDocs(query(collection(db, 'bookings'), where('clientId', '==', userDocId))),
    buildTrainerMap(),
    buildPackageMap(userDocId),
  ]);
  const lessonBookings = snap.docs
    .map((d) => parseBooking(d.id, d.data() as Record<string, unknown>, trainerMap, packageMap))
    .filter((b) => !b.isClassBooking); // exclude any stale class bookings w/ clientId set
  const classBookings = await fetchClassRegistrationBookings(userDocId, trainerMap);
  return [...lessonBookings, ...classBookings]
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

/**
 * Cancel a booking and restore the schedule slot to 'open' for future lessons.
 * Safe to call even if the slot no longer exists.
 */
export async function cancelBooking(
  bookingId: string,
  booking: Pick<Booking, 'trainerUID' | 'trainerId' | 'scheduleSlotId' | 'scheduleId' | 'startTime'>
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const updates: Promise<void>[] = [
    updateDoc(bookingRef, { status: 'cancelled', cancelledAt: Timestamp.now() }),
  ];
  // Only restore slot for future bookings — past slots don't need to be re-opened
  const slotId = booking.scheduleSlotId ?? booking.scheduleId;
  const trainerId = booking.trainerUID ?? booking.trainerId;
  if (slotId && trainerId && booking.startTime > new Date()) {
    const slotRef = doc(db, `trainers/${trainerId}/schedules/${slotId}`);
    updates.push(
      updateDoc(slotRef, { status: 'open', clientId: null, clientName: null, bookedAt: null })
    );
  }
  await Promise.all(updates);
}

/** Fetch upcoming confirmed bookings for a user (dashboard use). */
export async function fetchUpcomingBookings(userDocId: string, maxResults = 5): Promise<Booking[]> {
  const all = await fetchAllBookings(userDocId);
  const now = new Date();
  return all
    .filter((b) => b.status === 'confirmed' && b.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, maxResults);
}

// ─── Pricing & Stripe ─────────────────────────────────────────────────────────

import type { PricingStructure, PricingTier, PackageOption, PackageCategory } from '@/types';

/** Normalize Firestore packageCategory/packageType → canonical PackageCategory enum */
function normalizeCategory(cat: string): PackageCategory {
  const v = (cat ?? '').toLowerCase();
  if (['class', 'classpass', 'class_pass', 'class_10_pack', 'class_pack'].some((x) => v.includes(x))) return 'classPass';
  if (['4_athlete', 'four_athlete', 'fourathletes', 'fourathletes'].includes(v)) return 'fourAthlete';
  if (['3_athlete', 'three_athlete', 'threeathletes', 'threeathletes'].includes(v)) return 'threeAthlete';
  if (['2_athlete', 'two_athlete', 'twoathletes', 'semi_private'].includes(v)) return 'twoAthlete';
  if (['private', '1_athlete', 'one_athlete', 'oneathletes', 'pass'].includes(v)) return 'oneAthlete';
  // already a valid enum value
  if (['oneathlete', 'twoathlete', 'threeathlete', 'fourathlete'].includes(v.toLowerCase())) return cat as PackageCategory;
  // default: treat as single-athlete private lesson
  return 'oneAthlete';
}

/** Fetch the dynamic pricing structure from organizations/{orgId}/pricingStructure */
export async function fetchPricingStructure(): Promise<PricingStructure | null> {
  const snap = await getDoc(doc(db, 'organizations', ORG_ID));
  if (!snap.exists()) return null;
  const data = snap.data();
  const ps = data.pricingStructure;
  if (!ps?.tiers) return null;
  return {
    tiers: (ps.tiers as Array<Record<string, unknown>>).map((tier) => ({
      id: tier.id as string,
      tierName: tier.tierName as string,
      packages: ((tier.packages ?? []) as Array<Record<string, unknown>>)
        .filter((pkg) => pkg.active !== false) // exclude inactive packages
        .map((pkg) => ({
          id: pkg.id as string,
          title: pkg.title as string,
          priceInCents: pkg.priceInCents as number,
          packageType: pkg.packageType as string,
          packageCategory: normalizeCategory((pkg.packageCategory ?? pkg.packageType ?? 'oneAthlete') as string),
          lessonCount: (pkg.lessonCount as number) ?? 1,
          description: pkg.description as string | undefined,
          pricingTierId: (pkg.pricingTierId as string | undefined) ?? (tier.id as string),
          pricingTierName: (pkg.pricingTierName as string | undefined) ?? (tier.tierName as string),
          expirationDays: pkg.expirationDays as number | undefined,
          active: pkg.active as boolean | undefined,
        } as PackageOption)),
    } as PricingTier)),
    lastUpdated: ps.lastUpdated ? toDate(ps.lastUpdated) : undefined,
  } as PricingStructure;
}

/**
 * Fetch org's Stripe publishable key and Connect account ID.
 * connectAccountId may be null if onboarding is incomplete — callers must handle.
 */
export async function fetchOrgStripeInfo(): Promise<{ publishableKey: string; connectAccountId: string | null } | null> {
  const snap = await getDoc(doc(db, 'organizations', ORG_ID));
  if (!snap.exists()) return null;
  const stripe = snap.data().stripe as Record<string, string | null> | undefined;
  if (!stripe?.publishableKey) return null;
  return {
    publishableKey: stripe.publishableKey as string,
    connectAccountId: (stripe.connectAccountId ?? null) as string | null,
  };
}

/**
 * Real-time subscription to upcoming open group classes for the org.
 * Calls `callback` immediately and on every change.
 * Returns an unsubscribe function.
 */
export function subscribeToGroupClasses(
  callback: (classes: GroupClass[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'classes'), where('orgId', '==', ORG_ID));
  return onSnapshot(q, (snap) => {
    const now = new Date();
    const classes = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          title: (data.title ?? data.className ?? 'Class') as string,
          startTime: toDate(data.startTime),
          endTime: toDate(data.endTime),
          eligiblePackageIds: (data.eligiblePackageIds as string[]) ?? [],
        } as GroupClass;
      })
      .filter((c) => c.isOpenForRegistration !== false && c.startTime >= now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    callback(classes);
  }, (err) => {
    console.error('[subscribeToGroupClasses] Firestore error:', err);
    onError?.(err);
  });
}

/**
 * Fetch upcoming open group classes for the org.
 * Mirrors iOS ClassesService.loadOpenClasses().
 */
export async function fetchGroupClasses(): Promise<GroupClass[]> {
  // Single where clause — avoids composite index requirement; filter/sort client-side
  const snap = await getDocs(
    query(collection(db, 'classes'), where('orgId', '==', ORG_ID))
  );
  const now = new Date();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        title: (data.title ?? data.className ?? 'Class') as string,
        startTime: toDate(data.startTime),
        endTime: toDate(data.endTime),
        eligiblePackageIds: (data.eligiblePackageIds as string[]) ?? [],
      } as GroupClass;
    })
    .filter((c) => c.isOpenForRegistration !== false && c.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Fetch athlete objects from a user's profile document.
 * Merges new 'athletes' array with legacy individual fields.
 * Mirrors iOS BookView.allAthletes computed property.
 */
export async function fetchUserAthletes(userDocId: string): Promise<AthleteInfo[]> {
  const snap = await getDoc(doc(db, 'users', userDocId));
  if (!snap.exists()) return [];
  const data = snap.data();
  const seen = new Set<string>();
  const athletes: AthleteInfo[] = [];

  // New format: athletes array (primary source)
  if (Array.isArray(data.athletes)) {
    for (const a of data.athletes as Array<Record<string, unknown>>) {
      const info: AthleteInfo = {
        firstName: (a.firstName as string) ?? '',
        lastName: (a.lastName as string) ?? '',
        birthday: a.birthday as string | undefined,
        schoolClubTeam: a.schoolClubTeam as string | undefined,
        experienceLevel: a.experienceLevel as string | undefined,
        position: a.position as string | undefined,
      };
      const name = athleteDisplayName(info);
      if (name && !seen.has(name)) { seen.add(name); athletes.push(info); }
    }
  }

  // Legacy individual fields (backward compat)
  const legacyFields = [
    { first: data.athleteFirstName, last: data.athleteLastName, bday: data.athleteBirthday, club: data.athleteSchoolClubTeam, exp: data.athleteExperienceLevel },
    { first: data.athlete2FirstName, last: data.athlete2LastName, bday: data.athlete2Birthday, club: data.athlete2SchoolClubTeam, exp: data.athlete2ExperienceLevel },
    { first: data.athlete3FirstName, last: data.athlete3LastName, bday: data.athlete3Birthday, club: data.athlete3SchoolClubTeam, exp: data.athlete3ExperienceLevel },
    { first: data.athlete4FirstName, last: data.athlete4LastName, bday: data.athlete4Birthday, club: data.athlete4SchoolClubTeam, exp: data.athlete4ExperienceLevel },
  ] as Array<{ first?: unknown; last?: unknown; bday?: unknown; club?: unknown; exp?: unknown }>;

  for (const f of legacyFields) {
    const info: AthleteInfo = { firstName: (f.first as string) ?? '', lastName: (f.last as string) ?? '', birthday: f.bday as string | undefined, schoolClubTeam: f.club as string | undefined, experienceLevel: f.exp as string | undefined };
    const name = athleteDisplayName(info);
    if (name && !seen.has(name)) { seen.add(name); athletes.push(info); }
  }

  return athletes;
}

// ─── Org Settings & Waiver ────────────────────────────────────────────────────



export interface OrgSettings {
  requireWaiver: boolean;
  waiverText: string;
}

/** Fetch requireWaiver + waiverText from organizations/{orgId}. */
export async function fetchOrgSettings(): Promise<OrgSettings> {
  const snap = await getDoc(doc(db, 'organizations', ORG_ID));
  if (!snap.exists()) return { requireWaiver: false, waiverText: '' };
  const data = snap.data();
  return {
    requireWaiver: data.requireWaiver === true,
    waiverText: (data.waiverText as string) ?? '',
  };
}

/**
 * Return all signed waiver athlete names for this user.
 * Waivers are per-athlete — athleteName field on each waiver doc.
 */
export async function fetchSignedWaiverAthletes(userDocId: string): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', userDocId, 'documents'),
      where('type', 'in', ['waiver', 'waiver_agreement'])
    )
  );
  return snap.docs
    .map(d => (d.data().athleteName as string | undefined) ?? '')
    .filter(Boolean)
    .map(n => n.toLowerCase().trim());
}

/**
 * Check if a specific athlete has a signed waiver.
 * Pass empty string to check if ANY waiver exists (legacy fallback).
 */
export async function checkUserWaiver(userDocId: string, athleteName?: string): Promise<boolean> {
  const signed = await fetchSignedWaiverAthletes(userDocId);
  if (!athleteName) return signed.length > 0;
  return signed.includes(athleteName.toLowerCase().trim());
}

export interface WaiverSignatureData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  athleteName?: string;
}

/**
 * Save a signed waiver. Naming mirrors iOS exactly:
 *   filename:    {SanitizedAthlete}_waiver_{unixSeconds}.pdf
 *   Storage:     users/{userId}/documents/{filename}
 *   Firestore ID: {userId}_waiver_{unixSeconds}
 */
export async function saveWaiver(
  userDocId: string,
  signature: WaiverSignatureData
): Promise<void> {
  const { generateWaiverPDF, uploadWaiverPDF } = await import('./waiverPDF');

  // Unix seconds — matches iOS Date().timeIntervalSince1970
  const seconds = Math.floor(Date.now() / 1000);

  // iOS sanitization: split on whitespace → join "_" → remove all non-alphanumeric (including "_")
  // e.g. "Emma Johnson" → "EmmaJohnson", "" → ""
  const sanitizedAthlete = (signature.athleteName ?? '')
    .split(/\s+/)
    .join('_')
    .replace(/[^a-zA-Z0-9]/g, '');

  const filename = sanitizedAthlete
    ? `${sanitizedAthlete}_waiver_${seconds}.pdf`
    : `waiver_${seconds}.pdf`;

  // Firestore document ID matches iOS IDGenerator.generateDocumentId:
  //   "{userId}_waiver_{timestamp}" e.g. "john_doe_waiver_1740045600"
  const documentId = `${userDocId}_waiver_${seconds}`;

  // Generate PDF (matches iOS WaiverPDFGenerator layout)
  const pdfBlob = generateWaiverPDF(
    {
      fullName: `${signature.firstName} ${signature.lastName}`.trim(),
      email: signature.email,
      phoneNumber: signature.phoneNumber,
      signedAt: new Date(),
      isMinor: true,
    },
    signature.athleteName ?? ''
  );

  // Upload to Firebase Storage at users/{userId}/documents/{filename}
  let pdfUrl = '';
  try {
    pdfUrl = await uploadWaiverPDF(userDocId, filename, pdfBlob);
  } catch {
    // Non-fatal — waiver metadata saved even if Storage upload fails
    console.error('Waiver PDF upload failed; saving metadata without URL');
  }

  // setDoc with explicit iOS-matching document ID (instead of addDoc random ID)
  await setDoc(doc(db, 'users', userDocId, 'documents', documentId), {
    name: filename,
    displayName: signature.athleteName ? `${signature.athleteName} Waiver` : 'Release of Liability Waiver',
    type: 'waiver',
    uploadedAt: Timestamp.now(),
    url: pdfUrl,
    signedBy: `${signature.firstName} ${signature.lastName}`.trim(),
    signatoryEmail: signature.email,
    isMinor: true,
    athleteName: signature.athleteName ?? null,
    originalFilename: filename,
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

function decodeProfile(id: string, data: Record<string, unknown>): UserProfile {
  const athletes = Array.isArray(data.athletes)
    ? (data.athletes as Array<Record<string, unknown>>).map((a) => ({
        firstName: (a.firstName as string) ?? '',
        lastName: (a.lastName as string) ?? '',
        birthday: a.birthday as string | undefined,
        schoolClubTeam: a.schoolClubTeam as string | undefined,
        experienceLevel: a.experienceLevel as string | undefined,
        position: a.position as string | undefined,
      }))
    : undefined;
  return {
    id,
    firstName: (data.firstName as string) ?? '',
    lastName: (data.lastName as string) ?? '',
    email: ((data.emailAddress ?? data.email) as string) ?? '',
    authUserId: data.authUserId as string | undefined,
    phoneNumber: data.phoneNumber as string | undefined,
    photoURL: data.photoURL as string | undefined,
    role: (data.role as UserProfile['role']) ?? 'client',
    orgId: (data.orgId as string) ?? ORG_ID,
    isActive: (data.isActive as boolean) ?? (data.active as boolean) ?? true,
    createdAt: toDate(data.createdAt as Parameters<typeof toDate>[0]),
    updatedAt: data.updatedAt ? toDate(data.updatedAt as Parameters<typeof toDate>[0]) : undefined,
    referenceCode: data.referenceCode as string | undefined,
    emergencyContactName: data.emergencyContactName as string | undefined,
    emergencyContactNumber: data.emergencyContactNumber as string | undefined,
    notesForCoach: data.notesForCoach as string | undefined,
    referredBy: data.referredBy as string | undefined,
    athletes,
    athleteFirstName: data.athleteFirstName as string | undefined,
    athleteLastName: data.athleteLastName as string | undefined,
    athleteBirthday: data.athleteBirthday as string | undefined,
    athlete2FirstName: data.athlete2FirstName as string | undefined,
    athlete2LastName: data.athlete2LastName as string | undefined,
    athlete2Birthday: data.athlete2Birthday as string | undefined,
    athlete3FirstName: data.athlete3FirstName as string | undefined,
    athlete3LastName: data.athlete3LastName as string | undefined,
    athlete3Birthday: data.athlete3Birthday as string | undefined,
    athlete4FirstName: data.athlete4FirstName as string | undefined,
    athlete4LastName: data.athlete4LastName as string | undefined,
    athlete4Birthday: data.athlete4Birthday as string | undefined,
  };
}

/** Fetch a full user profile by their name-based document ID. */
export async function fetchUserProfile(userDocId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userDocId));
  if (!snap.exists()) return null;
  return decodeProfile(snap.id, snap.data() as Record<string, unknown>);
}

/** Save editable profile fields — merge so only provided fields overwrite. */
export async function saveUserProfile(
  userDocId: string,
  fields: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    notesForCoach?: string;
    referredBy?: string;
    athletes?: AthleteInfo[];
  }
): Promise<void> {
  await setDoc(doc(db, 'users', userDocId), { ...fields, updatedAt: Timestamp.now() }, { merge: true });
}

// ─── User Documents ───────────────────────────────────────────────────────────

/** Fetch all documents for a user, ordered newest first. */
export async function fetchUserDocuments(userDocId: string): Promise<UserDocument[]> {
  const snap = await getDocs(
    query(collection(db, 'users', userDocId, 'documents'), orderBy('uploadedAt', 'desc'))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: (data.name as string) ?? 'Document',
      displayName: data.displayName as string | undefined,
      type: (data.type as string) ?? 'document',
      uploadedAt: toDate(data.uploadedAt as Parameters<typeof toDate>[0]),
      url: (data.url as string) ?? '',
      signedBy: data.signedBy as string | undefined,
      signatoryEmail: data.signatoryEmail as string | undefined,
      isMinor: data.isMinor as boolean | undefined,
      athleteName: data.athleteName as string | undefined,
    } as UserDocument;
  });
}

// ─── Guest Waiver ─────────────────────────────────────────────────────────────

export interface GuestWaiverData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  athleteName?: string;
}

/**
 * Look up a user's name-based document ID by their email address within this org.
 * Returns null if no matching user is found.
 */
export async function findUserDocIdByEmail(email: string): Promise<string | null> {
  const normalised = email.trim().toLowerCase();
  // users store email in either 'email' or 'emailAddress' field
  for (const field of ['email', 'emailAddress']) {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('orgId', '==', ORG_ID),
        where(field, '==', normalised),
        limit(1)
      )
    );
    if (!snap.empty) return snap.docs[0].id;
  }
  return null;
}

/**
 * Save a guest (unauthenticated) waiver.
 * Uses iOS-matching field names so the record looks identical to a
 * users/{userId}/documents waiver — admin can see it the same way.
 * If the guest has a Skedence account the sign-waiver page calls
 * saveWaiver() instead (which also generates the PDF).
 */
export async function saveGuestWaiver(data: GuestWaiverData): Promise<void> {
  const seconds = Math.floor(Date.now() / 1000);
  const sanitizedAthlete = (data.athleteName ?? '')
    .split(/\s+/).join('_').replace(/[^a-zA-Z0-9]/g, '');
  const filename = sanitizedAthlete
    ? `${sanitizedAthlete}_waiver_${seconds}.pdf`
    : `waiver_${seconds}.pdf`;
  const displayName = data.athleteName
    ? `${data.athleteName} Waiver`
    : 'Release of Liability Waiver';

  await addDoc(collection(db, 'waivers'), {
    orgId: ORG_ID,
    // iOS-matching field names
    name: filename,
    displayName,
    type: 'waiver',
    uploadedAt: Timestamp.now(),
    signedBy: `${data.firstName} ${data.lastName}`.trim(),
    signatoryEmail: data.email.trim().toLowerCase(),
    isMinor: !!data.athleteName,
    athleteName: data.athleteName ?? null,
    originalFilename: filename,
    // extra guest context
    phoneNumber: data.phoneNumber,
    url: '',          // no PDF for guest path
    source: 'web_marketing',
  });
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

function decodeBlogPost(id: string, data: Record<string, unknown>): BlogPost {
  return {
    id,
    title: (data.title as string) ?? '',
    slug: (data.slug as string) ?? '',
    excerpt: (data.excerpt as string) ?? '',
    content: (data.content as string) ?? '',
    metaTitle: data.metaTitle as string | undefined,
    metaDescription: data.metaDescription as string | undefined,
    keywords: data.keywords as string | undefined,
    categories: (data.categories as string[]) ?? [],
    tags: data.tags as string[] | undefined,
    sport: data.sport as string | undefined,
    featuredImage: data.featuredImage as string | undefined,
    featuredImageAlt: data.featuredImageAlt as string | undefined,
    ctaText: data.ctaText as string | undefined,
    ctaLink: data.ctaLink as string | undefined,
    status: (data.status as BlogPost['status']) ?? 'draft',
    authorId: data.authorId as string | undefined,
    authorName: data.authorName as string | undefined,
    views: data.views as number | undefined,
    createdAt: data.createdAt ? toDate(data.createdAt as Parameters<typeof toDate>[0]) : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt as Parameters<typeof toDate>[0]) : undefined,
    publishedAt: data.publishedAt ? toDate(data.publishedAt as Parameters<typeof toDate>[0]) : undefined,
  };
}

/** Fetch all published blog posts, ordered newest first. */
export async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  const snap = await getDocs(
    query(
      collection(db, 'organizations', ORG_ID, 'blogPosts'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(50)
    )
  );
  return snap.docs.map(d => decodeBlogPost(d.id, d.data() as Record<string, unknown>));
}

/** Fetch all blog posts (published + draft) — for admin use. */
export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  const snap = await getDocs(
    query(collection(db, 'organizations', ORG_ID, 'blogPosts'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => decodeBlogPost(d.id, d.data() as Record<string, unknown>));
}

/** Fetch a single blog post by its URL slug. */
export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await getDocs(
    query(collection(db, 'organizations', ORG_ID, 'blogPosts'), where('slug', '==', slug), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return decodeBlogPost(d.id, d.data() as Record<string, unknown>);
}

/** Create a new blog post. Returns the new document ID. */
export async function createBlogPost(post: Omit<BlogPost, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'organizations', ORG_ID, 'blogPosts'), {
    ...post,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    views: 0,
    ...(post.status === 'published' ? { publishedAt: Timestamp.now() } : {}),
  });
  return ref.id;
}

/** Update an existing blog post by document ID. */
export async function updateBlogPost(id: string, fields: Partial<BlogPost>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = fields;
  await updateDoc(doc(db, 'organizations', ORG_ID, 'blogPosts', id), {
    ...rest,
    updatedAt: Timestamp.now(),
    ...(fields.status === 'published' && !fields.publishedAt ? { publishedAt: Timestamp.now() } : {}),
  });
}

/** Delete a blog post by document ID. */
export async function deleteBlogPost(id: string): Promise<void> {
  await deleteDoc(doc(db, 'organizations', ORG_ID, 'blogPosts', id));
}

/** Increment the view counter for a blog post. */
export async function incrementBlogViews(id: string): Promise<void> {
  const ref = doc(db, 'organizations', ORG_ID, 'blogPosts', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = (snap.data().views as number) ?? 0;
  await updateDoc(ref, { views: current + 1 });
}
