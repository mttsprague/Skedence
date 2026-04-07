import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

/**
 * Callable Cloud Function: sendVerificationEmail
 * Generates a Firebase email-verification link and delivers it via SendGrid.
 * Call from the client instead of firebase/auth sendEmailVerification().
 *
 * Required env vars (set in functions/.env):
 *   SENDGRID_API_KEY   – SendGrid API key (starts with SG.)
 *   VERIFICATION_CONTINUE_URL – URL shown after the user clicks the link
 *                               e.g. https://polyface-ae6d3.web.app/verify-email
 *   FROM_EMAIL         – Verified sender address in SendGrid
 *   FROM_NAME          – Sender display name (e.g. "PolyFace Volleyball Academy")
 */
export const sendVerificationEmail = onCall(
  {region: "us-central1"},
  async (request) => {
    const email = request.data?.email as string | undefined;

    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "A valid email address is required.");
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error("SENDGRID_API_KEY is not set.");
      throw new HttpsError("internal", "Email service not configured.");
    }

    const continueUrl =
      process.env.VERIFICATION_CONTINUE_URL ||
      "https://polyface-ae6d3.web.app/verify-email";

    const fromEmail = process.env.FROM_EMAIL || "noreply@polyface-ae6d3.firebaseapp.com";
    const fromName = process.env.FROM_NAME || "PolyFace Volleyball Academy";

    // Generate the verification link via Firebase Admin
    let verificationLink: string;
    try {
      verificationLink = await admin.auth().generateEmailVerificationLink(email, {
        url: continueUrl,
        handleCodeInApp: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to generate verification link:", msg);
      // Surface auth-specific errors (e.g. user not found)
      throw new HttpsError("not-found", "Could not generate verification link. " + msg);
    }

    sgMail.setApiKey(apiKey);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your PolyFace account</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Logo bar -->
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <span style="font-size:13px;font-weight:700;color:#6b7280;letter-spacing:1.5px;text-transform:uppercase;">
              PolyFace Volleyball Academy
            </span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

            <!-- Hero gradient header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#1a2d5a 0%,#14b8a6 100%);padding:44px 40px 36px;text-align:center;">
                  <!-- Icon circle -->
                  <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid rgba(255,255,255,0.3);">
                    <span style="font-size:28px;line-height:1;">✉️</span>
                  </div><br>
                  <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
                    Confirm your email
                  </h1>
                  <p style="margin:0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.5;">
                    You're almost ready to start booking lessons
                  </p>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:36px 40px;">

                  <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                    Hi there! Just one click to verify your email address and unlock full access to your PolyFace athlete portal.
                  </p>

                  <!-- Steps -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td style="background:#f8fafc;border-radius:12px;padding:20px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:6px 0;">
                              <span style="color:#14b8a6;font-weight:800;font-size:13px;">✓</span>&nbsp;
                              <span style="color:#374151;font-size:14px;">Book sessions with your trainers</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;">
                              <span style="color:#14b8a6;font-weight:800;font-size:13px;">✓</span>&nbsp;
                              <span style="color:#374151;font-size:14px;">Track your lesson passes</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;">
                              <span style="color:#14b8a6;font-weight:800;font-size:13px;">✓</span>&nbsp;
                              <span style="color:#374151;font-size:14px;">Manage your athlete profile</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <a href="${verificationLink}"
                           style="display:inline-block;background:linear-gradient(135deg,#1a2d5a,#14b8a6);color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:16px 44px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(20,184,166,0.4);">
                          Verify Email Address &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback link -->
                  <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                    Button not working? Copy and paste this link:
                  </p>
                  <p style="margin:0;font-size:11px;text-align:center;">
                    <a href="${verificationLink}" style="color:#14b8a6;word-break:break-all;">${verificationLink}</a>
                  </p>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">
                    If you didn't create an account, you can safely ignore this email.
                  </p>
                  <p style="margin:0;color:#d1d5db;font-size:11px;">
                    PolyFace Volleyball Academy &bull; Powered by Skedence
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await sgMail.send({
        to: email,
        from: {email: fromEmail, name: fromName},
        subject: "Verify your PolyFace account",
        html,
        text: `Verify your email address by visiting this link: ${verificationLink}`,
      });
      console.log(`✅ Verification email sent to ${email} via SendGrid`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("SendGrid send failed:", msg);
      throw new HttpsError("internal", "Failed to send verification email. Please try again.");
    }

    return {success: true};
  }
);
