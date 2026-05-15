import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType =
  | 'trainer_created'
  | 'trainer_activated'
  | 'trainer_deactivated'
  | 'trainer_invited' // Alternative naming compatibility
  | 'client_registered'
  | 'client_created' // Alternative naming compatibility
  | 'client_profile_updated'
  | 'lesson_booked'
  | 'lesson_canceled'
  | 'lesson_cancelled' // British spelling compatibility
  | 'lesson_completed'
  | 'lesson_rescheduled'
  | 'pass_purchased'
  | 'package_created' // Alternative naming compatibility
  | 'pass_activated'
  | 'pass_expired'
  | 'availability_opened'
  | 'availability_closed'
  | 'availability_updated'
  | 'class_created'
  | 'class_canceled'
  | 'class_cancelled' // British spelling compatibility
  | 'class_enrollment'
  | 'class_registered' // Alternative naming compatibility
  | 'class_unenrollment' // Admin removed participant from class
  | 'location_created'
  | 'location_updated'
  | 'location_deleted'
  | 'payment_received'
  | 'payment_refunded'
  | 'schedule_updated'
  | 'booking_created' // Legacy compatibility
  | 'booking_canceled'; // Legacy compatibility

export interface ActivityLogData {
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin' | 'trainer' | 'client' | 'system';
  targetId?: string;
  targetName?: string;
  targetType?: 'trainer' | 'client' | 'lesson' | 'class' | 'pass' | 'location';
  description: string;
  metadata?: Record<string, any>;
  orgId: string;
}

/**
 * Log an activity to Firestore
 * @param data Activity log data
 * @returns Promise with document ID
 */
export async function logActivity(data: ActivityLogData): Promise<string> {
  try {
    const activityData = {
      ...data,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'activities'), activityData);
    return docRef.id;
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    throw error;
  }
}

// Helper functions for common activities

export async function logTrainerCreated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
}) {
  return logActivity({
    type: 'trainer_created',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.trainerId,
    targetName: params.trainerName,
    targetType: 'trainer',
    description: `${params.actorName} added trainer ${params.trainerName}`,
    metadata: { email: params.trainerEmail },
    orgId: params.orgId,
  });
}

export async function logClientRegistered(params: {
  orgId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
}) {
  return logActivity({
    type: 'client_registered',
    actorId: params.clientId,
    actorName: params.clientName,
    actorRole: 'client',
    targetId: params.clientId,
    targetName: params.clientName,
    targetType: 'client',
    description: `${params.clientName} registered as a new client`,
    metadata: { email: params.clientEmail },
    orgId: params.orgId,
  });
}

export async function logLessonBooked(params: {
  orgId: string;
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  lessonId: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  packageType?: string;
}) {
  return logActivity({
    type: 'lesson_booked',
    actorId: params.clientId,
    actorName: params.clientName,
    actorRole: 'client',
    targetId: params.trainerId,
    targetName: params.trainerName,
    targetType: 'trainer',
    description: `${params.clientName} booked a lesson with ${params.trainerName} for ${params.startTime.toLocaleDateString()} at ${params.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    metadata: {
      lessonId: params.lessonId,
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
      location: params.location,
      packageType: params.packageType,
    },
    orgId: params.orgId,
  });
}

export async function logLessonCanceled(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin' | 'trainer' | 'client';
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  lessonId: string;
  startTime: Date;
  reason?: string;
}) {
  return logActivity({
    type: 'lesson_canceled',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.lessonId,
    targetName: `${params.clientName} with ${params.trainerName}`,
    targetType: 'lesson',
    description: `${params.actorName} canceled lesson for ${params.clientName} with ${params.trainerName} scheduled for ${params.startTime.toLocaleDateString()} at ${params.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    metadata: {
      lessonId: params.lessonId,
      clientId: params.clientId,
      trainerId: params.trainerId,
      startTime: params.startTime.toISOString(),
      reason: params.reason,
    },
    orgId: params.orgId,
  });
}

export async function logPassPurchased(params: {
  orgId: string;
  clientId: string;
  clientName: string;
  passId: string;
  passType: string;
  sessionsCount: number;
  amountPaid: number;
}) {
  return logActivity({
    type: 'pass_purchased',
    actorId: params.clientId,
    actorName: params.clientName,
    actorRole: 'client',
    targetId: params.passId,
    targetName: params.passType,
    targetType: 'pass',
    description: `${params.clientName} purchased ${params.passType} (${params.sessionsCount} sessions) for $${(params.amountPaid / 100).toFixed(2)}`,
    metadata: {
      passId: params.passId,
      passType: params.passType,
      sessionsCount: params.sessionsCount,
      amountPaid: params.amountPaid,
    },
    orgId: params.orgId,
  });
}

export async function logAvailabilityOpened(params: {
  orgId: string;
  trainerId: string;
  trainerName: string;
  slotId: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}) {
  return logActivity({
    type: 'availability_opened',
    actorId: params.trainerId,
    actorName: params.trainerName,
    actorRole: 'trainer',
    targetId: params.slotId,
    targetName: `${params.startTime.toLocaleDateString()} ${params.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    description: `${params.trainerName} opened availability for ${params.startTime.toLocaleDateString()} at ${params.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${params.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    metadata: {
      slotId: params.slotId,
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
      location: params.location,
    },
    orgId: params.orgId,
  });
}

export async function logAvailabilityClosed(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin' | 'trainer';
  trainerId: string;
  trainerName: string;
  slotId: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
}) {
  return logActivity({
    type: 'availability_closed',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.slotId,
    targetName: `${params.trainerName}'s slot`,
    description: `${params.actorName} marked ${params.trainerName} as unavailable for ${params.startTime.toLocaleDateString()} at ${params.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${params.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    metadata: {
      slotId: params.slotId,
      trainerId: params.trainerId,
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
      reason: params.reason,
    },
    orgId: params.orgId,
  });
}

export async function logClassCreated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  classId: string;
  className: string;
  trainerId: string;
  trainerName: string;
  startTime: Date;
  maxParticipants: number;
  location?: string;
}) {
  return logActivity({
    type: 'class_created',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.classId,
    targetName: params.className,
    targetType: 'class',
    description: `${params.actorName} created class "${params.className}" with ${params.trainerName} for ${params.startTime.toLocaleDateString()} at ${params.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    metadata: {
      classId: params.classId,
      trainerId: params.trainerId,
      startTime: params.startTime.toISOString(),
      maxParticipants: params.maxParticipants,
      location: params.location,
    },
    orgId: params.orgId,
  });
}

export async function logLocationCreated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  locationId: string;
  locationName: string;
  address: string;
}) {
  return logActivity({
    type: 'location_created',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.locationId,
    targetName: params.locationName,
    targetType: 'location',
    description: `${params.actorName} added location "${params.locationName}" at ${params.address}`,
    metadata: {
      locationId: params.locationId,
      address: params.address,
    },
    orgId: params.orgId,
  });
}

export async function logLocationUpdated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  locationId: string;
  locationName: string;
  address: string;
}) {
  return logActivity({
    type: 'location_updated',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.locationId,
    targetName: params.locationName,
    targetType: 'location',
    description: `${params.actorName} updated location "${params.locationName}"`,
    metadata: {
      locationId: params.locationId,
      address: params.address,
    },
    orgId: params.orgId,
  });
}

export async function logLocationDeleted(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  locationId: string;
  locationName: string;
}) {
  return logActivity({
    type: 'location_deleted',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.locationId,
    targetName: params.locationName,
    targetType: 'location',
    description: `${params.actorName} deleted location "${params.locationName}"`,
    metadata: {
      locationId: params.locationId,
    },
    orgId: params.orgId,
  });
}

export async function logPassIssued(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  clientId: string;
  clientName: string;
  passType: string;
  passTitle: string;
  quantity: number;
  totalSessions: number;
}) {
  return logActivity({
    type: 'pass_purchased',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.clientId,
    targetName: params.clientName,
    targetType: 'client',
    description: `${params.actorName} issued ${params.quantity} ${params.passTitle} (${params.totalSessions} total sessions) to ${params.clientName}`,
    metadata: {
      clientId: params.clientId,
      passType: params.passType,
      passTitle: params.passTitle,
      quantity: params.quantity,
      totalSessions: params.totalSessions,
      issuedBy: params.actorId,
    },
    orgId: params.orgId,
  });
}

export async function logClientProfileUpdated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin' | 'client';
  clientId: string;
  clientName: string;
  fields: string[];
}) {
  return logActivity({
    type: 'client_profile_updated',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.clientId,
    targetName: params.clientName,
    targetType: 'client',
    description: `${params.actorName} updated ${params.clientName}'s profile (${params.fields.join(', ')})`,
    metadata: {
      clientId: params.clientId,
      updatedFields: params.fields,
    },
    orgId: params.orgId,
  });
}

export async function logClassUpdated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  classId: string;
  className: string;
  trainerId: string;
  trainerName: string;
  startTime: Date;
  fields: string[];
}) {
  return logActivity({
    type: 'class_created',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.classId,
    targetName: params.className,
    targetType: 'class',
    description: `${params.actorName} updated class "${params.className}" (${params.fields.join(', ')})`,
    metadata: {
      classId: params.classId,
      trainerId: params.trainerId,
      trainerName: params.trainerName,
      startTime: params.startTime.toISOString(),
      updatedFields: params.fields,
    },
    orgId: params.orgId,
  });
}

export async function logClassDeleted(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  classId: string;
  className: string;
  trainerId: string;
  trainerName: string;
  startTime: Date;
  participantCount: number;
}) {
  return logActivity({
    type: 'class_canceled',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.classId,
    targetName: params.className,
    targetType: 'class',
    description: `${params.actorName} deleted class "${params.className}" (${params.participantCount} participants notified)`,
    metadata: {
      classId: params.classId,
      trainerId: params.trainerId,
      trainerName: params.trainerName,
      startTime: params.startTime.toISOString(),
      participantCount: params.participantCount,
    },
    orgId: params.orgId,
  });
}

export async function logTrainerActivated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  trainerId: string;
  trainerName: string;
}) {
  return logActivity({
    type: 'trainer_activated',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.trainerId,
    targetName: params.trainerName,
    targetType: 'trainer',
    description: `${params.actorName} reactivated trainer ${params.trainerName}`,
    metadata: {
      trainerId: params.trainerId,
    },
    orgId: params.orgId,
  });
}

export async function logTrainerDeactivated(params: {
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: 'owner' | 'admin';
  trainerId: string;
  trainerName: string;
}) {
  return logActivity({
    type: 'trainer_deactivated',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetId: params.trainerId,
    targetName: params.trainerName,
    targetType: 'trainer',
    description: `${params.actorName} deactivated trainer ${params.trainerName}`,
    metadata: {
      trainerId: params.trainerId,
    },
    orgId: params.orgId,
  });
}
