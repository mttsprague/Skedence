# CLAUDE.md - Complete Skedence/CoachFlow Project Reference

**Last Updated:** February 25, 2026  
**Firebase Project:** polyface-ae6d3  
**Production Domain:** https://skedence.com (Unified Admin Portal & Marketing Site)
**Status:** Production (Live with Stripe payments)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Website Architecture](#website-architecture)
3. [Firestore Database Schema](#firestore-database-schema)
4. [Schema Standards & Migration Patterns](#schema-standards--migration-patterns)
5. [Pricing Structure System](#pricing-structure-system)
6. [iOS Apps Architecture](#ios-apps-architecture)
7. [Admin Portal (Next.js)](#admin-portal-nextjs)
8. [Blog System](#blog-system)
9. [Cloud Functions](#cloud-functions)
10. [Trainer Invitation & Password Setup Flow](#trainer-invitation--password-setup-flow)
11. [Stripe Integration](#stripe-integration)
12. [SaaS Transformation Status](#saas-transformation-status)
13. [Security & Firestore Rules](#security--firestore-rules)
14. [Deployment Procedures](#deployment-procedures)
15. [Common Issues & Solutions](#common-issues--solutions)
16. [Key Technical Patterns](#key-technical-patterns)

---

## 🎯 Project Overview

### What is Skedence/CoachFlow?
A multi-tenant SaaS platform for fitness and sports organizations to manage:
- **Client scheduling** - Book 1-on-1 and group training sessions
- **Trainer management** - Assign schedules, track availability
- **Lesson packages** - Sell and track lesson passes (private, 2-athlete, 3-athlete, classes)
- **Payments** - Stripe Connect integration (organizations keep 100% of revenue)
- **Dynamic branding** - Each organization has custom colors and branding

### Platform Components
- **Skedence (iOS Client App)** - For clients to book lessons, view schedule, purchase passes
- **SkedenceAdmin (iOS Admin App)** - For trainers/owners to manage business
- **Admin Web Portal** - https://skedence.com/admin-portal/ - Full web dashboard
- **Marketing Website** - https://skedence.com - Public landing page
- **Firebase Backend** - Firestore database, Cloud Functions, Authentication
- **Stripe Connect** - Payment processing (businesses keep 100% of revenue)

### Key Technologies
- **iOS:** SwiftUI, Firebase SDK, Stripe iOS SDK
- **Web:** Next.js 16.1.4, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Node.js Cloud Functions, Firebase Admin SDK
- **Database:** Firestore (multi-tenant architecture)
- **Payments:** Stripe Connect (Express accounts)
- **Hosting:** Firebase Hosting

---

## 🌐 Website Architecture

### Current Architecture (Updated Feb 2026)

**Active Admin Portal:** `skedence-unified/` - Next.js 16.1.6 app
- **Live URL:** https://skedence.com
- **Framework:** Next.js 16.1.6 with App Router
- **Build Mode:** Static export (`output: 'export'`)
- **Deployment:** Firebase Hosting on skedence.com domain
- **Build Output:** `out/` directory

### Domain & Hosting Structure

**IMPORTANT:** The unified admin portal is deployed to **skedence.com**. This domain hosts both the marketing site and admin portal.

#### Live Sites
- **Unified Admin Portal & Marketing Site:** https://skedence.com
  - Location: `/skedence-unified/`
  - Next.js 16.1.6 static site
  - Full admin dashboard with reports, clients, trainers, scheduling, etc.
  - Marketing home page, legal pages (privacy, terms, support)
  - Built with: `npm run build` (outputs to `out/`)
  - Deployed with: `firebase deploy --only hosting`

- **Legacy Admin Portal:** `/admin-portal/` (archived)
  - Old Next.js 14 app
  - Replaced by unified portal
  - No longer deployed

#### Firebase Hosting Configuration
**File:** `/skedence-unified/firebase.json`

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

**How it works:**
1. All routes (`**`) are handled by the Next.js app via client-side routing
2. `cleanUrls: true` removes `.html` extensions
3. Static export mode means all routes are pre-rendered at build time
4. Dynamic routes (like `/clients/[id]`) are disabled for static export compatibility

#### Deployment Process

**Deploy Unified Admin Portal:**
```bash
cd skedence-unified
npm run build
firebase deploy --only hosting
```

**What it does:**
1. Builds Next.js app with static export: `next build`
2. Generates static files in: `out/` directory
3. Deploys to Firebase Hosting: `firebase deploy --only hosting`
4. Goes live at: https://skedence.com

**Quick Deploy Script:**
```bash
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified"
npm run build && firebase deploy --only hosting
```

**Manual Steps:**
```bash
# Build only
cd skedence-unified && npm run build

# Deploy only (must build first)
cd skedence-unified && firebase deploy --only hosting

# Deploy Cloud Functions (separate)
cd SkedenceAdmin/functions && firebase deploy --only functions
```

**Important Notes:**
- Always build before deploying (`npm run build`)
- Build output goes to `out/` directory (not committed to git)
- Static export mode means no server-side rendering
- Dynamic routes like `/clients/[id]` require `generateStaticParams()` or must be disabled
- Current setup uses query params (e.g., `/clients/detail?id=xxx`) instead of path params

### File Locations Reference

#### Unified Admin Portal (Current - Active)
- **Root Directory:** `/skedence-unified/`
- **Source Code:** `/skedence-unified/src/`
- **Pages:** `/skedence-unified/src/app/`
- **Components:** `/skedence-unified/src/components/`
- **Configuration:** `/skedence-unified/next.config.ts`
- **Firebase Config:** `/skedence-unified/firebase.json`
- **Build Output:** `/skedence-unified/out/` (generated, not committed)
- **Package Manager:** npm
- **Node Version:** 20.x

#### Key Admin Portal Features
- **Reports Section:**
  - `/reports/appointments` - Appointment analytics (default view)
  - `/reports/revenue` - Revenue tracking
  - `/reports/users` - Client sign-up analytics (new as of Feb 10, 2026)
  - Dashboard tab removed as of Feb 10, 2026
  
- **Main Sections:**
  - `/activity` - Activity feed
  - `/clients` - Client management (uses `/clients/detail?id=xxx` for details)
  - `/trainers` - Trainer management  
  - `/schedule` - Scheduling calendar
  - `/passes` - Lesson package management
  - `/pricing` - Pricing structure configuration
  - `/settings` - Organization settings, intake forms, notifications, etc.

#### Legacy Sites (Inactive)
- **Old Marketing Site:** `/web/` (not deployed)
- **Old Admin Portal:** `/admin-portal/` (replaced by unified portal)
- **Old Admin Portal Legacy:** `/admin-portal-legacy/` (archived)

#### Cloud Functions
- **Source:** `/SkedenceAdmin/functions/src/`
- **Trainer Invitations:** `/SkedenceAdmin/functions/src/trainerInvitations.ts`
- **Booking Alerts:** `/SkedenceAdmin/functions/src/bookingAlerts.ts`
- **Email Templates:** Uses skedence.com domain in all links
- **Configuration:** `/SkedenceAdmin/functions/tsconfig.json`
- **Environment:** `/SkedenceAdmin/functions/.env` (Stripe keys, NOT committed)

#### iOS Apps
- **Admin App:** `/SkedenceAdmin/SkedenceAdmin/`
- **Client App:** `/Skedence/Skedence/`

### Critical Rules

1. **Admin Portal URL:**
   - Production: https://skedence.com
   - Always use this URL for testing and sharing
   
2. **Static Export Limitations:**
   - Cannot use dynamic routes like `/clients/[id]` without `generateStaticParams()`
   - Use query parameters instead: `/clients/detail?id=xxx`
   - All routes must be statically generated at build time
   - No server-side rendering (SSR) or API routes

3. **Build Requirements:**
   - Must run `npm run build` before deploying
   - Build output goes to `out/` directory
   - Clean build recommended: `rm -rf .next out && npm run build`
   - Check for TypeScript errors before deploying

4. **Firebase Project:**
   - Project ID: `polyface-ae6d3`
   - All deployments go to this project
   - Use `firebase use polyface-ae6d3` to ensure correct project

5. **Deployment Order:**
   - Always build before deploying: `npm run build && firebase deploy --only hosting`
   - Deploy functions separately if email templates change
   - Test on skedence.com after deployment
   - Commit changes to git after successful deployment

---

## 🗄️ Firestore Database Schema

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
├── stripeSubscriptionId: string
├── stripe: {
│   ├── connectAccountId: string (Stripe Connect account ID)
│   ├── publishableKey: string (org's publishable key)
│   ├── onboardingComplete: boolean
│   ├── chargesEnabled: boolean
│   ├── payoutsEnabled: boolean
│   └── onboardingUrl: string
│   }
├── branding: {
│   ├── primaryColor: string (hex color)
│   └── logoUrl: string (optional)
│   }
└── pricingStructure: {
    ├── tiers: [{
    │   ├── id: string (UUID)
    │   ├── tierName: string (e.g., "Master", "Elite")
    │   └── packages: [{
    │       ├── id: string (UUID)
    │       ├── title: string (e.g., "1 Athlete Private Lesson")
    │       ├── priceInCents: number (e.g., 8000 = $80.00)
    │       └── packageType: string (e.g., "private", "2_athlete")
    │       }]
    │   }]
    └── lastUpdated: timestamp
    }
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
  ├── remainingLessons: number (computed)
  ├── purchaseDate: timestamp
  ├── expirationDate: timestamp
  ├── transactionId: string
  ├── amountPaid: number (cents)
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

#### **classes** (Group Classes)
```
classes/{classId}
├── orgId: string
├── trainerId: string
├── trainerName: string
├── className: string
├── description: string
├── startTime: timestamp
├── endTime: timestamp
├── location: string
├── maxParticipants: number
├── currentParticipants: number
├── participantIds: string[] (array of userIds)
├── isOpenForRegistration: boolean
├── price: number
├── imageUrl?: string
└── createdAt: timestamp
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

## 📐 Schema Standards & Migration Patterns

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

```swift
// Swift/iOS - Use orgId field
let orgId = data["orgId"] as? String
```

### Package Storage Paths
**STANDARD PATH (ONLY):** `organizations/{orgId}/users/{userId}/packages/{packageId}`

**IMPORTANT:** As of the package consolidation (February 2026), all packages are stored ONLY in the standard path. The old path (`users/{userId}/lessonPackages/{packageId}`) is deprecated and no longer used by any system.

**Reading Pattern:**
```typescript
// Cloud Functions - Query standard path only
const packageDoc = await db.collection("organizations")
  .doc(orgId).collection("users").doc(userId)
  .collection("packages").doc(packageId).get();
```

```swift
// iOS - Query standard path only
let packageRef = db.collection("organizations")
    .document(orgId)
    .collection("users")
    .document(userId)
    .collection("packages")
    .document(packageId)
let snapshot = try await packageRef.getDocument()
```

**Writing Pattern (All Systems):**
```swift
// Write to STANDARD path only
try await db.collection("organizations")
  .document(orgId)
  .collection("users")
  .document(userId)
  .collection("packages")
  .addDocument(data: passData)
```

```typescript
// Web admin - Write to standard path only
await addDoc(
  collection(db, 'organizations', orgId, 'users', userId, 'packages'),
  passData
);
```

**Migration:**
- All existing packages were migrated from old path to new path using `migrate-packages-to-new-path.js`
- Old packages remain as backup but are not queried by any app
- All new purchases and admin-added packages go to standard path only

### Package Schema
```typescript
{
  packageType: string,        // e.g., "private", "2_athlete", "class_10_pack"
  packageCategory: PackageCategory, // "oneAthlete" | "twoAthlete" | "threeAthlete" | "fourAthlete" | "classPass"
  packageName?: string,       // Optional display title
  totalLessons: number,       
  lessonsUsed: number,
  remainingLessons: number,   // totalLessons - lessonsUsed
  purchaseDate: Timestamp,
  expirationDate: Timestamp,
  transactionId: string,
  amountPaid: number,         // cents
  orgId: string              // Required for multi-tenant isolation
}
```

### Package Category Enum
The `packageCategory` field uses a strict enum to differentiate between athlete count for private lessons and group classes:

**Enum Values:**
- `oneAthlete` - Private lesson for 1 athlete
- `twoAthlete` - Private lesson for 2 athletes
- `threeAthlete` - Private lesson for 3 athletes
- `fourAthlete` - Private lesson for 4 athletes
- `classPass` - Group class pass

**Display Names (iOS):**
```swift
enum PackageCategory: String, Codable, CaseIterable {
    case oneAthlete = "oneAthlete"
    case twoAthlete = "twoAthlete"
    case threeAthlete = "threeAthlete"
    case fourAthlete = "fourAthlete"
    case classPass = "class"
    
    var displayName: String {
        switch self {
        case .oneAthlete: return "1 Athlete"
        case .twoAthlete: return "2 Athletes"
        case .threeAthlete: return "3 Athletes"
        case .fourAthlete: return "4 Athletes"
        case .classPass: return "Class"
        }
    }
    
    var athleteCount: Int { (packageCategory: "oneAthlete")
- `2_athlete` - Two athlete private lesson (packageCategory: "twoAthlete")
- `3_athlete` - Three athlete private lesson (packageCategory: "threeAthlete")
- `4_athlete` - Four athlete private lesson (packageCategory: "fourAthlete")
- `class_pass` or `class` - Group class pass (packageCategory: "classPass")

**NEW:** All packages now include a `packageCategory` field that uses the enum values above. The `packageType` field remains for backward compatibility and unique identification, but the `packageCategory` provides structured information about athlete count and lesson type.

Organizations can create custom package types with any naming they want, but must assign one of the standard packageCategory values
        case .classPass: return 0
        }
    }
    
    var isPrivateLesson: Bool {
        self != .classPass
    }
}
```

**Display Helper (Web):**
```typescript
function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'oneAthlete': return '1 Athlete';
    case 'twoAthlete': return '2 Athletes';
    case 'threeAthlete': return '3 Athletes';
    case 'fourAthlete': return '4 Athletes';
    case 'classPass':
    case 'class': return 'Class';
    case 'pass': return 'Pass';
    default: return category;
  }
}
```

**IMPORTANT:** The enum provides type safety and consistent display across all platforms. Legacy "pass" and "class" values are supported for backward compatibility but new packages should use the specific athlete count categories.

---

## 💰 Pricing Structure System

### Overview
The pricing structure is stored dynamically in Firestore at `organizations/{orgId}/pricingStructure` and is used across both apps and Firebase Functions to ensure consistent pricing.

### Firestore Schema
```typescript
organizations/{orgId}/pricingStructure: {
  tiers: [
    {
      id: string,              // UUID
      tierName: string,         // e.g., "Master", "Elite", "Pro"
      packages: [
        {
          id: string,           // UUID
          title: string,        // e.g., "1 Athlete Private Lesson"
          priceInCents: number, // e.g., 8000 = $80.00
          packageType: string   // e.g., "private", "2_athlete", "3_athlete", "class_pass"
        }
      ]
    }
  ],
  lastUpdated: Date             // ISO8601 timestamp
}
```

### Package Types (Standard)
- `private` or `1_athlete` - Single athlete private lesson
- `2_athlete` - Two athlete private lesson
- `3_athlete` - Three athlete private lesson
- `class_pass` or `class` - Group class pass

Organizations can create custom package types with any naming they want.
Models/PricingStructure.swift`
```swift
struct PackageOption: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var title: String                    // Display name
    var priceInCents: Int                // Price in cents (8000 = $80)
    var packageType: String              // Unique identifier
    var packageCategory: PackageCategory // Category enum (oneAthlete, twoAthlete, etc.)
    var lessonCount: Int = 1             // Number of lessons in package
    var description: String = ""         // Package description
    
    var formattedPrice: String           // "$80.00"
    var priceInDollars: Double           // 80.0
    
    mutating func autoGeneratePackageType() {
        if packageType.isEmpty {
            packageType = title.lowercased().replacingOccurrences(of: " ", with: "_")
        }
    }ue identifier
    
    var formattedPrice: String           // "$80.00"
    var priceInDollars: Double           // 80.0
}

struct PricingTier: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var tierName: String                 // "Master", "Elite", etc.
    var packages: [PackageOption]
}

struct PricingStructure: Codable {
    var tiers: [PricingTier]
    var lastUpdated: Date
    
    var allPackages: [PackageOption]     // Flattened list
    func package(withTitle: String) -> PackageOption?
}
```

**Service:** `Skedence/Skedence/PricingStructureService.swift`
```swift
class PricingStructureService: ObservableObject {
    @Published var pricingStructure: PricingStructure?
    
    func loadPricingStructure(for orgId: String) async
    func savePricingStructure(_ structure: PricingStructure, for orgId: String) async throws
    
    var allPackageOptions: [PackageOption]
    var packageTitles: [String]
    func package(withTitle: String) -> PackageOption?
}
```

### Admin App - Where Pricing is Created

**1. During Onboarding (Step 6):**
**File:** `SkedenceAdmin/SkedenceAdmin/OnboardingPackagesView.swift`

**2. After Onboarding (Manage Tab):**
**File:** `SkedenceAdmin/SkedenceAdmin/AdminPanelView.swift`

The Manage tab has a "Pricing Structure" section where owners/admins can:
- Add/edit/delete tiers
- Add/edit/delete packages within each tier
- Save changes to Firestore

### Firebase Functions Validation

**File:** `SkedenceAdmin/functions/src/stripe-connect.ts`

```typescript
// Load organization's pricing structure
const validPackages: { [key: string]: number } = {};

if (orgData.pricingStructure?.tiers) {
  // Load from dynamic pricing structure
  for (const tier of orgData.pricingStructure.tiers) {
    for (const pkg of tier.packages) {
      validPackages[pkg.packageType] = pkg.priceInCents;
    }
  }
  console.log(`✅ Loaded ${Object.keys(validPackages).length} packages from pricing structure`);
} else {
  // Fallback to default pricing if no custom structure
  validPackages.private = 8000;
  validPackages["2_athlete"] = 12000;
  validPackages["3_athlete"] = 16000;
  validPackages.class_pass = 2000;
}

// Validate request matches pricing
if (!validPackages[packageType] || validPackages[packageType] !== amount) {
  throw new functions.https.HttpsError(
    "invalid-argument",
    `Invalid package type or amount`
  );
}
```

### Default Pricing
If no pricing structure exists in Firestore, the app uses:
```swift
PricingStructure.default = [
    Tier: "Standard"
    Packages:
      - "1 Athlete Private Lesson" - $80 (private)
      - "2 Athlete Private Lesson" - $120 (2_athlete)
      - "3 Athlete Private Lesson" - $160 (3_athlete)
      - "Class Pass" - $20 (class_pass)
]
```

---

## 📱 iOS Apps Architecture

### Skedence (Client App)
**Location:** `/Skedence/`  
**Target:** Clients who book lessons and manage their schedules

#### Key Features
- **Authentication:** Firebase Auth with email/password
- **Home Dashboard:** Upcoming lessons, quick actions, waiver status
- **Book Sessions:** Browse trainer availability, select time slots, book using lesson passes
- **My Schedule:** View upcoming and past bookings, monthly calendar view
- **Purchase Passes:** Stripe integration for buying lesson packages
- **Profile Management:** Edit personal info, view pass balance
- **Waiver Signing:** Digital waiver with signature capture and PDF generation
- **Group Classes:** Browse and enroll in group training sessions
- **Athlete Management:** For multi-athlete packages, add and manage athlete profiles

#### Key Files
- `SkedenceApp.swift` - App entry point
- `AuthManager.swift` - Firebase authentication, loads orgId, branding, Stripe key
- `BookingsService.swift` - Booking CRUD operations
- `PackagesService.swift` - Lesson pass management (dual-path queries)
- `StripeService.swift` - Payment processing
- `PurchaseManager.swift` - In-app purchase flow
- `WaiverPDFGenerator.swift` - Generate signed waiver PDFs with professional formatting
- `ActivityPDFGenerator.swift` - Generate activity/liability waivers with custom branding
- `DesignSystem.swift` - Brand colors and UI components
- `PricingStructureService.swift` - Load/save pricing structure
- `Models/PricingStructure.swift` - PackageCategory enum and pricing models
- `Models/LessonPackage.swift` - Package data model with category support

#### Tech Stack
- SwiftUI
- Firebase SDK (Auth, Firestore, Storage)
- Stripe iOS SDK
- Combine framework

### SkedenceAdmin (iOS Admin/Trainer App)
**Location:** `/SkedenceAdmin/`  
**Target:** Trainers and administrators

#### Key Features
- **Authentication:** Firebase Auth (admin/trainer roles)
- **Client Management:** View all clients, search, view details, passes, booking history
- **Schedule Management:** Create/edit availability slots, view weekly schedule
- **Booking Management:** View all bookings, create bookings for clients, cancel/reschedule
- **Trainer Management:** Add/edit trainers, assign schedules
- **Admin Panel (Manage Tab):** Passes, Classes, Locations, Wallet, Pricing Structure
- **Analytics Dashboard:** Revenue, bookings count, client stats
- **Group Classes:** Create and manage group training sessions
- **Onboarding Flow:** New business signup with Stripe Connect setup

#### Key Files
- `SkedenceAdminApp.swift` - App entry point, deep link handling
- `ClientsViewModel.swift` - Client data management
- `ClientDetailView.swift` - Individual client management
- `AuthManager.swift` - Role-based authentication, loads trainerId
- `AdminPanelView.swift` - Manage tab with passes, classes, pricing, locations
- `FirestoreService.swift` - Shared Firestore operations
- `ScheduleView.swift` - Trainer schedule with real-time updates
- `OnboardingLandingView.swift` - Business signup landing
- `CreateBusinessView.swift` - Account creation flow
- `StripeOnboardingView.swift` - Stripe Connect wizard
- `PasswordSetupView.swift` - Password setup for invited trainers

#### AuthManager trainerId Resolution
**CRITICAL:** Trainer document IDs ≠ Firebase Auth UIDs

```swift
@Published var trainerId: String? // Actual trainer document ID

func loadTrainerId() async {
    guard let uid = Auth.auth().currentUser?.uid,
          let orgId = currentOrgId else { return }
    
    // Query trainers by orgId and email to find actual document ID
    let query = db.collection("trainers")
        .whereField("orgId", isEqualTo: orgId)
        .whereField("email", isEqualTo: userEmail)
    
    let snapshot = try? await query.getDocuments()
    if let doc = snapshot?.documents.first {
        trainerId = doc.documentID // This is the real trainer ID
        print("AuthManager: Loaded trainerId: \(trainerId) for user: \(uid)")
    }
}
```

This is called when role is "trainer" to resolve the correct trainerId for schedule queries.

#### Tech Stack
- SwiftUI
- Firebase SDK
- Admin-specific UI components

---

## 🌐 Admin Portal (Next.js)

**Location:** `/admin-portal/` (Next.js source) and `/web/admin-portal/` (deployed build)  
**URL:** https://skedence.com/admin-portal/  
**Framework:** Next.js 16.1.4 (App Router, Turbopack)

### Features
- **Dashboard:** Stats overview, quick actions, recent activity
- **Clients Page:** Search/filter clients, view client cards
- **Trainers Page:** Manage trainer roster, view schedules
- **Schedule Page:** Week view grid with availability slots, horizontal scroll on mobile
- **Bookings Page:** Create new bookings, select client/trainer/time slot, dual-path package queries
- **Passes Page:** Assign/remove lesson packages to clients
- **Pricing Page:** Manage pricing structure tiers and packages
- **Classes Page:** Create/edit group classes
- **Analytics:** Charts and metrics (Recharts)
- **Settings:** Organization settings, billing management, Stripe setup, email notifications
- **Mobile Optimized:** Responsive design for phone, tablet, and iPad (portrait/landscape)

### Tech Stack
- **Framework:** Next.js 16.1.4 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/ui
- **Charts:** Recharts
- **Auth:** Firebase Auth (custom useAuth hook)
- **Database:** Firestore SDK
- **Deployment:** Firebase Hosting (static export)

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
- `src/app/dashboard/page.tsx` - Main dashboard with revenue calculation
- `src/app/clients/page.tsx` - Client list with search
- `src/app/trainers/page.tsx` - Trainer list with search
- `src/app/schedule/page.tsx` - Weekly schedule grid with real-time onSnapshot
- `src/app/bookings/page.tsx` - Create booking form with dual-path package queries
- `src/app/passes/page.tsx` - Assign/remove lesson packages
- `src/app/pricing/page.tsx` - Manage pricing structure
- `src/app/classes/page.tsx` - Group class management
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

// Real-time listeners for live updates
const unsubscribe = onSnapshot(q, (snapshot) => {
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setSchedules(data);
});
```

---

## ⚡ Cloud Functions

**Location:** `/SkedenceAdmin/functions/src/`  
**Runtime:** Node.js 22 (2nd Gen)  
**Project:** polyface-ae6d3

### Key Functions

#### Authentication & Invitations
- **sendTrainerInvitation** - Sends invitation email with password setup link
  - Trigger: `onDocumentCreated("trainers/{trainerId}")`
  - Checks `needsPasswordSetup === true`
  - Generates deep link: `skedence://setup-password?token={token}&email={email}`
  - Uses Firebase Email Extension

- **sendPasswordResetEmail** - Password reset for existing users
  - Callable function
  - Sends reset link via Firebase Auth

- **deleteUserAccount** - Delete user account and all data
  - Callable function
  - Removes user, orgMembers, bookings, lessonPackages, class participants
  - Deletes Firebase Auth account
  - Prevents deletion if user owns organizations

#### Booking Operations
- **bookLesson** - Book a 1-on-1 lesson
  - Validates package has remaining lessons
  - Marks schedule slot as booked
  - Decrements package lessonsUsed
  - Creates booking document
  - Dual-path package support

- **registerForClass** - Register for group class
  - Validates class capacity
  - Checks package availability
  - Adds user to participantIds array
  - Increments currentParticipants

- **manualRegisterForClass** - Admin registers client for class
  - Similar to registerForClass but admin-initiated
  - Validates admin permissions

#### Notifications
- **sendBookingAlerts** - Sends booking confirmation emails
  - Scheduled function (runs every 5 minutes)
  - Queries recent bookings
  - Sends email to clients and trainers
  - Uses Firebase Email Extension

- **sendSummaryEmails** - Daily/weekly summary emails
  - Scheduled function
  - Aggregates booking data
  - Sends to trainers/admins

#### Payments (Stripe Connect)
- **createConnectAccount** - Creates Stripe Express account
  - Callable function
  - Sets up Connect account for organization
  - Returns account ID

- **createConnectAccountLink** - Generates onboarding URL
  - Callable function
  - Creates onboarding link for Stripe setup
  - Redirect URLs to admin-portal

- **refreshConnectAccountStatus** - Updates Stripe status
  - Callable function
  - Queries Stripe API for account status
  - Updates organization document

- **createPaymentIntentConnect** - Processes payments for organizations
  - Callable function
  - Creates payment intent (no platform fee - businesses keep 100%)
  - Validates pricing structure
  - Client pays $80 → Business receives full $80 (minus standard Stripe fees)

#### Stripe Webhooks
- **stripeConnectWebhook** - Handles Stripe events
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `account.updated`
  - Validates webhook signatures

#### Trainer Management
- **deleteTrainer** - Removes trainer and associated data
  - Callable function
  - Deletes trainer document, schedules, bookings (marks cancelled)
  - Removes orgMember entry
  - Admin-only

### Environment Variables
**File:** `/SkedenceAdmin/functions/.env` (NOT committed to git)

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_STUDIO_PRICE_ID=price_xxx
STRIPE_ACADEMY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

### Deployment
```bash
cd SkedenceAdmin/functions
npm run build
firebase deploy --only functions
```

Or deploy specific function:
```bash
firebase deploy --only functions:sendTrainerInvitation
```

---

## 🔐 Trainer Invitation & Password Setup Flow

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

---

## 💳 Stripe Integration

**Environment:** LIVE MODE (Production)  
**Keys Location:** `SkedenceAdmin/functions/.env`

### Subscription Tiers (Platform Billing)
- **Starter:** $29/month - `price_1SpKItFIh2MhEffNfsBy4HyT`
- **Studio:** $79/month - `price_1SpKMkFIh2MhEffNgGdbgMr5`
- **Academy:** $149/month - `price_1SpKNrFIh2MhEffNqZf64sPA`
- **Enterprise:** $299/month - `price_1SpKOrFIh2MhEffNjU5v5X4P`

### Stripe Connect Architecture
Each organization has their own Stripe Connect Express account:

**Payment Flow:**
```
Client pays $80 
  → Stripe processes payment (standard Stripe fees apply)
  → Business receives full amount in their Connect account
  → Skedence revenue comes from monthly subscription fees only
```

**Organization Stripe Fields:**
```typescript
stripe: {
  connectAccountId: "acct_xxx",      // Stripe Connect account ID
  publishableKey: "pk_xxx",          // Org's publishable key
  onboardingComplete: boolean,
  chargesEnabled: boolean,
  payoutsEnabled: boolean,
  onboardingUrl: string
}
```

### Payment Processing

**Client App Payment Flow:**
1. Client selects package in iOS app
2. `StripeService.swift` loads org's publishable key from Firestore
3. Calls `createPaymentIntentConnect` Cloud Function
4. Function validates pricing structure, creates payment intent
5. Client completes payment via Stripe SDK
6. Webhook creates lessonPackage document
7. Client's `remainingLessons` updated

**Key Functions:**
- `createPaymentIntentConnect` - Creates payment intent (no platform fee)
- `stripeConnectWebhook` - Handles payment success events

### Stripe Onboarding (New Businesses)

**Onboarding Flow:**
1. Business signs up in SkedenceAdmin app
2. `CreateBusinessView` creates organization
3. Launches `StripeOnboardingView`
4. Step 1: Explain benefits, create Connect account
5. Step 2: Generate onboarding link, open in Safari
6. Business completes Stripe setup (5 minutes)
7. Step 3: Verify completion, update organization
8. Step 4: Success screen, ready to accept payments

**Cloud Functions:**
- `createConnectAccount` - Creates Express account
- `createConnectAccountLink` - Generates onboarding URL
- `refreshConnectAccountStatus` - Updates status from Stripe

### Webhook Endpoint
- **URL:** Set in Stripe Dashboard
- **Handler:** Firebase Cloud Functions (`stripeConnectWebhook`)
- **Events:** 
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `account.updated`
- **Security:** Validates webhook signatures

---

## 🏗️ SaaS Transformation Status

### Completed (Steps 1-9) ✅

#### STEP 1: Pre-Migration Safety ✅
- Created `pre-saas-migration` branches
- Exported Firestore backup to Cloud Storage
- Location: `gs://polyface-ae6d3.firebasestorage.app/firestore-backups/20260107-184431-pre-saas-migration`

#### STEP 2: Organizations Layer ✅
- Created `organizations` collection
- Organization ID: `0Mtow1OaV7oUlCisKSNy` (Polyface Volleyball Academy)

#### STEP 3: Organization Membership ✅
- Created `orgMembers` collection
- 7 members: 1 owner, 2 trainers, 4 clients

#### STEP 4: Data Migration ✅
- Updated **191 documents** with orgId field
- Collections: trainers (3), users (5), classes (6), schedules (149), lessonPackages (16), bookings (12)

#### STEP 5: App Query Updates ✅
- Both apps updated to filter by orgId
- AuthManager loads currentOrgId
- All services accept orgId parameter

#### STEP 6: Security Rules ✅
- Deployed multi-tenant org-scoped security rules
- Helper functions: `isMemberOfOrg()`, `hasOrgRole()`, `isOrgOwner()`, etc.

#### STEP 7: Validation & Testing ✅
- Created `validate-multitenant.js` script
- Created `create-test-org.js` for isolation testing
- All 191 documents validated

#### STEP 8: Stripe Connect + Dynamic Branding ✅
- Removed hardcoded Stripe keys
- Added Stripe Connect fields to organizations
- Created Connect Cloud Functions
- Made branding dynamic (colors, logos)
- Payment flow (organizations keep 100% of revenue)

#### STEP 9: Business Onboarding Flow ✅
- Built `OnboardingLandingView`
- Created `CreateBusinessView`
- Implemented `StripeOnboardingView` wizard
- Complete self-service signup

### Remaining Steps (10-12) ⏳

#### STEP 10: Platform Billing System 🚧
- Create Stripe subscription products
- Add billing schema to organizations
- Implement subscription checks (paywall)
- Build "Manage Subscription" UI
- Webhook handlers for subscription events

#### STEP 11: Multi-Business Admin Tools
- Organization switcher UI
- Trainer removal/management
- Organization suspend/disable capability
- Booking export feature
- Firebase Crashlytics integration
- Analytics events

#### STEP 12: Production Launch Plan
- Migration strategy documentation
- Test environment checklist
- Late-night migration window plan
- Rollback procedures
- Second business onboarding test
- Success metrics definition

---

## 🔒 Security & Firestore Rules

### Firestore Rules Location
- iOS Client: `Skedence/firestore.rules`
- Admin: `SkedenceAdmin/firestore.rules`

**⚠️ IMPORTANT: Both files MUST be identical mirrors of each other!**

These files secure the same Firebase project (polyface-ae6d3) and must always match. When updating security rules:
1. Make changes to one file
2. **Immediately copy changes to the other file**
3. Deploy both: 
   ```bash
   cd Skedence && firebase deploy --only firestore:rules
   cd SkedenceAdmin && firebase deploy --only firestore:rules
   ```

### Key Security Patterns

#### Multi-Tenant Access Control
```javascript
// Helper function: Check if user is member of org
function isMemberOfOrg(orgId) {
  return exists(/databases/$(database)/documents/orgMembers/$(request.auth.uid + '_' + orgId))
    && get(/databases/$(database)/documents/orgMembers/$(request.auth.uid + '_' + orgId)).data.isActive == true;
}

// Helper function: Check user's role in org
function hasOrgRole(orgId, role) {
  return isMemberOfOrg(orgId) 
    && get(/databases/$(database)/documents/orgMembers/$(request.auth.uid + '_' + orgId)).data.role == role;
}
```

#### Key Rules

**Organizations Collection:**
```javascript
match /organizations/{orgId} {
  // Changed from 'allow get' to 'allow read' to support snapshot listeners
  allow read: if isMemberOfOrg(orgId);
  allow update: if isOrgAdmin(orgId);
}
```

**Users Collection:**
```javascript
match /users/{userId} {
  allow read: if request.auth != null && (
    request.auth.uid == userId ||
    isMemberOfOrg(resource.data.orgId)
  );
  allow write: if request.auth.uid == userId;
  
  // Packages subcollection
  match /lessonPackages/{packageId} {
    allow read, write: if request.auth.uid == userId;
  }
}
```

**Trainers Collection:**
```javascript
match /trainers/{trainerId} {
  // Self-read for schedule access
  allow get: if request.auth.uid == trainerId;
  
  // Org members can list trainers
  allow list: if request.auth != null && isMemberOfOrg(resource.data.orgId);
  
  // Schedules subcollection
  match /schedules/{slotId} {
    allow read: if request.auth != null && (
      request.auth.uid == trainerId ||
      resource.data.orgId in request.auth.token.orgIds ||
      get(/databases/$(database)/documents/trainers/$(trainerId)).data.orgId in request.auth.token.orgIds
    );
  }
}
```

**Bookings Collection:**
```javascript
match /bookings/{bookingId} {
  allow list: if request.auth != null;
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.clientId ||
    request.auth.uid == resource.data.trainerId ||
    isMemberOfOrg(resource.data.orgId)
  );
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && (
    request.auth.uid == resource.data.clientId ||
    isOrgAdmin(resource.data.orgId)
  );
}
```

**Classes Collection:**
```javascript
match /classes/{classId} {
  allow list: if request.auth != null;
  allow read, create, update, delete: if request.auth != null && isMemberOfOrg(resource.data.orgId);
}
```

### Password Setup Security
```javascript
match /trainers/{trainerId} {
  // Allow reading trainer docs with needsPasswordSetup
  allow get: if resource.data.needsPasswordSetup == true;
  
  // Allow updating to link Firebase UID after password setup
  allow update: if request.auth != null && 
    request.auth.uid != null &&
    resource.data.needsPasswordSetup == true &&
    request.resource.data.userId == request.auth.uid;
}
```

---

## 🚀 Deployment Procedures

### Full Website Deployment
```bash
# Use the deployment script (RECOMMENDED)
./deploy-website.sh

# Or manual steps:
cd admin-portal
npm run build
cd ..
rm -rf web/admin-portal
cp -r admin-portal/out web/admin-portal
cd web
firebase deploy --only hosting
```

### Cloud Functions Deployment
```bash
cd SkedenceAdmin/functions
npm run build
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:sendTrainerInvitation
```

### Firestore Rules Deployment
```bash
# Deploy both (MUST be done together)
cd Skedence && firebase deploy --only firestore:rules
cd ../SkedenceAdmin && firebase deploy --only firestore:rules
```

### iOS Apps Deployment
- Build in Xcode
- Archive and upload to App Store Connect
- TestFlight for beta testing
- Submit for review

### Deployment Checklist
- [ ] Build admin portal: `cd admin-portal && npm run build`
- [ ] Copy build to web: `cp -r admin-portal/out web/admin-portal`
- [ ] Test locally: `cd web && firebase serve`
- [ ] Deploy hosting: `firebase deploy --only hosting`
- [ ] Test on skedence.com after deployment
- [ ] Deploy functions if changed: `cd SkedenceAdmin/functions && firebase deploy --only functions`
- [ ] Deploy rules if changed: Deploy to BOTH Skedence and SkedenceAdmin
- [ ] Verify emails use skedence.com links
- [ ] Check Stripe webhooks are configured
- [ ] Test payment flow end-to-end

---

## ⚠️ Common Issues & Solutions

### Issue: Auth Loop (Page reloading infinitely)
**Cause:** `onAuthStateChanged` triggers re-render → setState → re-render loop  
**Solution:** Use refs to track validation state, early return before setState
```typescript
const validatedUserId = useRef<string | null>(null);
if (firebaseUser && validatedUserId.current === firebaseUser.uid) {
  return; // Already validated
}
```

### Issue: Availability slots not showing
**Cause:** Filtering by `trainerId` field that doesn't exist in subcollection  
**Solution:** Remove filter - docs already scoped by parent path
```typescript
// DON'T filter by trainerId
const schedulesRef = collection(db, `trainers/${trainerId}/schedules`);
const q = query(schedulesRef, where('isBooked', '==', false));
```

### Issue: Console spam
**Cause:** Debug logs in production build  
**Solution:** Remove `console.log` statements, keep only `console.error`

### Issue: Mobile layout broken
**Cause:** Fixed pixel widths, no responsive classes  
**Solution:** Use Tailwind breakpoints, touch-manipulation class, min-h-[44px]

### Issue: Pricing not loading in client app
**Symptom:** Shows 4 default packages instead of custom pricing  
**Cause:** Firestore rules used `allow get:` instead of `allow read:`  
**Fix:** Deploy updated rules with `allow read: if isMemberOfOrg(orgId);`

### Issue: Trainer can't see their schedule
**Cause:** Auth UID ≠ Trainer document ID  
**Solution:** AuthManager queries trainers by email to find actual document ID
```swift
@Published var trainerId: String? // Actual trainer document ID

func loadTrainerId() async {
    // Query trainers collection by orgId and email
    // Sets trainerId to document ID (not Auth UID)
}
```

### Issue: Client passes not loading in bookings
**Cause:** Only checking new path, but data in old path  
**Solution:** Implement dual-path query (new path first, fallback to old)

### Issue: "Invalid package type or amount" during purchase
**Cause:** Client sent different amount than pricing structure  
**Fix:** 
- Verify client loaded latest pricing
- Check Firebase Console pricing matches display
- Functions validate against organization's pricing structure

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

### Real-Time Listeners (Web)
```typescript
// Use onSnapshot for live updates
const schedulesRef = collection(db, `trainers/${trainerId}/schedules`);
const q = query(schedulesRef, where('isBooked', '==', false));

const unsubscribe = onSnapshot(q, (snapshot) => {
  const data = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
  setSchedules(data);
});

return () => unsubscribe(); // Cleanup
```

### Subcollection Queries
```typescript
// DON'T filter by parent ID - docs already scoped
const schedulesRef = collection(db, `trainers/${trainerId}/schedules`);
const q = query(schedulesRef, where('isBooked', '==', false));
// trainerId is implicit from path
```

### Dual-Path Package Queries (iOS)
```swift
// Try new path first
if let orgId = orgId {
    let newPath = db.collection("organizations")
        .document(orgId)
        .collection("users")
        .document(uid)
        .collection("packages")
    let snapshot = try await newPath.getDocuments()
    
    if !snapshot.isEmpty {
        return snapshot.documents
    }
}

// Fallback to legacy path
let oldPath = db.collection("users")
    .document(uid)
    .collection("lessonPackages")
return try await oldPath.getDocuments()
```

### Mobile Responsive Pattern (Web)
```tsx
// Tailwind mobile-first approach
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
<div className="p-4 sm:p-6 lg:p-8">
<button className="min-h-[44px] touch-manipulation">
```

### Dynamic Branding (iOS)
```swift
@Published var primaryColor: Color = .blue
@Published var logoUrl: String?
@Published var stripePublishableKey: String?

func loadOrgBranding(orgId: String) async {
    let doc = try? await db.collection("organizations")
        .document(orgId).getDocument()
    
    if let hex = doc?.data()?["branding.primaryColor"] as? String {
        primaryColor = Color(hex: hex)
    }
    
    if let key = doc?.data()?["stripe.publishableKey"] as? String {
        stripePublishableKey = key
    }
}
```

### Stripe Connect Payment Processing
```typescript
// No platform fee - organizations keep 100% of revenue
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount,
  currency: "usd",
  transfer_data: {
    destination: connectAccountId,
  },
});
// Client pays $80 → Business receives full $80 (minus standard Stripe processing fees)
// Skedence revenue comes from monthly subscription fees ($29-$299/month)
```

---

## 📝 Terminology & Conventions

- **Packages** → **Passes** (user-facing term for lesson packages)
- **Organization** → Single entity (gym, studio, academy)
- **OrgId** → Links all users, trainers, bookings to one organization
- **Schedule** → Trainer's available time slot
- **Booking** → Confirmed appointment using a pass
- **packageType** → Unique identifier (e.g., "private", "2_athlete")
- **packageCategory** → "pass" for lessons, "class" for group classes

---

## 🎨 Brand Colors

- **Primary:** #3258A3 (Blue)
- **Secondary:** Teal (#14B8A6)
- **Success:** Green
- **Warning:** Yellow
- **Error:** Red

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

## 📞 Important Notes & Best Practices

1. **Always check orgId** when querying data
2. **Subcollections don't inherit parent ID** as a field
3. **Use refs for auth state** to prevent re-render loops
4. **Touch targets must be 44px minimum** on mobile
5. **Test on actual devices** for mobile/iPad optimization
6. **Live Stripe keys** are in production - handle with care
7. **Firebase project name** is "polyface-ae6d3" (legacy name)
8. **Always use skedence.com domain** in user-facing links
9. **Both firestore.rules files MUST match** - deploy together
10. **Trainer document IDs ≠ Firebase Auth UIDs** - use email lookup
11. **Dual-path queries** for backwards compatibility during migration
12. **Pricing structure** is dynamic - loaded from Firestore per org
13. **Real-time listeners** preferred over getDocs for live data
14. **No platform fee** - Organizations keep 100% of payment revenue (Skedence revenue from subscriptions only)
15. **Deep link scheme** is `skedence://` for iOS apps

---

## � Blog System

**Location:** https://skedence.com/blog  
**Admin Editor:** https://skedence.com/blog-admin  
**Status:** ✅ Fully implemented with SEO & Analytics

### Overview
The blog system is a full-featured content management system (CMS) integrated into the Skedence marketing site. It supports rich content, SEO optimization, and comprehensive analytics tracking.

### Key Features
- **Rich Text Editor:** TinyMCE with image uploads, formatting, tables
- **SEO Optimization:** Dynamic meta tags, Open Graph, Twitter Cards
- **Google Analytics:** Automatic event tracking for views, filters, searches
- **Categories & Tags:** Multi-category support, sport-specific content
- **Featured Images:** Social sharing optimization (1200x630px recommended)
- **URL Slugs:** Auto-generated, SEO-friendly URLs
- **Draft/Published:** Preview mode before publishing
- **Search:** Full-text search across title, content, excerpt
- **Filtering:** By sport, category, and search terms
- **View Counter:** Automatic view count tracking in Firestore

### Blog Editor Fields

**Basic Information:**
- **Title** - Main headline (max 100 chars)
- **URL Slug** - SEO-friendly URL (auto-generated from title)
- **Excerpt** - Summary text (max 300 chars, used for meta description)
- **Content** - Full blog post (HTML, TinyMCE editor)
- **Status** - Draft or Published

**SEO Fields:**
- **Meta Title** - 60 chars max (defaults to title)
- **Meta Description** - 160 chars max (defaults to excerpt)
- **Keywords** - Comma-separated target keywords

**Organization:**
- **Categories** - Multiple selection (volleyball, basketball, revenue-growth, operations, etc.)
- **Tags** - Additional tags for organization
- **Sport** - Sport association (volleyball, basketball, soccer, baseball, all)

**Visuals:**
- **Featured Image** - Image URL for social sharing
- **Featured Image Alt Text** - Accessibility description

**Call to Action:**
- **CTA Text** - Optional custom CTA button text
- **CTA Link** - Link for CTA button

### Firestore Schema

**Collection:** `blog_posts/{postId}`
```typescript
{
  id: string,
  title: string,
  slug: string,                  // URL-friendly version of title
  excerpt: string,               // Short summary
  content: string,               // Full HTML content
  metaTitle?: string,           // SEO title (defaults to title)
  metaDescription?: string,     // SEO description (defaults to excerpt)
  keywords?: string,            // Comma-separated keywords
  categories: string[],         // ["volleyball", "revenue-growth"]
  tags: string[],               // Additional tags
  sport: string,                // "volleyball" | "basketball" | "all"
  featuredImage?: string,       // Image URL
  featuredImageAlt?: string,    // Alt text for featured image
  ctaText?: string,             // Call to action button text
  ctaLink?: string,             // Call to action link
  status: 'draft' | 'published',
  views: number,                // View counter
  createdAt: Timestamp,
  updatedAt: Timestamp,
  publishedAt?: Timestamp
}
```

### SEO Implementation

**Dynamic Meta Tags:**
```html
<title>[Blog Post Title] | Skedence Blog</title>
<meta name="description" content="[excerpt]">
<meta name="keywords" content="[keywords]">
```

**Open Graph Tags (Social Sharing):**
```html
<meta property="og:title" content="[title]">
<meta property="og:description" content="[excerpt]">
<meta property="og:image" content="[featuredImage]">
<meta property="og:url" content="https://skedence.com/blog/detail?slug=[slug]">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Skedence">
```

**Twitter Card Tags:**
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[title]">
<meta name="twitter:description" content="[excerpt]">
<meta name="twitter:image" content="[featuredImage]">
```

### Google Analytics Tracking

**GTM ID:** `GTM-KQMV58D`

**Blog Listing Page Events:**
- `page_view` - Page visit
- `blog_filter_sport` - Sport filter usage
- `blog_filter_category` - Category filter usage
- `blog_search` - Search queries with result counts

**Blog Detail Page Events:**
- `page_view` - Blog post view with title
- `blog_post_view` - Comprehensive tracking:
  ```javascript
  {
    post_id: postId,
    post_title: title,
    categories: categories.join(','),
    sport: sport
  }
  ```
- **View Counter** - Firestore `views` field auto-incremented

### File Locations

**Admin Portal:**
- **Editor:** `/src/app/blog-admin/edit/page.tsx`
- **List:** `/src/app/blog-admin/page.tsx`

**Public Site:**
- **Blog Listing:** `/src/app/(marketing)/blog/page.tsx`
- **Blog Detail:** `/src/app/(marketing)/blog/detail/page.tsx`

**Services:**
- **Blog Service:** `/src/lib/blog-service.ts`
- **Analytics Library:** `/src/lib/analytics.ts`
- **Blog Types:** `/src/types/blog.ts`

### Content Categories

**Business Categories:**
- `revenue-growth` - Revenue & monetization strategies
- `operations` - Operational efficiency
- `client-retention` - Client engagement & retention
- `marketing` - Marketing & lead generation
- `technology` - Tech tips & tools

**Sport Categories:**
- `volleyball` - Volleyball-specific content
- `basketball` - Basketball-specific content
- `soccer` - Soccer-specific content
- `baseball` - Baseball-specific content
- `all` - Applies to all sports

### Publishing Checklist

Before publishing:
- [ ] Title is compelling and includes primary keyword
- [ ] URL slug is SEO-friendly (lowercase, hyphens only)
- [ ] Excerpt clearly summarizes post (160 chars max)
- [ ] Meta description is set or auto-generated
- [ ] Keywords added (5-10 relevant terms)
- [ ] At least 2 categories selected
- [ ] Sport selected if sport-specific
- [ ] Featured image added with alt text (1200x630px recommended)
- [ ] Content has proper H2/H3 structure
- [ ] Content includes internal links when relevant
- [ ] Preview mode looks good
- [ ] Status set to "Published"

### SEO Best Practices

**Title (H1):**
- Include primary keyword
- Keep under 60 characters
- Make compelling and clear

**Excerpt:**
- Summarize value proposition
- Include secondary keywords naturally
- Stay under 160 characters

**Content:**
- Use H2 and H3 tags for structure
- Include keywords naturally (no stuffing)
- Aim for 800-2,000 words
- Break up text with bullets and lists
- Add internal links to other blog posts

**Featured Image:**
- Use high-quality, relevant images
- Recommended size: 1200x630px (optimal for social sharing)
- Add descriptive alt text
- Compress for fast loading

**Keywords:**
- Research target keywords first
- Include 5-10 relevant keywords
- Use long-tail keywords (3-4 word phrases)
- Examples: "volleyball scheduling software", "private lesson pricing"

---

## �🔄 Recent Changes & Updates

### February 17, 2026 - Domain Migration & Footer Updates
- **Domain Migration Complete:**
  - Migrated from polyface-ae6d3.web.app to skedence.com as primary domain
  - Unified admin portal and marketing site now live on skedence.com
  - Legal pages (privacy, terms, support) deployed to skedence.com
  - Updated all documentation to reflect new domain structure
  - Firebase project ID remains "polyface-ae6d3" (backend unchanged)

- **Footer Visibility Improvements:**
  - Changed footer link colors from light gray to orange (text-orange-500)
  - Improved contrast against black background for better readability
  - Updated hover states to lighter orange (text-orange-400)
  - Applied to all footer sections: Product, Company, Legal, Connect

### February 6, 2026 - Package Category Refactoring & PDF Enhancements
- **Package Category Enum Implementation:**
  - Replaced simple "pass"/"class" string with PackageCategory enum
  - New enum values: oneAthlete, twoAthlete, threeAthlete, fourAthlete, classPass
  - Provides type safety and athlete count information for private lessons
  - Updated across iOS apps (client & admin) and web admin portal
  - Display helpers show user-friendly names ("1 Athlete", "2 Athletes", etc.)
  - Backward compatibility maintained with legacy values

- **PDF Generation System:**
  - Created `WaiverPDFGenerator.swift` - Professional waiver PDFs with signatures
  - Created `ActivityPDFGenerator.swift` - Activity/liability waivers with custom branding
  - Features: Custom branding (colors, logos), table layouts, signature blocks
  - Automatic generation and Firebase Storage upload
  - Email delivery integration for completed waivers

- **Booking Improvements:**
  - Multi-athlete support in BookView with athlete info collection
  - Category-based athlete count validation
  - Enhanced UI for athlete information entry
  - Improved package selection with category display

- **Admin Portal Enhancements:**
  - Passes tab shows package categories with friendly names
  - Pricing page displays category information
  - Category-aware package management
  - getCategoryDisplayName() helper for consistent display

- **Code Refactoring:**
  - Cleaned up duplicate view files in iOS apps
  - Consolidated navigation structure
  - Removed redundant markdown documentation files
  - Improved code organization and maintainability

### February 3, 2026
- Added booking alert notifications (sendBookingAlerts Cloud Function)
- Implemented scheduling interactive modals in admin portal
- Enhanced notification settings page with booking alerts configuration
- Fixed pricing structure not loading on iPad when switching tabs (onChange listener)

### January 28, 2026
- Fixed iOS schedule loading with trainerId resolution in AuthManager
- Implemented dual-path package queries in web bookings page
- Added delete account feature for client app with Cloud Function
- Updated firestore rules for trainer schedule access (three-way OR)

### January 12, 2026
- Completed pricing structure schema across all systems
- Implemented dynamic pricing validation in Cloud Functions
- Fixed pricing structure loading with snapshot listeners
- Updated security rules: `allow get` → `allow read` for organizations

### January 7, 2026
- Completed SaaS transformation Steps 1-9
- Implemented Stripe Connect architecture
- Built business onboarding flow
- Created multi-tenant security rules

---

*For new conversations, read this file first to understand the complete project architecture and current state.*
