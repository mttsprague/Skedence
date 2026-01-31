/* eslint-disable quotes */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

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

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: `✅ Purchase Confirmed - ${packageName}`,
          text: `Thank You for Your Purchase!

Hi ${clientName},

Thank you for your purchase! ${amount > 0 ? `$${amount.toFixed(2)} has been charged to your card` : "Your payment has been processed"} for the purchase of ${packageName}.

PURCHASE DETAILS
Package: ${packageName}
${amount > 0 ? `Amount Charged: $${amount.toFixed(2)}` : ""}
Lessons: ${packageData.totalLessons || 0}
Purchase Date: ${packageData.purchaseDate?.toDate().toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}) || "Today"}

This purchase was made through ${orgName}.

You can now use your lessons to book sessions with trainers or register for classes.

Best,
The ${orgName} Team`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      padding: 40px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
    }
    .content {
      padding: 40px 32px;
      color: #1a1a1a;
      line-height: 1.7;
    }
    .details-box {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border: 2px solid #33B2AE;
      border-radius: 12px;
      padding: 28px;
      margin: 28px 0;
    }
    .details-box h3 {
      margin: 0 0 20px 0;
      color: #33B2AE;
      font-size: 20px;
      font-weight: 700;
    }
    .detail-row {
      display: flex;
      align-items: center;
      margin: 12px 0;
      font-size: 16px;
    }
    .detail-icon {
      width: 36px;
      height: 36px;
      background: #33B2AE;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 18px;
    }
    .detail-text {
      flex: 1;
    }
    .detail-text strong {
      display: block;
      color: #666;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .org-badge {
      background: linear-gradient(135deg, #3258A3 0%, #2A4A8C 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
      margin: 20px 0;
      font-size: 18px;
    }
    .footer {
      padding: 24px 32px;
      background: #f8f9fa;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>✅ Purchase Confirmed!</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px; margin-bottom: 8px;">Hi ${clientName},</p>
      <p>Thank you for your purchase! ${amount > 0 ? `<strong>$${amount.toFixed(2)}</strong> has been charged to your card` : "Your payment has been processed"} for the purchase of <strong>${packageName}</strong>.</p>
      
      <div class="details-box">
        <h3>Purchase Details</h3>
        <div class="detail-row">
          <div class="detail-icon">📦</div>
          <div class="detail-text">
            <strong>Package</strong>
            ${packageName}
          </div>
        </div>
        ${amount > 0 ? `
        <div class="detail-row">
          <div class="detail-icon">💳</div>
          <div class="detail-text">
            <strong>Amount Charged</strong>
            $${amount.toFixed(2)}
          </div>
        </div>
        ` : ""}
        <div class="detail-row">
          <div class="detail-icon">🎟️</div>
          <div class="detail-text">
            <strong>Lessons Included</strong>
            ${packageData.totalLessons || 0}
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-icon">📅</div>
          <div class="detail-text">
            <strong>Purchase Date</strong>
            ${packageData.purchaseDate?.toDate().toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}) || "Today"}
          </div>
        </div>
      </div>
      
      <p style="text-align: center; margin: 32px 0;">
        <span class="org-badge">Powered by ${orgName}</span>
      </p>
      
      <p>You can now use your lessons to book sessions with trainers or register for classes.</p>
      
      <p style="margin-top: 32px;">Best,<br>The ${orgName} Team</p>
    </div>
    <div class="footer">
      <p>This purchase was made through ${orgName}</p>
    </div>
  </div>
</body>
</html>
        `,
        },
      });

      console.log(`✅ Purchase confirmation sent to ${clientEmail}`);
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
      const orgName = org?.name || "Skedence";
      const location = booking.location || "Location TBD";

      const startTime = booking.startTime.toDate();
      const endTime = booking.endTime.toDate();

      // Format options with timezone - use America/Los_Angeles for PST/PDT
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
      };
      const shortDateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      };

      await admin.firestore().collection("mail").add({
        to: clientEmail,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: `✅ Lesson Confirmed with ${trainerName}`,
          text: `Your Lesson is Confirmed!

Hi ${clientName},

You've successfully booked a session at ${startTime.toLocaleTimeString("en-US", timeOptions)} on ${startTime.toLocaleDateString("en-US", shortDateOptions)} with ${trainerName} through ${orgName}.

SESSION DETAILS
Trainer: ${trainerName}
Date: ${startTime.toLocaleDateString("en-US", dateOptions)}
Time: ${startTime.toLocaleTimeString("en-US", timeOptions)} - ${endTime.toLocaleTimeString("en-US", timeOptions)}
Location: ${location}

Need to reschedule or cancel? Please contact us at least 24 hours in advance.

See you soon!
The ${orgName} Team`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      padding: 40px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
    }
    .content {
      padding: 40px 32px;
      color: #1a1a1a;
      line-height: 1.7;
    }
    .details-box {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border: 2px solid #33B2AE;
      border-radius: 12px;
      padding: 28px;
      margin: 28px 0;
    }
    .details-box h3 {
      margin: 0 0 20px 0;
      color: #33B2AE;
      font-size: 20px;
      font-weight: 700;
    }
    .detail-row {
      display: flex;
      align-items: center;
      margin: 12px 0;
      font-size: 16px;
    }
    .detail-icon {
      width: 36px;
      height: 36px;
      background: #33B2AE;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 18px;
    }
    .detail-text {
      flex: 1;
    }
    .detail-text strong {
      display: block;
      color: #666;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-box {
      background: #FFF8E1;
      border: 2px solid #FFD54F;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      font-size: 15px;
      color: #5D4037;
    }
    .org-badge {
      background: linear-gradient(135deg, #3258A3 0%, #2A4A8C 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
      margin: 20px 0;
      font-size: 18px;
    }
    .footer {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      padding: 28px 32px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>✅ Lesson Confirmed!</h1>
    </div>
    
    <div class="content">
      <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Hi ${clientName},</p>
      <p style="font-size: 16px; margin-bottom: 28px;">You've successfully booked a session at <strong>${startTime.toLocaleTimeString("en-US", timeOptions)}</strong> on <strong>${startTime.toLocaleDateString("en-US", shortDateOptions)}</strong> with <strong>${trainerName}</strong> through <strong>${orgName}</strong>.</p>
      
      <div class="details-box">
        <h3>📋 Session Details</h3>
        
        <div class="detail-row">
          <div class="detail-icon">👤</div>
          <div class="detail-text">
            <strong>Trainer</strong>
            ${trainerName}
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-icon">📅</div>
          <div class="detail-text">
            <strong>Date</strong>
            ${startTime.toLocaleDateString("en-US", dateOptions)}
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-icon">🕐</div>
          <div class="detail-text">
            <strong>Time</strong>
            ${startTime.toLocaleTimeString("en-US", timeOptions)} - ${endTime.toLocaleTimeString("en-US", timeOptions)}
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-icon">📍</div>
          <div class="detail-text">
            <strong>Location</strong>
            ${location}
          </div>
        </div>
      </div>
      
      <div class="info-box">
        <strong>⏰ Cancellation Policy</strong><br>
        Need to reschedule or cancel? Please contact us at least 24 hours in advance.
      </div>
      
      <p style="text-align: center; margin: 32px 0;">
        <span class="org-badge">Powered by ${orgName}</span>
      </p>
      
      <p style="margin-top: 32px; font-size: 16px;">
        See you soon! 👋<br>
        <strong>The ${orgName} Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>Booking made through ${orgName}</p>
    </div>
  </div>
</body>
</html>
        `,
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

      const startTime = classData?.startTime.toDate();
      const endTime = classData?.endTime.toDate();

      // Format options with timezone - use America/Los_Angeles for PST/PDT
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
      };
      const shortDateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "America/Los_Angeles",
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
