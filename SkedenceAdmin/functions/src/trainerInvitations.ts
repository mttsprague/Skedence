/* eslint-disable quotes */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Cloud Function that triggers when a new user document is created.
 * If the user has needsPasswordSetup: true, sends them an invitation email
 * with instructions to download the app and register.
 */
export const sendTrainerInvitation = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return;
    }

    const userData = snap.data();
    const userId = event.params.userId;

    // Only send invitation if this is a new trainer account that needs setup
    if (!userData.needsPasswordSetup) {
      console.log(`User ${userId} doesn't need password setup, skipping invitation`);
      return;
    }

    try {
      // Fetch organization details
      const orgDoc = await admin.firestore()
        .collection("organizations")
        .doc(userData.orgId)
        .get();

      const orgData = orgDoc.data();
      if (!orgData) {
        console.error(`Organization ${userData.orgId} not found for user ${userId}`);
        return;
      }

      // Get the trainer's role from orgMembers
      const membershipId = `${userData.orgId}_${userId}`;
      const orgMemberDoc = await admin.firestore()
        .collection("orgMembers")
        .doc(membershipId)
        .get();

      const memberData = orgMemberDoc.data();
      const role = memberData?.role || "trainer";

      // Prepare email content
      const emailData = {
        to: userData.email,
        template: {
          name: "trainer-invitation",
          data: {
            trainerName: userData.name || "there",
            orgName: orgData.name || "the organization",
            role: role.charAt(0).toUpperCase() + role.slice(1),
            email: userData.email,
            appStoreLink: "https://apps.apple.com/app/skedence-admin", // TODO: Update with actual App Store link
            playStoreLink: "https://play.google.com/store/apps/details?id=com.skedence.admin", // TODO: Update with actual Play Store link
          },
        },
        subject: `You've been invited to join ${orgData.name || "Skedence"}`,
        html: generateInvitationHTML(
          userData.name || "there",
          orgData.name || "the organization",
          role,
          userData.email
        ),
      };

      // Add to mail collection for Firebase email extension
      await admin.firestore().collection("mail").add({
        ...emailData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Invitation email sent to ${userData.email} for organization ${orgData.name}`);

      return;
    } catch (error) {
      console.error(`Error sending invitation to ${userData.email}:`, error);
      return;
    }
  });

/**
 * Generate HTML email template for trainer invitation
 * @param {string} trainerName - The name of the trainer being invited
 * @param {string} orgName - The name of the organization
 * @param {string} role - The role assigned to the trainer
 * @param {string} email - The email address for the trainer to use
 * @return {string} HTML email content
 */
function generateInvitationHTML(
  trainerName: string,
  orgName: string,
  role: string,
  email: string
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
    
    <p>Great news! You've been added as a <strong>${role}</strong> for ${orgName}. You're now part of the team!</p>
    
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
