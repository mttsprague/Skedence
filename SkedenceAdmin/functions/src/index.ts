/* eslint-disable quotes */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  checkQuota,
  incrementUsage,
  checkRateLimit,
  checkOrgAccess,
} from "./quotas";

// Initialize Firebase Admin SDK once when the function container starts
admin.initializeApp();

// Export Stripe payment functions (legacy single-tenant)
export * from "./stripe";

// Export Stripe Connect functions (multi-tenant)
export * from "./stripe-connect";

// Export Stripe Direct functions (organization's own keys)
export * from "./stripe-direct";

// Export billing/subscription functions
export * from "./billing";

// Export Stripe Connect webhook
export * from "./stripe-connect-webhook";

// Export quota and rate limiting functions
export * from "./quotas";

// Export password setup function
export * from "./passwordSetup";

// Export trainer invitation functions
export * from "./trainerInvitations";

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
export const bookLesson = functions.https.onCall(
  async (request: functions.https.CallableRequest<BookLessonData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const userId = request.auth.uid;

    const {trainerId, slotId, lessonPackageId, athleteName, secondAthleteName} = request.data;
    if (!trainerId || !slotId || !lessonPackageId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing trainerId, slotId, or lessonPackageId in request data."
      );
    }

    // Rate limiting: prevent abuse (10 booking attempts per minute per user)
    const rateLimitKey = `booking:${userId}`;
    const rateCheck = await checkRateLimit(rateLimitKey, 10, 60);
    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Too many booking attempts. Please try again at ${rateCheck.resetAt.toISOString()}`
      );
    }

    const userRef = db.collection("users").doc(userId);
    const lessonPackageRef = userRef
      .collection("lessonPackages")
      .doc(lessonPackageId);
    const trainerRef = db.collection("trainers").doc(trainerId);
    // IMPORTANT: slotId is deterministic ("YYYY-MM-DDTHH")
    const trainerSlotRef = trainerRef.collection("schedules").doc(slotId);

    let orgId: string | undefined;

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const lessonPackageDoc = await transaction.get(lessonPackageRef);
        const trainerDoc = await transaction.get(trainerRef);
        const trainerSlotDoc = await transaction.get(trainerSlotRef);

        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User profile not found for the authenticated user."
          );
        }

        // STEP 10: Check trainer's organization billing status and quota
        const trainerDataForBilling = trainerDoc.data();

        if (trainerDataForBilling && trainerDataForBilling.orgId) {
          orgId = trainerDataForBilling.orgId as string;
          const orgDoc = await transaction.get(
            db.collection("organizations").doc(orgId)
          );

          if (orgDoc.exists) {
            // Check if org is disabled or in read-only mode
            const orgAccess = await checkOrgAccess(orgId);
            if (!orgAccess.allowed) {
              throw new functions.https.HttpsError(
                "failed-precondition",
                `Booking unavailable: ${orgAccess.reason}`
              );
            }
            if (orgAccess.isReadOnly) {
              throw new functions.https.HttpsError(
                "failed-precondition",
                "Bookings are temporarily disabled. Please update your subscription."
              );
            }

            // Check quota limits
            const quotaCheck = await checkQuota(orgId, "bookings");
            if (!quotaCheck.allowed) {
              throw new functions.https.HttpsError(
                "resource-exhausted",
                `Daily booking limit reached (${quotaCheck.current}/${quotaCheck.limit}). Upgrade your plan for more capacity.`
              );
            }

            const orgData = orgDoc.data();
            const billing = orgData?.billing;

            if (billing) {
              const status = billing.status;
              const blockedStatuses = ["past_due", "canceled", "unpaid"];

              if (blockedStatuses.includes(status)) {
                throw new functions.https.HttpsError(
                  "failed-precondition",
                  `Booking unavailable: The trainer's organization has a billing issue. Status: ${status}`
                );
              }
            }
          }
        }
        if (!lessonPackageDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Specified lesson package not found."
          );
        }
        if (!trainerDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Trainer profile not found."
          );
        }
        if (!trainerSlotDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Specified trainer slot not found."
          );
        }

        const userData = userDoc.data();
        const lessonPackageData = lessonPackageDoc.data();
        const trainerData = trainerDoc.data();
        const trainerSlotData = trainerSlotDoc.data();

        if (!userData || !lessonPackageData || !trainerData || !trainerSlotData) {
          throw new functions.https.HttpsError(
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
                throw new functions.https.HttpsError(
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
                  throw new functions.https.HttpsError(
                    "resource-exhausted",
                    `This location has reached its booking capacity (${maxBookingsPerLocation} concurrent sessions). Please choose a different time or location.`
                  );
                }
              }
            }
          }
        }

        // Validate package category - only 'pass' packages can book lessons
        // Check packageType first as source of truth
        const pkgType = lessonPackageData.packageType as string;
        const pkgCategory = lessonPackageData.packageCategory as string | undefined;

        // Reject if it's a class package by type
        if (pkgType === "class" || pkgType === "class_pass") {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Class packages can only be used to register for classes, not book lessons."
          );
        }

        // Also check category as secondary validation
        if (pkgCategory === "class") {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Class packages can only be used to register for classes, not book lessons."
          );
        }

        if (lessonPackageData.lessonsUsed >= lessonPackageData.totalLessons) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Lesson package has no lessons remaining."
          );
        }
        if (
          lessonPackageData.expirationDate &&
          lessonPackageData.expirationDate.toDate() < new Date()
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Lesson package has expired and cannot be used."
          );
        }

        if (
          trainerSlotData.status !== "open" ||
          (trainerSlotData.clientId !== null &&
            trainerSlotData.clientId !== undefined)
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "The requested trainer slot is not available or already booked."
          );
        }

        const clientFullName = `${userData.firstName || ""} ${
          userData.lastName || ""
        }`.trim();
        if (!clientFullName) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "User name missing in profile; cannot create booking record."
          );
        }

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
        });

        // Log activity for the booking
        if (orgId) {
          const activityRef = db.collection("activity").doc();
          transaction.set(activityRef, {
            type: "lesson_booked",
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

      functions.logger.info(
        `Lesson booked successfully for user ${userId} with trainer ${trainerId}, slot ${slotId}.`
      );
      return {message: "Lesson booked successfully!"};
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error("Error booking lesson:", error);
      throw new functions.https.HttpsError(
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
export const registerForClass = functions.https.onCall(
  async (request: functions.https.CallableRequest<RegisterForClassData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const userId = request.auth.uid;

    const {classId, classPassPackageId, athleteName, secondAthleteName} = request.data;
    if (!classId || !classPassPackageId) {
      throw new functions.https.HttpsError(
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
          throw new functions.https.HttpsError(
            "not-found",
            "User profile not found for the authenticated user."
          );
        }
        if (!classPassDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Specified class pass not found."
          );
        }
        if (!classDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Class not found."
          );
        }

        const userData = userDoc.data();
        const classPassData = classPassDoc.data();
        const classData = classDoc.data();

        if (!userData || !classPassData || !classData) {
          throw new functions.https.HttpsError(
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
          throw new functions.https.HttpsError(
            "invalid-argument",
            "The specified package is not a class pass. Only packages with 'class' category can be used for classes."
          );
        }

        // Check if pass has been used
        if (classPassData.lessonsUsed >= classPassData.totalLessons) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Class pass has already been used."
          );
        }

        // Check if pass is expired
        if (
          classPassData.expirationDate &&
          classPassData.expirationDate.toDate() < new Date()
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Class pass has expired and cannot be used."
          );
        }

        // Count number of athletes (1 primary + optional second)
        const athleteCount = secondAthleteName ? 2 : 1;

        // Check if class has enough space for all athletes
        const spotsRemaining = classData.maxParticipants - classData.currentParticipants;
        if (spotsRemaining < athleteCount) {
          throw new functions.https.HttpsError(
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
            throw new functions.https.HttpsError(
              "already-exists",
              `${athleteName} is already registered for this class.`
            );
          }
        }

        // Increment lessonsUsed on the class pass
        transaction.update(classPassRef, {
          lessonsUsed: admin.firestore.FieldValue.increment(1),
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

        // Log activity
        const clientFullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Client";
        const className = classData.title || "Unknown Class";
        // athleteCount already declared above
        const athleteNames = secondAthleteName ? `${primaryAthleteName} and ${secondAthleteName}` : primaryAthleteName;
        const orgId = userData.orgId || null;

        const activityRef = db.collection("activity").doc();
        transaction.set(activityRef, {
          type: "class_registered",
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
          orgId: orgId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // athleteCount already calculated in transaction scope
      const finalAthleteCount = secondAthleteName ? 2 : 1;
      functions.logger.info(
        `User ${userId} registered ${finalAthleteCount} athlete(s) for class ${classId} using pass ${classPassPackageId}.`
      );
      return {message: `Successfully registered ${finalAthleteCount} athlete(s) for class!`};
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error("Error registering for class:", error);
      throw new functions.https.HttpsError(
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

export const cancelLesson = functions.https.onCall(
  async (request: functions.https.CallableRequest<CancelLessonData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a lesson."
      );
    }
    const userId = request.auth.uid;
    const {bookingId} = request.data;

    if (!bookingId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing bookingId"
      );
    }

    try {
      const bookingRef = db.collection("bookings").doc(bookingId);

      await db.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);

        if (!bookingDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Booking not found."
          );
        }

        const bookingData = bookingDoc.data();
        if (!bookingData) {
          throw new functions.https.HttpsError(
            "internal",
            "Booking data is missing."
          );
        }

        // Verify user owns this booking
        if (bookingData.clientUID !== userId) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You can only cancel your own bookings."
          );
        }

        // Check minimum cancellation notice if orgId and startTime are available
        if (bookingData.orgId && bookingData.startTime) {
          const settingsDoc = await transaction.get(
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
              throw new functions.https.HttpsError(
                "failed-precondition",
                `Cancellations must be made at least ${minCancellationHours} hours in advance. This lesson is too soon to cancel.`
              );
            }
          }
        }

        // Get the lesson package and decrement lessonsUsed
        const packageRef = db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(bookingData.packageId);

        const packageDoc = await transaction.get(packageRef);
        if (packageDoc.exists) {
          transaction.update(packageRef, {
            lessonsUsed: admin.firestore.FieldValue.increment(-1),
          });
        }

        // Update trainer's schedule slot back to open
        if (bookingData.trainerId && bookingData.slotId) {
          const trainerSlotRef = db
            .collection("trainers")
            .doc(bookingData.trainerId)
            .collection("schedules")
            .doc(bookingData.slotId);

          const slotDoc = await transaction.get(trainerSlotRef);
          if (slotDoc.exists) {
            transaction.update(trainerSlotRef, {
              status: "open",
              clientId: null,
              clientName: null,
              bookedAt: null,
            });
          }
        }

        // Delete the booking
        transaction.delete(bookingRef);

        // Log activity
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.exists ? userDoc.data() : null;
        const clientFullName = userData ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Client" : "Unknown Client";
        
        const trainerRef = db.collection("trainers").doc(bookingData.trainerId);
        const trainerDoc = await transaction.get(trainerRef);
        const trainerData = trainerDoc.exists ? trainerDoc.data() : null;
        const trainerFullName = trainerData ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() || "Unknown Trainer" : "Unknown Trainer";

        const activityRef = db.collection("activity").doc();
        transaction.set(activityRef, {
          type: "lesson_cancelled",
          actorId: userId,
          actorName: clientFullName,
          actorRole: "client",
          targetId: bookingData.trainerId,
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
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          orgId: bookingData.orgId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      functions.logger.info(`User ${userId} cancelled booking ${bookingId}`);
      return {message: "Lesson cancelled successfully!"};
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error("Error cancelling lesson:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while cancelling the lesson.",
        (error as Error).message
      );
    }
  }
);

/**
 * Admin cancel lesson - allows admins/owners to cancel any client's booking
 */
interface AdminCancelLessonData {
  bookingId: string;
  orgId: string;
  clientId: string;
}

export const adminCancelLesson = functions.https.onCall(
  async (request: functions.https.CallableRequest<AdminCancelLessonData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a lesson."
      );
    }
    const adminUid = request.auth.uid;
    const {bookingId, orgId, clientId} = request.data;

    if (!bookingId || !orgId || !clientId) {
      throw new functions.https.HttpsError(
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
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not a member of this organization"
        );
      }

      const memberData = memberDoc.data();
      const role = memberData?.role;

      if (role !== "admin" && role !== "owner") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only admins and owners can cancel client bookings"
        );
      }

      const bookingRef = db.collection("bookings").doc(bookingId);

      await db.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);

        if (!bookingDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Booking not found."
          );
        }

        const bookingData = bookingDoc.data();
        if (!bookingData) {
          throw new functions.https.HttpsError(
            "internal",
            "Booking data is missing."
          );
        }

        // Verify booking belongs to specified client
        if (bookingData.clientUID !== clientId) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Booking does not belong to specified client"
          );
        }

        // Get the lesson package and decrement lessonsUsed
        if (bookingData.packageId) {
          const packageRef = db
            .collection("users")
            .doc(clientId)
            .collection("lessonPackages")
            .doc(bookingData.packageId);

          const packageDoc = await transaction.get(packageRef);
          if (packageDoc.exists) {
            transaction.update(packageRef, {
              lessonsUsed: admin.firestore.FieldValue.increment(-1),
            });
          }
        }

        // Update trainer's schedule slot back to open
        if (bookingData.trainerId && bookingData.slotId) {
          const trainerSlotRef = db
            .collection("trainers")
            .doc(bookingData.trainerId)
            .collection("schedules")
            .doc(bookingData.slotId);

          const slotDoc = await transaction.get(trainerSlotRef);
          if (slotDoc.exists) {
            transaction.update(trainerSlotRef, {
              status: "open",
              clientId: null,
              clientName: null,
              bookedAt: null,
            });
          }
        }

        // Delete the booking
        transaction.delete(bookingRef);

        // Log activity
        const adminRef = db.collection("trainers").doc(adminUid);
        const adminDoc = await transaction.get(adminRef);
        const adminData = adminDoc.exists ? adminDoc.data() : null;
        const adminFullName = adminData ? `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin" : "Admin";
        
        const clientRef = db.collection("users").doc(clientId);
        const clientDoc = await transaction.get(clientRef);
        const clientData = clientDoc.exists ? clientDoc.data() : null;
        const clientFullName = clientData ? `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "Unknown Client" : "Unknown Client";
        
        const trainerRef = db.collection("trainers").doc(bookingData.trainerId);
        const trainerDoc = await transaction.get(trainerRef);
        const trainerData = trainerDoc.exists ? trainerDoc.data() : null;
        const trainerFullName = trainerData ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() || "Unknown Trainer" : "Unknown Trainer";

        const activityRef = db.collection("activity").doc();
        transaction.set(activityRef, {
          type: "lesson_cancelled",
          actorId: adminUid,
          actorName: adminFullName,
          actorRole: "admin",
          targetId: clientId,
          targetName: clientFullName,
          targetType: "client",
          description: `${adminFullName} cancelled ${clientFullName}'s lesson with ${trainerFullName}`,
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
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          orgId: orgId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      functions.logger.info(
        `Admin ${adminUid} (${role}) cancelled booking ${bookingId} for client ${clientId} in org ${orgId}`
      );
      return {message: "Lesson cancelled successfully!"};
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error("Error cancelling lesson:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while cancelling the lesson.",
        (error as Error).message
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

export const cancelClassRegistration = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<CancelClassRegistrationData>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a registration."
      );
    }
    const userId = request.auth.uid;
    const {classId} = request.data;

    if (!classId) {
      throw new functions.https.HttpsError(
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
          throw new functions.https.HttpsError(
            "not-found",
            "Class not found."
          );
        }

        if (!participantDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "You are not registered for this class."
          );
        }

        const participantData = participantDoc.data();
        if (!participantData) {
          throw new functions.https.HttpsError(
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

        // Log activity
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.exists ? userDoc.data() : null;
        const clientFullName = userData ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Client" : "Unknown Client";
        
        const classData = classDoc.data();
        const className = classData?.title || "Unknown Class";
        const athleteName = participantData.athleteName || clientFullName;

        const activityRef = db.collection("activity").doc();
        transaction.set(activityRef, {
          type: "class_cancelled",
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

      functions.logger.info(
        `User ${userId} cancelled registration for class ${classId}`
      );
      return {message: "Class registration cancelled successfully!"};
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error("Error cancelling class registration:", error);
      throw new functions.https.HttpsError(
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
export const processTrainerAvailability = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<ProcessTrainerAvailabilityData>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
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
      throw new functions.https.HttpsError(
        "permission-denied",
        "Trainer not found."
      );
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      throw new functions.https.HttpsError(
        "internal",
        "Unexpected missing trainer profile data."
      );
    }
    const trainerId = targetTrainerId;

    const {
      startDate: rawStartDate,
      endDate: rawEndDate,
      dailyStartHour = 9,
      dailyEndHour = 17,
      slotDurationMinutes = 60,
      daysOfWeek, // optional filter 0..6 (Sun..Sat), interpreted in LOCAL time
      timezoneOffsetMinutes, // required for local interpretation (JS getTimezoneOffset)
      status = "open", // default to "open" if not specified
      location, // optional location name
    } = request.data;

    if (typeof timezoneOffsetMinutes !== "number" || !isFinite(timezoneOffsetMinutes)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "timezoneOffsetMinutes (from Date.getTimezoneOffset()) is required."
      );
    }

    // Establish UTC start-of-day defaults
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const defaultEndUTC = new Date(todayUTC);
    defaultEndUTC.setUTCDate(defaultEndUTC.getUTCDate() + 7);

    // Parse YYYY-MM-DD strictly
    const parseDateOnly = (s: string): {y: number; m: number; d: number} => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      if (!match) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid start or end date provided. Use YYYY-MM-DD format."
        );
      }
      return {y: Number(match[1]), m: Number(match[2]), d: Number(match[3])};
    };

    // Convert a local date (y-m-d at local midnight) to the UTC instant that corresponds to that local midnight.
    // JS getTimezoneOffset(): minutes to add to LOCAL to get UTC (positive west of UTC).
    // Therefore, UTC instant for local midnight = Date.UTC(y,m,d,0) + offsetMinutes.
    const localMidnightToUTC = (y: number, m: number, d: number): Date => {
      const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + timezoneOffsetMinutes * 60_000;
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
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid start or end date provided. Use YYYY-MM-DD format."
      );
    }
    if (startDateUTC > endDateUTC) {
      throw new functions.https.HttpsError(
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
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid daily start or end hours."
      );
    }
    if (slotDurationMinutes <= 0 || slotDurationMinutes > 1440) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Slot duration must be a positive number of minutes."
      );
    }

    const trainerScheduleCollection = trainerRef.collection("schedules");
    const batch = db.batch();
    let slotsAddedCount = 0;

    try {
      // Walk LOCAL days by moving the "local midnight in UTC" anchor forward
      const currentLocalMidnightUTC = new Date(startDateUTC);
      while (currentLocalMidnightUTC <= endDateUTC) {
        // local weekday: getUTCDay() on the local-midnight-in-UTC anchor
        const localWeekday = currentLocalMidnightUTC.getUTCDay(); // 0..6 (Sun..Sat)

        // Filter by selected weekdays (LOCAL)
        if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
          if (!daysOfWeek.includes(localWeekday)) {
            currentLocalMidnightUTC.setUTCDate(currentLocalMidnightUTC.getUTCDate() + 1);
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

          // Build UTC instants for local times on this day
          const slotStartTime = new Date(currentLocalMidnightUTC);
          // FIX: add the local hour to the UTC hour of the local-midnight anchor
          slotStartTime.setUTCHours(
            slotStartTime.getUTCHours() + startHour,
            startMinute,
            0,
            0
          );

          const slotEndTime = new Date(slotStartTime);
          slotEndTime.setUTCMinutes(slotEndTime.getUTCMinutes() + slotDurationMinutes);

          // Deterministic ID for this slot (UTC hour)
          const slotDocId = generateScheduleDocId(slotStartTime);
          const slotRef = trainerScheduleCollection.doc(slotDocId);
          const existingSlotDoc = await slotRef.get();

          const trainerFirstName = trainerData.firstName || "";
          const trainerLastName = trainerData.lastName || "";
          const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || "Unknown Trainer";
          const orgId = trainerData.orgId || null;

          const slotData: Record<string, any> = {
            status: status,
            startTime: slotStartTime,
            endTime: slotEndTime,
            clientId: null,
            clientName: null,
            trainerName: trainerFullName,
          };

          // Add orgId if available from trainer data
          if (orgId) {
            slotData.orgId = orgId;
          }

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
              functions.logger.debug(
                `Slot ${slotDocId} updated from ${existingStatus} to ${status} for trainer ${trainerId}.`
              );
            } else if (isBooked) {
              functions.logger.debug(
                `Slot ${slotDocId} is booked for trainer ${trainerId}, skipping.`
              );
            } else {
              functions.logger.debug(
                `Slot ${slotDocId} already has status ${status} for trainer ${trainerId}, skipping.`
              );
            }
          }
        }

        // Next LOCAL day
        currentLocalMidnightUTC.setUTCDate(currentLocalMidnightUTC.getUTCDate() + 1);
      }

      if (slotsAddedCount > 0) {
        await batch.commit();
        
        // Log activity for availability creation
        const trainerFirstName = trainerData.firstName || "";
        const trainerLastName = trainerData.lastName || "";
        const trainerFullName = `${trainerFirstName} ${trainerLastName}`.trim() || "Unknown Trainer";
        const orgId = trainerData.orgId || null;
        const actorIsTrainer = callingUserId === trainerId;
        
        await db.collection("activity").add({
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

      functions.logger.info(
        `Trainer ${trainerId} availability processed. Added ${slotsAddedCount} new slots.`
      );
      return {
        message: `Availability processed successfully! Added ${slotsAddedCount} new slots.`,
        slotsAdded: slotsAddedCount,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error(
        "Error processing trainer availability:",
        error
      );
      throw new functions.https.HttpsError(
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
export const updateClassLocations = functions.https.onCall(
  async (request: functions.https.CallableRequest) => {
    // Check if user is authenticated and is admin
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to perform this action."
      );
    }

    const userId = request.auth.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new functions.https.HttpsError(
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
          functions.logger.info(
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
        functions.logger.info(
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
      functions.logger.error("Error updating class locations:", error);
      throw new functions.https.HttpsError(
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
export const registerTrainer = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{
      uid: string;
      email: string;
      firstName: string;
      lastName: string;
      orgId?: string;
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {uid, email, firstName, lastName, orgId} = request.data;

    if (!uid || !email || !firstName || !lastName) {
      throw new functions.https.HttpsError(
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
      throw new functions.https.HttpsError(
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
export const manualRegisterForClass = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{
      classId: string;
      userId?: string;
      classPassPackageId?: string;
      firstName?: string;
      lastName?: string;
      email?: string | null;
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {classId, userId, classPassPackageId, firstName, lastName, email} = request.data;

    if (!classId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "classId is required"
      );
    }

    try {
      // Get class document
      const classDoc = await db.collection("classes").doc(classId).get();
      if (!classDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Class not found");
      }

      const classData = classDoc.data()!;
      const orgId = classData.orgId;

      if (!orgId) {
        throw new functions.https.HttpsError(
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
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not a member of this organization"
        );
      }

      const role = adminMember.data()?.role;
      if (role !== "admin" && role !== "owner") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Must be admin or owner to manually register clients"
        );
      }

      let registrationData: any;

      if (userId) {
        // Existing client registration
        if (!classPassPackageId) {
          throw new functions.https.HttpsError(
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
          throw new functions.https.HttpsError("not-found", "Package not found");
        }

        const packageData = packageDoc.data()!;
        if ((packageData.lessonsRemaining || 0) <= 0) {
          throw new functions.https.HttpsError(
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
          throw new functions.https.HttpsError(
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

      return {success: true};
    } catch (error) {
      console.error("❌ Error in manualRegisterForClass:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        `Failed to register for class: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
/* eslint-enable quotes */
