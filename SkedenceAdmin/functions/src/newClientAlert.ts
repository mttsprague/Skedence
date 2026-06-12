/* eslint-disable quotes */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

/**
 * Firestore trigger: fires when a new orgMembers document is created.
 * If the new member has role "client", sends an alert email via SendGrid
 * to all admins/owners of that org.
 *
 * Required env vars (functions/.env):
 *   SENDGRID_API_KEY   – SendGrid API key (starts with SG.)
 *   FROM_EMAIL         – Verified sender address in SendGrid (e.g. no-reply@skedence.com)
 *   FROM_NAME          – Sender display name (e.g. "Skedence")
 */
export const onNewClientRegistered = onDocumentCreated(
  "orgMembers/{memberId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Only fire for new clients
    if (data.role !== "client") return;
    if (data.isActive === false) return;

    const orgId = data.orgId as string | undefined;
    const userId = data.userId as string | undefined; // name-based user doc ID
    const authUserId = data.authUserId as string | undefined;

    if (!orgId) {
      console.log("newClientAlert: no orgId on orgMembers doc, skipping");
      return;
    }

    const db = admin.firestore();

    try {
      // Load org info
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      if (!orgDoc.exists) {
        console.log(`newClientAlert: org ${orgId} not found`);
        return;
      }
      const orgData = orgDoc.data()!;
      const orgName = orgData.name || "your organization";

      // Check if this org has disabled new client registration alerts
      const alertSettingsDoc = await db
        .collection("organizations")
        .doc(orgId)
        .collection("settings")
        .doc("bookingAlerts")
        .get();
      if (
        alertSettingsDoc.exists &&
        alertSettingsDoc.data()?.sendNewClientRegistrationNotifications === false
      ) {
        console.log(`newClientAlert: org ${orgId} has disabled new client registration notifications, skipping`);
        return;
      }

      // Load the new client's info (try userId first, then authUserId lookup)
      let clientFirstName = "A new client";
      let clientLastName = "";
      let clientEmail = "";
      let clientPhone = "";

      const clientDocId = userId || authUserId;
      if (clientDocId) {
        try {
          const clientDoc = await db.collection("users").doc(clientDocId).get();
          if (clientDoc.exists) {
            const cd = clientDoc.data()!;
            clientFirstName = cd.firstName || cd.athleteFirstName || "A new client";
            clientLastName = cd.lastName || cd.athleteLastName || "";
            clientEmail = cd.emailAddress || cd.email || "";
            clientPhone = cd.phoneNumber || "";
          }
        } catch (err) {
          console.log("newClientAlert: could not load client doc:", err);
        }
      }

      const clientFullName =
        clientLastName
          ? `${clientFirstName} ${clientLastName}`.trim()
          : clientFirstName;

      // Find all admins/owners for this org to notify
      const adminSnapshot = await db
        .collection("orgMembers")
        .where("orgId", "==", orgId)
        .where("role", "in", ["owner", "admin"])
        .where("isActive", "==", true)
        .get();

      if (adminSnapshot.empty) {
        console.log(`newClientAlert: no admins found for org ${orgId}`);
        return;
      }

      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("newClientAlert: SENDGRID_API_KEY is not set.");
        return;
      }
      sgMail.setApiKey(apiKey);

      const fromEmail = process.env.FROM_EMAIL || "no-reply@skedence.com";
      const fromName = process.env.FROM_NAME || "Skedence";

      const emailPromises: Promise<any>[] = [];

      for (const adminMember of adminSnapshot.docs) {
        const adminData = adminMember.data();
        const adminUserId = adminData.userId as string | undefined;
        const adminAuthUserId = adminData.authUserId as string | undefined;

        // Find admin email — check trainers first then users
        let adminEmail: string | null = null;
        let adminName = "Admin";

        if (adminAuthUserId) {
          // Query users collection by authUserId field (most reliable pattern)
          try {
            const userQuery = await db
              .collection("users")
              .where("authUserId", "==", adminAuthUserId)
              .limit(1)
              .get();
            if (!userQuery.empty) {
              const ud = userQuery.docs[0].data();
              adminEmail = ud.emailAddress || ud.email || null;
              adminName = `${ud.firstName || ""}`.trim() || "Admin";
            }
          } catch {
            // ignore
          }

          // Fallback: query trainers collection by authUserId field
          if (!adminEmail) {
            try {
              const trainerQuery = await db
                .collection("trainers")
                .where("authUserId", "==", adminAuthUserId)
                .where("orgId", "==", orgId)
                .limit(1)
                .get();
              if (!trainerQuery.empty) {
                const td = trainerQuery.docs[0].data();
                adminEmail = td.email || td.emailAddress || null;
                adminName = `${td.firstName || ""}`.trim() || "Admin";
              }
            } catch {
              // ignore
            }
          }
        } else if (adminUserId) {
          // Fallback for old orgMembers docs without authUserId — direct doc lookup
          try {
            const trainerDoc = await db.collection("trainers").doc(adminUserId).get();
            if (trainerDoc.exists) {
              const td = trainerDoc.data()!;
              adminEmail = td.email || td.emailAddress || null;
              adminName = `${td.firstName || ""}`.trim() || "Admin";
            }
          } catch {
            // ignore
          }
          if (!adminEmail) {
            try {
              const userDoc = await db.collection("users").doc(adminUserId).get();
              if (userDoc.exists) {
                const ud = userDoc.data()!;
                adminEmail = ud.emailAddress || ud.email || null;
                adminName = `${ud.firstName || ""}`.trim() || "Admin";
              }
            } catch {
              // ignore
            }
          }
        }

        // Final fallback: org-level admin email
        if (!adminEmail && orgData.adminEmail) {
          adminEmail = orgData.adminEmail as string;
        }

        if (!adminEmail) continue;

        const joinedAt = data.joinedAt
          ? (data.joinedAt as admin.firestore.Timestamp).toDate().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

        const adminPortalUrl = `https://skedence.com/clients`;

        emailPromises.push(
          sgMail.send({
            to: adminEmail,
            from: { email: fromEmail, name: fromName },
            subject: `🎉 New client joined ${orgName}: ${clientFullName}`,
            text: generateNewClientEmailText(
              adminName,
              clientFullName,
              clientEmail,
              clientPhone,
              joinedAt,
              orgName,
              adminPortalUrl
            ),
            html: generateNewClientEmailHtml(
              adminName,
              clientFullName,
              clientEmail,
              clientPhone,
              joinedAt,
              orgName,
              adminPortalUrl
            ),
          })
        );
      }

      await Promise.all(emailPromises);
      console.log(
        `✅ newClientAlert: queued emails for ${emailPromises.length} admin(s) about new client ${clientFullName} in org ${orgId}`
      );
    } catch (error) {
      console.error("newClientAlert: error:", error);
    }
  }
);

function generateNewClientEmailText(
  adminName: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  joinedAt: string,
  orgName: string,
  portalUrl: string
): string {
  return `
Hi ${adminName},

Great news — a new client just joined ${orgName}!

CLIENT DETAILS
Name:    ${clientName}
Email:   ${clientEmail || "Not provided"}
Phone:   ${clientPhone || "Not provided"}
Joined:  ${joinedAt}

You can view their profile and get them set up with a pass from the admin portal:
${portalUrl}

— The Skedence Team
  `.trim();
}

function generateNewClientEmailHtml(
  adminName: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  joinedAt: string,
  orgName: string,
  portalUrl: string
): string {
  const initials = clientName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 32px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; color: #fff; }
    .header p { margin: 0; font-size: 15px; color: rgba(255,255,255,0.9); }
    .avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #60a5fa, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: #fff; margin: 0 auto 16px; }
    .body { padding: 36px 32px; }
    .greeting { font-size: 17px; color: #1e293b; margin: 0 0 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin: 0 0 16px; }
    .field { display: flex; align-items: baseline; gap: 12px; margin: 10px 0; font-size: 15px; color: #1e293b; }
    .field-label { font-weight: 600; color: #64748b; min-width: 54px; flex-shrink: 0; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; border-radius: 20px; padding: 3px 12px; font-size: 13px; font-weight: 600; }
    .btn { display: block; width: fit-content; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 28px auto 0; text-align: center; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 13px; color: #94a3b8; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="avatar">${initials || "?"}</div>
      <h1>🎉 New Client Joined!</h1>
      <p>${orgName}</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${adminName},</p>
      <p style="font-size:15px;color:#475569;margin:0 0 4px;">A new client just registered for <strong>${orgName}</strong>.</p>

      <div class="card">
        <div class="card-title">Client Details</div>
        <div class="field"><span class="field-label">Name</span><strong>${clientName}</strong></div>
        ${clientEmail ? `<div class="field"><span class="field-label">Email</span>${clientEmail}</div>` : ""}
        ${clientPhone ? `<div class="field"><span class="field-label">Phone</span>${clientPhone}</div>` : ""}
        <div class="field"><span class="field-label">Joined</span><span class="badge">${joinedAt}</span></div>
      </div>

      <p style="font-size:14px;color:#64748b;margin:20px 0 0;">Head to the admin portal to view their profile and assign a pass.</p>
      <a href="${portalUrl}" class="btn">View in Admin Portal →</a>
    </div>
    <div class="footer">
      <p>You're receiving this because you're an admin of ${orgName}.</p>
      <p><a href="https://skedence.com">skedence.com</a></p>
    </div>
  </div>
</body>
</html>`;
}
