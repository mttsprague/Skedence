// Firestore types based on existing Skedence Firebase structure

export interface User {
  id: string;
  email: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string; // Alternative field name used in some contexts
  role?: 'owner' | 'trainer' | 'client';
  photoURL?: string;
  avatarUrl?: string;
  orgId?: string;
  stripeCustomerId?: string;
  createdAt?: Date;
  isActive?: boolean; // For trainer status
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
