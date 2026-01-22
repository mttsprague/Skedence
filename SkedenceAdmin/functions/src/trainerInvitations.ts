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

      // Get setup token from trainer document
      const setupToken = trainerData.setupToken;
      if (!setupToken) {
        console.error(`No setup token found for trainer ${trainerId}`);
        return;
      }

      // Generate web link for password setup (using admin portal website)
      const setupLink = `https://polyface-ae6d3.web.app/setup-password?token=${setupToken}&email=${encodeURIComponent(emailAddress)}&trainerId=${trainerId}`;
      console.log(`Generated setup link: ${setupLink}`);

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
        message: {
          subject: `You have been invited to ${orgData.name || "Skedence"} by ${ownerName}!`,
          text: generateInvitationText(
            fullName,
            orgData.name || "the organization",
            role,
            emailAddress,
            ownerName,
            setupLink
          ),
          html: generateInvitationHTML(
            fullName,
            orgData.name || "the organization",
            role,
            emailAddress,
            ownerName,
            setupLink
          ),
        },
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
 * @param {string} setupLink - Deep link for password setup
 * @return {string} Plain text email content
 */
function generateInvitationText(
  trainerName: string,
  orgName: string,
  role: string,
  email: string,
  ownerName: string,
  setupLink: string
): string {
  return `
Welcome to ${orgName}!

Hi ${trainerName},

Great news! ${ownerName} has invited you to join ${orgName} as a ${role.toLowerCase()}. You're now part of the team!

YOUR LOGIN EMAIL
${email}

GETTING STARTED

Step 1: Set Up Your Password
Click this link to create your password (works on any device):
${setupLink}

This secure link expires in 7 days.

Step 2: Download the SkedenceAdmin App
After setting your password, download the app:
- iOS: https://apps.apple.com/app/skedence-admin
- Android: https://play.google.com/store/apps/details?id=com.skedence.admin

Step 3: Sign In
Open the app and sign in with:
- Email: ${email}
- Password: (the one you just created)

That's it! You'll have full ${role.toLowerCase()} access to ${orgName}.

IMPORTANT: 
- Complete Step 1 first (set your password on the website)
- Then download the app and sign in
- If the link expires, contact your administrator to resend

Questions? Reach out to your organization admin for help.

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
 * @param {string} setupLink - Deep link for password setup
 * @return {string} HTML email content
 */
function generateInvitationHTML(
  trainerName: string,
  orgName: string,
  role: string,
  email: string,
  ownerName: string,
  setupLink: string
): string {
  return `
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      padding: 48px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 12px 0;
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      color: rgba(255, 255, 255, 0.95);
    }
    .content {
      padding: 40px 32px;
      color: #1a1a1a;
      line-height: 1.7;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 16px;
    }
    .email-badge {
      background: linear-gradient(135deg, #E8F5F4 0%, #D4EEEC 100%);
      border: 2px solid #33B2AE;
      color: #1a1a1a;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 18px;
      font-weight: 600;
      display: inline-block;
      margin: 20px 0;
      letter-spacing: 0.5px;
    }
    .info-box {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border-left: 4px solid #33B2AE;
      padding: 24px;
      margin: 28px 0;
      border-radius: 12px;
    }
    .info-box strong {
      color: #33B2AE;
      display: block;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .step-container {
      margin: 32px 0;
    }
    .step {
      background: #ffffff;
      border: 2px solid #E8F5F4;
      padding: 20px 24px;
      margin: 16px 0;
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      transition: all 0.3s ease;
    }
    .step:hover {
      border-color: #33B2AE;
      box-shadow: 0 4px 12px rgba(51, 178, 174, 0.1);
    }
    .step-number {
      flex-shrink: 0;
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      text-align: center;
      line-height: 32px;
      font-weight: 700;
      font-size: 16px;
      margin-right: 16px;
    }
    .step-content {
      flex: 1;
    }
    .step-content strong {
      color: #1a1a1a;
      display: block;
      font-size: 17px;
      margin-bottom: 6px;
    }
    .step-content p {
      margin: 0;
      color: #666;
      font-size: 15px;
      line-height: 1.6;
    }
    .button-container {
      text-align: center;
      margin: 36px 0;
      padding: 28px 0;
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border-radius: 12px;
    }
    .button-container p {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      margin: 8px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(51, 178, 174, 0.2);
    }
    .warning-box {
      background: #FFF8E1;
      border: 2px solid #FFB74D;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 28px 0;
    }
    .warning-box strong {
      color: #F57C00;
      font-size: 15px;
    }
    .warning-box p {
      margin: 8px 0 0 0;
      color: #5D4037;
      font-size: 15px;
      line-height: 1.6;
    }
    .footer {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      padding: 32px;
      text-align: center;
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .footer a {
      color: #33B2AE;
      text-decoration: none;
      font-weight: 600;
    }
    h2 {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 700;
      margin: 32px 0 20px 0;
      letter-spacing: -0.5px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎉 Welcome to ${orgName}!</h1>
      <p>You've been invited to join the team</p>
    </div>
    
    <div class="content">
      <p style="font-size: 18px; font-weight: 600; color: #1a1a1a;">Hi ${trainerName},</p>

      <p>Great news! <strong>${ownerName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>. You're now part of the team!</p>

      <div class="info-box">
        <strong>🔑 Your Login Email</strong>
        <div class="email-badge">${email}</div>
        <p style="margin: 0; font-size: 14px; color: #666;">
          Use this exact email address when creating your account
        </p>
      </div>
      
      <h2>🚀 Getting Started</h2>
      
      <div class="step-container">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <strong>Download SkedenceAdmin</strong>
            <p>Get the app from the App Store or Play Store to manage your schedule and clients.</p>
          </div>
        </div>
        
      <div class="step-container">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <strong>Set Up Your Password</strong>
            <p>Click the button below to create your password on our secure website. Works on any device!</p>
          </div>
        </div>
      </div>
      
      <div class="button-container">
        <p>Create Your Password Now</p>
        <a href="${setupLink}" class="button" style="background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%); font-size: 18px; padding: 18px 36px;">
          🔐 Set Up Password
        </a>
        <p style="margin: 16px 0 0 0; font-size: 13px; color: #666; font-weight: normal;">
          This secure link expires in 7 days
        </p>
      </div>
      
      <div class="step-container">
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <strong>Download SkedenceAdmin</strong>
            <p>After setting your password, download the app from your device's app store.</p>
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <strong>Sign In</strong>
            <p>Open the app and sign in with <strong>${email}</strong> and your new password.</p>
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <strong>You're All Set!</strong>
            <p>Your account will automatically link to ${orgName} with ${role.toLowerCase()} access.</p>
          </div>
        </div>
      </div>
      
      <div class="button-container">
        <p style="font-size: 14px; font-weight: normal; margin-bottom: 12px;">Download the App</p>
        <a href="https://apps.apple.com/app/skedence-admin" class="button">
          📱 App Store
        </a>
        <a href="https://play.google.com/store/apps/details?id=com.skedence.admin" class="button">
          🤖 Play Store
        </a>
      </div>
      
      <div class="warning-box">
        <strong>⚠️ Remember</strong>
        <p>• First: Create your password on the website (Step 1)<br>
        • Then: Download the app and sign in (Steps 2-3)<br>
        • Setup link expires in 7 days</p>
      </div>
      
      <p style="margin-top: 32px; color: #666;">Questions or need help? Reach out to your organization admin or reply to this email.</p>
      
      <p style="margin-top: 28px; padding-top: 28px; border-top: 1px solid #E8F5F4;">
        Welcome aboard! 🎊<br>
        <strong style="color: #1a1a1a;">The Skedence Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>This invitation was sent because you were added to ${orgName}.</p>
      <p style="margin-top: 12px;">
        <a href="https://skedence.app">Visit skedence.app</a>
      </p>
    </div>
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
      // Get owner's trainer document (owners are in trainers collection)
      const trainerDoc = await admin.firestore()
        .collection("trainers")
        .doc(ownerUserId)
        .get();

      if (!trainerDoc.exists) {
        console.error(`Trainer ${ownerUserId} not found`);
        return;
      }

      const trainerData = trainerDoc.data();
      const emailAddress = trainerData?.email || trainerData?.emailAddress;

      if (!emailAddress) {
        console.error(`No email address found for owner ${ownerUserId}`);
        return;
      }

      const firstName = trainerData?.firstName || "";
      const fullName = `${firstName}`.trim() || "there";
      const orgName = orgData.name || "your organization";

      // Send welcome email via SendGrid extension
      await admin.firestore().collection("mail").add({
        to: emailAddress,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: `Welcome to Skedence! 🎉`,
          text: generateOwnerWelcomeEmailText(fullName, orgName),
          html: generateOwnerWelcomeEmail(fullName, orgName),
        },
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
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      padding: 48px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 12px 0;
      font-size: 36px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 18px;
      color: rgba(255, 255, 255, 0.95);
    }
    .content {
      padding: 40px 32px;
      color: #1a1a1a;
      line-height: 1.7;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 16px;
    }
    h2 {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 700;
      margin: 36px 0 24px 0;
      letter-spacing: -0.5px;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin: 24px 0;
    }
    .feature-card {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border: 2px solid #E8F5F4;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s ease;
    }
    .feature-card:hover {
      border-color: #33B2AE;
      box-shadow: 0 4px 12px rgba(51, 178, 174, 0.1);
    }
    .feature-number {
      display: inline-block;
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      text-align: center;
      line-height: 36px;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 12px;
    }
    .feature-card strong {
      display: block;
      color: #1a1a1a;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .feature-card p {
      margin: 0;
      color: #666;
      font-size: 15px;
      line-height: 1.6;
    }
    .tips-box {
      background: linear-gradient(135deg, #FFF8E1 0%, #FFF3CC 100%);
      border: 2px solid #FFD54F;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
    }
    .tips-box h3 {
      margin: 0 0 16px 0;
      color: #F57C00;
      font-size: 18px;
      font-weight: 700;
    }
    .tips-box ul {
      margin: 0;
      padding-left: 20px;
    }
    .tips-box li {
      color: #5D4037;
      margin: 10px 0;
      font-size: 15px;
      line-height: 1.6;
    }
    .tips-box li strong {
      color: #E65100;
    }
    .cta-box {
      text-align: center;
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border-radius: 12px;
      padding: 32px;
      margin: 32px 0;
    }
    .cta-box p {
      margin: 0 0 20px 0;
      font-size: 17px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(51, 178, 174, 0.2);
    }
    .footer {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      padding: 32px;
      text-align: center;
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .footer a {
      color: #33B2AE;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Welcome to Skedence! 🎉</h1>
      <p>Your training business platform is ready</p>
    </div>
    
    <div class="content">
      <p style="font-size: 20px; font-weight: 600; color: #1a1a1a;">Hi ${name},</p>
      
      <p><strong>Congratulations on setting up ${orgName}!</strong> You've taken the first step toward streamlining your training business and delivering an exceptional experience to your clients.</p>
      
      <h2>🚀 What's Next?</h2>
      
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-number">1</div>
          <strong>Invite Your Trainers</strong>
          <p>Head to the Business tab → Trainers section to add your team. They'll receive an email invitation to download the admin app and join your organization.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-number">2</div>
          <strong>Set Up Your Schedule</strong>
          <p>Create availability blocks for yourself and your trainers. This allows clients to see when they can book sessions with you.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-number">3</div>
          <strong>Create Packages & Classes</strong>
          <p>Set up lesson packages for clients to purchase (e.g., 5-pack, 10-pack) and create group classes for multiple participants.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-number">4</div>
          <strong>Share Your Invite Code</strong>
          <p>Give your unique organization invite code to clients so they can download the Skedence app and start booking sessions with you.</p>
        </div>
      </div>
      
      <div class="tips-box">
        <h3>💡 Pro Tips for Success</h3>
        <ul>
          <li><strong>Test the client experience:</strong> Have a friend or family member use your invite code to see what your clients will experience when booking.</li>
          <li><strong>Set up Stripe Connect:</strong> Enable payments through Stripe to start accepting bookings and collecting revenue automatically.</li>
          <li><strong>Customize your branding:</strong> Add your logo and brand colors in organization settings to make the experience feel uniquely yours.</li>
          <li><strong>Start small:</strong> Begin with a few availability blocks and expand as you get comfortable with the platform.</li>
        </ul>
      </div>
      
      <div class="cta-box">
        <p>Need help getting started?</p>
        <a href="mailto:matt.sprague@skedence.com" class="button">Contact Support</a>
      </div>
      
      <p style="margin-top: 32px; padding-top: 32px; border-top: 2px solid #E8F5F4; color: #666;">
        We're excited to see your business grow and help you deliver an amazing experience to your clients. If you have any questions, reply to this email anytime!
      </p>
      
      <p style="margin-top: 28px; font-size: 18px;">
        Welcome aboard! 💪<br>
        <strong style="color: #1a1a1a;">The Skedence Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>You're receiving this because you created <strong>${orgName}</strong> on Skedence.</p>
      <p style="margin-top: 12px;">
        <a href="https://skedence.app">Visit skedence.app</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

