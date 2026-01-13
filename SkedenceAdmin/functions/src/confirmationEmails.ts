/* eslint-disable quotes */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Send confirmation email when a client books a lesson
 */
export const sendBookingConfirmation = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const booking = snap.data();

    try {
      // Fetch related data
      const [clientDoc, trainerDoc, orgDoc] = await Promise.all([
        admin.firestore().collection("users").doc(booking.clientId).get(),
        admin.firestore().collection("users").doc(booking.trainerId).get(),
        admin.firestore().collection("organizations").doc(booking.orgId).get(),
      ]);

      const client = clientDoc.data();
      const trainer = trainerDoc.data();
      const org = orgDoc.data();

      if (!client?.emailAddress && !client?.email) {
        console.log("No email found for client:", booking.clientId);
        return;
      }

      const clientEmail = client.emailAddress || client.email;
      const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "there";
      const trainerName = `${trainer?.firstName || ""} ${trainer?.lastName || ""}`.trim() || "Your Trainer";
      const orgName = org?.name || "Skedence";

      const startTime = booking.startTime.toDate();
      const endTime = booking.endTime.toDate();

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        subject: `✅ Lesson Confirmed with ${trainerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #35b3af;">Your Lesson is Confirmed!</h2>
            <p>Hi ${clientName},</p>
            <p>Your training session has been successfully booked.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Session Details</h3>
              <p><strong>Trainer:</strong> ${trainerName}</p>
              <p><strong>Date:</strong> ${startTime.toLocaleDateString("en-US", {weekday: "long", year: "numeric", month: "long", day: "numeric"})}</p>
              <p><strong>Time:</strong> ${startTime.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"})} - ${endTime.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"})}</p>
              ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ""}
            </div>
            
            <p>Need to reschedule or cancel? Please contact us at least 24 hours in advance.</p>
            
            <p>See you soon!<br>The ${orgName} Team</p>
          </div>
        `,
      });

      console.log(`✅ Booking confirmation sent to ${clientEmail}`);
    } catch (error) {
      console.error("Error sending booking confirmation:", error);
    }
  }
);

/**
 * Send confirmation email when a client registers for a class
 */
export const sendClassRegistrationConfirmation = onDocumentCreated(
  "organizations/{orgId}/classes/{classId}/participants/{participantId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const participant = snap.data();
    const {orgId, classId} = event.params;

    try {
      // Fetch related data
      const [clientDoc, classDoc, orgDoc] = await Promise.all([
        admin.firestore().collection("users").doc(participant.userId).get(),
        admin.firestore().collection("organizations").doc(orgId)
          .collection("classes").doc(classId).get(),
        admin.firestore().collection("organizations").doc(orgId).get(),
      ]);

      const client = clientDoc.data();
      const classData = classDoc.data();
      const org = orgDoc.data();

      if (!client?.emailAddress && !client?.email) {
        console.log("No email found for client:", participant.userId);
        return;
      }

      const clientEmail = client.emailAddress || client.email;
      const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "there";
      const className = classData?.title || "Class";
      const orgName = org?.name || "Skedence";

      const startTime = classData?.startTime.toDate();
      const endTime = classData?.endTime.toDate();

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        subject: `✅ Registered for ${className}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #35b3af;">You're Registered!</h2>
            <p>Hi ${clientName},</p>
            <p>You've successfully registered for <strong>${className}</strong>.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Class Details</h3>
              <p><strong>Class:</strong> ${className}</p>
              ${classData?.description ? `<p>${classData.description}</p>` : ""}
              <p><strong>Date:</strong> ${startTime.toLocaleDateString("en-US", {weekday: "long", year: "numeric", month: "long", day: "numeric"})}</p>
              <p><strong>Time:</strong> ${startTime.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"})} - ${endTime.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"})}</p>
              ${classData?.location ? `<p><strong>Location:</strong> ${classData.location}</p>` : ""}
              <p><strong>Instructor:</strong> ${classData?.trainerName || "Staff"}</p>
            </div>
            
            <p>We're looking forward to seeing you there!</p>
            
            <p>Best,<br>The ${orgName} Team</p>
          </div>
        `,
      });

      console.log(`✅ Class registration confirmation sent to ${clientEmail}`);
    } catch (error) {
      console.error("Error sending class registration confirmation:", error);
    }
  }
);

/**
 * Send confirmation email when organization starts subscription
 */
export const sendSubscriptionConfirmation = onDocumentCreated(
  "organizations/{orgId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const org = snap.data();

    // Only send if billing info exists (not all orgs are created with billing immediately)
    if (!org.billing?.stripeCustomerId) {
      return;
    }

    try {
      // Get owner email
      const ownerIds = org.adminIds || [];
      if (ownerIds.length === 0) return;

      const ownerDoc = await admin.firestore().collection("users").doc(ownerIds[0]).get();
      const owner = ownerDoc.data();

      if (!owner?.email && !owner?.emailAddress) {
        console.log("No email found for owner:", ownerIds[0]);
        return;
      }

      const ownerEmail = owner.email || owner.emailAddress;
      const ownerName = `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || "there";
      const orgName = org.name || "Your Organization";
      const plan = org.billing?.plan || "free";
      const status = org.billing?.status || "active";

      // Only send for paid subscriptions or trials
      if (plan === "free" && status !== "trialing") {
        return;
      }

      const isTrial = status === "trialing";
      const subject = isTrial ?
        `🎉 Free Trial Started - Welcome to ${orgName}!` :
        `✅ Subscription Active - Welcome to ${orgName}!`;

      await admin.firestore().collection("mail").add({
        to: ownerEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #35b3af;">${isTrial ? "Welcome to Your Free Trial!" : "Subscription Confirmed!"}</h2>
            <p>Hi ${ownerName},</p>
            <p>${isTrial ?
    "Your free trial has started! You now have full access to all Skedence features." :
    "Thank you for subscribing to Skedence. Your payment has been processed successfully."
}</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Subscription Details</h3>
              <p><strong>Organization:</strong> ${orgName}</p>
              <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
              <p><strong>Status:</strong> ${isTrial ? "Free Trial" : "Active"}</p>
              ${isTrial ? '<p><strong>Trial Period:</strong> 14 days</p>' : ""}
            </div>
            
            ${isTrial ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>💡 Reminder:</strong> Your trial will automatically convert to a paid subscription after 14 days. You can cancel anytime before then.</p>
              </div>
            ` : ""}
            
            <h3>What's Next?</h3>
            <ul>
              <li>Set up your schedule and availability</li>
              <li>Invite trainers to your organization</li>
              <li>Add your service locations</li>
              <li>Create lesson packages for clients</li>
            </ul>
            
            <p>Need help getting started? Reply to this email and we'll be happy to assist!</p>
            
            <p>Best,<br>The Skedence Team</p>
          </div>
        `,
      });

      console.log(`✅ Subscription confirmation sent to ${ownerEmail}`);
    } catch (error) {
      console.error("Error sending subscription confirmation:", error);
    }
  }
);
