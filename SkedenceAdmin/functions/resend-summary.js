/**
 * One-time script to resend the weekly appointment summary
 * to jeff@polyfacevolleyball.com for Polyface Volleyball Academy.
 *
 * Usage:
 *   node resend-summary.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const ORG_ID = "polyface_volleyball_academy_"; // Polyface Volleyball Academy
const TARGET_EMAIL = "admin@polyfacevolleyball.com";
const TIMEZONE = "America/Los_Angeles";

async function main() {
  console.log("Fetching org data...");
  const orgDoc = await db.collection("organizations").doc(ORG_ID).get();
  if (!orgDoc.exists) {
    console.error("Org not found:", ORG_ID);
    process.exit(1);
  }
  const orgData = orgDoc.data();

  // Get next 7 days of bookings
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  console.log(`Querying bookings from ${startOfToday.toISOString()} to ${endOfWeek.toISOString()}...`);

  const bookingsSnapshot = await db
    .collection("bookings")
    .where("orgId", "==", ORG_ID)
    .where("startTime", ">=", admin.firestore.Timestamp.fromDate(startOfToday))
    .where("startTime", "<=", admin.firestore.Timestamp.fromDate(endOfWeek))
    .orderBy("startTime", "asc")
    .get();

  const bookings = bookingsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`Found ${bookings.length} booking(s)`);

  // Enrich with trainer/client details (with fallback to stored names)
  const bookingsWithDetails = await Promise.all(
    bookings.map(async (booking) => {
      const clientUID = booking.clientUID || booking.clientId;
      const [clientDoc, trainerDoc] = await Promise.all([
        clientUID ? db.collection("users").doc(clientUID).get() : Promise.resolve(null),
        booking.trainerId ? db.collection("trainers").doc(booking.trainerId).get() : Promise.resolve(null),
      ]);

      const clientData = clientDoc && clientDoc.exists ? clientDoc.data() : null;
      const trainerData = trainerDoc && trainerDoc.exists ? trainerDoc.data() : null;

      const resolvedTrainerName =
        (trainerData
          ? `${trainerData.firstName || ""} ${trainerData.lastName || ""}`.trim() || trainerData.email
          : null) ||
        booking.trainerName ||
        "Unknown Trainer";

      const resolvedClientName =
        (clientData
          ? `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || clientData.email
          : null) ||
        booking.clientName ||
        "Unknown Client";

      return {
        ...booking,
        clientName: resolvedClientName,
        trainerName: resolvedTrainerName,
      };
    })
  );

  // Group by day
  const bookingsByDay = {};
  bookingsWithDetails.forEach((booking) => {
    const dayKey = booking.startTime.toDate().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: TIMEZONE,
    });
    if (!bookingsByDay[dayKey]) bookingsByDay[dayKey] = [];
    bookingsByDay[dayKey].push(booking);
  });

  // Build HTML
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
          .map((booking) => {
            const time = booking.startTime.toDate().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: TIMEZONE,
            });
            return `
              <div style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #111827;">${time} - ${booking.clientName}</div>
                <div style="color: #6b7280; font-size: 14px; margin-top: 2px;">with ${booking.trainerName}</div>
                ${booking.location && booking.location !== "Location TBD" ? `<div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">📍 ${booking.location}</div>` : ""}
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

  // Write to mail collection
  const mailDoc = {
    to: TARGET_EMAIL,
    from: `${orgData.name || "Skedence"} <no-reply@skedence.com>`,
    replyTo: orgData.email || "support@skedence.com",
    message: {
      subject: `This Week's Appointments - ${bookingsWithDetails.length} scheduled`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3258A3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">📅 This Week's Schedule</h2>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0;">Hi Jeff,</p>
            
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
  };

  const docRef = await db.collection("mail").add(mailDoc);
  console.log(`✅ Summary email queued (mail/${docRef.id}) → ${TARGET_EMAIL}`);
  console.log(`   ${bookingsWithDetails.length} booking(s) included`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
