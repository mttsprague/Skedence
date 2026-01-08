# Phase 11 - Production Hardening Implementation

## Overview
This document details the implementation of production hardening features for Skedence, including admin tooling, abuse prevention, billing guardrails, and observability.

---

## ✅ Step 11.1: Tenant Admin Panel (Internal)

### Implementation
Created a Next.js admin panel at `SkedenceAdmin/admin-panel/`

### Features
- **Organization Management**
  - Search organizations by name or ID
  - View all organizations with real-time stats
  - Enable/disable organizations
  - View subscription status and billing information
  - View organization members
  - View recent events/errors (if events collection exists)

- **Dashboard Statistics**
  - Total organizations count
  - Active subscriptions
  - Trial organizations
  - Disabled organizations

- **Security**
  - Email allowlist protection (`ADMIN_EMAILS` env variable)
  - Firebase Admin SDK for secure backend operations
  - Protected API routes with admin email validation

### Setup Instructions
See `SkedenceAdmin/admin-panel/README.md` for complete setup instructions.

**Quick Start:**
```bash
cd SkedenceAdmin/admin-panel
npm install
cp .env.local.example .env.local
# Edit .env.local with your Firebase service account key and admin emails
npm run dev
```

Admin panel runs on: **http://localhost:3001**

### API Endpoints
- `GET /api/orgs` - List all organizations with stats
- `GET /api/orgs/[orgId]` - Get organization details
- `PATCH /api/orgs/[orgId]` - Update organization (enable/disable)

### Future Enhancements
- [ ] Implement "impersonate org" view-only mode
- [ ] Add OAuth/SSO authentication
- [ ] Real-time dashboard updates
- [ ] Advanced filtering and search
- [ ] Bulk operations
- [ ] Audit log for admin actions
- [ ] Email notifications for critical events

---

## ✅ Step 11.2: Guardrails to Prevent Abuse / Runaway Costs

### Implementation
Created `SkedenceAdmin/functions/src/quotas.ts` with comprehensive quota and rate limiting system.

### Features

#### 1. **Quota Limits Per Plan**

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Bookings/Day | 10 | 100 | 500 | Unlimited |
| Classes/Day | 5 | 50 | 200 | Unlimited |
| Messages/Day | 50 | 500 | 2000 | Unlimited |
| File Uploads/Day | 10 | 100 | 500 | Unlimited |
| Max File Size | 5MB | 10MB | 25MB | 100MB |
| Max Storage | 1GB | 10GB | 50GB | 500GB |

#### 2. **Rate Limiting**
- **Booking Creation:** 10 attempts per minute per user
- Prevents spam and accidental loops
- Automatic reset after time window
- Rate limit data stored in Firestore (`rateLimits` collection)

#### 3. **Usage Tracking**
- Daily usage counters per organization
- Stored in `organizations/{orgId}/usage/{YYYY-MM-DD}`
- Tracks: bookings, classes, messages, fileUploads
- Automatic daily reset

#### 4. **Organization Access Control**
- Check if organization is disabled
- Check subscription status (expired, past_due, canceled)
- Enforce read-only mode for non-payment states

### Code Integration

Updated `bookLesson` function in `SkedenceAdmin/functions/src/index.ts`:

```typescript
// Rate limiting check
const rateCheck = await checkRateLimit(`booking:${userId}`, 10, 60);

// Quota check
const quotaCheck = await checkQuota(orgId, "bookings");

// Org access check
const orgAccess = await checkOrgAccess(orgId);

// Increment usage after successful booking
await incrementUsage(orgId, "bookings");
```

### Storage Rules
Updated `Skedence/storage.rules` with file size limits:
- User documents: 10MB max
- Org documents: 25MB max
- Profile images: 5MB max
- PDF and image file type validation

### Firestore Security Rules
Update firestore.rules to add quota checks (recommended):
```javascript
match /organizations/{orgId}/usage/{date} {
  allow read: if isOrgMember(orgId);
  allow write: if false; // Only Cloud Functions can write
}
```

---

## ✅ Step 11.3: Non-Payment State Handling

### Implementation
Integrated into quota system (`checkOrgAccess` function).

### Behavior

#### Subscription States and Access:

| Status | Clients | Trainers | Behavior |
|--------|---------|----------|----------|
| `active` | Full access | Full access | Normal operation |
| `trialing` | Full access | Full access | Normal operation |
| `past_due` | Read-only | Read-only | Paywall CTA shown |
| `canceled` | Read-only | Read-only | Paywall CTA shown |
| `incomplete` | Blocked | Blocked | "Complete subscription" message |

#### Read-Only Mode
When subscription expires or payment fails:
- ✅ Clients can **view** schedule and past bookings
- ❌ Clients **cannot** create new bookings
- ✅ Trainers can **view** schedule and client info
- ❌ Trainers **cannot** create new availability slots
- 🔔 Prominent paywall CTA displayed

### iOS Implementation Needed
Add UI checks in:
- `BookView.swift` - Show paywall before booking
- `ScheduleView.swift` - Show paywall before creating availability
- `HomeView.swift` - Display subscription status banner

Example:
```swift
if orgAccess.isReadOnly {
    // Show paywall banner
    VStack {
        Text("Subscription Expired")
        Text("Update payment method to continue booking")
        Button("Update Subscription") {
            // Navigate to billing
        }
    }
}
```

---

## ✅ Step 11.4: Crash + Event Tracking

### Implementation

#### 1. **Firebase Analytics Integration**
Created `Skedence/Skedence/AnalyticsService.swift`

**Conversion Funnel Events:**
- `org_created` - Organization created
- `stripe_connected` - Stripe Connect linked
- `package_created` - Lesson package created
- `client_invited` - Client invitation sent
- `first_booking_created` - First booking made
- `subscription_activated` - Subscription started

**User Journey Events:**
- User sign up
- User login
- Profile completed
- Waiver signed
- Booking created/canceled
- Class registered
- Package purchased

**Usage:**
```swift
// Track events
AnalyticsService.shared.logOrganizationCreated(orgId: "org123", orgName: "Acme Training")
AnalyticsService.shared.logPackagePurchased(packageId: "pkg456", price: 99.99, method: "stripe")

// Set user properties
AnalyticsService.shared.setUserId("user123")
AnalyticsService.shared.setUserRole("trainer")
AnalyticsService.shared.setUserPlan("professional")
```

#### 2. **Firebase Crashlytics Integration**
Created `Skedence/Skedence/CrashlyticsService.swift`

**Features:**
- Automatic crash reporting
- Non-fatal error logging
- Custom key-value context
- User identification
- Specialized error logging (booking, payment, auth, Firestore, API errors)

**Usage:**
```swift
// Set user context
CrashlyticsService.shared.setUserId("user123")
CrashlyticsService.shared.setUserRole("trainer")
CrashlyticsService.shared.setOrganizationId("org123")

// Log errors
CrashlyticsService.shared.logError(error, context: "booking")
CrashlyticsService.shared.logBookingError(error, bookingDetails: details)
CrashlyticsService.shared.logPaymentError(error, amount: 99.99, method: "stripe")

// Log breadcrumbs
CrashlyticsService.shared.log("User attempted booking")
```

### Firebase Setup Required

#### Enable Analytics:
1. Go to Firebase Console > Analytics
2. Enable Google Analytics for project
3. Already enabled if using GoogleService-Info.plist

#### Enable Crashlytics:
1. Go to Firebase Console > Crashlytics
2. Click "Enable Crashlytics"
3. Add Firebase Crashlytics SDK to Xcode project:

**Podfile (if using CocoaPods):**
```ruby
pod 'Firebase/Crashlytics'
pod 'Firebase/Analytics'
```

**OR Swift Package Manager (Xcode):**
1. File > Add Packages
2. Search: `https://github.com/firebase/firebase-ios-sdk`
3. Add: FirebaseCrashlytics, FirebaseAnalytics

4. In Build Phases, add Run Script:
```bash
"${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
```

#### Initialize in App:
Update `Skedence/Skedence/SkedenceApp.swift`:

```swift
import FirebaseCore
import FirebaseCrashlytics
import FirebaseAnalytics

@main
struct SkedenceApp: App {
    init() {
        FirebaseApp.configure()
        
        // Initialize services
        _ = CrashlyticsService.shared
        _ = AnalyticsService.shared
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### Repeat for SkedenceAdmin App
Copy AnalyticsService.swift and CrashlyticsService.swift to SkedenceAdmin project and integrate the same way.

---

## Testing Checklist

### Admin Panel
- [ ] Admin panel runs on localhost:3001
- [ ] Can view all organizations
- [ ] Can search organizations
- [ ] Can enable/disable organizations
- [ ] Dashboard stats display correctly
- [ ] Unauthorized emails are blocked

### Quota System
- [ ] Booking creation respects rate limits
- [ ] Daily quota limits enforced
- [ ] Usage counters increment correctly
- [ ] Error messages are user-friendly
- [ ] Free plan has lower limits than paid plans

### Non-Payment State
- [ ] Expired subscriptions show read-only mode
- [ ] Past due payments show paywall
- [ ] Active subscriptions work normally
- [ ] Disabled orgs are blocked completely

### Analytics & Crashlytics
- [ ] Conversion events are tracked in Firebase console
- [ ] User properties are set correctly
- [ ] Non-fatal errors appear in Crashlytics
- [ ] Crashes are reported (test carefully!)
- [ ] User context appears in crash reports

---

## Deployment Instructions

### 1. Deploy Cloud Functions
```bash
cd SkedenceAdmin/functions
npm run build
firebase deploy --only functions
```

### 2. Deploy Storage Rules
```bash
cd Skedence
firebase deploy --only storage
```

### 3. Deploy Admin Panel
See `SkedenceAdmin/admin-panel/README.md` for deployment options:
- Vercel (recommended)
- Traditional Node.js server
- Docker container

### 4. Update iOS Apps
1. Add Crashlytics & Analytics SDKs
2. Add AnalyticsService.swift and CrashlyticsService.swift to targets
3. Initialize in SkedenceApp.swift
4. Add event tracking throughout app
5. Test in TestFlight before production

---

## Monitoring & Maintenance

### Daily Checks
- Review Crashlytics dashboard for new crashes
- Check Analytics for conversion funnel drop-offs
- Monitor quota usage patterns in admin panel
- Review disabled organizations

### Weekly Checks
- Review rate limit triggers (may need adjustment)
- Check for quota abuse patterns
- Review failed payment notifications
- Analyze conversion funnel metrics

### Monthly Checks
- Review and adjust quota limits based on usage
- Update admin allowlist if team changes
- Review storage usage per organization
- Audit disabled organizations

---

## Security Considerations

### Admin Panel
- ⚠️ **Never commit** `.env.local` or service account keys
- ⚠️ Service account key has full admin access - protect carefully
- ✅ Use strong passwords for admin emails
- ✅ Consider adding IP whitelisting in production
- ✅ Enable HTTPS (automatic on Vercel)
- ✅ Add session management for production
- ✅ Implement audit logging for admin actions

### Rate Limiting
- Clean up old rate limit documents regularly (automated function recommended)
- Monitor for distributed attacks across multiple accounts
- Adjust limits based on legitimate usage patterns

### Quota System
- Store quota limits in Firestore for dynamic updates
- Add admin UI to adjust quotas per organization
- Monitor for quota gaming or exploitation

---

## Cost Optimization

### Firestore Reads
- Rate limiting prevents runaway queries
- Quota checks are cached for 1 minute (recommended)
- Usage documents are daily (not per-transaction)

### Storage
- File size limits prevent storage bloat
- Enforce cleanup of old/unused files
- Monitor storage usage per org

### Cloud Functions
- Rate limiting reduces unnecessary function calls
- Quota checks happen before expensive operations
- Consider function timeouts and memory limits

---

## Future Enhancements

### Phase 11.5: Advanced Monitoring
- [ ] Real-time alerting for critical errors
- [ ] Automated rollback on deployment issues
- [ ] Performance monitoring and optimization
- [ ] Cost anomaly detection

### Phase 11.6: Advanced Analytics
- [ ] Cohort analysis
- [ ] A/B testing framework
- [ ] Predictive churn modeling
- [ ] Revenue attribution

### Phase 11.7: Advanced Admin Features
- [ ] Impersonate organization (view-only)
- [ ] Bulk operations (enable/disable multiple orgs)
- [ ] Export data for analysis
- [ ] Automated compliance reports
- [ ] Customer success scoring

---

## Support & Troubleshooting

### Common Issues

#### "Unauthorized" in Admin Panel
- Check `ADMIN_EMAILS` environment variable
- Verify email matches exactly (case-insensitive)
- Clear browser cache

#### Quota Checks Not Working
- Verify Cloud Functions are deployed
- Check Firestore `organizations` collection structure
- Verify `subscriptionPlan` field exists on org documents

#### Analytics Events Not Appearing
- Wait 24-48 hours for first data
- Check Firebase Console > Analytics > DebugView for real-time testing
- Verify Firebase SDK is initialized

#### Crashlytics Not Reporting
- Verify Crashlytics is enabled in Firebase Console
- Check that upload symbols script is running in Build Phases
- Test with a non-fatal error first

---

## Completion Status

✅ **Step 11.1** - Tenant Admin Panel: **COMPLETE**
✅ **Step 11.2** - Guardrails & Quotas: **COMPLETE**
✅ **Step 11.3** - Non-Payment State: **COMPLETE**
✅ **Step 11.4** - Crash & Event Tracking: **COMPLETE**

### Remaining Work
- [ ] Deploy Cloud Functions with quota system
- [ ] Set up admin panel on production server
- [ ] Add Crashlytics SDK to both iOS apps
- [ ] Integrate AnalyticsService throughout iOS codebase
- [ ] Add read-only mode UI in iOS apps
- [ ] Test all features in staging environment
- [ ] Monitor for 1 week, adjust quotas as needed

**Estimated Time to Full Production:** 2-3 days

---

## Questions or Issues?
Contact the development team or refer to:
- Admin Panel README: `SkedenceAdmin/admin-panel/README.md`
- Firebase Documentation: https://firebase.google.com/docs
- Stripe Connect Documentation: https://stripe.com/docs/connect
