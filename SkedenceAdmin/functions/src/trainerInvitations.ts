/* eslint-disable quotes */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Cloud Function that triggers when a new trainer document is created.
 * If the trainer has needsPasswordSetup: true, sends them an invitation email
 * with instructions to download the app and register.
 *
 * NOTE: Trainers are stored in the trainers collection, NOT users collection.
 * Users collection is for clients only.
 */
export const sendTrainerInvitation = onDocumentCreated(
  "trainers/{trainerId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return;
    }

    const trainerData = snap.data();
    const trainerId = event.params.trainerId;

    console.log(`Processing trainer ${trainerId}, needsPasswordSetup: ${trainerData.needsPasswordSetup}`);
    console.log(`Trainer data fields:`, Object.keys(trainerData));

    // Only send invitation if this is a new trainer account that needs setup
    if (!trainerData.needsPasswordSetup) {
      console.log(`Trainer ${trainerId} doesn't need password setup, skipping invitation`);
      return;
    }

    try {
      // Get email address
      const emailAddress = trainerData.emailAddress || trainerData.email;
      if (!emailAddress) {
        console.error(`No email address found for trainer ${trainerId}. Available fields:`, Object.keys(trainerData));
        return;
      }

      // Construct full name from firstName and lastName
      const firstName = trainerData.firstName || "";
      const lastName = trainerData.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim() || "there";

      // Fetch organization details
      const orgDoc = await admin.firestore()
        .collection("organizations")
        .doc(trainerData.orgId)
        .get();

      const orgData = orgDoc.data();
      if (!orgData) {
        console.error(`Organization ${trainerData.orgId} not found for trainer ${trainerId}`);
        return;
      }

      // Get the trainer's role from orgMembers
      const membershipId = `${trainerId}_${trainerData.orgId}`;
      const orgMemberDoc = await admin.firestore()
        .collection("orgMembers")
        .doc(membershipId)
        .get();

      const memberData = orgMemberDoc.data();
      const role = memberData?.role || "trainer";

      // Fetch owner information
      let ownerName = "your team";
      try {
        const ownersSnapshot = await admin.firestore()
          .collection("orgMembers")
          .where("orgId", "==", trainerData.orgId)
          .where("role", "==", "owner")
          .limit(1)
          .get();

        if (!ownersSnapshot.empty) {
          const ownerMembership = ownersSnapshot.docs[0].data();
          const ownerUserId = ownerMembership.userId;

          // Owner is a trainer, so look in trainers collection
          const ownerDoc = await admin.firestore()
            .collection("trainers")
            .doc(ownerUserId)
            .get();

          if (ownerDoc.exists) {
            const ownerData = ownerDoc.data();
            const ownerFirst = ownerData?.firstName || "";
            const ownerLast = ownerData?.lastName || "";
            ownerName = `${ownerFirst} ${ownerLast}`.trim() || "your team";
          }
        }
      } catch (error) {
        console.log("Could not fetch owner info, using default:", error);
      }

      // Prepare email content
      const emailData = {
        to: emailAddress,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        template: {
          name: "trainer-invitation",
          data: {
            trainerName: fullName,
            orgName: orgData.name || "the organization",
            role: role.charAt(0).toUpperCase() + role.slice(1),
            email: emailAddress,
            appStoreLink: "https://apps.apple.com/app/skedence-admin", // TODO: Update with actual App Store link
            playStoreLink: "https://play.google.com/store/apps/details?id=com.skedence.admin", // TODO: Update with actual Play Store link
          },
        },
        subject: `You have been invited to ${orgData.name || "Skedence"} by ${ownerName}!`,
        text: generateInvitationText(
          fullName,
          orgData.name || "the organization",
          role,
          emailAddress,
          ownerName
        ),
        html: generateInvitationHTML(
          fullName,
          orgData.name || "the organization",
          role,
          emailAddress,
          ownerName
        ),
      };

      // Add to mail collection for Firebase email extension
      await admin.firestore().collection("mail").add({
        ...emailData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Invitation email queued for ${emailAddress} (${fullName}) to join ${orgData.name}`);

      return;
    } catch (error) {
      console.error(`❌ Error sending invitation for trainer ${trainerId}:`, error);
      return;
    }
  });

/**
 * Generate plain text email template for trainer invitation
 * @param {string} trainerName - The name of the trainer being invited
 * @param {string} orgName - The name of the organization
 * @param {string} role - The role assigned to the trainer
 * @param {string} email - The email address for the trainer to use
 * @param {string} ownerName - The name of the person who invited them
 * @return {string} Plain text email content
 */
function generateInvitationText(
  trainerName: string,
  orgName: string,
  role: string,
  email: string,
  ownerName: string
): string {
  return `
Welcome to ${orgName}!

Hi ${trainerName},

Great news! ${ownerName} has invited you to join ${orgName} as a ${role.toLowerCase()}. You're now part of the team!

YOUR LOGIN EMAIL
${email}

Make sure to use this exact email address when registering.

GETTING STARTED

1. Download the SkedenceAdmin App
   Download the app from the App Store or Play Store.

2. Create Your Account
   Open the app and tap "Create Business" or "Sign Up".
   Use the email: ${email}

3. Set Your Password
   Choose a secure password for your account. You'll use this to log in.

4. You're All Set!
   Your account will automatically be linked to ${orgName} and you'll have ${role.toLowerCase()} access.

DOWNLOAD THE APP
App Store: https://apps.apple.com/app/skedence-admin
Play Store: https://play.google.com/store/apps/details?id=com.skedence.admin

IMPORTANT: Make sure to use the email ${email} when registering. This is how the app will link your account to ${orgName}.

If you have any questions or need help getting started, feel free to reach out to your organization admin.

Welcome aboard!
The Skedence Team

---
This invitation was sent because you were added to ${orgName}.
Visit us at: https://skedence.app
  `.trim();
}

/**
 * Generate HTML email template for trainer invitation
 * @param {string} trainerName - The name of the trainer being invited
 * @param {string} orgName - The name of the organization
 * @param {string} role - The role assigned to the trainer
 * @param {string} email - The email address for the trainer to use
 * @param {string} ownerName - The name of the person who invited them
 * @return {string} HTML email content
 */
function generateInvitationHTML(
  trainerName: string,
  orgName: string,
  role: string,
  email: string,
  ownerName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .highlight-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .highlight-box strong {
      color: #667eea;
      display: block;
      margin-bottom: 8px;
    }
    .step {
      background: #f0f7ff;
      padding: 15px;
      margin: 15px 0;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .step-number {
      display: inline-block;
      background: #667eea;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-weight: bold;
      margin-right: 10px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 8px 8px;
      color: #666;
      font-size: 14px;
    }
    .email-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: monospace;
      font-weight: bold;
      display: inline-block;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Welcome to ${orgName}!</h1>
  </div>
  
  <div class="content">
    <p>Hi ${trainerName},</p>

    <p>Great news! <strong>${ownerName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role.toLowerCase()}</strong>. You're now part of the team!</p>

    <div class="highlight-box">
      <strong>Your Login Email:</strong>
      <div class="email-badge">${email}</div>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
        Make sure to use this exact email address when registering.
      </p>
    </div>
    
    <h2 style="color: #667eea; margin-top: 30px;">🚀 Getting Started</h2>
    
    <div class="step">
      <span class="step-number">1</span>
      <strong>Download the SkedenceAdmin App</strong>
      <p style="margin: 8px 0 0 28px;">
        Download the app from the App Store or Play Store.
      </p>
    </div>
    
    <div class="step">
      <span class="step-number">2</span>
      <strong>Create Your Account</strong>
      <p style="margin: 8px 0 0 28px;">
        Open the app and tap "Create Business" or "Sign Up". Use the email: <code>${email}</code>
      </p>
    </div>
    
    <div class="step">
      <span class="step-number">3</span>
      <strong>Set Your Password</strong>
      <p style="margin: 8px 0 0 28px;">
        Choose a secure password for your account. You'll use this to log in.
      </p>
    </div>
    
    <div class="step">
      <span class="step-number">4</span>
      <strong>You're All Set!</strong>
      <p style="margin: 8px 0 0 28px;">
        Your account will automatically be linked to ${orgName} and you'll have ${role} access.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <p style="margin-bottom: 15px; font-size: 16px; font-weight: 600;">Download the App:</p>
      <a href="https://apps.apple.com/app/skedence-admin" class="button" style="margin-right: 10px;">
        📱 App Store
      </a>
      <a href="https://play.google.com/store/apps/details?id=com.skedence.admin" class="button">
        🤖 Play Store
      </a>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 25px 0;">
      <strong style="color: #856404;">⚠️ Important:</strong>
      <p style="margin: 8px 0 0 0; color: #856404;">
        Make sure to use the email <strong>${email}</strong> when registering. This is how the app will link your account to ${orgName}.
      </p>
    </div>
    
    <p style="margin-top: 30px;">If you have any questions or need help getting started, feel free to reach out to your organization admin.</p>
    
    <p style="margin-top: 25px;">
      Welcome aboard! 🎊<br>
      <strong>The Skedence Team</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>This invitation was sent because you were added to ${orgName}.</p>
    <p style="margin-top: 10px;">
      <a href="https://skedence.app" style="color: #667eea; text-decoration: none;">skedence.app</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Cloud Function that triggers when a new organization is created.
 * Sends a welcome email to the organization owner.
 */
export const sendOwnerWelcomeEmail = onDocumentCreated(
  "organizations/{orgId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return;
    }

    const orgData = snap.data();
    const orgId = event.params.orgId;
    const ownerUserId = orgData.ownerUserId;

    if (!ownerUserId) {
      console.log(`No ownerUserId found for organization ${orgId}`);
      return;
    }

    console.log(`Sending welcome email to owner ${ownerUserId} for org ${orgId}`);

    try {
      // Get owner's user document
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(ownerUserId)
        .get();

      if (!userDoc.exists) {
        console.error(`User ${ownerUserId} not found`);
        return;
      }

      const userData = userDoc.data();
      const emailAddress = userData?.emailAddress || userData?.email;

      if (!emailAddress) {
        console.error(`No email address found for owner ${ownerUserId}`);
        return;
      }

      const firstName = userData?.firstName || "";
      const fullName = `${firstName}`.trim() || "there";
      const orgName = orgData.name || "your organization";

      // Send welcome email via SendGrid extension
      await admin.firestore().collection("mail").add({
        to: emailAddress,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        subject: `Welcome to Skedence! 🎉`,
        text: generateOwnerWelcomeEmailText(fullName, orgName),
        html: generateOwnerWelcomeEmail(fullName, orgName),
      });

      console.log(`✅ Welcome email queued for ${emailAddress}`);
    } catch (error) {
      console.error(`Error sending welcome email for org ${orgId}:`, error);
    }
  }
);

function generateOwnerWelcomeEmailText(name: string, orgName: string): string {
  return `
Welcome to Skedence! 🎉

Hi ${name},

Congratulations on setting up ${orgName}! You've taken the first step toward streamlining your training business.

WHAT'S NEXT?

1. Invite Your Trainers
Head to the Team section to add trainers to your organization. They'll receive an email invitation to download the app.

2. Set Up Your Schedule
Create availability blocks so clients can book sessions with you and your trainers.

3. Create Packages & Classes
Set up lesson packages for clients to purchase and create group classes.

4. Share Your Invite Code
Give your unique organization invite code to clients so they can join and start booking.

PRO TIPS
- Test the client experience: Have a friend use your invite code to see what clients see
- Set up Stripe Connect: Enable payments to start accepting bookings and collecting revenue
- Customize your branding: Add your logo and brand colors in organization settings

If you have questions or need help, reply to this email or reach out at matt.sprague@skedence.com

We're excited to see your business grow! 💪
The Skedence Team

---
You're receiving this because you created an account with Skedence.
Visit us at: https://skedence.app
  `.trim();
}

function generateOwnerWelcomeEmail(name: string, orgName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .feature-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 6px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    h1 { margin: 0; font-size: 32px; font-weight: 700; }
    h2 { color: #667eea; font-size: 20px; margin-top: 30px; }
    ul { padding-left: 20px; }
    li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Skedence! 🎉</h1>
    <p style="margin-top: 15px; font-size: 18px; opacity: 0.95;">Your training business management platform is ready</p>
  </div>
  
  <div class="content">
    <p style="font-size: 18px;">Hi ${name},</p>
    
    <p><strong>Congratulations on setting up ${orgName}!</strong> You've taken the first step toward streamlining your training business.</p>
    
    <h2>🚀 What's Next?</h2>
    
    <div class="feature-box">
      <strong>1. Invite Your Trainers</strong>
      <p style="margin: 8px 0 0 0;">Head to the Team section to add trainers to your organization. They'll receive an email invitation to download the app.</p>
    </div>
    
    <div class="feature-box">
      <strong>2. Set Up Your Schedule</strong>
      <p style="margin: 8px 0 0 0;">Create availability blocks so clients can book sessions with you and your trainers.</p>
    </div>
    
    <div class="feature-box">
      <strong>3. Create Packages & Classes</strong>
      <p style="margin: 8px 0 0 0;">Set up lesson packages for clients to purchase and create group classes.</p>
    </div>
    
    <div class="feature-box">
      <strong>4. Share Your Invite Code</strong>
      <p style="margin: 8px 0 0 0;">Give your unique organization invite code to clients so they can join and start booking.</p>
    </div>
    
    <h2>💡 Pro Tips</h2>
    <ul>
      <li><strong>Test the client experience:</strong> Have a friend use your invite code to see what clients see</li>
      <li><strong>Set up Stripe Connect:</strong> Enable payments to start accepting bookings and collecting revenue</li>
      <li><strong>Customize your branding:</strong> Add your logo and brand colors in organization settings</li>
    </ul>
    
    <p style="margin-top: 30px;">If you have questions or need help, reply to this email or reach out at <a href="mailto:matt.sprague@skedence.com" style="color: #667eea;">matt.sprague@skedence.com</a></p>
    
    <p style="margin-top: 25px;">
      We're excited to see your business grow! 💪<br>
      <strong>The Skedence Team</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>You're receiving this because you created an account with Skedence.</p>
    <p style="margin-top: 10px;">
      <a href="https://skedence.app" style="color: #667eea; text-decoration: none;">skedence.app</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

