# Firebase Extensions Configuration

## SendGrid Email Extension

The `firestore-send-email.env` file contains the configuration template for the Firebase email extension.

### Setup Instructions

1. Copy `firestore-send-email.env` to `firestore-send-email.env.local`
2. Replace `YOUR_SENDGRID_API_KEY` with your actual SendGrid API key
3. Deploy the extension:
   ```bash
   firebase deploy --only extensions
   ```

### Configuration

- **SMTP Server**: smtp.sendgrid.net:465
- **From Address**: no-reply@skedence.com
- **Reply-To**: matt.sprague@skedence.com
- **Database Region**: nam5

### Security Note

Never commit the `.env.local` file with real API keys to version control. The `.env` template uses a placeholder that should be replaced locally.
