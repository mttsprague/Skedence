// Firestore data types mirroring the iOS Skedence client app

// ─── Athlete & User Profile ───────────────────────────────────────────────────

/** Mirrors iOS AthleteInfo struct — stored in users/{userId}.athletes[] array */
export interface AthleteInfo {
  firstName: string;
  lastName: string;
  birthday?: string;        // "MM/DD/YYYY"
  schoolClubTeam?: string;
  experienceLevel?: string; // "Beginner" | "Intermediate" | "Advanced" | "Elite"
  position?: string;        // optional, backward compat
}

export function athleteDisplayName(a: AthleteInfo): string {
  return [a.firstName, a.lastName].filter(Boolean).join(' ').trim();
}

/** Mirrors iOS UserProfile struct — users/{userId} */
export interface UserProfile {
  id?: string;          // Name-based Firestore doc ID (e.g. "john_doe")
  firstName: string;
  lastName: string;
  /** Stored as emailAddress in Firestore (matching iOS convention) */
  email: string;
  authUserId?: string;  // Firebase Auth UID
  phoneNumber?: string;
  photoURL?: string;
  role: 'client' | 'trainer' | 'admin';
  orgId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  referenceCode?: string;
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  // Notes
  notesForCoach?: string;
  referredBy?: string;
  // Athletes (new format — primary source)
  athletes?: AthleteInfo[];
  // Legacy single-athlete fields (backward compat)
  athleteFirstName?: string;
  athleteLastName?: string;
  athleteBirthday?: string;
  athleteSchoolClubTeam?: string;
  athleteExperienceLevel?: string;
  athlete2FirstName?: string;
  athlete2LastName?: string;
  athlete2Birthday?: string;
  athlete2SchoolClubTeam?: string;
  athlete2ExperienceLevel?: string;
  athlete3FirstName?: string;
  athlete3LastName?: string;
  athlete3Birthday?: string;
  athlete3SchoolClubTeam?: string;
  athlete3ExperienceLevel?: string;
  // 4th athlete legacy fields
  athlete4FirstName?: string;
  athlete4LastName?: string;
  athlete4Birthday?: string;
  athlete4SchoolClubTeam?: string;
  athlete4ExperienceLevel?: string;
}

/** Merged athlete list: prefers new athletes[] array, falls back to legacy fields */
export function resolveAthletes(profile: UserProfile): AthleteInfo[] {
  if (profile.athletes && profile.athletes.length > 0) return profile.athletes;
  const list: AthleteInfo[] = [];
  if (profile.athleteFirstName || profile.athleteLastName)
    list.push({ firstName: profile.athleteFirstName ?? '', lastName: profile.athleteLastName ?? '', birthday: profile.athleteBirthday, schoolClubTeam: profile.athleteSchoolClubTeam, experienceLevel: profile.athleteExperienceLevel });
  if (profile.athlete2FirstName || profile.athlete2LastName)
    list.push({ firstName: profile.athlete2FirstName ?? '', lastName: profile.athlete2LastName ?? '', birthday: profile.athlete2Birthday, schoolClubTeam: profile.athlete2SchoolClubTeam, experienceLevel: profile.athlete2ExperienceLevel });
  if (profile.athlete3FirstName || profile.athlete3LastName)
    list.push({ firstName: profile.athlete3FirstName ?? '', lastName: profile.athlete3LastName ?? '', birthday: profile.athlete3Birthday, schoolClubTeam: profile.athlete3SchoolClubTeam, experienceLevel: profile.athlete3ExperienceLevel });
  if (profile.athlete4FirstName || profile.athlete4LastName)
    list.push({ firstName: profile.athlete4FirstName ?? '', lastName: profile.athlete4LastName ?? '', birthday: profile.athlete4Birthday, schoolClubTeam: profile.athlete4SchoolClubTeam, experienceLevel: profile.athlete4ExperienceLevel });
  return list;
}

/** Mirrors iOS UserDocument — users/{userId}/documents/{docId} */
export interface UserDocument {
  id: string;
  name: string;
  displayName?: string;
  type: string;           // "waiver" | "waiver_agreement" | "document"
  uploadedAt: Date;
  url: string;
  signedBy?: string;
  signatoryEmail?: string;
  isMinor?: boolean;
  athleteName?: string;
}

// ─── Pricing Structure (mirrors organizations/{orgId}/pricingStructure) ───────

export interface PackageOption {
  id: string;
  title: string;
  priceInCents: number;
  packageType: string;
  /** Stored as 'class' in Firestore (iOS raw value); normalized to 'classPass' on read */
  packageCategory: PackageCategory;
  lessonCount: number;
  description?: string;
  pricingTierId?: string;
  pricingTierName?: string;
  expirationDays?: number;
  active?: boolean;
}

export interface PricingTier {
  id: string;
  tierName: string;
  packages: PackageOption[];
}

export interface PricingStructure {
  tiers: PricingTier[];
  lastUpdated?: Date;
}

export interface LessonPackage {
  id: string;
  packageType: string;
  packageCategory: PackageCategory;
  packageName?: string;
  totalLessons: number;
  lessonsUsed: number;
  /** Computed client-side as totalLessons - lessonsUsed. NOT stored in Firestore. */
  remainingLessons: number;
  purchaseDate: Date;
  expirationDate: Date;
  transactionId: string;
  amountPaid?: number; // cents
  orgId: string;
  /** Tier pricing: which tier this pass is valid for (nil = works with all trainers) */
  pricingTierId?: string;
  pricingTierName?: string;
  pricePerLesson?: number; // cents
}

export type PackageCategory =
  | 'oneAthlete'
  | 'twoAthlete'
  | 'threeAthlete'
  | 'fourAthlete'
  | 'classPass'
  | 'class'
  | 'pass';

export interface TrainerScheduleSlot {
  id: string;
  trainerId: string;
  trainerName?: string;
  startTime: Date;
  endTime: Date;
  /** "open" | "booked" | "unavailable" */
  status: string;
  location?: string;
  notes?: string;
  orgId?: string;
  /** If set, this slot is pre-assigned to a specific client — not publicly bookable */
  clientId?: string;
  clientName?: string;
}

export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  orgId: string;
  active: boolean;
  avatarUrl?: string;
  photoURL?: string;
  imageUrl?: string;
  profileImageUrl?: string;
  trainerDescription?: string;
  pricingTierId?: string;
  pricingTierName?: string;
}

export interface Booking {
  id: string;
  /** Name-based user doc ID — NOT Firebase Auth UID */
  clientId: string;
  clientUID?: string;
  /** Trainer document ID (also stored as trainerId for legacy compat) */
  trainerUID?: string;
  trainerId?: string;
  /** Resolved trainer display name — enriched client-side */
  trainerName?: string;
  orgId: string;
  /** Package document ID (also stored as packageId for legacy compat) */
  lessonPackageId?: string;
  packageId?: string;
  /** Resolved package display name — enriched client-side */
  packageName?: string;
  /** Resolved package type — enriched client-side */
  packageType?: string;
  /** Schedule slot document ID */
  scheduleSlotId?: string;
  scheduleId?: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'cancelled' | 'completed';
  location?: string;
  /** Primary athlete name */
  athleteName?: string;
  /** Second athlete (2-athlete lessons) */
  secondAthleteName?: string;
  /** All athletes array (when present) */
  athleteNames?: string[];
  lessonNotes?: string;
  createdAt: Date;
}

export interface GroupClass {
  id: string;
  orgId: string;
  trainerId: string;
  trainerName: string;
  /** 'title' is the current field name; 'className' is legacy */
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  participantIds: string[];
  isOpenForRegistration: boolean;
  /** Price in cents — shown when no eligible pass is available */
  priceInCents: number;
  imageUrl?: string;
  /** packageType strings eligible for this class. Empty = any class pass works. */
  eligiblePackageIds: string[];
  seriesId?: string;
  isPartOfSeries?: boolean;
}

// ─── Pass helper functions (mirror iOS LessonPackage helpers) ─────────────────

/** True if this pass can be used to book private lessons (mirrors iOS canBookLessons) */
export function canBookLessons(pkg: LessonPackage): boolean {
  const t = pkg.packageType;
  if (t === 'class' || t === 'class_pass') return false;
  const cat = pkg.packageCategory;
  return (
    cat === 'oneAthlete' || cat === 'twoAthlete' ||
    cat === 'threeAthlete' || cat === 'fourAthlete' || cat === 'pass'
  );
}

/** True if this pass can be used to register for group classes (mirrors iOS canBookClasses) */
export function canBookClasses(pkg: LessonPackage): boolean {
  const t = pkg.packageType;
  if (t === 'class' || t === 'class_pass') return true;
  const cat = pkg.packageCategory;
  return cat === 'classPass' || cat === 'class';
}

/** True if this pass is valid for the given trainer's tier (mirrors iOS isValidForTrainer) */
export function isValidForTrainer(pkg: LessonPackage, trainer: Trainer): boolean {
  if (!pkg.pricingTierId) return true;           // legacy pass — works with anyone
  if (!trainer.pricingTierId) return !pkg.pricingTierId; // trainer has no tier — only legacy passes
  return pkg.pricingTierId === trainer.pricingTierId;
}

/** Number of athletes required for a pass category */
export function athleteCountForCategory(cat: PackageCategory | string): number {
  switch (cat) {
    case 'oneAthlete': return 1;
    case 'twoAthlete': return 2;
    case 'threeAthlete': return 3;
    case 'fourAthlete': return 4;
    default: return 1;
  }
}

/** True if a pass is currently usable (has remaining lessons and not expired) */
export function isPassUsable(pkg: LessonPackage): boolean {
  return pkg.remainingLessons > 0 && pkg.expirationDate >= new Date();
}

export function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'oneAthlete': return '1 Athlete';
    case 'twoAthlete': return '2 Athletes';
    case 'threeAthlete': return '3 Athletes';
    case 'fourAthlete': return '4 Athletes';
    case 'classPass':
    case 'class': return 'Class Pass';
    case 'pass': return 'Pass';
    default: return category;
  }
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
