/**
 * Centralized Activity Types
 * All activity types used across the system
 */
export const ActivityTypes = {
  // Lesson/Booking Activities
  LESSON_BOOKED: "lesson_booked",
  LESSON_CANCELLED: "lesson_cancelled",
  LESSON_COMPLETED: "lesson_completed",
  
  // Class Activities
  CLASS_CREATED: "class_created",
  CLASS_REGISTERED: "class_registered",
  CLASS_CANCELLED: "class_cancelled",
  CLASS_ENROLLMENT: "class_enrollment",
  
  // Trainer Activities
  TRAINER_CREATED: "trainer_created",
  TRAINER_INVITED: "trainer_invited",
  TRAINER_DELETED: "trainer_deleted",
  
  // Client Activities
  CLIENT_REGISTERED: "client_registered",
  CLIENT_DELETED: "client_deleted",
  
  // Package/Pass Activities
  PASS_PURCHASED: "pass_purchased",
  PACKAGE_CREATED: "package_created",
  
  // Location Activities
  LOCATION_CREATED: "location_created",
  LOCATION_UPDATED: "location_updated",
  
  // Availability Activities
  AVAILABILITY_ADDED: "availability_added",
  AVAILABILITY_REMOVED: "availability_removed",
  UNAVAILABILITY_SET: "unavailability_set",
  
  // Payment Activities
  PAYMENT_PROCESSED: "payment_processed",
  REFUND_ISSUED: "refund_issued",
  
  // Admin Activities
  ADMIN_CHARGE: "admin_charge",
  SETTINGS_UPDATED: "settings_updated",
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

/**
 * Actor roles in the system
 */
export type ActorRole = "client" | "trainer" | "admin" | "system";

/**
 * Target types for activities
 */
export type TargetType = "trainer" | "client" | "booking" | "class" | "location" | "availability" | "package" | "organization";

/**
 * Base activity interface
 */
export interface BaseActivity {
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorRole: ActorRole;
  targetId?: string | null;
  targetName?: string;
  targetType?: TargetType;
  description: string;
  metadata?: Record<string, any>;
  orgId?: string | null;
  timestamp?: FirebaseFirestore.FieldValue;
}
