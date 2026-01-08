/* eslint-disable @typescript-eslint/no-unused-vars */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Email reminder templates
const EMAIL_TEMPLATES = {
  confirmation: {
    subject: "✅ Booking Confirmed - {{trainerName}} on {{date}}",
    body: `
      <h2>Your Training Session is Confirmed!</h2>
      <p>Hi {{clientName}},</p>
      <p>Your session with {{trainerName}} has been confirmed.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Session Details</h3>
        <p><strong>Date:</strong> {{date}}</p>
        <p><strong>Time:</strong> {{time}}</p>
        <p><strong>Duration:</strong> {{duration}} minutes</p>
        <p><strong>Package:</strong> {{packageName}}</p>
        {{#if location}}<p><strong>Location:</strong> {{location}}</p>{{/if}}
      </div>
      
      <p><a href="{{calendarLink}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Add to Calendar</a></p>
      
      <p>Need to reschedule? Contact {{trainerName}} at {{trainerEmail}}</p>
      
      <p>See you soon!<br>The {{orgName}} Team</p>
    `,
  },

  reminder24h: {
    subject: "⏰ Reminder: Session Tomorrow with {{trainerName}}",
    body: `
      <h2>Your Session is Tomorrow!</h2>
      <p>Hi {{clientName}},</p>
      <p>Just a friendly reminder about your upcoming session with {{trainerName}}.</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Tomorrow's Session</h3>
        <p><strong>Date:</strong> {{date}}</p>
        <p><strong>Time:</strong> {{time}}</p>
        <p><strong>Duration:</strong> {{duration}} minutes</p>
        {{#if location}}<p><strong>Location:</strong> {{location}}</p>{{/if}}
      </div>
      
      <p><a href="{{calendarLink}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Add to Calendar</a></p>
      
      <p>Need to cancel? Please contact us at least {{cancellationHours}} hours in advance.</p>
      
      <p>Looking forward to seeing you!<br>{{trainerName}}</p>
    `,
  },

  reminder2h: {
    subject: "🏃 Starting Soon: Session with {{trainerName}} in 2 Hours",
    body: `
      <h2>Your Session Starts in 2 Hours!</h2>
      <p>Hi {{clientName}},</p>
      <p>This is a quick reminder that your session starts soon.</p>
      
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Today's Session</h3>
        <p><strong>Time:</strong> {{time}}</p>
        <p><strong>Duration:</strong> {{duration}} minutes</p>
        {{#if location}}<p><strong>Location:</strong> {{location}}</p>{{/if}}
      </div>
      
      <p>See you soon!<br>{{trainerName}}</p>
    `,
  },

  followUp: {
    subject: "⭐ How Was Your Session with {{trainerName}}?",
    body: `
      <h2>Thanks for Training With Us!</h2>
      <p>Hi {{clientName}},</p>
      <p>We hope you had a great session with {{trainerName}}!</p>
      
      <p>We'd love to hear your feedback to help us continue improving.</p>
      
      <p style="margin: 30px 0;">
        <a href="{{feedbackLink}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Leave Feedback</a>
      </p>
      
      <h3>Ready to Book Your Next Session?</h3>
      <p><a href="{{bookingLink}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Book Again</a></p>
      
      <p>Thanks for being part of our community!<br>The {{orgName}} Team</p>
    `,
  },
};

// Schedule email reminders when booking is created
// TODO: Re-enable after fixing firestore API version
/*
export const scheduleBookingReminders = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    const bookingId = context.params.bookingId;

    // Don't send reminders for past bookings
    const startTime = booking.startTime.toDate();
    if (startTime < new Date()) {
      return null;
    }

    // Send immediate confirmation
    await sendBookingConfirmation(bookingId, booking);

    // Schedule 24h reminder
    const reminder24h = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > new Date()) {
      await scheduleEmail(bookingId, "reminder24h", reminder24h);
    }

    // Schedule 2h reminder
    const reminder2h = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);
    if (reminder2h > new Date()) {
      await scheduleEmail(bookingId, "reminder2h", reminder2h);
    }

    // Schedule follow-up (1 hour after session ends)
    const followUp = new Date(startTime.getTime() + (booking.durationMinutes + 60) * 60 * 1000);
    await scheduleEmail(bookingId, "followUp", followUp);

    return null;
  });
*/

async function sendBookingConfirmation(bookingId: string, booking: any) {
  // Fetch trainer and client details
  const [trainer, client, org] = await Promise.all([
    admin.firestore().collection("organizations").doc(booking.orgId)
      .collection("trainers").doc(booking.trainerId).get(),
    admin.firestore().collection("users").doc(booking.clientId).get(),
    admin.firestore().collection("organizations").doc(booking.orgId).get(),
  ]);

  const trainerData = trainer.data();
  const clientData = client.data();
  const orgData = org.data();

  // Generate calendar invite
  const calendarLink = `https://skedence.app/calendar/${bookingId}.ics`;

  const emailData = {
    to: clientData?.email,
    subject: EMAIL_TEMPLATES.confirmation.subject
      .replace("{{trainerName}}", trainerData?.name || "Your Trainer")
      .replace("{{date}}", formatDate(booking.startTime.toDate())),
    html: renderTemplate(EMAIL_TEMPLATES.confirmation.body, {
      clientName: clientData?.name || "there",
      trainerName: trainerData?.name || "Your Trainer",
      trainerEmail: trainerData?.email,
      date: formatDate(booking.startTime.toDate()),
      time: formatTime(booking.startTime.toDate()),
      duration: booking.durationMinutes,
      packageName: booking.lessonPackage,
      location: booking.location,
      calendarLink,
      orgName: orgData?.name || "Skedence",
    }),
  };

  // Send via your email service (SendGrid, etc.)
  await admin.firestore().collection("mail").add(emailData);
}

async function scheduleEmail(bookingId: string, type: string, scheduledFor: Date) {
  await admin.firestore().collection("scheduledEmails").add({
    bookingId,
    type,
    scheduledFor: admin.firestore.Timestamp.fromDate(scheduledFor),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function renderTemplate(template: string, data: any): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value || ""));
  }

  // Handle conditionals (basic {{#if}}...{{/if}})
  result = result.replace(/{{#if (\w+)}}(.*?){{\/if}}/gs, (match, key, content) => {
    return data[key] ? content : "";
  });

  return result;
}

// Process scheduled emails (run every 5 minutes)
// TODO: Re-enable after fixing pubsub API version
/*
export const processScheduledEmails = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (_context) => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await admin.firestore()
      .collection("scheduledEmails")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now)
      .limit(100)
      .get();

    const promises = snapshot.docs.map(async (doc) => {
      const emailData = doc.data();

      // Fetch booking details
      const booking = await admin.firestore()
        .collection("bookings")
        .doc(emailData.bookingId)
        .get();

      if (!booking.exists) {
        // Booking was deleted, mark email as cancelled
        return doc.ref.update({status: "cancelled"});
      }

      // Send the email based on type
      const template = EMAIL_TEMPLATES[emailData.type as keyof typeof EMAIL_TEMPLATES];
      if (template) {
        await sendEmailFromTemplate(emailData.bookingId, booking.data()!, template);
      }

      // Mark as sent
      return doc.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(promises);
    return null;
  });
*/

async function sendEmailFromTemplate(bookingId: string, booking: any, template: any) {
  // Similar to sendBookingConfirmation but uses the provided template
  const [trainer, client, org] = await Promise.all([
    admin.firestore().collection("organizations").doc(booking.orgId)
      .collection("trainers").doc(booking.trainerId).get(),
    admin.firestore().collection("users").doc(booking.clientId).get(),
    admin.firestore().collection("organizations").doc(booking.orgId).get(),
  ]);

  const trainerData = trainer.data();
  const clientData = client.data();
  const orgData = org.data();

  const emailData = {
    to: clientData?.email,
    subject: renderTemplate(template.subject, {
      trainerName: trainerData?.name || "Your Trainer",
      date: formatDate(booking.startTime.toDate()),
    }),
    html: renderTemplate(template.body, {
      clientName: clientData?.name || "there",
      trainerName: trainerData?.name || "Your Trainer",
      trainerEmail: trainerData?.email,
      date: formatDate(booking.startTime.toDate()),
      time: formatTime(booking.startTime.toDate()),
      duration: booking.durationMinutes,
      packageName: booking.lessonPackage,
      location: booking.location,
      calendarLink: `https://skedence.app/calendar/${bookingId}.ics`,
      bookingLink: `https://skedence.app/book/${booking.orgId}`,
      feedbackLink: `https://skedence.app/feedback/${bookingId}`,
      orgName: orgData?.name || "Skedence",
      cancellationHours: orgData?.cancellationPolicy?.hours || 24,
    }),
  };

  await admin.firestore().collection("mail").add(emailData);
}
