/* eslint-disable quotes */
import { onRequest } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

/**
 * Generate a calendar token for a trainer
 * This token is used to create a secure subscription URL
 */
export const generateCalendarToken = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("Authentication required");
  }

  const { trainerId } = request.data;

  if (!trainerId) {
    throw new Error("trainerId is required");
  }

  try {
    const db = admin.firestore();
    const trainerRef = db.collection("trainers").doc(trainerId);
    const trainerDoc = await trainerRef.get();

    if (!trainerDoc.exists) {
      throw new Error("Trainer not found");
    }

    const trainerData = trainerDoc.data();

    // Verify the requesting user is this trainer or an admin in the org
    const isTrainer = request.auth.uid === trainerData?.userId;
    const isAdmin = trainerData?.orgId && await checkIsOrgAdmin(request.auth.uid, trainerData.orgId);

    if (!isTrainer && !isAdmin) {
      throw new Error("Unauthorized: You can only generate tokens for yourself");
    }

    // Check if token already exists
    if (trainerData?.calendarToken) {
      logger.info(`Returning existing calendar token for trainer: ${trainerId}`);
      return {
        success: true,
        token: trainerData.calendarToken,
        createdAt: trainerData.calendarTokenCreatedAt?.toDate() || new Date()
      };
    }

    // Generate new token
    const token = generateSecureToken();
    const createdAt = admin.firestore.FieldValue.serverTimestamp();

    await trainerRef.update({
      calendarToken: token,
      calendarTokenCreatedAt: createdAt
    });

    logger.info(`✅ Generated calendar token for trainer: ${trainerId}`);

    return {
      success: true,
      token: token,
      createdAt: new Date()
    };
  } catch (error: any) {
    logger.error("Error generating calendar token:", error);
    throw new Error(error.message || "Failed to generate calendar token");
  }
});

/**
 * HTTP endpoint that serves iCalendar feed for a trainer
 * URL format: /api/calendar/{trainerId}/{token}
 */
export const trainerCalendarFeed = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    // Extract trainerId and token from path
    const pathParts = req.path.split("/").filter(p => p);
    
    // Expecting path like: /trainerId/token or /api/calendar/trainerId/token
    let trainerId: string;
    let token: string;

    if (pathParts.length >= 2) {
      // Get the last two parts as trainerId and token
      trainerId = pathParts[pathParts.length - 2];
      token = pathParts[pathParts.length - 1];
    } else {
      res.status(400).send("Invalid URL format. Expected: /api/calendar/{trainerId}/{token}");
      return;
    }

    logger.info(`Calendar feed requested for trainer: ${trainerId}`);

    // Validate token
    const db = admin.firestore();
    const trainerRef = db.collection("trainers").doc(trainerId);
    const trainerDoc = await trainerRef.get();

    if (!trainerDoc.exists) {
      logger.warn(`Trainer not found: ${trainerId}`);
      res.status(404).send("Trainer not found");
      return;
    }

    const trainerData = trainerDoc.data();

    if (!trainerData?.calendarToken || trainerData.calendarToken !== token) {
      logger.warn(`Invalid token for trainer: ${trainerId}`);
      res.status(403).send("Invalid calendar token");
      return;
    }

    // Fetch trainer's schedules
    const schedulesSnapshot = await trainerRef
      .collection("schedules")
      .orderBy("startTime", "asc")
      .get();

    // Fetch bookings for this trainer to show booked slots
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("trainerId", "==", trainerId)
      .where("status", "==", "confirmed")
      .get();

    const bookingsMap = new Map();
    bookingsSnapshot.docs.forEach(doc => {
      const booking = doc.data();
      if (booking.scheduleId) {
        bookingsMap.set(booking.scheduleId, booking);
      }
    });

    // Generate iCalendar content
    const icalContent = generateICalendar(
      trainerId,
      trainerData,
      schedulesSnapshot.docs,
      bookingsMap
    );

    // Set content type and send
    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="skedence-${trainerId}.ics"`);
    res.status(200).send(icalContent);

    logger.info(`✅ Calendar feed generated for trainer: ${trainerId} (${schedulesSnapshot.size} events)`);
  } catch (error: any) {
    logger.error("Error generating calendar feed:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Generate iCalendar format string
 */
function generateICalendar(
  trainerId: string,
  trainerData: any,
  schedules: admin.firestore.QueryDocumentSnapshot[],
  bookingsMap: Map<string, any>
): string {
  const trainerName = `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() || "Trainer";
  const calendarName = `${trainerName}'s Skedence Schedule`;

  let ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Skedence//Trainer Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
    "X-WR-CALDESC:Your Skedence training schedule with availability and bookings",
  ];

  // Add events for each schedule slot
  schedules.forEach(scheduleDoc => {
    const schedule = scheduleDoc.data();
    const scheduleId = scheduleDoc.id;
    const booking = bookingsMap.get(scheduleId);

    const startTime = schedule.startTime?.toDate();
    const endTime = schedule.endTime?.toDate();

    if (!startTime || !endTime) {
      return; // Skip if no valid times
    }

    // Determine if slot is booked
    const isBooked = schedule.isBooked || booking;
    
    let summary: string;
    let description: string;
    let status: string;

    if (isBooked && booking) {
      // Booked slot - show client info
      summary = `Lesson: ${booking.clientName || "Client"}`;
      description = `Training session with ${booking.clientName || "client"}`;
      if (booking.notes) {
        description += `\n\nNotes: ${booking.notes}`;
      }
      status = "CONFIRMED";
    } else if (isBooked) {
      // Marked as booked but no booking details
      summary = "Lesson (Booked)";
      description = "Training session scheduled";
      status = "CONFIRMED";
    } else {
      // Available slot
      summary = "Available Slot";
      description = "Open for bookings";
      status = "TENTATIVE";
    }

    // Add location if available
    const location = schedule.location || booking?.location || "";

    // Generate unique UID for this event
    const uid = `${scheduleId}@skedence.com`;

    // Format dates for iCal (UTC format: YYYYMMDDTHHmmssZ)
    const dtstart = formatICalDate(startTime);
    const dtend = formatICalDate(endTime);
    const dtstamp = formatICalDate(new Date());

    ical.push("BEGIN:VEVENT");
    ical.push(`UID:${uid}`);
    ical.push(`DTSTAMP:${dtstamp}`);
    ical.push(`DTSTART:${dtstart}`);
    ical.push(`DTEND:${dtend}`);
    ical.push(`SUMMARY:${escapeICalText(summary)}`);
    ical.push(`DESCRIPTION:${escapeICalText(description)}`);
    ical.push(`STATUS:${status}`);
    
    if (location) {
      ical.push(`LOCATION:${escapeICalText(location)}`);
    }

    // Color coding: Green for booked, Blue for available
    if (isBooked) {
      ical.push("COLOR:green");
      ical.push("X-APPLE-CALENDAR-COLOR:#34C759");
    } else {
      ical.push("COLOR:blue");
      ical.push("X-APPLE-CALENDAR-COLOR:#007AFF");
    }

    ical.push("END:VEVENT");
  });

  ical.push("END:VCALENDAR");

  return ical.join("\r\n");
}

/**
 * Format date for iCalendar (UTC): YYYYMMDDTHHmmssZ
 */
function formatICalDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/**
 * Escape special characters for iCalendar text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Generate a secure random token
 */
function generateSecureToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Check if user is admin in organization
 */
async function checkIsOrgAdmin(userId: string, orgId: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const memberDoc = await db.collection("orgMembers")
      .doc(`${userId}_${orgId}`)
      .get();

    if (!memberDoc.exists) {
      return false;
    }

    const memberData = memberDoc.data();
    return memberData?.role === "admin" || memberData?.role === "owner";
  } catch (error) {
    logger.error("Error checking org admin status:", error);
    return false;
  }
}
