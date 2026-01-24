# Skedence Admin Panel

Internal admin panel for managing Skedence organizations, subscriptions, and monitoring system health.

## Features

- **Organization Management**
  - View all organizations
  - Search organizations by name or ID
  - View organization details (members, subscription status, events)
  - Enable/disable organizations
  - View subscription status and plans

- **Dashboard Statistics**
  - Total organizations
  - Active subscriptions
  - Trial organizations
  - Disabled organizations

- **Security**
  - Email allowlist protection
  - Firebase Admin SDK for secure backend operations

## Setup

### 1. Install Dependencies

```bash
cd SkedenceAdmin/admin-panel
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:

```env
# Get this from Firebase Console > Project Settings > Service Accounts
# Generate new private key, then copy the entire JSON content
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}

# Add your admin email(s) - comma separated
ADMIN_EMAILS=your-email@example.com,another-admin@example.com

# Your Firebase project ID
FIREBASE_PROJECT_ID=polyface-ae6d3

NODE_ENV=development
```

### 3. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (polyface-ae6d3)
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Copy the entire JSON content and set it as `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

The admin panel will be available at http://localhost:3001

### 5. Build for Production

```bash
npm run build
npm start
```

## Authentication

The admin panel uses a simple email allowlist for authentication. Only emails listed in `ADMIN_EMAILS` environment variable can access the panel.

**Note**: This is a minimal auth implementation. For production, consider:
- Adding proper OAuth/SSO
- Session management
- API key authentication for API routes
- Rate limiting

## API Routes

### GET /api/orgs
Fetch all organizations with stats

**Headers:**
- `x-admin-email`: Your admin email

**Response:**
```json
{
  "organizations": [...],
  "stats": {
    "totalOrgs": 10,
    "activeSubscriptions": 8,
    "trialingOrgs": 2,
    "disabledOrgs": 0
  }
}
```

### GET /api/orgs/[orgId]
Fetch organization details, members, and recent events

### PATCH /api/orgs/[orgId]
Update organization (e.g., disable/enable)

**Body:**
```json
{
  "disabled": true
}
```

## Deployment

### Option 1: Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Docker

```bash
# Build
docker build -t skedence-admin-panel .

# Run
docker run -p 3001:3001 --env-file .env.local skedence-admin-panel
```

### Option 3: Traditional Node.js Server

```bash
npm run build
NODE_ENV=production npm start
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit** `.env.local` or `serviceAccountKey.json` to git
2. The service account key has full admin access - protect it carefully
3. Only add trusted admin emails to `ADMIN_EMAILS`
4. Consider adding IP whitelisting in production
5. Enable HTTPS in production
6. Add rate limiting to API routes
7. Implement proper session management

## Future Enhancements

- [ ] Add proper authentication (OAuth, SSO)
- [ ] Implement "impersonate org" view-only mode
- [ ] Add more detailed analytics and charts
- [ ] Real-time updates using Firebase listeners
- [ ] Export data functionality
- [ ] Audit log for admin actions
- [ ] Email notifications for critical events
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] API rate limiting and monitoring

## Troubleshooting

### "Unauthorized" Error
- Check that your email is in `ADMIN_EMAILS`
- Verify you're passing `x-admin-email` header in API calls

### Firebase Connection Issues
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
- Check `FIREBASE_PROJECT_ID` matches your Firebase project
- Ensure service account has necessary permissions

### Organizations Not Loading
- Check Firestore structure matches expected schema
- Verify `organizations` collection exists
- Check Firebase Admin SDK initialization in server logs

## Support

For issues or questions, contact the development team.
