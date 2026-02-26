# Email Template Backend Integration Analysis

## Current State

### Existing Email Functions

1. **confirmationEmails.ts**
   - `sendPurchaseConfirmation` - Package purchase receipts ✅ Has isEmailEnabled check
   - `sendBookingConfirmation` - Private lesson bookings ✅ Has isEmailEnabled check
   - `sendClassRegistrationConfirmation` - Class registrations ⚠️ No email check yet
   - `sendSubscriptionConfirmation` - Subscription start ⚠️ No email check yet
   - `sendCancellationConfirmation` - Booking cancellations ✅ Has isEmailEnabled check
   - `sendRescheduleConfirmation` - Booking reschedules ✅ Has isEmailEnabled check

2. **emailReminders.ts**
   - `sendBookingConfirmation` - Alternative booking confirmation (COMMENTED OUT)
   - `sendEmailFromTemplate` - Uses EMAIL_TEMPLATES for reminders/followups ✅ Has isEmailEnabled check
   - Note: Functions are currently disabled (commented out)

3. **bookingAlerts.ts**
   - Owner notifications (NOT client-facing, don't need templates)

### Email Trigger Points

| Event | Current Function | Template Type | Status |
|-------|-----------------|---------------|---------|
| Booking created | `confirmationEmails.sendBookingConfirmation` | bookingConfirmation | ✅ Ready for templates |
| Booking cancelled | `confirmationEmails.sendCancellationConfirmation` | cancellationConfirmation | ✅ Ready for templates |
| Booking rescheduled | `confirmationEmails.sendRescheduleConfirmation` | rescheduleConfirmation | ✅ Ready for templates |
| Package purchased | `confirmationEmails.sendPurchaseConfirmation` | packageReceipt | ✅ Ready for templates |
| 24h before session | `emailReminders.sendEmailFromTemplate` | reminders | ⏸️ Currently disabled |
| 2h before session | `emailReminders.sendEmailFromTemplate` | reminders | ⏸️ Currently disabled |
| After session | `emailReminders.sendEmailFromTemplate` | followUps | ⏸️ Currently disabled |

## Variable Mapping

### bookingConfirmation
Current data available:
- ✅ clientName (booking.clientName or from user doc)
- ✅ trainerName (booking.trainerName or from trainer doc)
- ✅ athleteName (can add from booking.athleteName)
- ✅ date (booking.startTime)
- ✅ time (booking.startTime)
- ✅ duration (calculate from startTime/endTime)
- ⚠️ packageName (not currently passed to email)
- ✅ location (booking.location)
- ✅ trainerEmail (from trainer doc)
- ✅ orgName (from org doc)
- ⚠️ cancellationHours (from org settings, not used in confirmation)

### cancellationConfirmation
Current data available:
- ✅ clientName (from user doc)
- ✅ trainerName (from trainer doc)
- ✅ athleteName (can add)
- ✅ date (bookingData.startTime)
- ✅ time (bookingData.startTime)
- ✅ duration (can calculate)
- ✅ location (bookingData.location)
- ✅ orgName (from org doc)

### rescheduleConfirmation
Current data available:
- ✅ clientName (from user doc)
- ✅ trainerName (from trainer doc)
- ✅ athleteName (can add)
- ✅ date (newBookingData.startTime)
- ✅ time (newBookingData.startTime)
- ✅ duration (can calculate)
- ✅ location (newBookingData.location)
- ✅ trainerEmail (from trainer doc)
- ✅ orgName (from org doc)

### packageReceipt
Current data available:
- ✅ clientName (from user doc)
- ⚠️ trainerName (not relevant for package purchase)
- ✅ packageName (packageData.packageName or formatted packageType)
- ✅ amount (from Stripe payment intent)
- ✅ date (packageData.purchaseDate)
- ✅ sessionsRemaining (packageData.totalLessons)
- ✅ orgName (from org doc or Stripe metadata)

### reminders
Current data available (from emailReminders.ts):
- ✅ clientName
- ✅ trainerName
- ✅ athleteName (can add)
- ✅ date
- ✅ time
- ✅ duration
- ✅ packageName (booking.lessonPackage)
- ✅ location
- ✅ trainerEmail
- ✅ orgName
- ✅ cancellationHours (from org settings)

### followUps
Current data available (from emailReminders.ts):
- ✅ clientName
- ✅ trainerName
- ✅ athleteName (can add)
- ✅ orgName
- ⚠️ feedbackLink (not in current variables)
- ⚠️ bookingLink (not in current variables)

## Schema Validation

### Firestore Collections

```
organizations/{orgId}/emailTemplates/{templateType}
  - subject: string
  - body: string (HTML with {{variables}})
  - variables?: string[]
  - lastModified?: timestamp
  - modifiedBy?: string
```

Template types must match:
- ✅ bookingConfirmation
- ✅ cancellationConfirmation
- ✅ rescheduleConfirmation
- ✅ reminders
- ✅ followUps
- ✅ packageReceipt

### Email Settings

```
organizations/{orgId}/settings/emailNotifications
  - bookingConfirmation: boolean (default true)
  - cancellationConfirmation: boolean (default true)
  - rescheduleConfirmation: boolean (default true)
  - reminders: boolean (default true)
  - followUps: boolean (default true)
  - packageReceipt: boolean (default true)
```

## Integration Strategy

### Phase 1: Update Confirmation Emails ✅
Replace hardcoded HTML in:
1. `sendBookingConfirmation` - Use generateEmail()
2. `sendCancellationConfirmation` - Use generateEmail()
3. `sendRescheduleConfirmation` - Use generateEmail()
4. `sendPurchaseConfirmation` - Use generateEmail()

### Phase 2: Variables Enhancement
Add missing variables where available:
- athleteName (from booking data)
- packageName (where applicable)
- feedbackLink, bookingLink (construct URLs)

### Phase 3: Reminder System (Future)
When emailReminders.ts is re-enabled:
- Replace EMAIL_TEMPLATES constant with generateEmail() calls
- Use template system for scheduled emails

## Implementation Checklist

- [ ] Update sendBookingConfirmation to use generateEmail()
- [ ] Update sendCancellationConfirmation to use generateEmail()
- [ ] Update sendRescheduleConfirmation to use generateEmail()
- [ ] Update sendPurchaseConfirmation to use generateEmail()
- [ ] Add athleteName to variable data
- [ ] Test with custom template in Firestore
- [ ] Test with no custom template (default fallback)
- [ ] Verify all variables are replaced correctly
- [ ] Update emailReminders.ts when re-enabled

## Testing Plan

### Test 1: Custom Template
1. Create custom template in Firestore for org
2. Trigger booking confirmation
3. Verify email uses custom template
4. Verify all variables replaced

### Test 2: Default Template
1. Trigger booking for org without custom templates
2. Verify email uses default template from code
3. Verify all variables replaced

### Test 3: Toggle Settings
1. Disable bookingConfirmation in email settings
2. Create booking
3. Verify no email sent

### Test 4: All Email Types
1. Test booking confirmation
2. Test cancellation
3. Test reschedule
4. Test package purchase
5. Verify each uses correct template type

## Variable Reference

### Available Variables

| Variable | Type | Description | Used In |
|----------|------|-------------|---------|
| {{clientName}} | string | Client's full name | All |
| {{trainerName}} | string | Trainer's name | Booking, Cancel, Reschedule, Reminders, Followups |
| {{athleteName}} | string | Athlete's name (for multi-athlete accounts) | All |
| {{date}} | string | Formatted date (e.g., "Monday, January 15, 2024") | All |
| {{time}} | string | Formatted time (e.g., "2:30 PM") | Booking, Cancel, Reschedule, Reminders |
| {{duration}} | number | Session duration in minutes | Booking, Reschedule, Reminders |
| {{packageName}} | string | Lesson package name | Booking, Reminders, Package Receipt |
| {{location}} | string | Session location | Booking, Cancel, Reschedule, Reminders |
| {{trainerEmail}} | string | Trainer's email address | Booking, Reschedule |
| {{orgName}} | string | Organization name | All |
| {{cancellationHours}} | number | Hours before session to cancel | Reminders |
| {{amount}} | string | Payment amount (formatted with $) | Package Receipt |
| {{sessionsRemaining}} | number | Number of sessions in package | Package Receipt |

### Notes on Variable Usage
- All date/time formatting uses org's timezone setting
- Amount is formatted with currency symbol in backend
- Empty/undefined variables are removed from final email
- HTML is preserved in body templates
