# Password Reset Setup & Email Template Customization

## Overview
Password reset functionality has been implemented across both the Admin Dashboard and Client App. Users can request password reset emails from:
- **Admin Dashboard**: Login page + Account section
- **Client App**: Sign In screen + More tab

## Features Implemented

### Admin Dashboard (Web)
1. **Login Screen** (`admin-dashboard.html`)
   - "Forgot Password?" link below the Sign In button
   - Prompts user to enter email if field is empty
   - Confirmation dialog before sending reset email
   - Success/error feedback messages

2. **Account Section** (New sidebar menu item)
   - Displays user's email and organization name
   - "Send Password Reset Email" button
   - Real-time feedback on email send status
   - Located in sidebar navigation (🧑 Account icon)

### Client App (iOS)
1. **Sign In Screen** (`ProfileView.swift`)
   - "Forgot Password?" button below Sign In button
   - Alert dialog for confirmation
   - Success/error feedback messages
   - Auto-dismisses success message after 10 seconds

2. **More Tab** (`MorePlaceholderView.swift`)
   - "Reset Password" option in Profile section
   - Lock rotation icon (🔐)
   - Alert dialog for confirmation
   - Success/error feedback with email confirmation

## Customizing the Password Reset Email Template

Firebase allows you to customize the password reset email that users receive. Here's how to create a beautiful, branded email template:

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **polyface-ae6d3**
3. Navigate to **Authentication** (in the left sidebar)
4. Click on **Templates** tab at the top

### Step 2: Customize Password Reset Template
1. Find **Password reset** in the template list
2. Click the pencil icon (✏️) to edit
3. You'll see fields for:
   - **Sender name**: (e.g., "Skedence Support")
   - **Subject**: (e.g., "Reset your Skedence password")
   - **Email body** (HTML)

### Step 3: Create Beautiful Email Template

Here's a modern, branded email template you can use:

```html
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
                                We received a request to reset your password for your Skedence account. Click the button below to create a new password:
                            </p>
                            
                            <!-- Reset Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="%LINK%" style="display: inline-block; background: linear-gradient(135deg, #33B2AE 0%, #2a9894 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 10px rgba(51, 178, 174, 0.3);">
                                            Reset Your Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #64748b;">
                                Or copy and paste this link into your browser:
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 13px; line-height: 1.6; color: #33B2AE; word-break: break-all; background-color: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid #33B2AE;">
                                %LINK%
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
```

### Step 4: Save and Test
1. Click **Save** in the Firebase Console
2. Test the password reset by:
   - Logging out of your app
   - Clicking "Forgot Password?"
   - Entering your email
   - Checking your inbox for the new branded email

### Template Customization Variables

Firebase automatically replaces these variables in your template:
- `%LINK%` - The password reset link
- `%EMAIL%` - The user's email address
- `%APP_NAME%` - Your app name from Firebase settings

### Email Best Practices

✅ **What's Included:**
- Clear call-to-action button
- Security warning for users who didn't request reset
- Expiration notice (Firebase default: 1 hour)
- Support contact information
- Mobile-responsive design
- Brand colors (#33B2AE - Skedence primary)

### Alternative: Simple Text-Based Template

If you prefer a simpler template, here's a text-only version:

```
Subject: Reset your Skedence password

Hi there,

We received a request to reset your password for your Skedence account.

To reset your password, click here: %LINK%

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

This link will expire in 1 hour for security reasons.

Need help? Contact us at support@skedence.com

© 2026 Skedence. All rights reserved.
```

## Testing Checklist

### Admin Dashboard
- [ ] Test "Forgot Password?" on login page
- [ ] Test without entering email (should show alert)
- [ ] Test with valid email (should show success message)
- [ ] Navigate to Account section
- [ ] Test "Send Password Reset Email" button
- [ ] Verify email received in inbox
- [ ] Click reset link and change password
- [ ] Sign in with new password

### Client App
- [ ] Test "Forgot Password?" on Sign In screen
- [ ] Test with empty email field
- [ ] Test with valid email
- [ ] Navigate to More tab
- [ ] Test "Reset Password" option
- [ ] Verify email received
- [ ] Complete password reset flow
- [ ] Sign in with new password

## Technical Implementation Details

### Firebase Auth Methods Used
- `Auth.auth().sendPasswordReset(withEmail:)` (iOS Swift)
- `auth.sendPasswordResetEmail(email, options)` (Web JavaScript)

### Security Features
- Links expire after 1 hour (Firebase default)
- Links can only be used once
- User must be authenticated to use in-app reset (More tab/Account section)
- Login page allows reset before authentication

### Error Handling
Both implementations handle:
- Invalid email format
- Network errors
- Rate limiting (too many requests)
- User not found
- Email not verified

## Support

If users report issues with password reset:
1. Check Firebase Authentication logs in Console
2. Verify email template is saved correctly
3. Check spam/junk folders
4. Ensure sender name and email are configured
5. Review Firebase Auth quotas (100/hour default)

## Future Enhancements

Possible improvements:
- [ ] Custom redirect URL after password reset
- [ ] Multi-language email templates
- [ ] SMS password reset as alternative
- [ ] Password reset from admin dashboard (admin resets user passwords)
- [ ] Two-factor authentication integration
- [ ] Password strength requirements display
