import * as admin from "firebase-admin";

/**
 * Email notification settings helper
 * Checks if a specific email type is enabled for an organization
 */

export interface EmailNotificationSettings {
  // Confirmations
  bookingConfirmation?: boolean;
  cancellationConfirmation?: boolean;
  rescheduleConfirmation?: boolean;

  // Other emails
  reminders?: boolean;
  followUps?: boolean;
  packageReceipt?: boolean;
  appointmentReceipt?: boolean;
  subscriptionReceipt?: boolean;
  subscriptionCancellation?: boolean;
}

export type EmailType = keyof EmailNotificationSettings;

/**
 * Check if a specific email notification is enabled for an organization
 * @param {string} orgId - Organization ID
 * @param {EmailType} emailType - Type of email to check
 * @return {Promise<boolean>} boolean - true if enabled (or if setting doesn't exist - default enabled)
 */
export async function isEmailEnabled(orgId: string, emailType: EmailType): Promise<boolean> {
  try {
    const settingsDoc = await admin
      .firestore()
      .collection("organizations")
      .doc(orgId)
      .collection("settings")
      .doc("emailNotifications")
      .get();

    if (!settingsDoc.exists) {
      // If no settings exist, default to enabled (backward compatible)
      console.log(`No email settings found for org ${orgId}, defaulting to enabled`);
      return true;
    }

    const settings = settingsDoc.data() as EmailNotificationSettings;

    // If setting is undefined, default to enabled
    const isEnabled = settings[emailType] !== false;

    console.log(`Email setting for ${orgId} - ${emailType}: ${isEnabled ? "enabled" : "disabled"}`);

    return isEnabled;
  } catch (error) {
    console.error(`Error checking email settings for ${orgId}:`, error);
    // On error, default to enabled to avoid breaking existing functionality
    return true;
  }
}

/**
 * Convenience function to check and send email
 * @param {string} orgId - Organization ID
 * @param {EmailType} emailType - Type of email
 * @param {Function} sendEmailFn - Function to execute if email is enabled
 * @return {Promise<void>}
 */
export async function sendEmailIfEnabled(
  orgId: string,
  emailType: EmailType,
  sendEmailFn: () => Promise<void>
): Promise<void> {
  const enabled = await isEmailEnabled(orgId, emailType);

  if (enabled) {
    await sendEmailFn();
  } else {
    console.log(`Email type ${emailType} is disabled for org ${orgId}, skipping`);
  }
}
