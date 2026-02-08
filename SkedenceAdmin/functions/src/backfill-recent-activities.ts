/**
 * Backfill Recent Activities Script
 * 
 * This script creates activity log entries for all actions in the last few days.
 * Use this to populate the activity feed for testing purposes.
 * 
 * Usage:
 * curl -X POST "https://backfillrecentactivities-d5rzjueqba-uc.a.run.app?orgId=YOUR_ORG_ID&days=3"
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

export const backfillRecentActivities = functions.https.onRequest(
  { cors: true, maxInstances: 1, timeoutSeconds: 540 },
  async (request, response) => {
    const orgId = request.query.orgId as string;
    const daysBack = parseInt(request.query.days as string) || 3;

    if (!orgId) {
      response.status(400).json({ error: "orgId parameter is required" });
      return;
    }

    const db = admin.firestore();
    const stats = {
      trainers: 0,
      bookings: 0,
      classes: 0,
      classEnrollments: 0,
      locations: 0,
      passes: 0,
      clients: 0,
      availability: 0,
      total: 0,
    };

    try {
      // Calculate cutoff date (X days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      console.log(`Backfilling activities for orgId: ${orgId} from last ${daysBack} days (since ${cutoffDate.toISOString()})`);

      // 1. Backfill trainer creations and activations
      const trainersSnapshot = await db
        .collection("trainers")
        .where("orgId", "==", orgId)
        .get();

      for (const doc of trainersSnapshot.docs) {
        const trainer = doc.data();
        const createdAt = trainer.createdAt || trainer.dateJoined || cutoffTimestamp;
        
        // Only log if created within the time window
        if (createdAt.toDate() >= cutoffDate) {
          await db.collection("activities").add({
            type: "trainer_created",
            actorId: trainer.createdBy || "system",
            actorName: "Admin",
            actorRole: "admin",
            targetId: doc.id,
            targetName: `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim(),
            targetType: "trainer",
            description: `${trainer.firstName || ""} ${trainer.lastName || ""} was added as a trainer`,
            metadata: {
              trainerId: doc.id,
              email: trainer.email || trainer.emailAddress,
            },
            orgId: orgId,
            timestamp: createdAt,
          });
          stats.trainers++;
          stats.total++;
        }
      }

      // 2. Backfill bookings (lessons)
      const bookingsSnapshot = await db
        .collection("bookings")
        .where("orgId", "==", orgId)
        .where("timestamp", ">=", cutoffTimestamp)
        .get();

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        
        // Fetch client and trainer names
        const clientDoc = await db.collection("users").doc(booking.userId).get();
        const clientData = clientDoc.data();
        const clientName = clientData 
          ? `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() 
          : "Unknown Client";

        const trainerDoc = await db.collection("trainers").doc(booking.trainerId).get();
        const trainerData = trainerDoc.data();
        const trainerName = trainerData 
          ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() 
          : "Unknown Trainer";

        if (booking.status === "cancelled") {
          await db.collection("activities").add({
            type: "lesson_canceled",
            actorId: booking.cancelledBy || booking.userId,
            actorName: booking.cancelledBy ? "Admin" : clientName,
            actorRole: booking.cancelledBy ? "admin" : "client",
            targetId: doc.id,
            targetName: `Lesson with ${trainerName}`,
            targetType: "booking",
            description: `${booking.cancelledBy ? "Admin" : clientName} canceled a lesson for ${clientName} with ${trainerName}`,
            metadata: {
              bookingId: doc.id,
              trainerId: booking.trainerId,
              trainerName,
              clientId: booking.userId,
              clientName,
              date: booking.startTime,
              cancelReason: booking.cancelReason,
            },
            orgId: orgId,
            timestamp: booking.cancelledAt || booking.timestamp,
          });
        } else {
          await db.collection("activities").add({
            type: "lesson_booked",
            actorId: booking.userId,
            actorName: clientName,
            actorRole: "client",
            targetId: doc.id,
            targetName: `Lesson with ${trainerName}`,
            targetType: "booking",
            description: `${clientName} booked a lesson with ${trainerName}`,
            metadata: {
              bookingId: doc.id,
              trainerId: booking.trainerId,
              trainerName,
              date: booking.startTime,
            },
            orgId: orgId,
            timestamp: booking.timestamp,
          });
        }
        stats.bookings++;
        stats.total++;
      }

      // 3. Backfill class enrollments
      const classesSnapshot = await db
        .collection("classes")
        .where("orgId", "==", orgId)
        .get();

      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        
        if (classData.participants && classData.participants.length > 0) {
          for (const participant of classData.participants) {
            const registeredAt = participant.registeredAt || cutoffTimestamp;
            
            // Only log if registered within the time window
            if (registeredAt.toDate() >= cutoffDate) {
              const clientDoc = await db.collection("users").doc(participant.userId).get();
              const clientData = clientDoc.data();
              const clientName = clientData 
                ? `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() 
                : "Unknown Client";

              await db.collection("activities").add({
                type: "class_enrollment",
                actorId: participant.userId,
                actorName: clientName,
                actorRole: "client",
                targetId: classDoc.id,
                targetName: classData.title || "Unknown Class",
                targetType: "class",
                description: `${clientName} registered ${participant.athleteName || "athlete"} for ${classData.title || "class"}`,
                metadata: {
                  classId: classDoc.id,
                  athleteName: participant.athleteName,
                  date: classData.startTime,
                },
                orgId: orgId,
                timestamp: registeredAt,
              });
              stats.classEnrollments++;
              stats.total++;
            }
          }
        }

        // Log class creation if within time window
        const createdAt = classData.createdAt || cutoffTimestamp;
        if (createdAt.toDate() >= cutoffDate) {
          const trainerDoc = await db.collection("trainers").doc(classData.trainerId).get();
          const trainerData = trainerDoc.data();
          const trainerName = trainerData 
            ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() 
            : "Unknown Trainer";

          const locationDoc = classData.locationId 
            ? await db.collection("locations").doc(classData.locationId).get() 
            : null;
          const locationName = locationDoc?.data()?.name || "Unknown Location";

          await db.collection("activities").add({
            type: "class_created",
            actorId: classData.createdBy || "system",
            actorName: "Admin",
            actorRole: "admin",
            targetId: classDoc.id,
            targetName: classData.title || "Unknown Class",
            targetType: "class",
            description: `Admin created class ${classData.title} with ${trainerName} at ${locationName}`,
            metadata: {
              classId: classDoc.id,
              trainerId: classData.trainerId,
              trainerName,
              locationId: classData.locationId,
              locationName,
              date: classData.startTime,
              maxParticipants: classData.maxParticipants,
            },
            orgId: orgId,
            timestamp: createdAt,
          });
          stats.classes++;
          stats.total++;
        }
      }

      // 4. Backfill locations
      const locationsSnapshot = await db
        .collection("locations")
        .where("orgId", "==", orgId)
        .get();

      for (const doc of locationsSnapshot.docs) {
        const location = doc.data();
        const createdAt = location.createdAt || cutoffTimestamp;
        
        // Only log if created within the time window
        if (createdAt.toDate() >= cutoffDate) {
          await db.collection("activities").add({
            type: "location_created",
            actorId: location.createdBy || "system",
            actorName: "Admin",
            actorRole: "admin",
            targetId: doc.id,
            targetName: location.name || "Unknown Location",
            targetType: "location",
            description: `Admin added location ${location.name} at ${location.address || "address"}`,
            metadata: {
              locationId: doc.id,
              address: location.address,
              city: location.city,
              state: location.state,
            },
            orgId: orgId,
            timestamp: createdAt,
          });
          stats.locations++;
          stats.total++;
        }
      }

      // 5. Backfill pass purchases/issuances
      const usersSnapshot = await db
        .collection("users")
        .where("orgId", "==", orgId)
        .get();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        if (userData.passes && Array.isArray(userData.passes)) {
          for (const pass of userData.passes) {
            const purchasedAt = pass.purchasedAt || pass.createdAt || cutoffTimestamp;
            
            // Only log if purchased within the time window
            if (purchasedAt.toDate() >= cutoffDate) {
              const clientName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Client";
              
              await db.collection("activities").add({
                type: "pass_purchased",
                actorId: pass.issuedBy || "system",
                actorName: pass.issuedBy ? "Admin" : clientName,
                actorRole: pass.issuedBy ? "admin" : "client",
                targetId: userDoc.id,
                targetName: clientName,
                targetType: "client",
                description: pass.issuedBy 
                  ? `Admin issued ${pass.totalSessions} ${pass.title || "sessions"} to ${clientName}`
                  : `${clientName} purchased ${pass.totalSessions} ${pass.title || "sessions"}`,
                metadata: {
                  passId: pass.id,
                  passType: pass.passType,
                  passTitle: pass.title,
                  totalSessions: pass.totalSessions,
                  remainingSessions: pass.remainingSessions,
                },
                orgId: orgId,
                timestamp: purchasedAt,
              });
              stats.passes++;
              stats.total++;
            }
          }
        }
      }

      // 6. Backfill client signups
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt || userData.dateJoined || cutoffTimestamp;
        
        // Only log if created within the time window and not a trainer
        if (createdAt.toDate() >= cutoffDate && userData.role !== "trainer") {
          const clientName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "New Client";
          
          await db.collection("activities").add({
            type: "client_registered",
            actorId: userDoc.id,
            actorName: clientName,
            actorRole: "client",
            targetId: userDoc.id,
            targetName: clientName,
            targetType: "client",
            description: `${clientName} created an account`,
            metadata: {
              email: userData.email,
            },
            orgId: orgId,
            timestamp: createdAt,
          });
          stats.clients++;
          stats.total++;
        }
      }

      // 7. Backfill trainer availability
      const availabilitySnapshot = await db
        .collection("availability")
        .where("orgId", "==", orgId)
        .where("createdAt", ">=", cutoffTimestamp)
        .get();

      for (const doc of availabilitySnapshot.docs) {
        const avail = doc.data();
        
        const trainerDoc = await db.collection("trainers").doc(avail.trainerId).get();
        const trainerData = trainerDoc.data();
        const trainerName = trainerData 
          ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() 
          : "Unknown Trainer";

        if (avail.isUnavailable) {
          await db.collection("activities").add({
            type: "unavailability_set",
            actorId: avail.createdBy || avail.trainerId,
            actorName: trainerName,
            actorRole: "trainer",
            targetId: doc.id,
            targetName: `Unavailability for ${trainerName}`,
            targetType: "availability",
            description: `${trainerName} marked time as unavailable`,
            metadata: {
              trainerId: avail.trainerId,
              startTime: avail.startTime,
              endTime: avail.endTime,
              reason: avail.reason,
            },
            orgId: orgId,
            timestamp: avail.createdAt,
          });
        } else {
          const slotsCount = avail.slots ? avail.slots.length : 0;
          await db.collection("activities").add({
            type: "availability_added",
            actorId: avail.createdBy || avail.trainerId,
            actorName: trainerName,
            actorRole: "trainer",
            targetId: doc.id,
            targetName: `Availability for ${trainerName}`,
            targetType: "availability",
            description: `${trainerName} added availability (${slotsCount} slots)`,
            metadata: {
              trainerId: avail.trainerId,
              startTime: avail.startTime,
              endTime: avail.endTime,
              slotsCount,
            },
            orgId: orgId,
            timestamp: avail.createdAt,
          });
        }
        stats.availability++;
        stats.total++;
      }

      console.log("Backfill complete:", stats);
      response.json({
        success: true,
        message: `Successfully backfilled ${stats.total} activities from the last ${daysBack} days`,
        stats,
        orgId,
        daysBack,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      console.error("Error backfilling activities:", error);
      response.status(500).json({
        error: "Failed to backfill activities",
        details: error instanceof Error ? error.message : String(error),
        stats,
      });
    }
  }
);
