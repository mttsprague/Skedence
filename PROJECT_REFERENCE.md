# Skedence Project Reference Guide
**Last Updated:** January 22, 2026  
**Firebase Project:** polyface-ae6d3  
**Status:** Production (Live with Stripe payments)

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
├── orgId: string (reference to organization)
├── isActive: boolean
├── createdAt: timestamp
└── profileImageUrl?: string
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

#### **lessonPackages** (Client passes)
```
lessonPackages/{packageId}
├── clientId: string
├── orgId: string
├── packageName: string
├── totalLessons: number
├── remainingLessons: number
├── price: number
├── purchaseDate: timestamp
├── expirationDate?: timestamp
└── isActive: boolean
```

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

## 📱 Skedence iOS App (Client App)

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

## 💳 Stripe Integration

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

### Key Rules
- Users can only read/write their own data
- Trainers can read clients in their org
- Admins have full access to their org
- Bookings require valid packageId with remaining lessons

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
