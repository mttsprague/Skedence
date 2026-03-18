/* eslint-disable quotes */
import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Callable Cloud Function to send client invitation emails.
 * Called from the admin portal when an admin wants to invite a client.
 */
export const sendClientInvitation = onCall(
  async (request) => {
    const {email, orgId} = request.data;

    // Validate inputs
    if (!email || !orgId) {
      throw new Error("Missing required fields: email and orgId");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email address");
    }

    try {
      // Fetch organization details
      const orgDoc = await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .get();

      if (!orgDoc.exists) {
        throw new Error(`Organization ${orgId} not found`);
      }

      const orgData = orgDoc.data();
      if (!orgData) {
        throw new Error("Organization data not found");
      }

      const orgName = orgData.name || "Skedence";
      const inviteCode = orgData.inviteCode || orgId.substring(0, 8).toUpperCase();

      // Fetch owner information
      let ownerName = "your coach";
      try {
        const ownersSnapshot = await admin.firestore()
          .collection("orgMembers")
          .where("orgId", "==", orgId)
          .where("role", "==", "owner")
          .limit(1)
          .get();

        if (!ownersSnapshot.empty) {
          const ownerMembership = ownersSnapshot.docs[0].data();
          const ownerUserId = ownerMembership.userId;

          // Owner could be in trainers or users collection
          let ownerDoc = await admin.firestore()
            .collection("trainers")
            .doc(ownerUserId)
            .get();

          if (!ownerDoc.exists) {
            ownerDoc = await admin.firestore()
              .collection("users")
              .doc(ownerUserId)
              .get();
          }

          if (ownerDoc.exists) {
            const ownerData = ownerDoc.data();
            const ownerFirst = ownerData?.firstName || "";
            const ownerLast = ownerData?.lastName || "";
            ownerName = `${ownerFirst} ${ownerLast}`.trim() || "your coach";
          }
        }
      } catch (error) {
        console.log("Could not fetch owner info, using default:", error);
      }

      // Generate deep link for iOS app with pre-filled org code
      // Format: skedence://join?orgCode={inviteCode}&email={email}
      const deepLink = `skedence://join?orgCode=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(email)}`;

      // Prepare email content
      const emailData = {
        to: email,
        from: "Skedence <no-reply@skedence.com>",
        replyTo: "matt.sprague@skedence.com",
        message: {
          subject: `${ownerName} invited you to ${orgName} on Skedence!`,
          text: generateInvitationText(orgName, ownerName, inviteCode, deepLink),
          html: generateInvitationHTML(orgName, ownerName, inviteCode, deepLink),
        },
      };

      // Add to mail collection for Firebase email extension
      await admin.firestore().collection("mail").add({
        ...emailData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Client invitation email queued for ${email} to join ${orgName}`);

      return {
        success: true,
        message: "Invitation sent successfully",
      };
    } catch (error) {
      console.error(`❌ Error sending client invitation:`, error);
      throw new Error(`Failed to send invitation: ${error}`);
    }
  });

/**
 * Generate plain text email template for client invitation
 */
function generateInvitationText(
  orgName: string,
  ownerName: string,
  inviteCode: string,
  deepLink: string
): string {
  return `
You're Invited to ${orgName}!

Hi there,

${ownerName} has invited you to join ${orgName} on Skedence! 

With the Skedence app, you can:
• Book private lessons and classes 24/7
• View your upcoming schedule
• Purchase and manage lesson passes
• Track your progress and history
• Communicate with your coaches

GETTING STARTED (2 EASY STEPS)

Step 1: Download the Skedence App
iOS: https://apps.apple.com/us/app/skedence/id6739061766
Android: Coming soon!

Step 2: Create Your Account
When you sign up, use this organization code to connect to ${orgName}:

${inviteCode}

Or tap this link to open the app with the code pre-filled:
${deepLink}

NEED HELP?
If you have any questions, reach out to ${ownerName} or contact us at support@skedence.com.

We're excited to have you join ${orgName}!

The Skedence Team

---
This invitation was sent because you were invited to ${orgName}.
Visit us at: https://skedence.com
  `.trim();
}

/**
 * Generate HTML email template for client invitation
 */
function generateInvitationHTML(
  orgName: string,
  ownerName: string,
  inviteCode: string,
  deepLink: string
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
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 24px;
    }
    .benefits {
      background: linear-gradient(135deg, #F8FFFE 0%, #F1F9F9 100%);
      border-left: 4px solid #33B2AE;
      padding: 20px 24px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .benefits ul {
      margin: 0;
      padding-left: 20px;
      list-style-type: none;
    }
    .benefits li {
      margin: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    .benefits li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #33B2AE;
      font-weight: bold;
      font-size: 18px;
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
      margin-bottom: 8px;
    }
    .step-content p {
      margin: 0;
      color: #666;
      font-size: 15px;
    }
    .code-box {
      background: linear-gradient(135deg, #E8F5F4 0%, #D4EEEC 100%);
      border: 3px solid #33B2AE;
      padding: 24px;
      margin: 20px 0;
      border-radius: 12px;
      text-align: center;
    }
    .code-box .label {
      color: #666;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .code-box .code {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 4px;
      margin: 12px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #33B2AE 0%, #2A9D99 100%);
      color: #ffffff;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(51, 178, 174, 0.3);
      transition: all 0.3s ease;
    }
    .button:hover {
      box-shadow: 0 6px 20px rgba(51, 178, 174, 0.4);
      transform: translateY(-2px);
    }
    .app-links {
      text-align: center;
      margin: 32px 0;
    }
    .app-links a {
      display: inline-block;
      margin: 8px;
    }
    .app-links img {
      height: 48px;
      width: auto;
    }
    .footer {
      background: #f8f9fa;
      padding: 24px 32px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #33B2AE;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎉 You're Invited!</h1>
      <p>Join ${orgName} on Skedence</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi there,</p>
      
      <p><strong>${ownerName}</strong> has invited you to join <strong>${orgName}</strong> on Skedence!</p>
      
      <div class="benefits">
        <strong style="color: #33B2AE; margin-bottom: 12px; display: block;">With the Skedence app, you can:</strong>
        <ul>
          <li>Book private lessons and classes 24/7</li>
          <li>View your upcoming schedule</li>
          <li>Purchase and manage lesson passes</li>
          <li>Track your progress and history</li>
          <li>Communicate with your coaches</li>
        </ul>
      </div>
      
      <div class="step-container">
        <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Getting Started (2 Easy Steps)</h2>
        
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <strong>Download the Skedence App</strong>
            <p>Available on iOS (Android coming soon!)</p>
            <div class="app-links">
              <a href="https://apps.apple.com/us/app/skedence/id6739061766" target="_blank">
                <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83" alt="Download on the App Store" />
              </a>
            </div>
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <strong>Create Your Account</strong>
            <p>When you sign up, use this organization code:</p>
            <div class="code-box">
              <div class="label">Organization Code</div>
              <div class="code">${inviteCode}</div>
            </div>
            <p style="text-align: center;">Or tap the button below to open the app with the code pre-filled:</p>
            <div style="text-align: center;">
              <a href="${deepLink}" class="button">
                Open Skedence App
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div style="background: #fffbf0; border-left: 4px solid #FFD700; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>💡 Need Help?</strong><br>
          If you have any questions, reach out to ${ownerName} or contact us at <a href="mailto:support@skedence.com" style="color: #33B2AE;">support@skedence.com</a>
        </p>
      </div>
      
      <p style="font-size: 18px; font-weight: 600; color: #33B2AE; text-align: center; margin-top: 32px;">
        We're excited to have you join ${orgName}!
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 8px 0;">This invitation was sent because you were invited to ${orgName}.</p>
      <p style="margin: 0;">
        <a href="https://skedence.com">Visit Skedence</a> | 
        <a href="https://skedence.com/privacy">Privacy Policy</a> | 
        <a href="https://skedence.com/support">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
