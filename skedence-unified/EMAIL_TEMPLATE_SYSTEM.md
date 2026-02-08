# Email Template Customization System

## Overview
Multi-tenant email template system allowing each organization to customize their client emails while maintaining default templates as fallbacks.

## Architecture

### Frontend (Web App)
**Location:** `skedence-unified/src/app/(admin)/settings/client-emails/page.tsx`

- **Email Toggle Settings:** Enable/disable each email type
- **Edit Template Buttons:** Opens modal editor for each email type
- **Template Editor Modal:** `components/admin/email-template-editor.tsx`
  - Subject line editor
  - HTML body editor (textarea)
  - Variable picker with descriptions
  - Live preview with sample data
  - Reset to default functionality
  - Save to Firestore

### Backend (Cloud Functions)
**Location:** `SkedenceAdmin/functions/src/emailTemplates.ts`

- `getEmailTemplate(orgId, templateType)` - Loads org-specific or default template
- `replaceTemplateVariables(template, data)` - Replaces {{variables}} with actual data
- `generateEmail(orgId, templateType, data)` - Complete email generation

### Data Storage (Firestore)
```
organizations/{orgId}/emailTemplates/{templateType}
  - subject: string
  - body: string (HTML)
  - lastModified: timestamp
```

**Template Types:**
- `bookingConfirmation`
- `cancellationConfirmation`
- `rescheduleConfirmation`
- `reminders`
- `followUps`
- `packageReceipt`

## Available Variables

Each template has access to dynamic variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{clientName}}` | Client's full name | "John Smith" |
| `{{trainerName}}` | Trainer's full name | "Coach Sarah" |
| `{{athleteName}}` | Athlete's full name | "Emma Smith" |
| `{{date}}` | Session date | "Monday, March 15, 2026" |
| `{{time}}` | Session time | "4:00 PM" |
| `{{duration}}` | Duration in minutes | "60" |
| `{{packageName}}` | Package name | "10 Session Package" |
| `{{location}}` | Session location | "Main Gym" |
| `{{trainerEmail}}` | Trainer's email | "coach@example.com" |
| `{{orgName}}` | Organization name | "Your Organization" |
| `{{cancellationHours}}` | Cancellation policy | "24" |
| `{{amount}}` | Purchase amount | "150.00" |
| `{{sessionsRemaining}}` | Sessions left | "10" |

## Email Flow

1. **Event Triggered** (booking created, reminder scheduled, etc.)
2. **Load Template:** `getEmailTemplate(orgId, templateType)`
   - Checks: `organizations/{orgId}/emailTemplates/{templateType}`
   - Falls back to default if not found
3. **Generate Content:** `generateEmail(orgId, templateType, data)`
   - Replaces all {{variables}} with actual values
4. **Send via SendGrid** (existing Firebase extension)

## Integration with Existing Functions

Update email sending functions to use the new template system:

```typescript
import { generateEmail } from './emailTemplates';

// Old way
const emailData = {
  subject: "Booking Confirmed",
  body: EMAIL_TEMPLATES.confirmation.body,
  // ...
};

// New way
const emailData = await generateEmail(orgId, 'bookingConfirmation', {
  clientName: user.name,
  trainerName: trainer.name,
  date: formatDate(booking.date),
  time: formatTime(booking.time),
  duration: booking.duration,
  packageName: package.name,
  location: booking.location,
  trainerEmail: trainer.email,
  orgName: org.name,
});

// emailData.subject and emailData.body are ready to send
```

## User Experience

### For Organization Owners:
1. Navigate to **Settings > Client Emails**
2. See all email types with on/off toggles
3. Click **"Edit Template"** button next to any email
4. Modal opens with:
   - Subject line editor
   - HTML body textarea
   - Variable legend on the side
   - Preview button to see with sample data
5. Click variable to insert at cursor
6. **Save Template** or **Reset to Default**
7. Changes apply only to their organization

### Multi-Tenant Isolation:
- Each org has: `organizations/{orgId}/emailTemplates/*`
- Editing templates in Org A does NOT affect Org B
- If no custom template exists, default is used
- Defaults are maintained in code (can be updated globally)

## Testing

### Test Custom Template:
1. Go to Settings > Client Emails
2. Click "Edit Template" on Booking Confirmation
3. Change subject to: "🎉 You're Booked! {{trainerName}} on {{date}}"
4. Save
5. Create a test booking
6. Check email uses custom subject

### Test Fallback:
1. Don't customize a template
2. Trigger that email type
3. Should use default template from code

## Future Enhancements

- [ ] Rich text editor (WYSIWYG) instead of HTML textarea
- [ ] Email template versioning/history
- [ ] Template preview email (send test to yourself)
- [ ] Template library with preset designs
- [ ] Conditional sections (if/else logic)
- [ ] Attachment support
- [ ] Multi-language templates
