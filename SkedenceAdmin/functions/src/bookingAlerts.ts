import * as admin from "firebase-admin";
import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";

/**
 * Send appointment notification to owner when booking is created
 */
export const sendOwnerAppointmentNotification = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const booking = snap.data();
    const bookingId = event.params.bookingId;

    if (!booking || !booking.orgId) {
      console.log("No org ID found for booking");
      return null;
    }

    try {
      // Check if owner wants appointment notifications
      const alertSettings = await admin.firestore()
        .collection("organizations").doc(booking.orgId)
        .collection("settings").doc("bookingAlerts").get();

      if (!alertSettings.exists || alertSettings.data()?.sendAppointmentNotifications !== true) {
        console.log(`Appointment notifications disabled for org ${booking.orgId}`);
        return null;
      }

      // Get organization and owner details
      const orgDoc = await admin.firestore()
        .collection("organizations")
        .doc(booking.orgId)
        .get();

      if (!orgDoc.exists) {
        console.log("Organization not found");
        return null;
      }

      const orgData = orgDoc.data()!;

      // Query orgMembers for admins/owners
      const adminMembers = await admin.firestore()
        .collection("orgMembers")
        .where("orgId", "==", booking.orgId)
        .where("role", "in", ["admin", "owner"])
        .where("isActive", "==", true)
        .get();

      let adminEmails: string[] = [];
      let ownerData: any = {};

      if (!adminMembers.empty) {
        // Get all admin emails from orgMembers (query users by authUserId field)
        const adminAuthIds = adminMembers.docs.map((doc) => doc.data().authUserId).filter((id) => id);
        
        // Query users collection by authUserId field (not document ID)
        for (const authUserId of adminAuthIds) {
          const userQuery = await admin.firestore()
            .collection("users")
            .where("authUserId", "==", authUserId)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            const email = userData.email || userData.emailAddress;
            if (email) {
              adminEmails.push(email);
              if (!ownerData.email) {
                ownerData = userData; // Use first admin for personalization
              }
            }
          }
        }
      }

      // Fallback to adminEmail on org document if no admins found in orgMembers
      if (adminEmails.length === 0 && orgData.adminEmail) {
        console.log("No admins found in orgMembers, using adminEmail from org document");
        adminEmails = [orgData.adminEmail];
        ownerData = {firstName: "Admin", email: orgData.adminEmail};
      }

      if (adminEmails.length === 0) {
        console.log("No admin emails found anywhere");
        return null;
      }

      // Get client and trainer details
      const [clientDoc, trainerDoc] = await Promise.all([
        admin.firestore().collection("users").doc(booking.clientUID).get(),
        admin.firestore().collection("trainers").doc(booking.trainerId).get(),
      ]);

      const clientData = clientDoc.data();
      const trainerData = trainerDoc.data();

      const clientName = clientData ?
        `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || clientData.email :
        "Unknown Client";
      const trainerName = trainerData?.name || "Unknown Trainer";

      // Format date and time in owner's timezone
      const timezone = alertSettings.data()?.timezone || "America/Los_Angeles";
      const startDate = booking.startTime.toDate();
      const formattedDate = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: timezone,
      });
      const formattedTime = startDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      });

      // Send email
      // Send email to all admins
      await admin.firestore().collection("mail").add({
        to: adminEmails,
        from: `${orgData.name} <no-reply@skedence.com>`,
        replyTo: orgData.email || "support@skedence.com",
        message: {
          subject: `New Appointment Booked - ${clientName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #3258A3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🎉 New Appointment Booked</h2>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="margin-top: 0;">Hi ${ownerData.firstName || "there"},</p>
                
                <p>A new appointment has been booked:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="margin-top: 0; color: #3258A3;">Appointment Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Client:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${clientName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Trainer:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${trainerName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedTime}</td>
                    </tr>
                    ${booking.location ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Location:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${booking.location}</td>
                    </tr>
                    ` : ""}
                  </table>
                </div>
                
                <p style="margin-bottom: 0;">View this appointment in your <a href="https://skedence.com/admin-portal/bookings" style="color: #3258A3; text-decoration: none; font-weight: 500;">admin portal</a>.</p>
              </div>
            </div>
          `,
        },
      });

      console.log(`✅ Appointment notification sent to ${adminEmails.join(", ")} for booking ${bookingId}`);
      return null;
    } catch (error) {
      console.error("Error sending owner appointment notification:", error);
      return null;
    }
  });

/**
 * Send notification when booking is cancelled
 */
export const sendOwnerCancellationNotification = onDocumentDeleted(
  "bookings/{bookingId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const booking = snap.data();

    if (!booking || !booking.orgId) {
      return null;
    }

    try {
      // Check if owner wants appointment notifications
      const alertSettings = await admin.firestore()
        .collection("organizations").doc(booking.orgId)
        .collection("settings").doc("bookingAlerts").get();

      if (!alertSettings.exists || alertSettings.data()?.sendAppointmentNotifications !== true) {
        return null;
      }

      // Get organization and owner details
      const orgDoc = await admin.firestore()
        .collection("organizations")
        .doc(booking.orgId)
        .get();

      if (!orgDoc.exists) return null;

      const orgData = orgDoc.data()!;

      // Query orgMembers for admins/owners
      const adminMembers = await admin.firestore()
        .collection("orgMembers")
        .where("orgId", "==", booking.orgId)
        .where("role", "in", ["admin", "owner"])
        .where("isActive", "==", true)
        .get();

      let adminEmails: string[] = [];
      let ownerData: any = {};

      if (!adminMembers.empty) {
        // Get all admin emails from orgMembers (query users by authUserId field)
        const adminAuthIds = adminMembers.docs.map((doc) => doc.data().authUserId).filter((id) => id);
        
        // Query users collection by authUserId field (not document ID)
        for (const authUserId of adminAuthIds) {
          const userQuery = await admin.firestore()
            .collection("users")
            .where("authUserId", "==", authUserId)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            const email = userData.email || userData.emailAddress;
            if (email) {
              adminEmails.push(email);
              if (!ownerData.email) {
                ownerData = userData;
              }
            }
          }
        }
      }

      // Fallback to adminEmail on org document if no admins found in orgMembers
      if (adminEmails.length === 0 && orgData.adminEmail) {
        console.log("No admins found in orgMembers, using adminEmail from org document");
        adminEmails = [orgData.adminEmail];
        ownerData = {firstName: "Admin", email: orgData.adminEmail};
      }

      if (adminEmails.length === 0) {
        console.log("No admin emails found anywhere");
        return null;
      }

      // Get client and trainer details
      const [clientDoc, trainerDoc] = await Promise.all([
        admin.firestore().collection("users").doc(booking.clientUID).get(),
        admin.firestore().collection("trainers").doc(booking.trainerId).get(),
      ]);

      const clientData = clientDoc.data();
      const trainerData = trainerDoc.data();

      const clientName = clientData ?
        `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || clientData.email :
        "Unknown Client";
      const trainerName = trainerData?.name || "Unknown Trainer";

      // Format date and time
      const timezone = alertSettings.data()?.timezone || "America/Los_Angeles";
      const startDate = booking.startTime.toDate();
      const formattedDate = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: timezone,
      });
      const formattedTime = startDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      });

      // Send email to all admins
      await admin.firestore().collection("mail").add({
        to: adminEmails,
        from: `${orgData.name} <no-reply@skedence.com>`,
        replyTo: orgData.email || "support@skedence.com",
        message: {
          subject: `Appointment Cancelled - ${clientName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">❌ Appointment Cancelled</h2>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="margin-top: 0;">Hi ${ownerData.firstName || "there"},</p>
                
                <p>An appointment has been cancelled:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="margin-top: 0; color: #dc2626;">Cancelled Appointment</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Client:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${clientName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Trainer:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${trainerName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedTime}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="margin-bottom: 0;">View your schedule in the <a href="https://skedence.com/admin-portal/bookings" style="color: #3258A3; text-decoration: none; font-weight: 500;">admin portal</a>.</p>
              </div>
            </div>
          `,
        },
      });

      console.log(`✅ Cancellation notification sent to ${adminEmails.join(", ")}`);
      return null;
    } catch (error) {
      console.error("Error sending cancellation notification:", error);
      return null;
    }
  });

/**
 * Send notification when package is purchased
 */
export const sendOwnerPackagePurchaseNotification = onDocumentCreated(
  "organizations/{orgId}/users/{userId}/packages/{packageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const packageData = snap.data();
    const {orgId, userId} = event.params;

    if (!packageData) return null;

    try {
      // Check if owner wants appointment notifications
      const alertSettings = await admin.firestore()
        .collection("organizations").doc(orgId)
        .collection("settings").doc("bookingAlerts").get();

      if (!alertSettings.exists || alertSettings.data()?.sendAppointmentNotifications !== true) {
        return null;
      }

      // Get organization and owner details
      const orgDoc = await admin.firestore()
        .collection("organizations")
        .doc(orgId)
        .get();

      if (!orgDoc.exists) return null;

      const orgData = orgDoc.data()!;

      // Query orgMembers for admins/owners
      const adminMembers = await admin.firestore()
        .collection("orgMembers")
        .where("orgId", "==", orgId)
        .where("role", "in", ["admin", "owner"])
        .where("isActive", "==", true)
        .get();

      let adminEmails: string[] = [];
      let ownerData: any = {};

      if (!adminMembers.empty) {
        // Get all admin emails from orgMembers (query users by authUserId field)
        const adminAuthIds = adminMembers.docs.map((doc) => doc.data().authUserId).filter((id) => id);
        
        // Query users collection by authUserId field (not document ID)
        for (const authUserId of adminAuthIds) {
          const userQuery = await admin.firestore()
            .collection("users")
            .where("authUserId", "==", authUserId)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            const email = userData.email || userData.emailAddress;
            if (email) {
              adminEmails.push(email);
              if (!ownerData.email) {
                ownerData = userData;
              }
            }
          }
        }
      }

      // Fallback to adminEmail on org document if no admins found in orgMembers
      if (adminEmails.length === 0 && orgData.adminEmail) {
        console.log("No admins found in orgMembers, using adminEmail from org document");
        adminEmails = [orgData.adminEmail];
        ownerData = {firstName: "Admin", email: orgData.adminEmail};
      }

      if (adminEmails.length === 0) {
        console.log("No admin emails found anywhere");
        return null;
      }

      // Get client details
      const clientDoc = await admin.firestore().collection("users").doc(userId).get();
      const clientData = clientDoc.data();

      const clientName = clientData ?
        `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || clientData.email :
        "Unknown Client";

      // Format purchase date
      const timezone = alertSettings.data()?.timezone || "America/Los_Angeles";
      const purchaseDate = packageData.purchasedAt?.toDate() || new Date();
      const formattedDate = purchaseDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: timezone,
      });

      // Send email to all admins
      await admin.firestore().collection("mail").add({
        to: adminEmails,
        from: `${orgData.name} <no-reply@skedence.com>`,
        replyTo: orgData.email || "support@skedence.com",
        message: {
          subject: `Package Purchased - ${clientName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">💳 Package Purchased</h2>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="margin-top: 0;">Hi ${ownerData.firstName || "there"},</p>
                
                <p>A client has purchased a package:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="margin-top: 0; color: #059669;">Purchase Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Client:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${clientName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Package:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${packageData.name || "Package"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Sessions:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${packageData.totalLessons || 0}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Amount:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${(packageData.price || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="margin-bottom: 0;">View revenue details in the <a href="https://skedence.com/admin-portal/reports/revenue" style="color: #3258A3; text-decoration: none; font-weight: 500;">admin portal</a>.</p>
              </div>
            </div>
          `,
        },
      });

      console.log(`✅ Package purchase notification sent to ${adminEmails.join(", ")}`);
      return null;
    } catch (error) {
      console.error("Error sending package purchase notification:", error);
      return null;
    }
  });
