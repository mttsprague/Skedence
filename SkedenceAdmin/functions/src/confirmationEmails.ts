/* eslint-disable quotes */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {isEmailEnabled} from "./emailSettings";
import {generateEmail} from "./emailTemplates";

/**
 * Log activity to the activities collection
 */
async function logActivity(data: {
  type: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetId?: string;
  targetName?: string;
  targetType?: string;
  description: string;
  metadata?: Record<string, any>;
  orgId: string;
}) {
  try {
    await admin.firestore().collection("activities").add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Activity logged: ${data.type}`);
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
}

/**
 * Send confirmation email when a client purchases a lesson package
 */
export const sendPurchaseConfirmation = onDocumentCreated(
  "users/{userId}/lessonPackages/{packageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const packageData = snap.data();
    const {userId} = event.params;

    try {
      // Fetch user and organization data
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const user = userDoc.data();

      // Get organization ID to check email settings
      let orgId = packageData.orgId;
      if (!orgId) {
        // Try to get orgId from user's orgMembers
        const orgMemberDoc = await admin.firestore().collection("orgMembers").doc(userId).get();
        if (orgMemberDoc.exists) {
          orgId = orgMemberDoc.data()?.orgId;
        }
      }

      // Check if package receipt emails are enabled
      if (orgId) {
        const emailEnabled = await isEmailEnabled(orgId, "packageReceipt");
        if (!emailEnabled) {
          console.log(`Package receipt emails disabled for org ${orgId}, skipping email`);
          return;
        }
      }

      if (!user?.emailAddress && !user?.email) {
        console.log("No email found for user:", userId);
        return;
      }

      const clientEmail = user.emailAddress || user.email;
      const clientName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "there";

      // Get payment details from Stripe if available
      let amount = 0;
      let orgName = "Skedence";
      let packageName = packageData.packageType || "Lesson Package";

      if (packageData.transactionId) {
        try {
          // Initialize Stripe
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeKey) {
            throw new Error("Stripe secret key not configured");
          }
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const stripe = require("stripe")(stripeKey);

          const paymentIntent = await stripe.paymentIntents.retrieve(packageData.transactionId);
          amount = paymentIntent.amount / 100; // Convert from cents

          // Get organization from payment intent metadata
          if (paymentIntent.metadata?.orgId) {
            const orgDoc = await admin.firestore()
              .collection("organizations")
              .doc(paymentIntent.metadata.orgId)
              .get();
            const org = orgDoc.data();
            if (org?.name) {
              orgName = org.name;
            }
          }
        } catch (stripeError) {
          console.error("Error retrieving payment details:", stripeError);
        }
      }

      // Use packageName field if available, otherwise format packageType
      if (packageData.packageName) {
        packageName = packageData.packageName;
      } else {
        // Fallback: Format packageType into readable name
        const packageTypeNames: { [key: string]: string } = {
          "single": "Single Lesson",
          "five_pack": "5-Lesson Package",
          "ten_pack": "10-Lesson Package",
          "two_athlete": "2-Athlete Lesson",
          "three_athlete": "3-Athlete Lesson",
          "class_pass": "Class Pass",
          "private": "Private Lesson",
          "2_athlete": "2-Athlete Lesson",
          "3_athlete": "3-Athlete Lesson",
        };
        packageName = packageTypeNames[packageData.packageType] || packageData.packageType;
      }

      // Format purchase date
      const purchaseDate = packageData.purchaseDate?.toDate() || new Date();
      const formattedDate = purchaseDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Generate email from template
      const emailContent = await generateEmail(orgId, "packageReceipt", {
        clientName,
        packageName,
        amount: amount.toFixed(2),
        date: formattedDate,
        sessionsRemaining: packageData.totalLessons || 0,
        orgName,
      });

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: emailContent.subject,
          html: emailContent.body,
        },
      });

      console.log(`✅ Purchase confirmation sent to ${clientEmail}`);

      // Log activity for package purchase
      if (orgId) {
        await logActivity({
          type: "pass_purchased",
          actorId: userId,
          actorName: clientName,
          actorRole: "client",
          targetId: snap.id,
          targetName: packageName,
          targetType: "pass",
          description: `${clientName} purchased ${packageName} (${packageData.totalLessons || 0} sessions)${amount > 0 ? ` for $${amount.toFixed(2)}` : ""}`,
          metadata: {
            packageId: snap.id,
            packageType: packageData.packageType,
            totalLessons: packageData.totalLessons,
            amountPaid: Math.round(amount * 100),
            transactionId: packageData.transactionId,
          },
          orgId: orgId,
        });
      }
    } catch (error) {
      console.error("Error sending purchase confirmation:", error);
    }
  }
);

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
      // Check if booking confirmation emails are enabled
      const emailEnabled = await isEmailEnabled(booking.orgId, "bookingConfirmation");
      if (!emailEnabled) {
        console.log(`Booking confirmation emails disabled for org ${booking.orgId}, skipping email`);
        return;
      }
      // Fetch related data - Note: trainers are in trainers collection, not users
      const [clientDoc, trainerDoc, orgDoc] = await Promise.all([
        admin.firestore().collection("users").doc(booking.clientUID || booking.clientId).get(),
        admin.firestore().collection("trainers").doc(booking.trainerId).get(),
        admin.firestore().collection("organizations").doc(booking.orgId).get(),
      ]);

      const client = clientDoc.data();
      const trainer = trainerDoc.data();
      const org = orgDoc.data();

      if (!client?.emailAddress && !client?.email) {
        console.log("No email found for client:", booking.clientUID || booking.clientId);
        return;
      }

      const clientEmail = client.emailAddress || client.email;
      const clientName = booking.clientName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "there";
      const trainerName = booking.trainerName || `${trainer?.firstName || ""} ${trainer?.lastName || ""}`.trim() || "Your Trainer";
      const trainerEmail = trainer?.email || trainer?.emailAddress || "";
      const orgName = org?.name || "Skedence";
      const location = booking.location || "Location TBD";
      const athleteName = booking.athleteName || "";

      // Get timezone from org settings, default to America/New_York
      const orgTimezone = org?.settings?.timezone || "America/New_York";

      const startTime = booking.startTime.toDate();
      const endTime = booking.endTime?.toDate() || new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

      // Calculate duration in minutes
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // Format date and time with organization's timezone
      const dateFormatted = startTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: orgTimezone,
      });
      const timeFormatted = startTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: orgTimezone,
      });

      // Generate email from template
      const emailContent = await generateEmail(booking.orgId, "bookingConfirmation", {
        clientName,
        trainerName,
        athleteName,
        date: dateFormatted,
        time: timeFormatted,
        duration: durationMinutes,
        packageName: booking.packageName || booking.lessonPackage || "",
        location,
        trainerEmail,
        orgName,
      });

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: emailContent.subject,
          html: emailContent.body,
        },
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
      // Check if booking confirmation emails are enabled (classes use same setting)
      const emailEnabled = await isEmailEnabled(orgId, "bookingConfirmation");
      if (!emailEnabled) {
        console.log(`Class registration emails disabled for org ${orgId}, skipping email`);
        return;
      }
      // Fetch related data
      const [clientDoc, classDoc, orgDoc] = await Promise.all([
        admin.firestore().collection("users").doc(participant.userId).get(),
        admin.firestore().collection("classes").doc(classId).get(),
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
      const clientName = participant.userName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "there";
      const className = classData?.name || classData?.title || "Class";
      const classDescription = classData?.description || "";
      const instructor = classData?.trainerName || "Staff";
      const orgName = org?.name || "Skedence";
      const location = classData?.location || "Location TBD";

      // Get timezone from org settings, default to America/New_York
      const orgTimezone = org?.settings?.timezone || "America/New_York";

      const startTime = classData?.startTime.toDate();
      const endTime = classData?.endTime.toDate();

      // Format options with organization's timezone
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: orgTimezone,
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: orgTimezone,
      };
      const shortDateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: orgTimezone,
      };

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: `✅ Registered for ${className}`,
          text: `You're Registered!

Hi ${clientName},

You've successfully registered for ${className} at ${startTime.toLocaleTimeString("en-US", timeOptions)} on ${startTime.toLocaleDateString("en-US", shortDateOptions)} through ${orgName}.

CLASS DETAILS
Class: ${className}
${classDescription ? classDescription + "\n" : ""}
Date: ${startTime.toLocaleDateString("en-US", dateOptions)}
Time: ${startTime.toLocaleTimeString("en-US", timeOptions)} - ${endTime.toLocaleTimeString("en-US", timeOptions)}
Location: ${location}
Instructor: ${instructor}

We're looking forward to seeing you there!

Best,
The ${orgName} Team`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #35b3af;">You're Registered!</h2>
            <p>Hi ${clientName},</p>
            <p>You've successfully registered for <strong>${className}</strong> at <strong>${startTime.toLocaleTimeString("en-US", timeOptions)}</strong> on <strong>${startTime.toLocaleDateString("en-US", shortDateOptions)}</strong> through <strong>${orgName}</strong>.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Class Details</h3>
              <p><strong>Class:</strong> ${className}</p>
              ${classDescription ? `<p>${classDescription}</p>` : ""}
              <p><strong>Date:</strong> ${startTime.toLocaleDateString("en-US", dateOptions)}</p>
              <p><strong>Time:</strong> ${startTime.toLocaleTimeString("en-US", timeOptions)} - ${endTime.toLocaleTimeString("en-US", timeOptions)}</p>
              <p><strong>Location:</strong> ${location}</p>
              <p><strong>Instructor:</strong> ${instructor}</p>
            </div>
            
            <p style="text-align: center; margin: 32px 0;">
              <span style="background: linear-gradient(135deg, #3258A3 0%, #2A4A8C 100%); color: white; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 18px;">Powered by ${orgName}</span>
            </p>
            
            <p>We're looking forward to seeing you there!</p>
            
            <p>Best,<br>The ${orgName} Team</p>
            
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee;">Registration made through ${orgName}</p>
          </div>
        `,
        },
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
    const {orgId} = event.params;

    // Only send if billing info exists (not all orgs are created with billing immediately)
    if (!org.billing?.stripeCustomerId) {
      return;
    }

    try {
      // Check if subscription receipt emails are enabled
      const emailEnabled = await isEmailEnabled(orgId, "subscriptionReceipt");
      if (!emailEnabled) {
        console.log(`Subscription receipt emails disabled for org ${orgId}, skipping email`);
        return;
      }
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
        message: {
          subject,
          text: `${isTrial ? "Welcome to Your Free Trial!" : "Subscription Confirmed!"}

Hi ${ownerName},

${isTrial ?
    "Your free trial has started! You now have full access to all Skedence features." :
    "Thank you for subscribing to Skedence. Your payment has been processed successfully."
}

SUBSCRIPTION DETAILS
Organization: ${orgName}
Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)}
Status: ${isTrial ? "Free Trial" : "Active"}
${isTrial ? "Trial Period: 14 days" : ""}

${isTrial ? "💡 REMINDER: Your trial will automatically convert to a paid subscription after 14 days. You can cancel anytime before then.\n\n" : ""}
WHAT'S NEXT?
- Set up your schedule and availability
- Invite trainers to your organization
- Add your service locations
- Create lesson packages for clients

Need help getting started? Reply to this email and we'll be happy to assist!

Best,
The Skedence Team`,
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
        },
      });

      console.log(`✅ Subscription confirmation sent to ${ownerEmail}`);
    } catch (error) {
      console.error("Error sending subscription confirmation:", error);
    }
  }
);

/**
 * Send cancellation confirmation email to client
 * @param {string} bookingId - The ID of the cancelled booking
 * @param {object} bookingData - The booking data including client, trainer, and time info
 */
export async function sendCancellationConfirmation(
  bookingId: string,
  bookingData: {
    clientUID: string;
    trainerId: string;
    startTime: FirebaseFirestore.Timestamp;
    endTime?: FirebaseFirestore.Timestamp;
    orgId: string;
    location?: string;
    notes?: string;
  }
) {
  try {
    // Check if cancellation emails are enabled
    const emailEnabled = await isEmailEnabled(bookingData.orgId, "cancellationConfirmation");
    if (!emailEnabled) {
      console.log(`Cancellation email disabled for org ${bookingData.orgId}`);
      return;
    }

    // Fetch client, trainer, and org info
    const [clientDoc, trainerDoc, orgDoc] = await Promise.all([
      admin.firestore().collection("users").doc(bookingData.clientUID).get(),
      admin.firestore().collection("trainers").doc(bookingData.trainerId).get(),
      admin.firestore().collection("organizations").doc(bookingData.orgId).get(),
    ]);

    const clientData = clientDoc.data();
    if (!clientData || !clientData.email) {
      console.error("Client email not found");
      return;
    }

    const trainerData = trainerDoc.data();
    const orgData = orgDoc.data();
    
    const clientName = `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "there";
    const trainerName = trainerData?.name || `${trainerData?.firstName || ""} ${trainerData?.lastName || ""}`.trim() || "Your trainer";
    const trainerEmail = trainerData?.email || trainerData?.emailAddress || "";
    const orgName = orgData?.name || "Skedence";
    const orgEmail = orgData?.email || "support@skedence.com";
    const location = bookingData.location || "";

    // Get timezone from org settings
    const orgTimezone = orgData?.settings?.timezone || "America/New_York";

    // Format dates with org's timezone
    const startDate = bookingData.startTime.toDate();
    const endDate = bookingData.endTime?.toDate() || new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formattedDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: orgTimezone,
    });
    const formattedTime = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: orgTimezone,
    });
    
    // Calculate duration
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    // Generate email from template
    const emailContent = await generateEmail(bookingData.orgId, "cancellationConfirmation", {
      clientName,
      trainerName,
      date: formattedDate,
      time: formattedTime,
      duration: durationMinutes,
      location,
      trainerEmail,
      orgName,
    });

    // Send email
    await admin.firestore().collection("mail").add({
      to: clientData.email,
      from: `${orgName} <no-reply@skedence.com>`,
      replyTo: orgEmail,
      message: {
        subject: emailContent.subject,
        html: emailContent.body,
      },
    });

    console.log(`✅ Cancellation confirmation sent to ${clientData.email} for booking ${bookingId}`);
  } catch (error) {
    console.error("Error sending cancellation confirmation:", error);
  }
}

/**
 * Send subscription cancellation email to organization owner
 * @param {string} orgId - The organization ID
 */
export async function sendSubscriptionCancellationEmail(orgId: string) {
  try {
    // Check if subscription cancellation emails are enabled
    const emailEnabled = await isEmailEnabled(orgId, "subscriptionCancellation");
    if (!emailEnabled) {
      console.log(`Subscription cancellation email disabled for org ${orgId}`);
      return;
    }

    // Fetch organization info
    const orgDoc = await admin.firestore().collection("organizations").doc(orgId).get();
    const orgData = orgDoc.data();
    if (!orgData) {
      console.error("Organization not found");
      return;
    }

    // Get owner email
    const ownerIds = orgData.adminIds || [];
    if (ownerIds.length === 0) {
      console.error("No admin/owner found for organization");
      return;
    }

    const ownerDoc = await admin.firestore().collection("users").doc(ownerIds[0]).get();
    const ownerData = ownerDoc.data();
    if (!ownerData || !ownerData.email) {
      console.error("Owner email not found");
      return;
    }

    const planName = orgData.billing?.plan || "subscription";
    const planDisplay = planName.charAt(0).toUpperCase() + planName.slice(1);

    // Send email
    await admin.firestore().collection("mail").add({
      to: ownerData.email,
      from: "Skedence <no-reply@skedence.com>",
      replyTo: "matt.sprague@skedence.com",
      message: {
        subject: `Subscription Cancelled - ${orgData.name}`,
        text: `Hi ${ownerData.firstName || "there"},\n\nYour ${planDisplay} subscription for ${orgData.name} has been cancelled.\n\nYour account will remain active until the end of your current billing period. After that, you'll still be able to access your data, but won't be able to book new appointments or use premium features.\n\nIf you cancelled by mistake or would like to reactivate your subscription, you can do so anytime from your account settings.\n\nWe're sorry to see you go! If there's anything we could have done better, please let us know by replying to this email.\n\nBest,\nThe Skedence Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subscription Cancelled</h2>
            
            <p>Hi ${ownerData.firstName || "there"},</p>
            
            <p>Your <strong>${planDisplay}</strong> subscription for <strong>${orgData.name}</strong> has been cancelled.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>What happens next?</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Your account will remain active until the end of your current billing period</li>
                <li>After that, you'll still be able to access your data</li>
                <li>You won't be able to book new appointments or use premium features</li>
              </ul>
            </div>
            
            <p>If you cancelled by mistake or would like to reactivate your subscription, you can do so anytime from your account settings.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p>We're sorry to see you go! If there's anything we could have done better, please let us know by replying to this email.</p>
            
            <p>Best,<br>The Skedence Team</p>
          </div>
        `,
      },
    });

    console.log(`✅ Subscription cancellation email sent to ${ownerData.email} for org ${orgId}`);
  } catch (error) {
    console.error("Error sending subscription cancellation email:", error);
  }
}

/**
 * Send reschedule confirmation email to client
 * @param {string} bookingId - The ID of the rescheduled booking
 * @param {object} oldBookingData - The original booking time info
 * @param {object} newBookingData - The new booking data including client, trainer, and time info
 */
export async function sendRescheduleConfirmation(
  bookingId: string,
  oldBookingData: {
    startTime: FirebaseFirestore.Timestamp;
    endTime?: FirebaseFirestore.Timestamp;
  },
  newBookingData: {
    clientUID: string;
    trainerId: string;
    startTime: FirebaseFirestore.Timestamp;
    endTime?: FirebaseFirestore.Timestamp;
    orgId: string;
    location?: string;
    notes?: string;
  }
) {
  try {
    // Check if reschedule emails are enabled
    const emailEnabled = await isEmailEnabled(newBookingData.orgId, "rescheduleConfirmation");
    if (!emailEnabled) {
      console.log(`Reschedule email disabled for org ${newBookingData.orgId}`);
      return;
    }

    // Fetch client, trainer, and org info
    const [clientDoc, trainerDoc, orgDoc] = await Promise.all([
      admin.firestore().collection("users").doc(newBookingData.clientUID).get(),
      admin.firestore().collection("trainers").doc(newBookingData.trainerId).get(),
      admin.firestore().collection("organizations").doc(newBookingData.orgId).get(),
    ]);

    const clientData = clientDoc.data();
    if (!clientData || !clientData.email) {
      console.error("Client email not found");
      return;
    }

    const trainerData = trainerDoc.data();
    const orgData = orgDoc.data();
    
    const clientName = `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "there";
    const trainerName = trainerData?.name || `${trainerData?.firstName || ""} ${trainerData?.lastName || ""}`.trim() || "Your trainer";
    const trainerEmail = trainerData?.email || trainerData?.emailAddress || "";
    const orgName = orgData?.name || "Skedence";
    const orgEmail = orgData?.email || "support@skedence.com";
    const location = newBookingData.location || "";

    // Get timezone from org settings
    const orgTimezone = orgData?.settings?.timezone || "America/New_York";

    // Format new dates with org's timezone
    const newStartDate = newBookingData.startTime.toDate();
    const newEndDate = newBookingData.endTime?.toDate() || new Date(newStartDate.getTime() + 60 * 60 * 1000);
    
    const newFormattedDate = newStartDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: orgTimezone,
    });
    const newFormattedTime = newStartDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: orgTimezone,
    });
    
    // Calculate duration
    const durationMinutes = Math.round((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60));

    // Generate email from template
    const emailContent = await generateEmail(newBookingData.orgId, "rescheduleConfirmation", {
      clientName,
      trainerName,
      date: newFormattedDate,
      time: newFormattedTime,
      duration: durationMinutes,
      location,
      trainerEmail,
      orgName,
    });

    // Send email
    await admin.firestore().collection("mail").add({
      to: clientData.email,
      from: `${orgName} <no-reply@skedence.com>`,
      replyTo: orgEmail,
      message: {
        subject: emailContent.subject,
        html: emailContent.body,
      },
    });

    console.log(`✅ Reschedule confirmation sent to ${clientData.email} for booking ${bookingId}`);
  } catch (error) {
    console.error("Error sending reschedule confirmation:", error);
  }
}

/**
 * Log activity when a new client registers
 */
export const logClientRegistration = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const userData = snap.data();
    const {userId} = event.params;

    try {
      // Only log for clients (not trainers or admins)
      const role = userData.role || "client";
      if (role !== "client") {
        console.log(`Skipping activity log for non-client user: ${userId} (role: ${role})`);
        return;
      }

      // Get organization ID
      let orgId = userData.orgId;
      
      // If orgId not in user doc, try to get from orgMembers
      if (!orgId) {
        // Try different patterns for orgMembers document ID
        const orgMemberPatterns = [
          `${userId}_${userData.organizationId}`, // New pattern: userId_orgId
          userId, // Legacy pattern: just userId
        ];

        for (const pattern of orgMemberPatterns) {
          const orgMemberDoc = await admin.firestore().collection("orgMembers").doc(pattern).get();
          if (orgMemberDoc.exists) {
            orgId = orgMemberDoc.data()?.orgId;
            if (orgId) break;
          }
        }

        // Final fallback: query by authUserId
        if (!orgId) {
          const orgMembersQuery = await admin.firestore()
            .collection("orgMembers")
            .where("authUserId", "==", userId)
            .limit(1)
            .get();
          
          if (!orgMembersQuery.empty) {
            orgId = orgMembersQuery.docs[0].data()?.orgId;
          }
        }
      }

      if (!orgId) {
        console.log(`No orgId found for user ${userId}, skipping activity log`);
        return;
      }

      const clientName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "New Client";
      const clientEmail = userData.emailAddress || userData.email || "";

      // Log activity for client registration
      await logActivity({
        type: "client_registered",
        actorId: userId,
        actorName: clientName,
        actorRole: "client",
        targetId: userId,
        targetName: clientName,
        targetType: "client",
        description: `${clientName} registered as a new client`,
        metadata: {
          email: clientEmail,
          phone: userData.phoneNumber || userData.phone || "",
        },
        orgId: orgId,
      });

      console.log(`✅ Client registration logged for ${clientName} (${userId})`);
    } catch (error) {
      console.error("Error logging client registration:", error);
    }
  }
);
