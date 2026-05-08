/* eslint-disable quotes */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Send password reset email via SendGrid
 * This replaces Firebase Auth's default password reset email
 */
export const sendPasswordResetEmail = onCall(
  { enforceAppCheck: true },
  async (request) => {
    try {
      // Log received data safely
      console.log("Received password reset request");

      // Extract email - Firebase Functions v2 might nest data in data.data
      let email: string | undefined;
      const data = request.data;
      if (typeof data === "string") {
        email = data;
      } else if (data?.data?.email) {
        email = data.data.email;
      } else if (data?.email) {
        email = data.email;
      }

      if (!email || typeof email !== "string") {
        console.error("Invalid email. Type:", typeof email);
        throw new HttpsError(
          "invalid-argument",
          "Email is required"
        );
      }

      console.log("Processing password reset for:", email);

      // Verify user exists
      try {
        await admin.auth().getUserByEmail(email);
      } catch (error) {
        // Don't reveal if user exists or not for security
        console.log(`Password reset requested for non-existent email: ${email}`);
        return {success: true}; // Return success anyway for security
      }

      // Generate password reset link with redirect to custom page
      // handleCodeInApp: true causes Firebase's action handler to redirect to our
      // custom /setup-password page with the oobCode as a query param
      const actionCodeSettings: admin.auth.ActionCodeSettings = {
        url: "https://skedence.com/login",
        handleCodeInApp: true,
      };
      const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

      // Send email via SendGrid extension (mail collection)
      // Using default FROM and REPLY-TO from extension configuration
      await admin.firestore().collection("mail").add({
        to: email,
        message: {
          subject: "Reset Your Skedence Password",
          html: generatePasswordResetEmailHTML(resetLink, email),
        },
      });

      console.log(`✅ Password reset email sent to ${email}`);

      return {success: true};
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw new HttpsError(
        "internal",
        "Failed to send password reset email"
      );
    }
  }
);

/**
 * Generate beautiful HTML email for password reset
 * @param {string} resetLink - The password reset link
 * @param {string} email - The user's email address
 * @return {string} HTML email content
 */
function generatePasswordResetEmailHTML(resetLink: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Header with Brand Color -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #33B2AE 0%, #2a9894 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                🔐 Reset Your Password
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi there,
                            </p>
                            
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We received a request to reset your password for your Skedence account (<strong>${email}</strong>). Click the button below to create a new password:
                            </p>
                            
                            <!-- Reset Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #33B2AE 0%, #2a9894 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 10px rgba(51, 178, 174, 0.3);">
                                            Reset Your Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #64748b;">
                                Or copy and paste this link into your browser:
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 13px; line-height: 1.6; color: #33B2AE; word-break: break-all; background-color: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid #33B2AE;">
                                ${resetLink}
                            </p>
                            
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin-bottom: 30px;">
                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
                                    <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #64748b;">
                                This link will expire in <strong>1 hour</strong> for security reasons.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
                                Need help? Contact us at <a href="mailto:support@skedence.com" style="color: #33B2AE; text-decoration: none; font-weight: 600;">support@skedence.com</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
                                © 2026 Skedence. All rights reserved.
                            </p>
                            <p style="margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
                                Making fitness scheduling simple and efficient
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}
