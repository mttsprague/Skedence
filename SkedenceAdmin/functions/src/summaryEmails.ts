import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";

/**
 * Send daily or weekly appointment summaries to owners
 * Runs every hour to check if summaries should be sent
 */
export const sendAppointmentSummaries = onSchedule(
  {
    schedule: "0 * * * *", // Run every hour
    timeZone: "UTC",
  },
  async (_event) => {
    console.log("Starting appointment summaries job");

    try {
      // Get all organizations with booking alerts enabled
      const orgsSnapshot = await admin.firestore()
        .collection("organizations")
        .get();

      const promises = orgsSnapshot.docs.map(async (orgDoc) => {
        const orgId = orgDoc.id;
        const orgData = orgDoc.data();

        // Check booking alert settings
        const settingsDoc = await admin.firestore()
          .collection("organizations").doc(orgId)
          .collection("settings").doc("bookingAlerts").get();

        if (!settingsDoc.exists) return;

        const settings = settingsDoc.data()!;

        // Skip if summary emails are disabled
        if (!settings.sendSummaryEmails) {
          return;
        }

        const timezone = settings.timezone || "America/Los_Angeles";
        const now = new Date();

        // Get current time in the org's timezone
        const currentHourInTz = parseInt(now.toLocaleString("en-US", {
          hour: "2-digit",
          hour12: false,
          timeZone: timezone,
        }));

        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const currentDayOfWeek = now.getUTCDay();

        // Check if it's time to send based on frequency
        if (settings.summaryFrequency === "daily") {
          // Parse the summaryTime (format: "HH:mm")
          const [targetHour] = settings.summaryTime.split(":").map((n: string) => parseInt(n));

          // Send if current hour matches the target hour
          if (currentHourInTz !== targetHour) {
            return;
          }

          // Send daily summary
          await sendDailySummary(orgId, orgData, timezone);
        } else if (settings.summaryFrequency === "weekly") {
          // Send on Monday (1) at 8 AM
          if (currentDayOfWeek !== 1 || currentHourInTz !== 8) {
            return;
          }

          // Send weekly summary
          await sendWeeklySummary(orgId, orgData, timezone);
        }
      });

      await Promise.all(promises);
      console.log("Appointment summaries job completed");
      return null;
    } catch (error) {
      console.error("Error in appointment summaries job:", error);
      return null;
    }
  });

/**
 * Send daily summary of upcoming appointments
 * @param {string} orgId The organization ID
 * @param {any} orgData The organization data
 * @param {string} timezone The timezone for date formatting
 */
async function sendDailySummary(orgId: string, orgData: any, timezone: string) {
  try {
    // Get admin/owner email from orgMembers
    const adminMembers = await admin.firestore()
      .collection("orgMembers")
      .where("orgId", "==", orgId)
      .where("role", "in", ["admin", "owner"])
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (adminMembers.empty) {
      console.log(`No active admin/owner found for org ${orgId}`);
      return;
    }

    const adminMember = adminMembers.docs[0].data();
    const authUserId = adminMember.authUserId;

    // Try to find user in users collection
    let ownerEmail = "";
    let ownerData: any = {};
    
    const userQuery = await admin.firestore()
      .collection("users")
      .where("authUserId", "==", authUserId)
      .limit(1)
      .get();
    
    if (!userQuery.empty) {
      ownerData = userQuery.docs[0].data();
      ownerEmail = ownerData.email || ownerData.emailAddress || "";
    } else {
      // Try trainers collection
      const trainerQuery = await admin.firestore()
        .collection("trainers")
        .where("authUserId", "==", authUserId)
        .where("orgId", "==", orgId)
        .limit(1)
        .get();
      
      if (!trainerQuery.empty) {
        ownerData = trainerQuery.docs[0].data();
        ownerEmail = ownerData.email || "";
      }
    }

    if (!ownerEmail) {
      console.log(`No email found for admin ${authUserId} in org ${orgId}`);
      return;
    }

    // Get today's appointments
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bookingsSnapshot = await admin.firestore()
      .collection("bookings")
      .where("orgId", "==", orgId)
      .where("startTime", ">=", admin.firestore.Timestamp.fromDate(startOfDay))
      .where("startTime", "<=", admin.firestore.Timestamp.fromDate(endOfDay))
      .orderBy("startTime", "asc")
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get client and trainer details for all bookings
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking: any) => {
        const [clientDoc, trainerDoc] = await Promise.all([
          admin.firestore().collection("users").doc(booking.clientUID).get(),
          admin.firestore().collection("trainers").doc(booking.trainerId).get(),
        ]);

        const clientData = clientDoc.data();
        const trainerData = trainerDoc.data();

        return {
          ...booking,
          clientName: clientData ?
            `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || clientData.email :
            "Unknown",
          trainerName: trainerData?.name || "Unknown",
        };
      })
    );

    // Format today's date
    const todayFormatted = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone,
    });

    // Build appointments HTML
    let appointmentsHtml = "";
    if (bookingsWithDetails.length === 0) {
      appointmentsHtml = `
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; margin: 0;">No appointments scheduled for today</p>
        </div>
      `;
    } else {
      appointmentsHtml = bookingsWithDetails
        .map((booking: any) => {
          const time = booking.startTime.toDate().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: timezone,
          });

          return `
          <div style="background-color: white; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${time}</div>
                <div style="color: #6b7280; font-size: 14px;">${booking.clientName} with ${booking.trainerName}</div>
                ${booking.location ? `<div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">📍 ${booking.location}</div>` : ""}
              </div>
            </div>
          </div>
        `;
        })
        .join("");
    }

    // Send email
    await admin.firestore().collection("mail").add({
      to: ownerEmail,
      from: `${orgData.name} <no-reply@skedence.com>`,
      replyTo: orgData.email || "support@skedence.com",
      message: {
        subject: `Today's Appointments - ${todayFormatted}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3258A3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">📅 Today's Schedule</h2>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin-top: 0;">Hi ${ownerData.firstName || "there"},</p>
              
              <p>Here's your appointment summary for <strong>${todayFormatted}</strong>:</p>
              
              <div style="margin: 20px 0;">
                <div style="background-color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
                  <div style="color: #6b7280; font-size: 14px;">Total Appointments</div>
                  <div style="font-size: 24px; font-weight: 700; color: #3258A3;">${bookingsWithDetails.length}</div>
                </div>
              </div>

              <h3 style="color: #111827; margin-bottom: 12px;">Appointments</h3>
              ${appointmentsHtml}
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="https://skedence.com/schedule" style="display: inline-block; background-color: #3258A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Full Schedule</a>
              </div>
            </div>
          </div>
        `,
      },
    });

    console.log(`✅ Daily summary sent to ${ownerEmail} for org ${orgId}`);
  } catch (error) {
    console.error(`Error sending daily summary for org ${orgId}:`, error);
  }
}

/**
 * Send weekly summary of upcoming appointments
 * @param {string} orgId The organization ID
 * @param {any} orgData The organization data
 * @param {string} timezone The timezone for date formatting
 */
async function sendWeeklySummary(orgId: string, orgData: any, timezone: string) {
  try {
    // Get admin/owner email from orgMembers
    const adminMembers = await admin.firestore()
      .collection("orgMembers")
      .where("orgId", "==", orgId)
      .where("role", "in", ["admin", "owner"])
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (adminMembers.empty) {
      console.log(`No active admin/owner found for org ${orgId}`);
      return;
    }

    const adminMember = adminMembers.docs[0].data();
    const authUserId = adminMember.authUserId;

    // Try to find user in users collection
    let ownerEmail = "";
    let ownerData: any = {};
    
    const userQuery = await admin.firestore()
      .collection("users")
      .where("authUserId", "==", authUserId)
      .limit(1)
      .get();
    
    if (!userQuery.empty) {
      ownerData = userQuery.docs[0].data();
      ownerEmail = ownerData.email || ownerData.emailAddress || "";
    } else {
      // Try trainers collection
      const trainerQuery = await admin.firestore()
        .collection("trainers")
        .where("authUserId", "==", authUserId)
        .where("orgId", "==", orgId)
        .limit(1)
        .get();
      
      if (!trainerQuery.empty) {
        ownerData = trainerQuery.docs[0].data();
        ownerEmail = ownerData.email || "";
      }
    }

    if (!ownerEmail) {
      console.log(`No email found for admin ${authUserId} in org ${orgId}`);
      return;
    }

    // Get this week's appointments (next 7 days)
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    const bookingsSnapshot = await admin.firestore()
      .collection("bookings")
      .where("orgId", "==", orgId)
      .where("startTime", ">=", admin.firestore.Timestamp.fromDate(startOfWeek))
      .where("startTime", "<=", admin.firestore.Timestamp.fromDate(endOfWeek))
      .orderBy("startTime", "asc")
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get client and trainer details for all bookings
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking: any) => {
        const [clientDoc, trainerDoc] = await Promise.all([
          admin.firestore().collection("users").doc(booking.clientUID).get(),
          admin.firestore().collection("trainers").doc(booking.trainerId).get(),
        ]);

        const clientData = clientDoc.data();
        const trainerData = trainerDoc.data();

        return {
          ...booking,
          clientName: clientData ?
            `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || clientData.email :
            "Unknown",
          trainerName: trainerData?.name || "Unknown",
        };
      })
    );

    // Group bookings by day
    const bookingsByDay: { [key: string]: any[] } = {};
    bookingsWithDetails.forEach((booking: any) => {
      const dayKey = booking.startTime.toDate().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: timezone,
      });

      if (!bookingsByDay[dayKey]) {
        bookingsByDay[dayKey] = [];
      }
      bookingsByDay[dayKey].push(booking);
    });

    // Build appointments HTML by day
    let appointmentsHtml = "";
    if (Object.keys(bookingsByDay).length === 0) {
      appointmentsHtml = `
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; margin: 0;">No appointments scheduled for this week</p>
        </div>
      `;
    } else {
      appointmentsHtml = Object.entries(bookingsByDay)
        .map(([day, dayBookings]) => {
          const appointmentsList = dayBookings
            .map((booking: any) => {
              const time = booking.startTime.toDate().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: timezone,
              });

              return `
              <div style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #111827;">${time} - ${booking.clientName}</div>
                <div style="color: #6b7280; font-size: 14px; margin-top: 2px;">with ${booking.trainerName}</div>
                ${booking.location ? `<div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">📍 ${booking.location}</div>` : ""}
              </div>
            `;
            })
            .join("");

          return `
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 12px 0; color: #3258A3; font-size: 16px;">${day} (${dayBookings.length} appointment${dayBookings.length !== 1 ? "s" : ""})</h3>
            <div style="border-top: 1px solid #f3f4f6;">
              ${appointmentsList}
            </div>
          </div>
        `;
        })
        .join("");
    }

    // Send email
    await admin.firestore().collection("mail").add({
      to: ownerEmail,
      from: `${orgData.name} <no-reply@skedence.com>`,
      replyTo: orgData.email || "support@skedence.com",
      message: {
        subject: `This Week's Appointments - ${bookingsWithDetails.length} scheduled`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3258A3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">📅 This Week's Schedule</h2>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin-top: 0;">Hi ${ownerData.firstName || "there"},</p>
              
              <p>Here's your appointment summary for the upcoming week:</p>
              
              <div style="margin: 20px 0;">
                <div style="background-color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
                  <div style="color: #6b7280; font-size: 14px;">Total Appointments This Week</div>
                  <div style="font-size: 24px; font-weight: 700; color: #3258A3;">${bookingsWithDetails.length}</div>
                </div>
              </div>

              ${appointmentsHtml}
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="https://skedence.com/schedule" style="display: inline-block; background-color: #3258A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Full Schedule</a>
              </div>
            </div>
          </div>
        `,
      },
    });

    console.log(`✅ Weekly summary sent to ${ownerEmail} for org ${orgId}`);
  } catch (error) {
    console.error(`Error sending weekly summary for org ${orgId}:`, error);
  }
}
