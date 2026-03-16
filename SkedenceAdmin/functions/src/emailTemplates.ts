import * as admin from "firebase-admin";

/**
 * Email template management for organization-specific customization
 */

export interface EmailTemplate {
  subject: string;
  body: string;
  variables?: string[];
  lastModified?: Date;
  modifiedBy?: string;
}

// Default templates (same as in frontend)
const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  bookingConfirmation: {
    subject: "✅ Booking Confirmed - {{trainerName}} on {{date}}",
    body: `<h2>Your Training Session is Confirmed!</h2>
<p>Hi {{clientName}},</p>
<p>Your session with {{trainerName}} has been confirmed.</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Session Details</h3>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Time:</strong> {{time}}</p>
  <p><strong>Duration:</strong> {{duration}} minutes</p>
  <p><strong>Package:</strong> {{packageName}}</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>

<p>Need to reschedule? Contact {{trainerName}} at {{trainerEmail}}</p>

<p>See you soon!<br>The {{orgName}} Team</p>`,
  },
  cancellationConfirmation: {
    subject: "❌ Cancellation Confirmed - {{trainerName}} on {{date}}",
    body: `<h2>Your Session Has Been Cancelled</h2>
<p>Hi {{clientName}},</p>
<p>Your session with {{trainerName}} on {{date}} at {{time}} has been cancelled.</p>

<p>If you need to reschedule, please contact us or book another session through the app.</p>

<p>Thanks,<br>The {{orgName}} Team</p>`,
  },
  rescheduleConfirmation: {
    subject: "🔄 Session Rescheduled - New Time with {{trainerName}}",
    body: `<h2>Your Session Has Been Rescheduled</h2>
<p>Hi {{clientName}},</p>
<p>Your session with {{trainerName}} has been rescheduled.</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>New Session Details</h3>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Time:</strong> {{time}}</p>
  <p><strong>Duration:</strong> {{duration}} minutes</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>

<p>See you soon!<br>The {{orgName}} Team</p>`,
  },
  reminders: {
    subject: "⏰ Reminder: Session Tomorrow with {{trainerName}}",
    body: `<h2>Your Session is Tomorrow!</h2>
<p>Hi {{clientName}},</p>
<p>Just a friendly reminder about your upcoming session with {{trainerName}}.</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Tomorrow's Session</h3>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Time:</strong> {{time}}</p>
  <p><strong>Duration:</strong> {{duration}} minutes</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>

<p>Need to cancel? Please contact us at least {{cancellationHours}} hours in advance.</p>

<p>Looking forward to seeing you!<br>{{trainerName}}</p>`,
  },
  followUps: {
    subject: "⭐ How Was Your Session with {{trainerName}}?",
    body: `<h2>Thanks for Training With Us!</h2>
<p>Hi {{clientName}},</p>
<p>We hope you had a great session with {{trainerName}}!</p>

{{#if reviewsEnabled}}
<h3>⭐ Share Your Experience</h3>
<p>{{reviewPrompt}}</p>
<div style="margin: 20px 0;">
  {{#if googleReviewUrl}}
  <a href="{{googleReviewUrl}}" style="background: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Review on Google</a>
  {{/if}}
  {{#if yelpReviewUrl}}
  <a href="{{yelpReviewUrl}}" style="background: #D32323; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Review on Yelp</a>
  {{/if}}
  {{#if facebookReviewUrl}}
  <a href="{{facebookReviewUrl}}" style="background: #1877F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Review on Facebook</a>
  {{/if}}
  {{#if customReviewUrl}}
  <a href="{{customReviewUrl}}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Review on {{customReviewPlatform}}</a>
  {{/if}}
</div>
{{/if}}

<h3>Ready to Book Your Next Session?</h3>
<p>Visit our app to schedule your next training session.</p>

<p>Thanks for being part of our community!<br>The {{orgName}} Team</p>`,
  },
  packageReceipt: {
    subject: "🎁 Receipt: {{packageName}} Purchase",
    body: `<h2>Thank You for Your Purchase!</h2>
<p>Hi {{clientName}},</p>
<p>Here's your receipt for your recent purchase.</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Purchase Details</h3>
  <p><strong>Package:</strong> {{packageName}}</p>
  <p><strong>Amount:</strong> ${'{'}{{amount}}{'}'}</p>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Sessions Remaining:</strong> {{sessionsRemaining}}</p>
</div>

<p>You can start booking your sessions right away!</p>

<p>Thanks,<br>The {{orgName}} Team</p>`,
  },
};

/**
 * Load email template for an organization
 * Falls back to default template if no custom template exists
 */
export async function getEmailTemplate(
  orgId: string,
  templateType: string
): Promise<EmailTemplate> {
  try {
    const templateDoc = await admin
      .firestore()
      .collection("organizations")
      .doc(orgId)
      .collection("emailTemplates")
      .doc(templateType)
      .get();

    if (templateDoc.exists) {
      console.log(`Using custom template for ${orgId} - ${templateType}`);
      return templateDoc.data() as EmailTemplate;
    }

    // Fall back to default template
    console.log(`Using default template for ${orgId} - ${templateType}`);
    return DEFAULT_TEMPLATES[templateType] || {
      subject: "Notification from {{orgName}}",
      body: "<p>This is an automated notification.</p>",
    };
  } catch (error) {
    console.error(`Error loading template for ${orgId} - ${templateType}:`, error);
    // On error, return default template
    return DEFAULT_TEMPLATES[templateType] || {
      subject: "Notification from {{orgName}}",
      body: "<p>This is an automated notification.</p>",
    };
  }
}

/**
 * Replace variables in template with actual data
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = template;

  Object.keys(variables).forEach((key) => {
    const value = variables[key];
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, String(value));
    }
  });

  // Remove any remaining unreplaced variables
  result = result.replace(/{{[^}]+}}/g, "");

  return result;
}

/**
 * Generate email content from template and data
 */
export async function generateEmail(
  orgId: string,
  templateType: string,
  data: Record<string, string | number | undefined>
): Promise<{ subject: string; body: string }> {
  const template = await getEmailTemplate(orgId, templateType);

  return {
    subject: replaceTemplateVariables(template.subject, data),
    body: replaceTemplateVariables(template.body, data),
  };
}
