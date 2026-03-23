/**
 * Backfill Admin-Created Bookings Script
 * 
 * This script creates activity log entries for admin-created bookings that don't have activity logs.
 * It identifies admin bookings and creates proper activity entries with admin as the actor.
 * 
 * Usage:
 * node backfill-admin-bookings.js <orgId>
 * 
 * Or via HTTP:
 * curl -X POST "https://<function-url>/backfillAdminBookings?orgId=YOUR_ORG_ID"
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";

export const backfillAdminBookings = functions.https.onRequest(
  { cors: true, maxInstances: 1, timeoutSeconds: 540 },
  async (request, response) => {
    const orgId = request.query.orgId as string;

    if (!orgId) {
      response.status(400).json({ error: "orgId parameter is required" });
      return;
    }

    const db = admin.firestore();
    const stats = {
      totalBookings: 0,
      bookingsWithLogs: 0,
      bookingsWithoutLogs: 0,
      adminBookingsCreated: 0,
      clientBookingsCreated: 0,
      errors: 0,
    };

    try {
      console.log(`🔍 Starting backfill for orgId: ${orgId}`);

      // 1. Get all bookings for this organization
      console.log(`📋 Querying bookings with orgId: ${orgId}`);
      const bookingsSnapshot = await db
        .collection("bookings")
        .where("orgId", "==", orgId)
        .get();

      stats.totalBookings = bookingsSnapshot.size;
      console.log(`📋 Found ${stats.totalBookings} total bookings`);

      // DEBUG: If no bookings found, check if any exist without orgId filter
      if (stats.totalBookings === 0) {
        console.log("⚠️ No bookings found with orgId filter. Checking all bookings...");
        const allBookingsSnapshot = await db.collection("bookings").limit(10).get();
        console.log(`📊 Total bookings in database (sample): ${allBookingsSnapshot.size}`);
        
        if (allBookingsSnapshot.size > 0) {
          const sampleBooking = allBookingsSnapshot.docs[0].data();
          console.log("📄 Sample booking structure:", {
            hasOrgId: !!sampleBooking.orgId,
            orgIdValue: sampleBooking.orgId,
            fields: Object.keys(sampleBooking),
          });
        }
      }

      // 2. Get all existing booking-related activities
      const activitiesSnapshot = await db
        .collection("activities")
        .where("orgId", "==", orgId)
        .where("type", "in", ["lesson_booked", "booking_created"])
        .get();

      // Create a map of booking IDs that have activity logs
      const bookingsWithLogs = new Set<string>();
      activitiesSnapshot.docs.forEach(doc => {
        const metadata = doc.data().metadata;
        if (metadata?.bookingId) {
          bookingsWithLogs.add(metadata.bookingId);
        }
      });

      stats.bookingsWithLogs = bookingsWithLogs.size;
      console.log(`✅ Found ${stats.bookingsWithLogs} bookings with existing activity logs`);

      // 3. Process each booking
      for (const bookingDoc of bookingsSnapshot.docs) {
        const bookingId = bookingDoc.id;
        const booking = bookingDoc.data();

        // Skip if already has an activity log
        if (bookingsWithLogs.has(bookingId)) {
          continue;
        }

        stats.bookingsWithoutLogs++;

        try {
          // Get client info
          const clientId = booking.clientId || booking.clientUID || booking.userId;
          const clientName = booking.clientName || "Unknown Client";
          
          // Get trainer info
          const trainerId = booking.trainerId;
          const trainerName = booking.trainerName || "Unknown Trainer";

          // Determine if this was an admin booking or client booking
          // Admin bookings typically have clientId field set (passed from web portal)
          // Client bookings from iOS app would have been logged already
          // So missing logs = likely admin bookings
          const isAdminBooking = true; // Assume admin booking if no log exists

          // Get org owner/admin info for admin bookings
          let adminId = "system";
          let adminName = "Admin";

          if (isAdminBooking) {
            // Try to find an admin/owner for this org
            const orgMembersSnapshot = await db
              .collection("orgMembers")
              .where("orgId", "==", orgId)
              .where("role", "in", ["owner", "admin"])
              .limit(1)
              .get();

            if (!orgMembersSnapshot.empty) {
              const adminMember = orgMembersSnapshot.docs[0].data();
              adminId = adminMember.authUserId || adminMember.userId || "system";
              
              // Get admin's name from users or trainers
              if (adminMember.userId) {
                const userDoc = await db.collection("users").doc(adminMember.userId).get();
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  adminName = `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || "Admin";
                } else {
                  const trainerDoc = await db.collection("trainers").doc(adminMember.userId).get();
                  if (trainerDoc.exists) {
                    const trainerData = trainerDoc.data();
                    adminName = `${trainerData?.firstName || ""} ${trainerData?.lastName || ""}`.trim() || "Admin";
                  }
                }
              }
            }
          }

          // Create activity log
          const activityTimestamp = booking.bookedAt || booking.createdAt || admin.firestore.Timestamp.now();
          const activityId = `${clientId}_lesson_booked_${activityTimestamp.seconds}`;

          const actorId = isAdminBooking ? adminId : clientId;
          const actorName = isAdminBooking ? adminName : clientName;
          const actorRole = isAdminBooking ? "admin" : "client";
          const description = isAdminBooking
            ? `${adminName} booked a private for ${clientName} with ${trainerName}`
            : `${clientName} booked a private with ${trainerName}`;

          await db.collection("activities").doc(activityId).set({
            type: "lesson_booked",
            actorId: actorId,
            actorName: actorName,
            actorRole: actorRole,
            targetId: trainerId,
            targetName: trainerName,
            targetType: "trainer",
            description: description,
            metadata: {
              bookingId: bookingId,
              slotId: booking.slotId,
              startTime: booking.startTime,
              endTime: booking.endTime,
              location: booking.location || "Location TBD",
              clientId: clientId,
              clientName: clientName,
              isAdminBooking: isAdminBooking,
              backfilled: true,
              timestamp: activityTimestamp,
            },
            orgId: orgId,
            timestamp: activityTimestamp,
          });

          if (isAdminBooking) {
            stats.adminBookingsCreated++;
          } else {
            stats.clientBookingsCreated++;
          }

          console.log(`✅ Created activity log for booking ${bookingId} (${actorRole})`);

        } catch (error) {
          stats.errors++;
          console.error(`❌ Error processing booking ${bookingId}:`, error);
        }
      }

      console.log("\n📊 Backfill Complete!");
      console.log(`Total bookings: ${stats.totalBookings}`);
      console.log(`Bookings with existing logs: ${stats.bookingsWithLogs}`);
      console.log(`Bookings without logs: ${stats.bookingsWithoutLogs}`);
      console.log(`Admin booking logs created: ${stats.adminBookingsCreated}`);
      console.log(`Client booking logs created: ${stats.clientBookingsCreated}`);
      console.log(`Errors: ${stats.errors}`);

      response.status(200).json({
        success: true,
        stats: stats,
      });

    } catch (error) {
      console.error("❌ Backfill failed:", error);
      response.status(500).json({
        error: "Backfill failed",
        message: error instanceof Error ? error.message : String(error),
        stats: stats,
      });
    }
  }
);
