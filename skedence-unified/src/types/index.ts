// Firestore types based on existing Skedence Firebase structure

export interface AthleteInfo {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  schoolClubTeam?: string;
  experienceLevel?: string;
  position?: string;
}

export interface User {
  id: string;
  email: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string; // Alternative field name used in some contexts
  role?: 'owner' | 'admin' | 'trainer' | 'client';
  photoURL?: string;
  avatarUrl?: string;
  orgId?: string;
  stripeCustomerId?: string;
  createdAt?: Date;
  isActive?: boolean; // For trainer status
  
  // Enhanced profile fields
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  referredBy?: string;
  notesForCoach?: string;
  athletes?: AthleteInfo[];
  
  // Legacy athlete fields (for backward compatibility)
  athleteFirstName?: string;
  athleteLastName?: string;
  athleteBirthday?: string;
  athletePosition?: string;
  athlete2FirstName?: string;
  athlete2LastName?: string;
  athlete2Birthday?: string;
  athlete2Position?: string;
  athlete3FirstName?: string;
  athlete3LastName?: string;
  athlete3Birthday?: string;
  athlete3Position?: string;
}

export interface Trainer extends User {
  name?: string;
  bio?: string;
  specialties?: string[];
  isActive?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  adminIds: string[];
  trainerIds: string[];
  billing?: {
    stripeCustomerId: string;
    plan: 'free' | 'starter' | 'studio' | 'academy' | 'enterprise';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    trainerLimit?: number;
  };
  settings?: OrgSettings;
  createdAt?: Date;
}

export interface OrgSettings {
  minBookingHours: number;
  minCancellationHours: number;
  maxBookingsPerLocation?: number;
  sessionDuration?: number;
  allowSameDayBooking?: boolean;
}

export interface Booking {
  id: string;
  clientId?: string; // Web format
  clientUID?: string; // iOS format
  trainerId: string;
  orgId: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  status: 'confirmed' | 'canceled';
  lessonPackageId?: string;
  createdAt?: Date;
  
  // Participant information
  athleteName?: string; // Name of athlete for this lesson
  secondAthleteName?: string; // Second participant name
  
  // Lesson notes
  lessonNotes?: string; // Lesson-specific notes from client
  
  // Class booking fields
  isClassBooking?: boolean; // True if this is a class registration, false/undefined for lesson
  classId?: string; // Reference to class document if isClassBooking is true
}

export interface AvailabilitySlot {
  id: string;
  trainerId: string;
  orgId: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isBooked: boolean;
  bookingId?: string;
}

export interface LessonPackage {
  id: string;
  userId: string;
  packageType: string;
  packageCategory?: 'private' | 'class';
  packageName?: string;
  totalLessons: number;
  lessonsUsed: number;
  purchaseDate: Date;
  expirationDate: Date;
  transactionId?: string;
}

export interface GroupClass {
  id: string;
  orgId: string;
  title: string;
  description: string;
  trainerId: string;
  trainerName: string;
  startTime: Date;
  endTime: Date;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  price?: number;
}

export interface DashboardStats {
  totalClients: number;
  totalTrainers: number;
  upcomingBookings: number;
  thisMonthRevenue: number;
  activePackages: number;
  openClasses: number;
}
