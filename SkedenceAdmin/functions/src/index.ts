/* eslint-disable quotes */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { scheduler, logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {
  checkQuota,
  incrementUsage,
  checkRateLimit,
  checkOrgAccess,
} from "./quotas";
import {ActivityTypes} from "./utils/activityTypes";
import {getUserDisplayName, getTrainerDisplayName} from "./utils/activityLogger";
import { checkRateLimit as rateLimitCheck, RATE_LIMITS } from "./rateLimiter";

// Initialize Firebase Admin SDK once when the function container starts
admin.initializeApp();

// Export Stripe payment functions (legacy single-tenant)
export * from "./stripe";

// Export Stripe Connect functions (multi-tenant)
export * from "./stripe-connect";

// Export Stripe Direct functions (organization's own keys)
export * from "./stripe-direct";

// Export migration/utility functions
export * from "./backfill-activities";
export * from "./backfill-recent-activities";

// Export billing/subscription functions
export * from "./billing";

// Export web subscription functions
export * from "./web-subscriptions";

// Export Stripe Connect webhook
export * from "./stripe-connect-webhook";

// Export quota and rate limiting functions
export * from "./quotas";

// Export password setup function
export * from "./passwordSetup";

// Export trainer invitation functions
export * from "./trainerInvitations";

// Export web registration functions
export * from "./webRegistration";

// Export trainer limit enforcement functions
export * from "./trainerLimits";

// Export trainer deletion functions
export * from "./deleteTrainer";

// Export user account deletion functions
export * from "./deleteUserAccount";

// Export confirmation email functions
export * from "./confirmationEmails";

// Export admin payment functions
export * from "./admin-payment";

// Export wallet functions
export * from "./wallet";

// Export password reset functions
export * from "./passwordReset";

const db = admin.firestore();

/**
 * Generate a deterministic schedule document ID for a given start time.
 * Uses UTC and hour resolution to match iOS FirestoreService.scheduleDocId(for:).
 * Format: YYYY-MM-DDTHH (e.g., 2025-10-13T06)
 *
 * @param {Date} startTime UTC date/time of the slot start
 * @return {string} Deterministic document ID
 */
function generateScheduleDocId(startTime: Date): string {
  const date = new Date(startTime);
  date.setUTCMinutes(0, 0, 0); // normalize to top of the hour
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  // e.g., 2025-10-13T06
  return `${year}-${month}-${day}T${hour}`;
}

// --- Interfaces for function input data ---

/**
 * Interface for the input data to the bookLesson callable function.
 */
interface BookLessonData {
  trainerId: string;
  slotId: string; // deterministic ID "YYYY-MM-DDTHH"
  lessonPackageId: string;
  athleteName?: string;
  secondAthleteName?: string;
  athleteNames?: string[]; // All athlete names for multi-athlete bookings
  lessonNotes?: string; // Session-specific notes from client
}

/**
 * Interface for the input data to the registerForClass callable function.
 */
interface RegisterForClassData {
  classId: string;
  classPassPackageId: string;
  athleteName?: string;
  secondAthleteName?: string;
}

/**
 * Interface for the input data to the processTrainerAvailability
 * callable function.
 */
interface ProcessTrainerAvailabilityData {
  trainerId?: string; // optional: specify trainer ID (admin only)
  startDate?: string; // YYYY-MM-DD (date-only)
  endDate?: string; // YYYY-MM-DD (date-only)
  dailyStartHour?: number; // 0...23 (LOCAL hour)
  dailyEndHour?: number; // 1...24 (exclusive end, LOCAL hour)
  slotDurationMinutes?: number; // usually 60
  daysOfWeek?: number[]; // 0=Sunday ... 6=Saturday (LOCAL weekday)
  timezoneOffsetMinutes?: number; // Date.getTimezoneOffset() from client (positive west of UTC)
  status?: string; // "open" or "unavailable"
  location?: string; // optional: location name for availability slots
}

// --- Cloud Functions ---

/**
 * Cloud Function to book a lesson for a user with a trainer.
 */
export const bookLesson = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const authUserId = request.auth.uid;

    const {trainerId, slotId, lessonPackageId, athleteName, secondAthleteName, athleteNames, lessonNotes, clientId} = request.data;
    if (!trainerId || !slotId || !lessonPackageId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing trainerId, slotId, or lessonPackageId in request data."
      );
    }

    // If clientId is provided (admin booking), use it; otherwise use authenticated user
    const userId = clientId || authUserId;

    const userRef = db.collection("users").doc(userId);
    const trainerRef = db.collection("trainers").doc(trainerId);
    // IMPORTANT: slotId is deterministic ("YYYY-MM-DDTHH")
    const trainerSlotRef = trainerRef.collection("schedules").doc(slotId);

    let orgId: string | undefined;
    let lessonPackageRef: FirebaseFirestore.DocumentReference;

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const trainerDoc = await transaction.get(trainerRef);
        const trainerSlotDoc = await transaction.get(trainerSlotRef);

        // Get orgId from trainer first for dual-path package lookup
        if (!trainerDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Trainer profile not found."
          );
        }
        const trainerData = trainerDoc.data();
        if (trainerData && trainerData.orgId) {
          orgId = trainerData.orgId as string;
        }

        // Dual-path package lookup: Try new path first, fallback to old path
        let lessonPackageDoc: FirebaseFirestore.DocumentSnapshot;
        if (orgId) {
          // Try new path: organizations/{orgId}/users/{userId}/packages/{packageId}
          const newPathRef = db.collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .collection("packages")
            .doc(lessonPackageId);
          lessonPackageDoc = await transaction.get(newPathRef);
          
          if (lessonPackageDoc.exists) {
            lessonPackageRef = newPathRef;
          } else {
            // Fallback to old path
            lessonPackageRef = userRef.collection("lessonPackages").doc(lessonPackageId);
            lessonPackageDoc = await transaction.get(lessonPackageRef);
          }
        } else {
          // No orgId, use old path only
          lessonPackageRef = userRef.collection("lessonPackages").doc(lessonPackageId);
          lessonPackageDoc = await transaction.get(lessonPackageRef);
        }

        if (!userDoc.exists) {
          throw new HttpsError(
            "not-found",
            "User profile not found for the authenticated user."
          );
        }

        // STEP 10: Check trainer's organization billing status and quota
        if (orgId) {
          const orgDoc = await transaction.get(
            db.collection("organizations").doc(orgId)
          );

          if (orgDoc.exists) {
            // Check if org is disabled or in read-only mode
            const orgAccess = await checkOrgAccess(orgId);
            if (!orgAccess.allowed) {
              throw new HttpsError(
                "failed-precondition",
                `Booking unavailable: ${orgAccess.reason}`
              );
            }
            if (orgAccess.isReadOnly) {
              throw new HttpsError(
                "failed-precondition",
                "Bookings are temporarily disabled. Please update your subscription."
              );
            }

            const orgData = orgDoc.data();
            const billing = orgData?.billing;

            if (billing) {
              const status = billing.status;
              const blockedStatuses = ["past_due", "canceled", "unpaid"];

              if (blockedStatuses.includes(status)) {
                throw new HttpsError(
                  "failed-precondition",
                  `Booking unavailable: The trainer's organization has a billing issue. Status: ${status}`
                );
              }
            }
          }
        }
        if (!lessonPackageDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Specified lesson package not found."
          );
        }
        if (!trainerDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Trainer profile not found."
          );
        }
        if (!trainerSlotDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Specified trainer slot not found."
          );
        }

        const userData = userDoc.data();
        const lessonPackageData = lessonPackageDoc.data();
        // trainerData already declared earlier for dual-path lookup
        const trainerSlotData = trainerSlotDoc.data();

        if (!userData || !lessonPackageData || !trainerData || !trainerSlotData) {
          throw new HttpsError(
            "internal",
            "Unexpected missing document data."
          );
        }

        // Check settings: location booking limit and minimum booking notice
        if (orgId) {
          const settingsDoc = await transaction.get(
            db.collection("organizations")
              .doc(orgId)
              .collection("settings")
              .doc(orgId)
          );

          if (settingsDoc.exists) {
            const settings = settingsDoc.data();

            // Check minimum booking notice
            const minBookingHours = settings?.minBookingHours ?? 4;
            const slotStartTime = trainerSlotData.startTime?.toDate();
            if (slotStartTime) {
              const hoursUntilLesson = (slotStartTime.getTime() - Date.now()) / (1000 * 60 * 60);
              if (hoursUntilLesson < minBookingHours) {
                throw new HttpsError(
                  "failed-precondition",
                  `Bookings must be made at least ${minBookingHours} hours in advance. This slot is too soon.`
                );
              }
            }

            // Check location booking limit if location is specified
            if (trainerSlotData.location) {
              const maxBookingsPerLocation = settings?.maxBookingsPerLocation ?? 5;

              // Get the start time of this slot
              const slotStartTime = trainerSlotData.startTime?.toDate();
              if (slotStartTime) {
                // Count CONCURRENT booked sessions at this location and time
                // Only count bookings happening at the exact same time
                const locationBookingsQuery = await db
                  .collectionGroup("schedules")
                  .where("orgId", "==", orgId)
                  .where("location", "==", trainerSlotData.location)
                  .where("status", "==", "booked")
                  .where("startTime", "==", trainerSlotData.startTime)
                  .get();

                const currentConcurrentBookings = locationBookingsQuery.size;

                if (currentConcurrentBookings >= maxBookingsPerLocation) {
                  throw new HttpsError(
                    "resource-exhausted",
                    `This location has reached its booking capacity (${maxBookingsPerLocation} concurrent sessions). Please choose a different time or location.`
                  );
                }
              }
            }
          }
        }

        // Validate package category - only athlete packages can book lessons
        // Check packageType first as source of truth
        const pkgType = lessonPackageData.packageType as string;
        const pkgCategory = lessonPackageData.packageCategory as string | undefined;

        // Reject if it's a class package by type
        if (pkgType === "class" || pkgType === "class_pass") {
          throw new HttpsError(
            "invalid-argument",
            "Class packages can only be used to register for classes, not book lessons."
          );
        }

        // Also check category as secondary validation - accept all athlete categories
        const validAthleteCategories = ["oneAthlete", "twoAthlete", "threeAthlete", "fourAthlete", "pass"];
        if (pkgCategory && pkgCategory === "class") {
          throw new HttpsError(
            "invalid-argument",
            "Class packages can only be used to register for classes, not book lessons."
          );
        }
        
        // Validate that category is a valid athlete category if present
        if (pkgCategory && !validAthleteCategories.includes(pkgCategory)) {
          throw new HttpsError(
            "invalid-argument",
            `Invalid package category: ${pkgCategory}. Expected one of: ${validAthleteCategories.join(", ")}`
          );
        }

        if (lessonPackageData.lessonsUsed >= lessonPackageData.totalLessons) {
          throw new HttpsError(
            "failed-precondition",
            "Lesson package has no lessons remaining."
          );
        }
        if (
          lessonPackageData.expirationDate &&
          lessonPackageData.expirationDate.toDate() < new Date()
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Lesson package has expired and cannot be used."
          );
        }

        if (
          trainerSlotData.status !== "open" ||
          (trainerSlotData.clientId !== null &&
            trainerSlotData.clientId !== undefined)
        ) {
          throw new HttpsError(
            "failed-precondition",
            "The requested trainer slot is not available or already booked."
          );
        }

        const clientFullName = `${userData.firstName || ""} ${
          userData.lastName || ""
        }`.trim();
        if (!clientFullName) {
          throw new HttpsError(
            "failed-precondition",
            "User name missing in profile; cannot create booking record."
          );
        }

        // Extract complete client profile data
        const clientEmail = userData.emailAddress || userData.email || null;
        const clientPhone = userData.phoneNumber || null;
        const emergencyContactName = userData.emergencyContactName || null;
        const emergencyContactNumber = userData.emergencyContactNumber || null;
        const referredBy = userData.referredBy || null;
        const notesForCoach = userData.notesForCoach || null;
        const athletes = userData.athletes || null; // Array of athlete info

        transaction.update(lessonPackageRef, {
          lessonsUsed: admin.firestore.FieldValue.increment(1),
        });

        transaction.update(trainerSlotRef, {
          status: "booked",
          clientId: userId,
          clientName: clientFullName,
          bookedAt: admin.firestore.FieldValue.serverTimestamp(),
          orgId: orgId || trainerData.orgId, // Ensure orgId is present
        });

        const newBookingRef = db.collection("bookings").doc();
        const trainerFirstName = trainerData.firstName || "";
        const trainerLastName = trainerData.lastName || "";
        const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || "Unknown Trainer";

        transaction.set(newBookingRef, {
          clientUID: userId,
          clientId: userId, // Add for backward compatibility with queries
          trainerId: trainerId,
          slotId: slotId, // deterministic schedule slot id
          startTime: trainerSlotData.startTime,
          endTime: trainerSlotData.endTime,
          packageId: lessonPackageId,
          bookedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "confirmed",
          trainerName: trainerFullName,
          clientName: clientFullName,
          scheduleSlotId: slotId,
          location: trainerSlotData.location || "Location TBD", // Copy location from schedule slot
          orgId: orgId || trainerData.orgId, // Add orgId to booking record
          athleteName: athleteName || null, // Legacy support
          secondAthleteName: secondAthleteName || null, // Legacy support
          athleteNames: athleteNames || null, // New array format
          lessonNotes: lessonNotes || null, // Session-specific notes
          // Client profile data
          clientEmail: clientEmail,
          clientPhone: clientPhone,
          emergencyContactName: emergencyContactName,
          emergencyContactNumber: emergencyContactNumber,
          referredBy: referredBy,
          notesForCoach: notesForCoach,
          athletes: athletes, // Full athlete info array
        });

        // Log activity for the booking
        if (orgId) {
          const activityTimestamp = Math.floor(Date.now() / 1000);
          const activityId = `${userId}_${ActivityTypes.LESSON_BOOKED}_${activityTimestamp}`;
          const activityRef = db.collection("activities").doc(activityId);
          transaction.set(activityRef, {
            type: ActivityTypes.LESSON_BOOKED,
            actorId: userId,
            actorName: clientFullName,
            actorRole: "client",
            targetId: trainerId,
            targetName: trainerFullName,
            targetType: "trainer",
            description: `${clientFullName} booked a private with ${trainerFullName}`,
            metadata: {
              bookingId: newBookingRef.id,
              slotId: slotId,
              startTime: trainerSlotData.startTime,
              endTime: trainerSlotData.endTime,
              location: trainerSlotData.location || "Location TBD",
              athleteName: athleteName || null,
              secondAthleteName: secondAthleteName || null,
              athleteNames: athleteNames || null,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            },
            orgId: orgId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      // Increment booking usage counter after successful transaction
      if (orgId) {
        await incrementUsage(orgId, "bookings");
      }

      logger.info(
        `Lesson booked successfully for user ${userId} with trainer ${trainerId}, slot ${slotId}.`
      );
      return {message: "Lesson booked successfully!"};
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("Error booking lesson:", error);
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while booking the lesson.",
        (error as Error).message
      );
    }
  }
);

/**
 * Cloud Function to register for a class using a class pass.
 */
export const registerForClass = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const userId = request.auth.uid;

    const {classId, classPassPackageId, athleteName, secondAthleteName} = request.data;
    if (!classId || !classPassPackageId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing classId or classPassPackageId in request data."
      );
    }

    const userRef = db.collection("users").doc(userId);
    const classPassRef = userRef
      .collection("lessonPackages")
      .doc(classPassPackageId);
    const classRef = db.collection("classes").doc(classId);

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const classPassDoc = await transaction.get(classPassRef);
        const classDoc = await transaction.get(classRef);

        if (!userDoc.exists) {
          throw new HttpsError(
            "not-found",
            "User profile not found for the authenticated user."
          );
        }
        if (!classPassDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Specified class pass not found."
          );
        }
        if (!classDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Class not found."
          );
        }

        const userData = userDoc.data();
        const classPassData = classPassDoc.data();
        const classData = classDoc.data();

        if (!userData || !classPassData || !classData) {
          throw new HttpsError(
            "internal",
            "Unexpected missing document data."
          );
        }

        // Verify it's a class pass - check packageType first as source of truth
        const pkgCategory = classPassData.packageCategory as string | undefined;
        const pkgType = classPassData.packageType as string;

        // Check packageType first (more reliable), then category as fallback
        const isClassPackage = pkgType === "class" || pkgType === "class_pass" || pkgCategory === "class";

        if (!isClassPackage) {
          throw new HttpsError(
            "invalid-argument",
            "The specified package is not a class pass. Only packages with 'class' category can be used for classes."
          );
        }

        // Check if pass has been used
        if (classPassData.lessonsUsed >= classPassData.totalLessons) {
          throw new HttpsError(
            "failed-precondition",
            "Class pass has already been used."
          );
        }

        // Check if pass is expired
        if (
          classPassData.expirationDate &&
          classPassData.expirationDate.toDate() < new Date()
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Class pass has expired and cannot be used."
          );
        }

        // Count number of athletes (1 primary + optional second)
        const athleteCount = secondAthleteName ? 2 : 1;

        // Check if pass has enough lessons for all athletes (1 pass per athlete)
        const remainingLessons = classPassData.totalLessons - classPassData.lessonsUsed;
        if (remainingLessons < athleteCount) {
          throw new HttpsError(
            "failed-precondition",
            `Not enough class passes. You need ${athleteCount} pass(es), but only ${remainingLessons} remaining.`
          );
        }

        // Check if class has enough space for all athletes
        const spotsRemaining = classData.maxParticipants - classData.currentParticipants;
        if (spotsRemaining < athleteCount) {
          throw new HttpsError(
            "failed-precondition",
            `Class does not have enough space. ${spotsRemaining} spot(s) remaining, but ${athleteCount} needed.`
          );
        }

        // Check if user is already registered for this specific athlete
        if (athleteName) {
          const athleteParticipantId = `${userId}_${athleteName.replace(/\s+/g, "_")}`;
          const athleteParticipantRef = classRef.collection("participants").doc(athleteParticipantId);
          const athleteParticipantDoc = await transaction.get(athleteParticipantRef);
          if (athleteParticipantDoc.exists) {
            throw new HttpsError(
              "already-exists",
              `${athleteName} is already registered for this class.`
            );
          }
        }

        // Increment lessonsUsed on the class pass by athleteCount (1 pass per athlete)
        transaction.update(classPassRef, {
          lessonsUsed: admin.firestore.FieldValue.increment(athleteCount),
        });

        // Increment class participants by number of athletes
        transaction.update(classRef, {
          currentParticipants: admin.firestore.FieldValue.increment(athleteCount),
        });

        // Add primary athlete to participants subcollection
        const primaryAthleteName = athleteName || `${userData.firstName || "Unknown"} ${userData.lastName || "User"}`.trim();
        const primaryParticipantId = `${userId}_${primaryAthleteName.replace(/\s+/g, "_")}`;
        const primaryParticipantRef = classRef.collection("participants").doc(primaryParticipantId);

        transaction.set(primaryParticipantRef, {
          userId: userId,
          firstName: userData.firstName || "Unknown",
          lastName: userData.lastName || "User",
          athleteName: primaryAthleteName,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          classPassPackageId: classPassPackageId,
        });

        // Add second athlete if provided
        if (secondAthleteName) {
          const secondParticipantId = `${userId}_${secondAthleteName.replace(/\s+/g, "_")}`;
          const secondParticipantRef = classRef.collection("participants").doc(secondParticipantId);

          transaction.set(secondParticipantRef, {
            userId: userId,
            firstName: userData.firstName || "Unknown",
            lastName: userData.lastName || "User",
            athleteName: secondAthleteName,
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            classPassPackageId: classPassPackageId,
          });
        }

        // Create classRegistration document for tracking user's registered classes
        // This allows the client app to query which classes a user is registered for
        const clientOrgId = userData.orgId || null;
        const registrationId = `${userId}_${classId}`;
        const registrationRef = db.collection("classRegistrations").doc(registrationId);
        transaction.set(registrationRef, {
          userId: userId,
          clientId: userId, // For backward compatibility with existing queries
          classId: classId,
          orgId: clientOrgId,
          athleteName: primaryAthleteName,
          secondAthleteName: secondAthleteName || null,
          athleteCount: athleteCount,
          classPassPackageId: classPassPackageId,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log activity
        const clientFullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Client";
        const className = classData.title || "Unknown Class";
        // athleteCount already declared above
        const athleteNames = secondAthleteName ? `${primaryAthleteName} and ${secondAthleteName}` : primaryAthleteName;

        const activityTimestamp = Math.floor(Date.now() / 1000);
        const activityId = `${userId}_${ActivityTypes.CLASS_REGISTERED}_${activityTimestamp}`;
        const activityRef = db.collection("activities").doc(activityId);
        transaction.set(activityRef, {
          type: ActivityTypes.CLASS_REGISTERED,
          actorId: userId,
          actorName: clientFullName,
          actorRole: "client",
          targetId: classId,
          targetName: className,
          targetType: "class",
          description: `${clientFullName} registered ${athleteNames} for ${className}`,
          metadata: {
            classId: classId,
            classPassPackageId: classPassPackageId,
            athleteName: primaryAthleteName,
            secondAthleteName: secondAthleteName || null,
            athleteCount: athleteCount,
            startTime: classData.startTime || null,
            endTime: classData.endTime || null,
            location: classData.location || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          orgId: clientOrgId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // athleteCount already calculated in transaction scope
      const finalAthleteCount = secondAthleteName ? 2 : 1;
      logger.info(
        `User ${userId} registered ${finalAthleteCount} athlete(s) for class ${classId} using pass ${classPassPackageId}.`
      );
      return {message: `Successfully registered ${finalAthleteCount} athlete(s) for class!`};
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("Error registering for class:", error);
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while registering for the class.",
        (error as Error).message
      );
    }
  }
);

/**
 * Cancel a booked lesson
 */
interface CancelLessonData {
  bookingId: string;
}

export const cancelLesson = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a lesson."
      );
    }
    const userId = request.auth.uid;
    const {bookingId} = request.data;

    if (!bookingId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing bookingId"
      );
    }

    // Rate limiting: 10 cancellations per minute per user
    const rateLimitKey = `cancelLesson_${userId}`;
    const allowed = await rateLimitCheck(
      rateLimitKey,
      RATE_LIMITS.CANCEL_LESSON.maxRequests,
      RATE_LIMITS.CANCEL_LESSON.windowSeconds
    );

    if (!allowed) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many cancellation attempts. Please try again in a minute."
      );
    }

    try {
      const bookingRef = db.collection("bookings").doc(bookingId);

      await db.runTransaction(async (transaction) => {
        // ===== PHASE 1: ALL READS (must happen before any writes) =====
        
        // Read booking
        const bookingDoc = await transaction.get(bookingRef);

        if (!bookingDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Booking not found."
          );
        }

        const bookingData = bookingDoc.data();
        if (!bookingData) {
          throw new HttpsError(
            "internal",
            "Booking data is missing."
          );
        }

        // Verify user owns this booking - check both clientUID and clientId for compatibility
        const bookingClientId = bookingData.clientUID || bookingData.clientId;
        if (!bookingClientId || bookingClientId !== userId) {
          throw new HttpsError(
            "permission-denied",
            "You can only cancel your own bookings."
          );
        }

        // Read settings if needed
        let settingsDoc = null;
        if (bookingData.orgId && bookingData.startTime) {
          settingsDoc = await transaction.get(
            db.collection("organizations")
              .doc(bookingData.orgId)
              .collection("settings")
              .doc(bookingData.orgId)
          );

          if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            const minCancellationHours = settings?.minCancellationHours ?? 24;
            const lessonStartTime = bookingData.startTime.toDate();
            const hoursUntilLesson = (lessonStartTime.getTime() - Date.now()) / (1000 * 60 * 60);

            if (hoursUntilLesson < minCancellationHours) {
              throw new HttpsError(
                "failed-precondition",
                `Cancellations must be made at least ${minCancellationHours} hours in advance. This lesson is too soon to cancel.`
              );
            }
          }
        }

        // Read lesson package
        const packageRef = db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(bookingData.packageId);

        const packageDoc = await transaction.get(packageRef);

        // Read trainer's schedule slot
        let slotDoc = null;
        let trainerSlotRef = null;
        if (bookingData.trainerId && bookingData.slotId) {
          trainerSlotRef = db
            .collection("trainers")
            .doc(bookingData.trainerId)
            .collection("schedules")
            .doc(bookingData.slotId);

          slotDoc = await transaction.get(trainerSlotRef);
        }

        // Read user and trainer for activity logging
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.exists ? userDoc.data() : null;
        const clientFullName = userData ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Client" : "Unknown Client";
        
        let trainerDoc = null;
        let trainerFullName = "Unknown Trainer";
        if (bookingData.trainerId) {
          const trainerRef = db.collection("trainers").doc(bookingData.trainerId);
          trainerDoc = await transaction.get(trainerRef);
          const trainerData = trainerDoc.exists ? trainerDoc.data() : null;
          trainerFullName = trainerData ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() || "Unknown Trainer" : "Unknown Trainer";
        }

        // ===== PHASE 2: ALL WRITES (must happen after all reads) =====

        // Update lesson package
        if (packageDoc.exists) {
          transaction.update(packageRef, {
            lessonsUsed: admin.firestore.FieldValue.increment(-1),
          });
        }

        // Update trainer's schedule slot back to open
        if (slotDoc && slotDoc.exists && trainerSlotRef) {
          logger.info(`Updating slot ${bookingData.slotId} for trainer ${bookingData.trainerId} to open`);
          transaction.update(trainerSlotRef, {
            status: "open",
            clientId: admin.firestore.FieldValue.delete(),
            clientName: admin.firestore.FieldValue.delete(),
            bookedAt: admin.firestore.FieldValue.delete(),
          });
        } else if (bookingData.trainerId && bookingData.slotId) {
          logger.warn(`Slot ${bookingData.slotId} not found for trainer ${bookingData.trainerId} - slot may have been deleted or schedule restructured`);
        }

        // Delete the booking
        transaction.delete(bookingRef);

        // Log activity
        const activityTimestamp = Math.floor(Date.now() / 1000);
        const activityId = `${userId}_${ActivityTypes.LESSON_CANCELLED}_${activityTimestamp}`;
        const activityRef = db.collection("activities").doc(activityId);
        transaction.set(activityRef, {
          type: ActivityTypes.LESSON_CANCELLED,
          actorId: userId,
          actorName: clientFullName,
          actorRole: "client",
          targetId: bookingData.trainerId || null,
          targetName: trainerFullName,
          targetType: "trainer",
          description: `${clientFullName} cancelled a lesson with ${trainerFullName}`,
          metadata: {
            bookingId: bookingId,
            slotId: bookingData.slotId || null,
            startTime: bookingData.startTime || null,
            endTime: bookingData.endTime || null,
            location: bookingData.location || null,
            athleteName: bookingData.athleteName || null,
            secondAthleteName: bookingData.secondAthleteName || null,
          },
          orgId: bookingData.orgId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      logger.info(`User ${userId} cancelled booking ${bookingId}`);
      return {message: "Lesson cancelled successfully!"};
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("Error cancelling lesson:", error);
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while cancelling the lesson.",
        (error as Error).message
      );
    }
  }
);

/**
 * Scheduled function to mark past lessons as complete
 * Runs every hour to update booking statuses
 */
export const markCompletedLessons = scheduler.onSchedule({
  schedule: "every 1 hours",
  timeZone: "America/New_York",
}, async (event) => {
  try {
    const now = admin.firestore.Timestamp.now();
    
    // Find all bookings that have ended but are still marked as confirmed
    const pastBookingsSnapshot = await db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("endTime", "<", now)
      .get();

    console.log(`Found ${pastBookingsSnapshot.size} bookings to mark as complete`);

    const batch = db.batch();
    let updateCount = 0;

    pastBookingsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updateCount++;
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Marked ${updateCount} lessons as completed`);
    }

    return null;
  } catch (error) {
    console.error("Error marking completed lessons:", error);
    return null;
  }
});

/**
 * Admin cancel lesson - allows admins/owners to cancel any client's booking
 */
interface AdminCancelLessonData {
  bookingId: string;
  orgId: string;
  clientId: string;
  refundPass?: boolean; // Optional: true for early cancel, false for late cancel. Defaults to true for backward compatibility
}

export const adminCancelLesson = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a lesson."
      );
    }
    const adminUid = request.auth.uid;
    const {bookingId, orgId, clientId, refundPass = true} = request.data; // Default to true for backward compatibility

    if (!bookingId || !orgId || !clientId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: bookingId, orgId, clientId"
      );
    }

    try {
      // Verify admin/owner access using flat orgMembers collection
      const membershipId = `${adminUid}_${orgId}`;
      const memberDoc = await db
        .collection("orgMembers")
        .doc(membershipId)
        .get();

      if (!memberDoc.exists) {
        throw new HttpsError(
          "permission-denied",
          "You are not a member of this organization"
        );
      }

      const memberData = memberDoc.data();
      const role = memberData?.role;

      if (role !== "admin" && role !== "owner") {
        throw new HttpsError(
          "permission-denied",
          "Only admins and owners can cancel client bookings"
        );
      }

      const bookingRef = db.collection("bookings").doc(bookingId);

      // Pre-check booking exists before transaction
      const bookingSnapshot = await bookingRef.get();
      if (!bookingSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          `Booking ${bookingId} not found.`
        );
      }

      const preBookingData = bookingSnapshot.data();
      if (!preBookingData) {
        throw new HttpsError(
          "internal",
          "Booking data is missing."
        );
      }

      // Verify booking belongs to specified client
      if (preBookingData.clientUID !== clientId) {
        throw new HttpsError(
          "invalid-argument",
          `Booking does not belong to client ${clientId}. Belongs to ${preBookingData.clientUID}`
        );
      }

      logger.info(`Cancelling booking ${bookingId} for client ${clientId}. RefundPass: ${refundPass}`);

      // Fetch activity logging data before transaction
      let adminFullName = "Admin";
      let clientFullName = "Unknown Client";
      let trainerFullName = "Unknown Trainer";
      
      try {
        const [adminDoc, clientDoc] = await Promise.all([
          db.collection("trainers").doc(adminUid).get(),
          db.collection("users").doc(clientId).get()
        ]);
        
        if (adminDoc.exists) {
          const adminData = adminDoc.data();
          adminFullName = adminData ? `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin" : "Admin";
        }
        
        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          clientFullName = clientData ? `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "Unknown Client" : "Unknown Client";
        }
      } catch (fetchError) {
        logger.warn("Error fetching user data for activity log:", fetchError);
      }

      await db.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);

        if (!bookingDoc.exists) {
          throw new Error("Booking was deleted during transaction");
        }

        const bookingData = bookingDoc.data();
        if (!bookingData) {
          throw new Error("Booking data missing during transaction");
        }

        // Fetch trainer data for activity logging BEFORE any writes
        if (bookingData.trainerId) {
          const trainerRef = db.collection("trainers").doc(bookingData.trainerId);
          const trainerDoc = await transaction.get(trainerRef);
          if (trainerDoc.exists) {
            const trainerData = trainerDoc.data();
            trainerFullName = trainerData ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() || "Unknown Trainer" : "Unknown Trainer";
          }
        }

        // Read package and slot docs BEFORE any writes
        let packageDoc;
        let slotDoc;
        
        if (refundPass && bookingData.packageId) {
          const packageRef = db
            .collection("users")
            .doc(clientId)
            .collection("lessonPackages")
            .doc(bookingData.packageId);
          packageDoc = await transaction.get(packageRef);
        }
        
        if (bookingData.trainerId && bookingData.slotId) {
          const trainerSlotRef = db
            .collection("trainers")
            .doc(bookingData.trainerId)
            .collection("schedules")
            .doc(bookingData.slotId);
          slotDoc = await transaction.get(trainerSlotRef);
        }

        // Now perform all writes
        // Get the lesson package and conditionally decrement lessonsUsed based on refundPass
        // If refundPass is true (early cancel), refund the pass. If false (late cancel), don't refund.
        if (refundPass && bookingData.packageId && packageDoc) {
          logger.info(`Refunding pass ${bookingData.packageId} for client ${clientId}`);
          const packageRef = db
            .collection("users")
            .doc(clientId)
            .collection("lessonPackages")
            .doc(bookingData.packageId);

          if (packageDoc.exists) {
            transaction.update(packageRef, {
              lessonsUsed: admin.firestore.FieldValue.increment(-1),
            });
          } else {
            logger.warn(`Package ${bookingData.packageId} not found for refund`);
          }
        }

        // Update trainer's schedule slot back to open
        if (bookingData.trainerId && bookingData.slotId && slotDoc) {
          logger.info(`Opening slot ${bookingData.slotId} for trainer ${bookingData.trainerId}`);
          const trainerSlotRef = db
            .collection("trainers")
            .doc(bookingData.trainerId)
            .collection("schedules")
            .doc(bookingData.slotId);

          if (slotDoc.exists) {
            transaction.update(trainerSlotRef, {
              status: "open",
              clientId: null,
              clientName: null,
              bookedAt: null,
            });
          } else {
            logger.warn(`Slot ${bookingData.slotId} not found for trainer ${bookingData.trainerId}`);
          }
        }

        // Delete the booking
        logger.info(`Deleting booking ${bookingId}`);
        transaction.delete(bookingRef);

        // Log activity
        const activityTimestamp = Math.floor(Date.now() / 1000);
        const activityId = `${adminUid}_${ActivityTypes.LESSON_CANCELLED}_${activityTimestamp}`;
        const activityRef = db.collection("activities").doc(activityId);
        transaction.set(activityRef, {
            type: ActivityTypes.LESSON_CANCELLED,
            actorId: adminUid,
            actorName: adminFullName,
            actorRole: "admin",
            targetId: clientId,
            targetName: clientFullName,
            targetType: "client",
            description: `${adminFullName} cancelled ${clientFullName}'s lesson with ${trainerFullName} (${refundPass ? 'Early Cancel - Pass Refunded' : 'Late Cancel - No Refund'})`,
            metadata: {
              bookingId: bookingId,
              slotId: bookingData.slotId || null,
              trainerId: bookingData.trainerId,
              trainerName: trainerFullName,
              startTime: bookingData.startTime || null,
              endTime: bookingData.endTime || null,
              location: bookingData.location || null,
              athleteName: bookingData.athleteName || null,
              secondAthleteName: bookingData.secondAthleteName || null,
              refundPass: refundPass, // Track whether pass was refunded
              cancelType: refundPass ? 'early' : 'late', // Track cancel type
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            },
            orgId: orgId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
      });

      logger.info(
        `Admin ${adminUid} (${role}) successfully cancelled booking ${bookingId} for client ${clientId} in org ${orgId}. RefundPass: ${refundPass}`
      );
      return {message: "Lesson cancelled successfully!"};
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("Error cancelling lesson:", {
        error: error,
        message: (error as Error).message,
        stack: (error as Error).stack,
        bookingId,
        orgId,
        clientId,
        refundPass
      });
      throw new HttpsError(
        "internal",
        `An unexpected error occurred while cancelling the lesson: ${(error as Error).message}`,
        JSON.stringify({
          originalError: (error as Error).message,
          bookingId,
          orgId,
          clientId
        })
      );
    }
  }
);

/**
 * Cancel a class registration
 */
interface CancelClassRegistrationData {
  classId: string;
}

export const cancelClassRegistration = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a registration."
      );
    }
    const userId = request.auth.uid;
    const {classId} = request.data;

    if (!classId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing classId"
      );
    }

    try {
      const classRef = db.collection("classes").doc(classId);
      const participantRef = classRef.collection("participants").doc(userId);

      await db.runTransaction(async (transaction) => {
        const classDoc = await transaction.get(classRef);
        const participantDoc = await transaction.get(participantRef);

        if (!classDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Class not found."
          );
        }

        if (!participantDoc.exists) {
          throw new HttpsError(
            "not-found",
            "You are not registered for this class."
          );
        }

        const participantData = participantDoc.data();
        if (!participantData) {
          throw new HttpsError(
            "internal",
            "Participant data is missing."
          );
        }

        // Get the class pass package and decrement lessonsUsed
        const classPassRef = db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(participantData.classPassPackageId);

        const classPassDoc = await transaction.get(classPassRef);
        if (classPassDoc.exists) {
          transaction.update(classPassRef, {
            lessonsUsed: admin.firestore.FieldValue.increment(-1),
          });
        }

        // Decrement class participants count
        transaction.update(classRef, {
          currentParticipants: admin.firestore.FieldValue.increment(-1),
        });

        // Remove participant from class
        transaction.delete(participantRef);
        
        // Delete classRegistration document
        const registrationId = `${userId}_${classId}`;
        const registrationRef = db.collection("classRegistrations").doc(registrationId);
        transaction.delete(registrationRef);

        // Log activity
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.exists ? userDoc.data() : null;
        const clientFullName = userData ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Client" : "Unknown Client";
        
        const classData = classDoc.data();
        const className = classData?.title || "Unknown Class";
        const athleteName = participantData.athleteName || clientFullName;

        const activityTimestamp = Math.floor(Date.now() / 1000);
        const activityId = `${userId}_${ActivityTypes.CLASS_CANCELLED}_${activityTimestamp}`;
        const activityRef = db.collection("activities").doc(activityId);
        transaction.set(activityRef, {
          type: ActivityTypes.CLASS_CANCELLED,
          actorId: userId,
          actorName: clientFullName,
          actorRole: "client",
          targetId: classId,
          targetName: className,
          targetType: "class",
          description: `${clientFullName} cancelled registration for ${className}`,
          metadata: {
            classId: classId,
            classPassPackageId: participantData.classPassPackageId,
            athleteName: athleteName,
            startTime: classData?.startTime || null,
            endTime: classData?.endTime || null,
            location: classData?.location || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          orgId: userData?.orgId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      logger.info(
        `User ${userId} cancelled registration for class ${classId}`
      );
      return {message: "Class registration cancelled successfully!"};
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("Error cancelling class registration:", error);
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while cancelling the registration.",
        (error as Error).message
      );
    }
  }
);

/**
 * Cloud Function to generate or process trainer availability slots.
 * Creates 'open' schedule slots for the specified range and weekdays.
 *
 * Interprets provided dates and hours in the client's LOCAL timezone using timezoneOffsetMinutes.
 * timezoneOffsetMinutes must match JavaScript Date.getTimezoneOffset() (positive west of UTC).
 */
export const processTrainerAvailability = onCall(
  { enforceAppCheck: false }, // Temporarily disabled for static export compatibility
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const callingUserId = request.auth.uid;

    // Extract trainerId from request data (for admin use)
    const requestedTrainerId = request.data.trainerId;

    // Use provided trainerId or default to calling user
    const targetTrainerId = requestedTrainerId || callingUserId;

    const trainerRef = db.collection("trainers").doc(targetTrainerId);
    const trainerDoc = await trainerRef.get();

    if (!trainerDoc.exists) {
      throw new HttpsError(
        "permission-denied",
        "Trainer not found."
      );
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      throw new HttpsError(
        "internal",
        "Unexpected missing trainer profile data."
      );
    }
    const trainerId = targetTrainerId;
    const orgId = trainerData.orgId;

    // Fetch organization to get timezone
    if (!orgId) {
      throw new HttpsError(
        "internal",
        "Trainer has no organization ID."
      );
    }

    const orgDoc = await db.collection("organizations").doc(orgId).get();
    if (!orgDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Organization not found."
      );
    }

    const orgData = orgDoc.data();
    const orgTimezone = orgData?.settings?.timezone || "America/New_York"; // default to ET

    const {
      startDate: rawStartDate,
      endDate: rawEndDate,
      dailyStartHour = 9,
      dailyEndHour = 17,
      slotDurationMinutes = 60,
      daysOfWeek, // optional filter 0..6 (Sun..Sat), interpreted in LOCAL time
      timezoneOffsetMinutes, // DEPRECATED - now using org timezone
      status = "open", // default to "open" if not specified
      location, // optional location name
    } = request.data;

    // Map timezone identifiers to standard UTC offsets (before DST)
    const timezoneOffsets: Record<string, number> = {
      "America/New_York": 300,    // UTC-5 (EST becomes UTC-4 EDT in DST)
      "America/Chicago": 360,      // UTC-6 (CST becomes UTC-5 CDT in DST)
      "America/Denver": 420,       // UTC-7 (MST becomes UTC-6 MDT in DST)
      "America/Los_Angeles": 480,  // UTC-8 (PST becomes UTC-7 PDT in DST)
    };

    // Get base offset for this timezone (JavaScript semantics: minutes to add to LOCAL to get UTC)
    const baseTimezoneOffset = timezoneOffsets[orgTimezone] || timezoneOffsetMinutes || 300;

    // Establish UTC start-of-day defaults
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const defaultEndUTC = new Date(todayUTC);
    defaultEndUTC.setUTCDate(defaultEndUTC.getUTCDate() + 7);

    // Parse YYYY-MM-DD strictly
    const parseDateOnly = (s: string): {y: number; m: number; d: number} => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      if (!match) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid start or end date provided. Use YYYY-MM-DD format."
        );
      }
      return {y: Number(match[1]), m: Number(match[2]), d: Number(match[3])};
    };

    // Convert a local date (y-m-d at local midnight) to the UTC instant that corresponds to that local midnight.
    // Uses the organization's timezone for calculations.
    const localMidnightToUTC = (y: number, m: number, d: number): Date => {
      // Create a date at midnight UTC for this calendar date
      const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
      // Apply the timezone offset to get local midnight in UTC
      return new Date(utcMs + baseTimezoneOffset * 60_000);
    };
    
    // Helper to detect if a date falls within DST period (US rules)
    // DST starts: Second Sunday of March at 2am
    // DST ends: First Sunday of November at 2am
    const isDST = (year: number, month: number, day: number): boolean => {
      // Find second Sunday of March
      const marchFirst = new Date(Date.UTC(year, 2, 1)); // March 1
      const marchFirstDay = marchFirst.getUTCDay(); // 0=Sun, 1=Mon, etc.
      const daysUntilFirstSunday = marchFirstDay === 0 ? 0 : (7 - marchFirstDay);
      const secondSundayOfMarch = 1 + daysUntilFirstSunday + 7; // Second Sunday
      
      // Find first Sunday of November
      const novFirst = new Date(Date.UTC(year, 10, 1)); // November 1
      const novFirstDay = novFirst.getUTCDay();
      const firstSundayOfNov = novFirstDay === 0 ? 1 : (1 + (7 - novFirstDay));
      
      // Create date for comparison
      const currentDate = year * 10000 + month * 100 + day;
      const dstStart = year * 10000 + 3 * 100 + secondSundayOfMarch;
      const dstEnd = year * 10000 + 11 * 100 + firstSundayOfNov;
      
      return currentDate >= dstStart && currentDate < dstEnd;
    };
    
    // Helper to create a UTC timestamp for a specific local date/time in the org's timezone
    // This accounts for DST by adjusting the offset based on the date
    const createLocalDateTime = (y: number, m: number, d: number, hour: number, minute: number): Date => {
      // Date.UTC gives us midnight on this date in UTC
      const utcBase = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
      const localMinutes = hour * 60 + minute;
      
      // Adjust offset for DST if needed
      // During DST, clocks "spring forward" by 1 hour, so offset decreases by 60 minutes
      let adjustedOffset = baseTimezoneOffset;
      const targetDST = isDST(y, m, d);
      
      if (targetDST) {
        // Target date IS in DST - offset decreases by 60
        adjustedOffset -= 60;
      }
      
      const utcMs = utcBase + (localMinutes * 60_000) + (adjustedOffset * 60_000);
      return new Date(utcMs);
    };

    // Build start and end UTC anchors from local dates (if provided)
    const startDateUTC = (() => {
      if (rawStartDate) {
        const {y, m, d} = parseDateOnly(rawStartDate);
        return localMidnightToUTC(y, m, d);
      }
      return new Date(todayUTC.getTime() + timezoneOffsetMinutes * 60_000);
    })();

    const endDateUTC = (() => {
      if (rawEndDate) {
        const {y, m, d} = parseDateOnly(rawEndDate);
        return localMidnightToUTC(y, m, d);
      }
      return new Date(defaultEndUTC.getTime() + timezoneOffsetMinutes * 60_000);
    })();

    // Validation
    if (isNaN(startDateUTC.getTime()) || isNaN(endDateUTC.getTime())) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid start or end date provided. Use YYYY-MM-DD format."
      );
    }
    if (startDateUTC > endDateUTC) {
      throw new HttpsError(
        "invalid-argument",
        "Start date cannot be after end date."
      );
    }
    if (
      dailyStartHour < 0 ||
      dailyStartHour > 23 ||
      dailyEndHour < 1 ||
      dailyEndHour > 24 ||
      dailyStartHour >= dailyEndHour
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid daily start or end hours."
      );
    }
    if (slotDurationMinutes <= 0 || slotDurationMinutes > 1440) {
      throw new HttpsError(
        "invalid-argument",
        "Slot duration must be a positive number of minutes."
      );
    }

    const trainerScheduleCollection = trainerRef.collection("schedules");
    const batch = db.batch();
    let slotsAddedCount = 0;
    let daysProcessed = 0;
    let slotsSkipped = 0;

    try {
      // Walk through calendar dates (not UTC dates) to properly handle DST
      // Parse start date to get initial calendar values
      const startParts = rawStartDate ? parseDateOnly(rawStartDate) : {
        y: new Date().getFullYear(),
        m: new Date().getMonth() + 1,
        d: new Date().getDate()
      };
      const endParts = rawEndDate ? parseDateOnly(rawEndDate) : {
        y: startParts.y,
        m: startParts.m,
        d: startParts.d + 7
      };
      
      // Create a date for iteration - we'll increment by day
      let currentDate = new Date(Date.UTC(startParts.y, startParts.m - 1, startParts.d));
      const endDate = new Date(Date.UTC(endParts.y, endParts.m - 1, endParts.d));
      
      while (currentDate <= endDate) {
        daysProcessed++;
        
        // Extract calendar date components for this iteration
        const year = currentDate.getUTCFullYear();
        const month = currentDate.getUTCMonth() + 1; // 1-12
        const day = currentDate.getUTCDate();
        
        // Calculate weekday for this calendar date (using a temp date in user's timezone)
        const tempLocalDate = createLocalDateTime(year, month, day, 12, 0); // noon to avoid edge cases
        const localWeekday = tempLocalDate.getUTCDay(); // 0..6 (Sun..Sat)

        // Filter by selected weekdays (LOCAL)
        if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
          if (!daysOfWeek.includes(localWeekday)) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            continue;
          }
        }

        // Iterate by minutes to avoid FP drift
        const startMinutes = Math.round(dailyStartHour * 60);
        const endMinutesExclusive = Math.round(dailyEndHour * 60);

        for (
          let minuteOfDay = startMinutes;
          minuteOfDay + slotDurationMinutes <= endMinutesExclusive;
          minuteOfDay += slotDurationMinutes
        ) {
          const startHour = Math.floor(minuteOfDay / 60);
          const startMinute = minuteOfDay % 60;

          // Create slot times using the calendar date + time
          // This ensures DST is handled correctly for each specific date
          const slotStartTime = createLocalDateTime(year, month, day, startHour, startMinute);
          const slotEndTime = new Date(slotStartTime.getTime() + slotDurationMinutes * 60_000);

          // Deterministic ID for this slot (UTC hour)
          const slotDocId = generateScheduleDocId(slotStartTime);
          const slotRef = trainerScheduleCollection.doc(slotDocId);
          const existingSlotDoc = await slotRef.get();

          const trainerFirstName = trainerData.firstName || "";
          const trainerLastName = trainerData.lastName || "";
          const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || "Unknown Trainer";

          const slotData: Record<string, any> = {
            status: status,
            startTime: slotStartTime,
            endTime: slotEndTime,
            clientId: null,
            clientName: null,
            trainerName: trainerFullName,
            orgId: orgId, // Use orgId from function scope
          };

          // Add location if provided
          if (location) {
            slotData.location = location;
          }

          if (!existingSlotDoc.exists) {
            // Create new slot
            slotData.createdAt = admin.firestore.FieldValue.serverTimestamp();
            batch.set(slotRef, slotData);
            slotsAddedCount++;
          } else {
            // Update existing slot if it's open and we're setting to unavailable
            // or if it's unavailable and we're setting to open
            const existingData = existingSlotDoc.data();
            const existingStatus = existingData?.status;
            const isBooked = existingStatus === "booked" || existingData?.clientId;

            if (!isBooked && existingStatus !== status) {
              // Only update if not booked and status is changing
              batch.update(slotRef, slotData);
              slotsAddedCount++;
            } else {
              slotsSkipped++;
            }
          }
        }

        // Next calendar day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      if (slotsAddedCount > 0) {
        await batch.commit();
        
        // Log activity for availability creation
        const trainerFirstName = trainerData.firstName || "";
        const trainerLastName = trainerData.lastName || "";
        const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || "Unknown Trainer";
        const orgId = trainerData.orgId || null;
        const actorIsTrainer = callingUserId === trainerId;
        
        await db.collection("activities").add({
          type: status === "open" ? "availability_added" : "unavailability_set",
          actorId: callingUserId,
          actorName: actorIsTrainer ? trainerFullName : "Admin",
          actorRole: actorIsTrainer ? "trainer" : "admin",
          targetId: trainerId,
          targetName: trainerFullName,
          targetType: "trainer",
          description: actorIsTrainer 
            ? `${trainerFullName} ${status === "open" ? "added availability" : "set unavailability"} (${slotsAddedCount} slots)`
            : `Admin ${status === "open" ? "added availability" : "set unavailability"} for ${trainerFullName} (${slotsAddedCount} slots)`,
          metadata: {
            slotsAdded: slotsAddedCount,
            startDate: rawStartDate || null,
            endDate: rawEndDate || null,
            dailyStartHour: dailyStartHour,
            dailyEndHour: dailyEndHour,
            slotDurationMinutes: slotDurationMinutes,
            status: status,
            location: location || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          orgId: orgId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        message: `Availability processed successfully! Added ${slotsAddedCount} new slots.`,
        slotsAdded: slotsAddedCount,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error(
        "❌ Error processing trainer availability:",
        error
      );
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while processing trainer availability.",
        (error as Error).message
      );
    }
  }
);

/**
 * One-time function to update all class locations from "Midtown" to "Oakwood Community Church"
 * Admin-only function
 */
export const updateClassLocations = onCall(
  { enforceAppCheck: true },
  async (request) => {
    // Check if user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to perform this action."
      );
    }

    const userId = request.auth.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can update class locations."
      );
    }

    try {
      const classesSnapshot = await db.collection("classes").get();

      if (classesSnapshot.empty) {
        return {message: "No classes found."};
      }

      const batch = db.batch();
      let updateCount = 0;

      classesSnapshot.forEach((doc) => {
        const data = doc.data();

        // Check if location contains "Midtown" (case insensitive)
        if (data.location && data.location.toLowerCase().includes("midtown")) {
          logger.info(
            `Updating class "${data.title}" (${doc.id}): "${data.location}" -> "Oakwood Community Church"`
          );
          batch.update(doc.ref, {
            location: "Oakwood Community Church",
          });
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        logger.info(
          `Successfully updated ${updateCount} class location(s).`
        );
        return {
          message: `Successfully updated ${updateCount} class location(s) from Midtown to Oakwood Community Church.`,
          updatedCount: updateCount,
        };
      } else {
        return {message: "No classes with 'Midtown' found. Nothing to update."};
      }
    } catch (error) {
      logger.error("Error updating class locations:", error);
      throw new HttpsError(
        "internal",
        "An error occurred while updating class locations.",
        (error as Error).message
      );
    }
  }
);

/**
 * Register a new trainer profile
 * Called during trainer signup from admin app
 */
export const registerTrainer = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {uid, email, firstName, lastName, orgId} = request.data;

    if (!uid || !email || !firstName || !lastName) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: uid, email, firstName, lastName"
      );
    }

    try {
      // Create trainer profile
      await db.collection("trainers").doc(uid).set({
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        orgId: orgId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
      }, {merge: true});

      console.log(`✅ Registered trainer: ${firstName} ${lastName} (${uid})`);

      return {success: true, trainerId: uid};
    } catch (error) {
      console.error("❌ Error registering trainer:", error);
      throw new HttpsError(
        "internal",
        `Failed to register trainer: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Manually register a client for a class (admin only)
 * Supports both existing clients with packages and manual entry
 */
export const manualRegisterForClass = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {classId, userId, classPassPackageId, firstName, lastName, email} = request.data;

    if (!classId) {
      throw new HttpsError(
        "invalid-argument",
        "classId is required"
      );
    }

    try {
      // Get class document
      const classDoc = await db.collection("classes").doc(classId).get();
      if (!classDoc.exists) {
        throw new HttpsError("not-found", "Class not found");
      }

      const classData = classDoc.data()!;
      const orgId = classData.orgId;

      if (!orgId) {
        throw new HttpsError(
          "failed-precondition",
          "Class missing orgId"
        );
      }

      // Check if user is admin
      const adminMember = await db
        .collection("orgMembers")
        .doc(`${request.auth.uid}_${orgId}`)
        .get();

      if (!adminMember.exists) {
        throw new HttpsError(
          "permission-denied",
          "Not a member of this organization"
        );
      }

      const role = adminMember.data()?.role;
      if (role !== "admin" && role !== "owner") {
        throw new HttpsError(
          "permission-denied",
          "Must be admin or owner to manually register clients"
        );
      }

      let registrationData: any;

      if (userId) {
        // Existing client registration
        if (!classPassPackageId) {
          throw new HttpsError(
            "invalid-argument",
            "classPassPackageId required for existing client"
          );
        }

        // Verify package exists and has credits
        const packageDoc = await db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(classPassPackageId)
          .get();

        if (!packageDoc.exists) {
          throw new HttpsError("not-found", "Package not found");
        }

        const packageData = packageDoc.data()!;
        if ((packageData.lessonsRemaining || 0) <= 0) {
          throw new HttpsError(
            "failed-precondition",
            "Package has no remaining credits"
          );
        }

        registrationData = {
          clientId: userId,
          classId,
          classPassPackageId,
          orgId,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          registeredBy: request.auth.uid,
          status: "confirmed",
        };

        // Decrement package
        await db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(classPassPackageId)
          .update({
            lessonsRemaining: admin.firestore.FieldValue.increment(-1),
          });

        console.log(`✅ Registered user ${userId} for class ${classId} using package ${classPassPackageId}`);
      } else {
        // Manual entry registration
        if (!firstName || !lastName) {
          throw new HttpsError(
            "invalid-argument",
            "firstName and lastName required for manual entry"
          );
        }

        registrationData = {
          firstName,
          lastName,
          email: email || null,
          classId,
          orgId,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          registeredBy: request.auth.uid,
          status: "manual",
          isManualEntry: true,
        };

        console.log(`✅ Manually registered ${firstName} ${lastName} for class ${classId}`);
      }

      // Create registration
      await db.collection("classRegistrations").add(registrationData);

      // Increment current participants
      await db.collection("classes").doc(classId).update({
        currentParticipants: admin.firestore.FieldValue.increment(1),
      });

      // Log activity
      const adminDoc = await db.collection("trainers").doc(request.auth.uid).get();
      const adminData = adminDoc.exists ? adminDoc.data() : null;
      const adminName = adminData ? `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin" : "Admin";
      
      const classForLogging = await db.collection("classes").doc(classId).get();
      const classDataForLogging = classForLogging.exists ? classForLogging.data() : null;
      const className = classDataForLogging?.title || "Unknown Class";
      
      const participantName = userId ? "Unknown Client" : `${firstName} ${lastName}`;
      
      await db.collection("activities").add({
        type: ActivityTypes.CLASS_ENROLLMENT,
        actorId: request.auth.uid,
        actorName: adminName,
        actorRole: "admin",
        targetId: classId,
        targetName: className,
        targetType: "class",
        description: userId 
          ? `${adminName} registered client for ${className}` 
          : `${adminName} manually registered ${participantName} for ${className}`,
        metadata: {
          classId: classId,
          participantName: participantName,
          isManualEntry: !userId,
          classPassPackageId: classPassPackageId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
        orgId: orgId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
    } catch (error) {
      console.error("❌ Error in manualRegisterForClass:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        `Failed to register for class: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
/* eslint-enable quotes */
