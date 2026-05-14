/* eslint-disable quotes */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

/**
 * Send password reset email via SendGrid
 * This replaces Firebase Auth's default password reset email
 */
export const sendPasswordResetEmail = onCall(
  {region: "us-central1"},
  async (request) => {
    try {
      // Log received data safely
      console.log("Received password reset request");

      // Extract email
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

      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("SENDGRID_API_KEY is not set.");
        throw new HttpsError("internal", "Email service not configured.");
      }

      const continueUrl =
        process.env.RESET_CONTINUE_URL ||
        process.env.VERIFICATION_CONTINUE_URL ||
        "https://www.polyfacevolleyball.com/login";

      const fromEmail = process.env.FROM_EMAIL || "noreply@skedence.com";
      const fromName = process.env.FROM_NAME || "PolyFace Volleyball Academy";

      // Verify user exists
      try {
        await admin.auth().getUserByEmail(email);
      } catch (error) {
        // Don't reveal if user exists or not for security
        console.log(`Password reset requested for non-existent email: ${email}`);
        return {success: true};
      }

      // Generate password reset link
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: continueUrl,
        handleCodeInApp: false,
      });

      // Send via SendGrid directly
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to: email,
        from: {email: fromEmail, name: fromName},
        subject: "Reset your PolyFace password",
        html: generatePasswordResetEmailHTML(resetLink, email),
        text: `Reset your password by visiting this link: ${resetLink}`,
      });

      console.log(`✅ Password reset email sent to ${email} via SendGrid`);

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
 * Generate PolyFace-branded HTML email for password reset
 */
function generatePasswordResetEmailHTML(resetLink: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your PolyFace password</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <span style="font-size:13px;font-weight:700;color:#6b7280;letter-spacing:1.5px;text-transform:uppercase;">
              PolyFace Volleyball Academy
            </span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#1a2d5a 0%,#14b8a6 100%);padding:44px 40px 36px;text-align:center;">
                  <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid rgba(255,255,255,0.3);">
                    <span style="font-size:28px;line-height:1;">🔐</span>
                  </div><br>
                  <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">Reset your password</h1>
                  <p style="margin:0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.5;">We received a request to reset your account password</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:36px 40px;">
                  <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                    Click the button below to choose a new password. This link expires in 1 hour.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1a2d5a,#14b8a6);color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:16px 44px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(20,184,166,0.4);">
                          Reset Password &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">Button not working? Copy and paste this link:</p>
                  <p style="margin:0;font-size:11px;text-align:center;">
                    <a href="${resetLink}" style="color:#14b8a6;word-break:break-all;">${resetLink}</a>
                  </p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">If you didn't request a password reset, you can safely ignore this email.</p>
                  <p style="margin:0;color:#d1d5db;font-size:11px;">PolyFace Volleyball Academy &bull; Powered by Skedence</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>\`\`;
}

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
