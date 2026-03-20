/* eslint-disable quotes */
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { google } from "googleapis";

/**
 * Initialize Google Calendar OAuth2 flow
 * Returns the authorization URL for the user to visit
 */
export const initGoogleCalendarAuth = onCall(
  {
    secrets: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI"],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const { orgId } = request.data;

    if (!orgId) {
      throw new Error("orgId is required");
    }

    try {
      // Verify user is admin in this organization
      const db = admin.firestore();
      const memberDoc = await db.collection("orgMembers")
        .doc(`${request.auth.uid}_${orgId}`)
        .get();

      if (!memberDoc.exists) {
        throw new Error("Unauthorized: You are not a member of this organization");
      }

      const memberData = memberDoc.data();
      if (memberData?.role !== "admin" && memberData?.role !== "owner") {
        throw new Error("Unauthorized: Only administrators can connect calendars");
      }

      // Get OAuth2 credentials from environment
      const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "https://skedence.com/import-schedule/callback";

      if (!clientId || !clientSecret) {
        throw new Error("Google Calendar OAuth credentials not configured");
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      // Generate auth URL with required scopes
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar.readonly"],
        state: JSON.stringify({ orgId, userId: request.auth.uid }),
        prompt: "consent", // Force consent screen to get refresh token
      });

      logger.info(`Generated auth URL for org: ${orgId}`);

      return {
        success: true,
        authUrl: authUrl,
      };
    } catch (error: any) {
      logger.error("Error initializing Google Calendar auth:", error);
      throw new Error(error.message || "Failed to initialize Google Calendar authentication");
    }
  }
);

/**
 * Complete Google Calendar OAuth2 flow
 * Exchange authorization code for tokens and save
 */
export const completeGoogleCalendarAuth = onCall(
  {
    secrets: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI"],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const { orgId, code, calendarName } = request.data;

    if (!orgId || !code) {
      throw new Error("orgId and code are required");
    }

    try {
      const db = admin.firestore();

      // Verify user is admin
      const memberDoc = await db.collection("orgMembers")
        .doc(`${request.auth.uid}_${orgId}`)
        .get();

      if (!memberDoc.exists) {
        throw new Error("Unauthorized");
      }

      const memberData = memberDoc.data();
      if (memberData?.role !== "admin" && memberData?.role !== "owner") {
        throw new Error("Unauthorized: Only administrators can connect calendars");
      }

      // Exchange code for tokens
      const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "https://skedence.com/import-schedule/callback";

      if (!clientId || !clientSecret) {
        throw new Error("Google Calendar OAuth credentials not configured");
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get calendar list to find the primary calendar
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const calendars = await calendar.calendarList.list();

      if (!calendars.data.items || calendars.data.items.length === 0) {
        throw new Error("No calendars found in Google account");
      }

      // Use primary calendar by default
      const primaryCalendar = calendars.data.items.find(cal => cal.primary) || calendars.data.items[0];
      const googleCalendarId = primaryCalendar.id!;
      const displayName = calendarName || primaryCalendar.summary || "Google Calendar";

      // Generate random color for this calendar
      const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Store calendar in Firestore
      const calendarRef = await db.collection("organizations")
        .doc(orgId)
        .collection("importedCalendars")
        .add({
          name: displayName,
          googleCalendarId: googleCalendarId,
          color: randomColor,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiryDate: tokens.expiry_date,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: request.auth.uid,
        });

      logger.info(`✅ Connected calendar: ${displayName} for org: ${orgId}`);

      // Trigger initial sync
      await syncCalendarEvents(orgId, calendarRef.id);

      return {
        success: true,
        calendarId: calendarRef.id,
        calendarName: displayName,
      };
    } catch (error: any) {
      logger.error("Error completing Google Calendar auth:", error);
      throw new Error(error.message || "Failed to connect Google Calendar");
    }
  }
);

/**
 * Manually sync a specific calendar
 */
export const syncGoogleCalendar = onCall(
  {
    secrets: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const { orgId, calendarId } = request.data;

    if (!orgId || !calendarId) {
      throw new Error("orgId and calendarId are required");
    }

    try {
      const db = admin.firestore();

      // Verify user is admin
      const memberDoc = await db.collection("orgMembers")
        .doc(`${request.auth.uid}_${orgId}`)
        .get();

      if (!memberDoc.exists) {
        throw new Error("Unauthorized");
      }

      const memberData = memberDoc.data();
      if (memberData?.role !== "admin" && memberData?.role !== "owner") {
        throw new Error("Unauthorized: Only administrators can sync calendars");
      }

      await syncCalendarEvents(orgId, calendarId);

      return {
        success: true,
        message: "Calendar synced successfully",
      };
    } catch (error: any) {
      logger.error("Error syncing calendar:", error);
      throw new Error(error.message || "Failed to sync calendar");
    }
  }
);

/**
 * Sync all calendars for all organizations
 * Runs every 15 minutes
 */
export const syncAllGoogleCalendars = onSchedule(
  {
    schedule: "every 15 minutes",
    secrets: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"],
  },
  async () => {
    try {
      const db = admin.firestore();

      // Get all organizations
      const orgsSnapshot = await db.collection("organizations").get();

      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;

        // Get all imported calendars for this org
        const calendarsSnapshot = await db.collection("organizations")
          .doc(orgId)
          .collection("importedCalendars")
          .get();

        for (const calendarDoc of calendarsSnapshot.docs) {
          try {
            await syncCalendarEvents(orgId, calendarDoc.id);
          } catch (error) {
            logger.error(`Error syncing calendar ${calendarDoc.id} for org ${orgId}:`, error);
            // Continue with next calendar even if one fails
          }
        }
      }

      logger.info("✅ Completed syncing all calendars");
    } catch (error) {
      logger.error("Error in syncAllGoogleCalendars:", error);
    }
  }
);

/**
 * Helper function to sync events for a specific calendar
 */
async function syncCalendarEvents(orgId: string, calendarId: string): Promise<void> {
  const db = admin.firestore();

  // Get calendar document
  const calendarDoc = await db.collection("organizations")
    .doc(orgId)
    .collection("importedCalendars")
    .doc(calendarId)
    .get();

  if (!calendarDoc.exists) {
    throw new Error("Calendar not found");
  }

  const calendarData = calendarDoc.data()!;
  const googleCalendarId = calendarData.googleCalendarId;
  let accessToken = calendarData.accessToken;
  const refreshToken = calendarData.refreshToken;

  // Check if token needs refresh
  const tokenExpiryDate = calendarData.tokenExpiryDate;
  const now = Date.now();

  if (tokenExpiryDate && now >= tokenExpiryDate) {
    // Token expired, refresh it
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google Calendar OAuth credentials not configured");
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    accessToken = credentials.access_token;

    // Update stored token
    await calendarDoc.ref.update({
      accessToken: accessToken,
      tokenExpiryDate: credentials.expiry_date,
    });

    logger.info(`Refreshed token for calendar: ${calendarId}`);
  }

  // Setup Google Calendar API client
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // Fetch events for the next 30 days
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const response = await calendar.events.list({
    calendarId: googleCalendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const events = response.data.items || [];

  logger.info(`Fetched ${events.length} events from Google Calendar: ${calendarData.name}`);

  // Delete existing events for this calendar in the date range
  const existingEventsSnapshot = await db.collection("organizations")
    .doc(orgId)
    .collection("importedEvents")
    .where("calendarId", "==", calendarId)
    .where("startTime", ">=", admin.firestore.Timestamp.fromDate(timeMin))
    .where("startTime", "<=", admin.firestore.Timestamp.fromDate(timeMax))
    .get();

  const batch = db.batch();
  existingEventsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Add new events
  for (const event of events) {
    // Skip all-day events without specific times
    if (event.start?.date && !event.start?.dateTime) {
      continue;
    }

    const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : null;
    const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : null;

    if (!startTime || !endTime) {
      continue;
    }

    const eventRef = db.collection("organizations")
      .doc(orgId)
      .collection("importedEvents")
      .doc();

    batch.set(eventRef, {
      calendarId: calendarId,
      googleEventId: event.id,
      title: event.summary || "Busy",
      startTime: admin.firestore.Timestamp.fromDate(startTime),
      endTime: admin.firestore.Timestamp.fromDate(endTime),
      location: event.location || null,
      description: event.description || null,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  // Update last synced timestamp
  await calendarDoc.ref.update({
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`✅ Synced ${events.length} events for calendar: ${calendarData.name}`);
}
