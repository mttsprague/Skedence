# Skedence Project Reference Guide
**Last Updated:** January 28, 2026  
**Firebase Project:** polyface-ae6d3  
**Production Domain:** https://skedence.com  
**Status:** Production (Live with Stripe payments)

---

## 🌐 Website Architecture

### Domain & Hosting Structure

**IMPORTANT:** All public URLs must use **skedence.com** domain. Never reference polyface-ae6d3.web.app in user-facing links.

#### Live Sites
- **Marketing Site:** https://skedence.com
  - Location: `/web/index.html`
  - Static HTML with Tailwind CSS
  - Header contains "Admin Portal" link → `/admin-portal/`

- **Admin Portal:** https://skedence.com/admin-portal/
  - Location: `/admin-portal/` (Next.js 16.1.4)
  - Built files deployed to: `/web/admin-portal/`
  - Owner login and management dashboard
  - Accessible from marketing site header link

- **Password Setup:** https://skedence.com/admin-portal/setup-password
  - Location: `/admin-portal/src/app/setup-password/`
  - Used by trainer invitation emails
  - Email auto-fill, dual password validation, iOS app download

#### Firebase Hosting Configuration
**File:** `/web/firebase.json`

```json
{
  "hosting": {
    "public": ".",
    "rewrites": [
      {
        "source": "/admin-portal/**",
        "destination": "/admin-portal/index.html"
      },
      {
        "source": "/**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**How it works:**
1. `/admin-portal/**` routes to admin portal Next.js app
2. All other routes (`/**`) serve marketing site

#### Deployment Process

**Deploy Everything:**
```bash
./deploy-website.sh
```

**What it does:**
1. Builds admin portal: `cd admin-portal && npm run build`
2. Copies build to web: `cp -r admin-portal/out web/admin-portal`
3. Deploys to Firebase: `cd web && firebase deploy --only hosting`

**Manual Steps:**
```bash
# Build admin portal only
cd admin-portal && npm run build

# Deploy hosting only
cd web && firebase deploy --only hosting

# Deploy Cloud Functions
cd SkedenceAdmin/functions && firebase deploy --only functions
```

### File Locations Reference

#### Marketing Website
- **HTML:** `/web/index.html`
- **CSS:** `/web/styles.css`
- **Images:** `/web/images/`
- **Firebase Config:** `/web/firebase.json`

#### Admin Portal (Next.js)
- **Source Code:** `/admin-portal/src/`
- **Pages:** `/admin-portal/src/app/`
- **Components:** `/admin-portal/src/components/`
- **Configuration:** `/admin-portal/next.config.ts`
- **Build Output:** `/admin-portal/out/` (generated, not committed)
- **Deployed Location:** `/web/admin-portal/` (copied from build)

#### Cloud Functions
- **Source:** `/SkedenceAdmin/functions/src/`
- **Trainer Invitations:** `/SkedenceAdmin/functions/src/trainerInvitations.ts`
- **Email Templates:** Uses skedence.com domain in all links
- **Configuration:** `/SkedenceAdmin/functions/tsconfig.json`
- **Environment:** `/SkedenceAdmin/functions/.env` (Stripe keys, NOT committed)

#### iOS Apps
- **Admin App:** `/SkedenceAdmin/SkedenceAdmin/`
- **Client App:** `/Skedence/Skedence/`

### Critical Rules

1. **Always use skedence.com domain** in:
   - Email templates
   - Hardcoded links
   - OAuth redirects
   - Share links
   
2. **Never use polyface-ae6d3.web.app** in:
   - User-facing emails
   - Public documentation
   - Social media links
   - App configurations

3. **Admin Portal basePath:**
   - Must be set to `'/admin-portal'` in `/admin-portal/next.config.ts`
   - Matches Firebase hosting subdirectory structure
   - DO NOT remove or change without updating firebase.json

4. **Deployment Order:**
   - Always build admin portal before deploying hosting
   - Deploy functions separately if only email templates changed
   - Test on skedence.com (not polyface domain) after deployment

---

## 🗄️ Firebase Firestore Schema

### Collections Structure

#### **organizations**
```
organizations/{orgId}
├── name: string
├── adminEmail: string
├── createdAt: timestamp
├── isActive: boolean
├── subscriptionStatus: "active" | "trialing" | "past_due" | "canceled"
├── subscriptionTier: "starter" | "studio" | "academy" | "enterprise"
├── stripeCustomerId: string
└── stripeSubscriptionId: string
```

#### **users**
```
users/{userId}
├── firstName: string
├── lastName: string
├── email: string (or emailAddress)
├── phoneNumber: string
├── role: "admin" | "trainer" | "client"
├── orgId: string (PRIMARY - reference to organization)
├── organizationId: string (LEGACY - backwards compatibility only)
├── isActive: boolean
├── createdAt: timestamp
└── profileImageUrl?: string

  SUBCOLLECTION: packages (NEW STANDARD PATH)
  organizations/{orgId}/users/{userId}/packages/{packageId}
  ├── packageType: string (e.g., "private", "2_athlete", "class_10_pack")
  ├── packageCategory: string ("pass" or "class")
  ├── packageName?: string (optional display title)
  ├── totalLessons: number
  ├── lessonsUsed: number
  ├── purchaseDate: timestamp
  ├── expirationDate: timestamp
  ├── transactionId: string
  └── orgId: string
  
  SUBCOLLECTION: lessonPackages (LEGACY PATH - backwards compatibility)
  users/{userId}/lessonPackages/{packageId}
  (Same schema as packages above)
```

#### **orgMembers** (Junction table)
```
orgMembers/{memberId}
├── orgId: string
├── userId: string
├── role: "admin" | "trainer" | "client"
├── joinedAt: timestamp
└── isActive: boolean
```

#### **trainers**
```
trainers/{trainerId}
├── firstName: string
├── lastName: string
├── email: string
├── phoneNumber: string
├── orgId: string
├── active: boolean
├── role: "trainer"
├── needsPasswordSetup: boolean (true for new invitations)
├── setupToken: string (UUID for password setup)
├── setupTokenExpiry: timestamp (7 days from creation)
├── userId: string (Firebase Auth UID, added after password setup)
├── passwordSetAt: timestamp (when password was created)
└── createdAt: timestamp

  SUBCOLLECTION: schedules
  trainers/{trainerId}/schedules/{scheduleId}
  ├── startTime: timestamp
  ├── endTime: timestamp
  ├── isBooked: boolean
  ├── location?: string
  ├── notes?: string
  └── createdAt: timestamp
  **NOTE:** No trainerId field in schedule docs (inherited from parent)
```

#### **bookings**
```
bookings/{bookingId}
├── clientId: string
├── trainerId: string
├── orgId: string
├── packageId: string (reference to lessonPackage)
├── scheduleId: string
├── startTime: timestamp
├── endTime: timestamp
├── status: "confirmed" | "cancelled" | "completed"
├── location?: string
├── notes?: string
└── createdAt: timestamp
```

#### **packages** (Client Lesson Passes & Class Passes)

**STANDARD PATH (Primary):**
```
organizations/{orgId}/users/{userId}/packages/{packageId}
├── packageType: string (e.g., "private", "2_athlete", "class_10_pack")
├── packageCategory: string ("pass" or "class")
├── packageName?: string (optional display title)
├── totalLessons: number
├── lessonsUsed: number
├── purchaseDate: timestamp
├── expirationDate: timestamp
├── transactionId: string
└── orgId: string
```

**LEGACY PATH (Backwards Compatibility):**
```
users/{userId}/lessonPackages/{packageId}
(Same schema as above)
```

**Usage Pattern:**
- **Reading:** Try new path first, fallback to legacy path
- **Writing (Admin):** Write to BOTH paths for compatibility
- **Writing (Stripe):** Write to new path only

#### **groupClasses**
```
groupClasses/{classId}
├── orgId: string
├── trainerId: string
├── className: string
├── description: string
├── startTime: timestamp
├── endTime: timestamp
├── location: string
├── maxCapacity: number
├── currentEnrollment: number
├── price: number
└── isActive: boolean
```

#### **waivers**
```
waivers/{waiverId}
├── clientId: string
├── orgId: string
├── signedAt: timestamp
├── waiverText: string
├── signature: string (base64 or URL)
└── ipAddress?: string
```

---

## � Schema Standards & Data Patterns

### User Organization Field
**PRIMARY:** `orgId` (string)  
**LEGACY:** `organizationId` (string) - kept for backwards compatibility

**Code Pattern:**
```typescript
// Cloud Functions - Always check both fields
let orgId = userData.orgId as string | undefined;
if (!orgId) {
  orgId = userData.organizationId as string | undefined;
}
```

### Package Storage Paths
**PRIMARY:** `organizations/{orgId}/users/{userId}/packages/{packageId}`  
**LEGACY:** `users/{userId}/lessonPackages/{packageId}`

**Reading Pattern:**
```typescript
// Try new path first
let packageDoc = await db.collection("organizations")
  .doc(orgId).collection("users").doc(userId)
  .collection("packages").doc(packageId).get();

// Fallback to old path
if (!packageDoc.exists) {
  packageDoc = await db.collection("users")
    .doc(userId).collection("lessonPackages")
    .doc(packageId).get();
}
```

**Writing Pattern (Admin Functions):**
```swift
// Write to BOTH paths for compatibility
try await db.collection("users").document(userId)
  .collection("lessonPackages").addDocument(data: passData)
  
try await db.collection("organizations").document(orgId)
  .collection("users").document(userId)
  .collection("packages").addDocument(data: passData)
```

**See Also:** `SCHEMA_STANDARDS.md` for complete documentation

---

## �📱 Skedence iOS App (Client App)

**Location:** `/Skedence/`  
**Target:** Clients who book lessons and manage their schedules

### Key Features
- **Authentication:** Firebase Auth with email/password
- **Home Dashboard:** Upcoming lessons, quick actions, waiver status
- **Book Sessions:** Browse trainer availability, select time slots, book using lesson passes
- **My Schedule:** View upcoming and past bookings, monthly calendar view
- **Purchase Passes:** Stripe integration for buying lesson packages (Starter, Studio, Academy, Enterprise tiers)
- **Profile Management:** Edit personal info, view pass balance
- **Waiver Signing:** Digital waiver with signature capture and PDF generation
- **Group Classes:** Browse and enroll in group training sessions

### Key Files
- `SkedenceApp.swift` - App entry point
- `AuthManager.swift` - Firebase authentication
- `BookingsService.swift` - Booking CRUD operations
- `PackagesService.swift` - Lesson pass management
- `StripeService.swift` - Payment processing
- `PurchaseManager.swift` - In-app purchase flow
- `WaiverPDFGenerator.swift` - Generate signed waiver PDFs
- `DesignSystem.swift` - Brand colors and UI components

### Tech Stack
- SwiftUI
- Firebase SDK (Auth, Firestore, Storage)
- Stripe iOS SDK
- Combine framework

---

## 🖥️ SkedenceAdmin iOS App (Trainer/Admin App)

**Location:** `/SkedenceAdmin/`  
**Target:** Trainers and administrators

### Key Features
- **Authentication:** Firebase Auth (admin/trainer roles)
- **Client Management:** View all clients, search, view details, passes, booking history
- **Schedule Management:** Create/edit availability slots, view weekly schedule
- **Booking Management:** View all bookings, create bookings for clients, cancel/reschedule
- **Trainer Management:** Add/edit trainers, assign schedules
- **Analytics Dashboard:** Revenue, bookings count, client stats
- **Group Classes:** Create and manage group training sessions

### Key Files
- `SkedenceAdminApp.swift` - App entry point
- `ClientsViewModel.swift` - Client data management
- `ClientDetailView.swift` - Individual client management
- `AuthManager.swift` - Role-based authentication
- Similar service files as client app

### Tech Stack
- SwiftUI
- Firebase SDK
- Admin-specific UI components

---

## 🌐 Skedence Website (Marketing + Admin Portal)

**Location:** `/web/` (deployment source) and `/admin-portal/` (Next.js source)  
**Marketing URL:** https://skedence.com  
**Admin Portal URL:** https://skedence.com/admin-portal/  
**Firebase URL:** https://polyface-ae6d3.web.app

### Website Structure

#### Marketing Site (`web/`)
- **Home Page:** Blue hero section, features, pricing, CTA
- **Navigation:** Header with logo, features, pricing, support, about, admin-portal link
- **Footer:** Privacy policy, terms, support links
- **Pages:** index.html, about.html, privacy.html, support.html, terms.html
- **Static Assets:** style.css, script.js, logo.png, favicon

#### Admin Portal (`web/admin-portal/`)
- **Dashboard:** Stats overview, quick actions, recent activity
- **Clients Page:** Search/filter clients, view client cards
- **Trainers Page:** Manage trainer roster, view schedules
- **Schedule Page:** Week view grid with availability slots, horizontal scroll on mobile
- **Bookings Page:** Create new bookings, select client/trainer/time slot
- **Analytics:** Charts and metrics (Recharts)
- **Settings:** Organization settings, billing management
- **Mobile Optimized:** Responsive design for phone, tablet, and iPad (portrait/landscape)

### Tech Stack
- **Marketing Site:** Static HTML/CSS/JS
- **Admin Portal Framework:** Next.js 16.1.4 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/ui
- **Charts:** Recharts
- **Auth:** Firebase Auth (custom useAuth hook)
- **Database:** Firestore SDK
- **Deployment:** Firebase Hosting (static export)

### Deployment
**Quick Deploy:** Run `./deploy-website.sh` from project root
- Builds admin portal with Next.js
- Copies build to `web/admin-portal/`
- Deploys entire site to Firebase Hosting

### Key Files & Patterns

#### Authentication
- `src/hooks/useAuth.tsx` - Auth state management with anti-glitch pattern
  ```typescript
  // CRITICAL: Early return prevents re-renders
  if (firebaseUser && validatedUserId.current === firebaseUser.uid && hasCompletedInitialCheck.current) {
    return; // Already validated, don't update state
  }
  ```

#### Layout
- `src/components/dashboard-layout.tsx` - Page wrapper with sidebar
- `src/components/sidebar.tsx` - Navigation with mobile hamburger menu
  - Fixed header on mobile (h-16)
  - Slide-in sidebar animation
  - Touch-friendly buttons

#### Pages
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/clients/page.tsx` - Client list with search
- `src/app/trainers/page.tsx` - Trainer list with search
- `src/app/schedule/page.tsx` - Weekly schedule grid
- `src/app/bookings/page.tsx` - Create booking form
- `src/app/analytics/page.tsx` - Charts and metrics

#### Mobile Optimizations
- **Viewport:** Configured in `layout.tsx` metadata
- **Touch Targets:** Minimum 44px height (iOS guideline)
- **Responsive Classes:** `text-2xl sm:text-3xl`, `p-4 sm:p-6 lg:p-8`
- **Touch Manipulation:** CSS class on all interactive elements
- **Horizontal Scroll:** Schedule grid on mobile
- **Active States:** `active:shadow-xl` for touch feedback

#### Data Fetching Patterns
```typescript
// Trainers subcollection pattern
const schedulesRef = collection(db, `trainers/${trainerId}/schedules`);
const q = query(schedulesRef, where('isBooked', '==', false));
// Note: No trainerId filter needed - docs are already scoped to trainer
```

---

## � Trainer Invitation & Password Setup Flow

### Overview
When an admin adds a new trainer, they receive an invitation email with a deep link to set up their password. This flow ensures trainers can securely create their accounts without the admin having to manually share passwords.

### Step-by-Step Process

1. **Admin Adds Trainer** (SuperAdminViewModel.swift)
   - Creates `trainers/{trainerId}` document with:
     - `needsPasswordSetup: true`
     - `setupToken: UUID()` (unique secure token)
     - `setupTokenExpiry: Date + 7 days`
     - Email, name, orgId
   - Creates `orgMembers/{trainerId}_{orgId}` entry with role

2. **Cloud Function Triggered** (trainerInvitations.ts)
   - Firestore trigger: `onDocumentCreated("trainers/{trainerId}")`
   - Checks if `needsPasswordSetup === true`
   - Fetches organization and owner info
   - Generates deep link: `skedence://setup-password?token={token}&email={email}&trainerId={id}`
   - Sends email via Firebase Email Extension with:
     - Setup link button (prominent green button)
     - App Store / Play Store download links
     - Clear instructions
     - 7-day expiration notice

3. **Trainer Opens Email**
   - Clicks "Set Up Password" button
   - Deep link opens SkedenceAdmin app (or prompts to download)
   - URL scheme: `skedence://` (registered in Info.plist)

4. **App Handles Deep Link** (SkedenceAdminApp.swift)
   - `onOpenURL` parses query parameters
   - Extracts token, email, trainerId
   - Sets `passwordSetupData` state
   - Navigates to `PasswordSetupView`

5. **Password Setup Screen** (PasswordSetupView.swift)
   - Shows trainer's email (read-only)
   - Password and confirm password fields
   - Real-time password requirements validation:
     - Minimum 8 characters
     - Uppercase and lowercase letters
     - Contains a number
   - "Create Account" button (disabled until valid)

6. **Password Creation Process**
   - Validates setup token:
     - Checks token matches stored value
     - Verifies not expired (< 7 days old)
     - Confirms email matches
   - Creates Firebase Auth account: `Auth.auth().createUser(withEmail:password:)`
   - Gets Firebase UID from result
   - Updates trainer document:
     - `userId: firebaseUid` (links to Firebase Auth)
     - `needsPasswordSetup: false`
     - `passwordSetAt: timestamp`
     - Deletes `setupToken` and `setupTokenExpiry`
   - Updates orgMembers:
     - Creates new doc: `{firebaseUid}_{orgId}`
     - Copies role and membership data
     - Deletes old doc if different from new one
   - Success alert shown
   - Auth listener automatically signs in and navigates to main app

### Security Features
- **Unique Tokens**: UUID generated per invitation
- **Time-Limited**: 7-day expiration on setup links
- **Single Use**: Token deleted after successful setup
- **Email Verification**: Must match stored email
- **Strong Passwords**: Enforced requirements
- **Secure Storage**: Tokens stored in Firestore (server-side)

### Error Handling
- **Invalid Token**: "Invalid or expired setup link"
- **Expired Link**: "This setup link has expired. Contact admin."
- **Email Mismatch**: "Email mismatch. Use correct setup link."
- **Weak Password**: "Password is too weak."
- **Email Already Used**: "This email is already in use. Try signing in."
- **Network Errors**: Displays Firebase error message

### Deep Link Configuration
- **URL Scheme**: `skedence://`
- **Host**: `setup-password`
- **Parameters**: `token`, `email`, `trainerId`
- **Registered in**: Info.plist `CFBundleURLTypes`
- **Example**: `skedence://setup-password?token=abc123&email=trainer@example.com&trainerId=xyz789`

### Email Template Features
- Branded header with gradient
- Prominent green "Set Up Password" button
- Step-by-step visual guide
- App download links (iOS & Android)
- Warning box with key info
- Mobile-responsive HTML design

### Testing
1. Add trainer via SuperAdminView
2. Check Cloud Functions logs for email sent
3. Open email on mobile device
4. Click setup link (should open app)
5. Set password and verify auto-login
6. Check Firestore for updated trainer doc

---

## �💳 Stripe Integration

**Environment:** LIVE MODE (Production)  
**Keys Location:** `SkedenceAdmin/functions/.env`

### Subscription Tiers
- **Starter:** $29/month - `price_1SpKItFIh2MhEffNfsBy4HyT`
- **Studio:** $79/month - `price_1SpKMkFIh2MhEffNgGdbgMr5`
- **Academy:** $149/month - `price_1SpKNrFIh2MhEffNqZf64sPA`
- **Enterprise:** $299/month - `price_1SpKOrFIh2MhEffNjU5v5X4P`

### Payment Flow
1. Client selects package in iOS app
2. `StripeService.swift` creates payment sheet
3. Payment processed via Stripe SDK
4. Webhook updates Firestore `lessonPackages` collection
5. Client's `remainingLessons` incremented

### Webhook Endpoint
- **URL:** Set in Stripe Dashboard
- **Handler:** Firebase Cloud Functions (`SkedenceAdmin/functions/src/index.ts`)
- **Events:** `checkout.session.completed`, `invoice.payment_succeeded`

---

## 🔧 Key Technical Patterns

### Auth State Management (Web)
```typescript
// useAuth.tsx - Prevents infinite loops
const validatedUserId = useRef<string | null>(null);
const hasCompletedInitialCheck = useRef(false);

// Early return before setState
if (firebaseUser && validatedUserId.current === firebaseUser.uid) {
  return; // Already validated
}
```

### Availability Slot Filtering
```typescript
// DON'T filter by trainerId - it doesn't exist in subcollection docs
const schedulesRef = collection(db, `trainers/${trainerId}/schedules`);
const q = query(schedulesRef, where('isBooked', '==', false));
// Docs are already scoped to specific trainer via parent path
```

### Mobile Responsive Pattern
```tsx
// Tailwind mobile-first approach
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
<div className="p-4 sm:p-6 lg:p-8">
<button className="min-h-[44px] touch-manipulation">
```

---

## 🚨 Common Issues & Solutions

### Issue: Auth Loop (Page reloading infinitely)
**Cause:** `onAuthStateChanged` triggers re-render → setState → re-render loop  
**Solution:** Use refs to track validation state, early return before setState

### Issue: Availability slots not showing
**Cause:** Filtering by `trainerId` field that doesn't exist in subcollection  
**Solution:** Remove filter - docs already scoped by parent path

### Issue: Console spam
**Cause:** Debug logs in production build  
**Solution:** Remove `console.log` statements, keep only `console.error`

### Issue: Mobile layout broken
**Cause:** Fixed pixel widths, no responsive classes  
**Solution:** Use Tailwind breakpoints, touch-manipulation class, min-h-[44px]

---

## 📦 Package Management

### Web App Dependencies
```json
{
  "next": "16.1.4",
  "react": "^19.0.0",
  "firebase": "^11.2.0",
  "tailwindcss": "^3.4.1",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.468.0",
  "recharts": "^2.15.0"
}
```

### iOS Dependencies
- Firebase SDK (Auth, Firestore, Storage)
- Stripe iOS SDK
- SwiftUI (native)

---

## 🔐 Security Rules

### Firestore Rules Location
- iOS Client: `Skedence/firestore.rules`
- Admin: `SkedenceAdmin/firestore.rules`

**⚠️ IMPORTANT: Both files MUST be identical mirrors of each other!**

These files secure the same Firebase project (polyface-ae6d3) and must always match. When updating security rules:
1. Make changes to one file
2. **Immediately copy changes to the other file**
3. Deploy both: 
   - `cd Skedence && firebase deploy --only firestore:rules`
   - `cd SkedenceAdmin && firebase deploy --only firestore:rules`

### Key Rules
- Users can only read/write their own data
- Trainers can read clients in their org
- Admins have full access to their org
- Bookings require valid packageId with remaining lessons
- Password setup: Allows reading trainer docs with `needsPasswordSetup: true` and updating to link Firebase UID

---

## 🚀 Deployment

### Website (Marketing + Admin Portal)
**Recommended:** Use the deployment script
```bash
./deploy-website.sh
```

**Manual Steps:**
```bash
# 1. Build admin portal
cd admin-portal
npm run build

# 2. Copy to web directory
cd ..
rm -rf web/admin-portal
cp -r admin-portal/out web/admin-portal

# 3. Deploy to Firebase
cd web
firebase deploy --only hosting
```

**Important:**
- Always deploy from the `web/` directory
- Never deploy from `admin-portal/` directory alone
- The `web/` directory contains both marketing site and admin portal
- Marketing site files are in `web/*.html`, admin portal is in `web/admin-portal/`

### iOS Apps
- Build in Xcode
- Archive and upload to App Store Connect
- TestFlight for beta testing

---

## 📝 Terminology

- **Packages** → **Passes** (user-facing term for lesson packages)
- **Organization** → Single entity (gym, studio, academy)
- **OrgId** → Links all users, trainers, bookings to one organization
- **Schedule** → Trainer's available time slot
- **Booking** → Confirmed appointment using a pass

---

## 🎨 Brand Colors

- **Primary:** #3258A3 (Blue)
- **Secondary:** Teal (#14B8A6)
- **Success:** Green
- **Warning:** Yellow
- **Error:** Red

---

## 📞 Important Notes

1. **Always check orgId** when querying data
2. **Subcollections don't inherit parent ID** as a field
3. **Use refs for auth state** to prevent re-render loops
4. **Touch targets must be 44px minimum** on mobile
5. **Test on actual devices** for mobile/iPad optimization
6. **Live Stripe keys** are in production - handle with care
7. **Firebase project name** is "polyface-ae6d3" (legacy name)

---

*For new conversations, read this file first to understand the project architecture and current state.*
