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

// Export Apple In-App Purchase functions
export * from "./appleIAP";

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

// Export pricing package deletion functions
export * from "./deletePricingPackages";

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
  athleteName?: string; // First athlete/participant name
  secondAthleteName?: string; // Second athlete/participant name (if applicable)
  lessonNotes?: string; // Notes for trainer about this lesson
}

/**
 * Interface for the input data to the registerForClass callable function.
 */
interface RegisterForClassData {
  classId: string;
  classPassPackageId: string;
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

    const {trainerId, slotId, lessonPackageId, athleteName, secondAthleteName, lessonNotes} = request.data;
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
    const trainerRef = db.collection("trainers").doc(trainerId);
    // IMPORTANT: slotId is deterministic ("YYYY-MM-DDTHH")
    const trainerSlotRef = trainerRef.collection("schedules").doc(slotId);

    let orgId: string | undefined;

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const trainerDoc = await transaction.get(trainerRef);
        const trainerSlotDoc = await transaction.get(trainerSlotRef);

        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User profile not found for the authenticated user."
          );
        }

        // Get orgId from user document - try both fields for backwards compatibility
        const userData = userDoc.data();
        orgId = userData?.orgId as string | undefined;
        if (!orgId) {
          orgId = userData?.organizationId as string | undefined;
        }

        if (!orgId) {
          // Fallback: check orgMembers collection
          const orgMembersQuery = await db.collection("orgMembers")
            .where("userId", "==", userId)
            .limit(1)
            .get();
          if (!orgMembersQuery.empty) {
            orgId = orgMembersQuery.docs[0].data().orgId;
          }
        }

        // Try to get lesson package from new path first, then fallback to old path
        let lessonPackageDoc;
        if (orgId) {
          // New path: organizations/{orgId}/users/{userId}/packages/{packageId}
          const newPathRef = db.collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .collection("packages")
            .doc(lessonPackageId);
          lessonPackageDoc = await transaction.get(newPathRef);
        }

        if (!lessonPackageDoc || !lessonPackageDoc.exists) {
          // Fallback to old path: users/{userId}/lessonPackages/{packageId}
          const oldPathRef = userRef
            .collection("lessonPackages")
            .doc(lessonPackageId);
          lessonPackageDoc = await transaction.get(oldPathRef);
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
            if (trainerSlotData.location && trainerSlotData.startTime) {
              const maxBookingsPerLocation = settings?.maxBookingsPerLocation ?? 5;

              // Count concurrent booked sessions at this location and time
              // We need to check for bookings that overlap with this time slot
              const locationBookingsQuery = await db
                .collectionGroup("schedules")
                .where("orgId", "==", orgId)
                .where("location", "==", trainerSlotData.location)
                .where("startTime", "==", trainerSlotData.startTime)
                .where("status", "==", "booked")
                .get();

              const currentBookings = locationBookingsQuery.size;

              if (currentBookings >= maxBookingsPerLocation) {
                throw new functions.https.HttpsError(
                  "resource-exhausted",
                  `This location has reached its booking capacity (${maxBookingsPerLocation} concurrent sessions). Please choose a different time or location.`
                );
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

        // Increment lessonsUsed on the package (write to the same path we read from)
        const lessonPackageRef = lessonPackageDoc.ref;
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

        const bookingData: any = {
          clientUID: userId,
          trainerId: trainerId,
          slotId: slotId, // deterministic schedule slot doc id
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
        };

        // Add optional athlete and notes fields if provided
        if (athleteName) {
          bookingData.athleteName = athleteName;
        }
        if (secondAthleteName) {
          bookingData.secondAthleteName = secondAthleteName;
        }
        if (lessonNotes) {
          bookingData.lessonNotes = lessonNotes;
        }

        transaction.set(newBookingRef, bookingData);
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

    const {classId, classPassPackageId} = request.data;
    if (!classId || !classPassPackageId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing classId or classPassPackageId in request data."
      );
    }

    const userRef = db.collection("users").doc(userId);
    const classRef = db.collection("classes").doc(classId);

    try {
      // Get orgId BEFORE the transaction to avoid collectionGroup query inside transaction
      functions.logger.info(`[registerForClass] Step 1: Getting user document for userId: ${userId}`);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User profile not found for the authenticated user."
        );
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new functions.https.HttpsError(
          "internal",
          "User data is missing."
        );
      }

      // Get orgId from userData - try both fields for backwards compatibility
      let orgId = userData.organizationId as string | undefined;
      if (!orgId) {
        orgId = userData.orgId as string | undefined;
      }
      functions.logger.info(`[registerForClass] orgId from userData: ${orgId || "NOT FOUND"}`);

      if (!orgId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "User must be associated with an organization to register for classes. Please contact support."
        );
      }

      functions.logger.info(`[registerForClass] Starting transaction with orgId: ${orgId}`);


      await db.runTransaction(async (transaction) => {
        const classDoc = await transaction.get(classRef);

        if (!classDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Class not found."
          );
        }

        const classData = classDoc.data();

        if (!classData) {
          throw new functions.https.HttpsError(
            "internal",
            "Unexpected missing document data."
          );
        }

        // Try new path first, then fallback to old path
        let classPassDoc: FirebaseFirestore.DocumentSnapshot | undefined;

        if (orgId) {
          const newPathRef = db
            .collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .collection("packages")
            .doc(classPassPackageId);
          classPassDoc = await transaction.get(newPathRef);
        }

        // Fallback to old path if not found in new path
        if (!classPassDoc || !classPassDoc.exists) {
          const oldPathRef = userRef
            .collection("lessonPackages")
            .doc(classPassPackageId);
          classPassDoc = await transaction.get(oldPathRef);
        }

        if (!classPassDoc || !classPassDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Specified class pass not found."
          );
        }

        const classPassData = classPassDoc.data();

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

        // Check if class is full
        if (classData.currentParticipants >= classData.maxParticipants) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Class is full."
          );
        }

        // Allow multiple registrations by the same user (for multiple athletes)
        // Use auto-generated ID instead of userId to allow duplicates
        const participantRef = classRef
          .collection("participants")
          .doc(); // Auto-generate unique ID

        // Increment lessonsUsed on the class pass
        transaction.update(classPassDoc.ref, {
          lessonsUsed: admin.firestore.FieldValue.increment(1),
        });

        // Increment class participants
        transaction.update(classRef, {
          currentParticipants: admin.firestore.FieldValue.increment(1),
        });

        // Add user to participants subcollection with auto-generated ID
        // This allows the same user/email to register multiple times
        transaction.set(participantRef, {
          userId: userId,
          firstName: userData.firstName || "Unknown",
          lastName: userData.lastName || "User",
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          classPassPackageId: classPassPackageId,
        });
      });

      functions.logger.info(
        `User ${userId} registered for class ${classId} using pass ${classPassPackageId}.`
      );
      return {message: "Successfully registered for class!"};
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
 * Cloud Function for admin to manually register a client for a class
 * Supports two modes:
 * 1. Existing client with class pass (requires userId and classPassPackageId)
 * 2. Manual entry (requires firstName, lastName, optional email - no package deduction)
 */
interface ManualRegisterData {
  classId: string;
  userId?: string;
  classPassPackageId?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
}

export const manualRegisterForClass = functions.https.onCall(
  async (request: functions.https.CallableRequest<ManualRegisterData>) => {
    // Verify admin authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to manually register a client."
      );
    }

    const {classId, userId, classPassPackageId, firstName, lastName, email} = request.data;

    if (!classId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing classId"
      );
    }

    // Determine registration mode
    const isExistingClient = !!userId && !!classPassPackageId;
    const isManualEntry = !!firstName && !!lastName;

    if (!isExistingClient && !isManualEntry) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide either (userId + classPassPackageId) or (firstName + lastName)"
      );
    }

    const classRef = db.collection("classes").doc(classId);

    try {
      if (isExistingClient) {
        // Mode 1: Existing client with class pass
        const userRef = db.collection("users").doc(userId);
        functions.logger.info(`[manualRegisterForClass] Registering user ${userId} for class ${classId} with package ${classPassPackageId}`);

        // Get user data for orgId
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User profile not found."
          );
        }

        const userData = userDoc.data();
        if (!userData) {
          throw new functions.https.HttpsError(
            "internal",
            "User data is missing."
          );
        }

        // Try both fields for backwards compatibility
        let orgId = userData.organizationId as string | undefined;
        if (!orgId) {
          orgId = userData.orgId as string | undefined;
        }
        if (!orgId) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "User must be associated with an organization."
          );
        }

        await db.runTransaction(async (transaction) => {
          const classDoc = await transaction.get(classRef);

          if (!classDoc.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              "Class not found."
            );
          }

          const classData = classDoc.data();
          if (!classData) {
            throw new functions.https.HttpsError(
              "internal",
              "Class data is missing."
            );
          }

          // Try new path first, then fallback to old path
          let classPassDoc: FirebaseFirestore.DocumentSnapshot | undefined;

          const newPathRef = db
            .collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .collection("packages")
            .doc(classPassPackageId);
          classPassDoc = await transaction.get(newPathRef);

          // Fallback to old path if not found in new path
          if (!classPassDoc || !classPassDoc.exists) {
            const oldPathRef = userRef
              .collection("lessonPackages")
              .doc(classPassPackageId);
            classPassDoc = await transaction.get(oldPathRef);
          }

          if (!classPassDoc || !classPassDoc.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              "Specified class pass not found."
            );
          }

          const classPassData = classPassDoc.data();
          if (!classPassData) {
            throw new functions.https.HttpsError(
              "internal",
              "Class pass data is missing."
            );
          }

          // Verify it's a class pass
          const pkgCategory = classPassData.packageCategory;
          const pkgType = classPassData.packageType;
          const isClassPackage = pkgType === "class" || pkgType === "class_pass" || pkgCategory === "class";

          if (!isClassPackage) {
            throw new functions.https.HttpsError(
              "invalid-argument",
              "The specified package is not a class pass."
            );
          }

          // Check if pass has remaining uses
          if (classPassData.lessonsUsed >= classPassData.totalLessons) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Class pass has already been fully used."
            );
          }

          // Check if pass is expired
          if (
            classPassData.expirationDate &&
            classPassData.expirationDate.toDate() < new Date()
          ) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Class pass has expired."
            );
          }

          // Check if class is full
          if (classData.currentParticipants >= classData.maxParticipants) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Class is full."
            );
          }

          // Check if user is already registered
          const existingParticipant = await transaction.get(
            classRef.collection("participants").doc(userId)
          );
          if (existingParticipant.exists) {
            throw new functions.https.HttpsError(
              "already-exists",
              "User is already registered for this class."
            );
          }

          // Add participant
          const participantRef = classRef.collection("participants").doc(userId);
          transaction.set(participantRef, {
            userId: userId,
            firstName: userData.firstName || "Unknown",
            lastName: userData.lastName || "User",
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            classPassPackageId: classPassPackageId,
            manuallyAdded: true,
          });

          // Increment lessonsUsed on the class pass
          transaction.update(classPassDoc.ref, {
            lessonsUsed: admin.firestore.FieldValue.increment(1),
          });

          // Increment class participants
          transaction.update(classRef, {
            currentParticipants: admin.firestore.FieldValue.increment(1),
          });
        });

        functions.logger.info(`Manual registration successful for user ${userId} in class ${classId}`);
        return {message: "Client successfully registered for class!"};
      } else {
        // Mode 2: Manual entry (no package deduction)
        functions.logger.info(`[manualRegisterForClass] Manual entry registration for ${firstName} ${lastName} in class ${classId}`);

        await db.runTransaction(async (transaction) => {
          const classDoc = await transaction.get(classRef);

          if (!classDoc.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              "Class not found."
            );
          }

          const classData = classDoc.data();
          if (!classData) {
            throw new functions.https.HttpsError(
              "internal",
              "Class data is missing."
            );
          }

          // Check if class is full
          if (classData.currentParticipants >= classData.maxParticipants) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Class is full."
            );
          }

          // Add participant with auto-generated ID (allows duplicates for walk-ins)
          const participantRef = classRef.collection("participants").doc();
          transaction.set(participantRef, {
            userId: "", // Empty for manual entries
            firstName: firstName,
            lastName: lastName,
            email: email || "",
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            manualEntry: true,
            manuallyAdded: true,
          });

          // Increment class participants
          transaction.update(classRef, {
            currentParticipants: admin.firestore.FieldValue.increment(1),
          });
        });

        functions.logger.info(`Manual entry registration successful for ${firstName} ${lastName} in class ${classId}`);
        return {message: "Client successfully added to class!"};
      }
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      functions.logger.error("Error in manual registration:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred during manual registration.",
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
/* eslint-enable quotes */
