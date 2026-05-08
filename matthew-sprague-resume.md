# Matthew Sprague
**Product Engineer**

📧 mttsprague@gmail.com · 📍 St. Louis, Missouri · 🐙 github.com/mttsprague

---

## Summary

Self-taught product engineer who designed, built, and shipped a full multi-tenant SaaS platform entirely independently — **Skedence** — production at [skedence.com](https://skedence.com). Built three apps from scratch (two iOS, one web), a Firebase Cloud Functions backend, Stripe Connect payment processing, and a multi-tenant Firestore architecture serving real paying customers. Comfortable owning the full stack: database schema, backend logic, two native iOS apps in SwiftUI, and a Next.js web admin portal.

---

## Projects

### Skedence — Multi-Tenant SaaS Platform for Fitness & Sports Organizations
**Sole Developer · 2024–Present · Production at skedence.com**

A complete business-in-a-box SaaS for gyms, tennis academies, volleyball clubs, and sports training organizations. Sold as a subscription product with Stripe. Businesses use it to manage clients, trainers, scheduling, lesson packages, and payments.

**What I built:**

- **Multi-tenant architecture** — Isolated Firestore data per organization using `orgId` scoping, `orgMembers` junction collection, and Firestore security rules with role-based access control (owner / admin / trainer / client)
- **Firestore database schema** — Designed all collections: `organizations`, `users`, `trainers`, `bookings`, `classes`, `orgMembers`, `waivers`, `locations`, nested subcollections for schedules and packages
- **Firebase Cloud Functions (Node.js 22)** — ~15 production functions: trainer invitation with secure tokenized deep links, booking creation with package validation, Stripe Connect payment intents, real-time booking alert emails, scheduled summary emails, account deletion with cascading cleanup
- **Stripe Connect integration** — Organizations connect their own Stripe Express account; businesses keep 100% of client payment revenue; Skedence earns from monthly subscriptions ($29–$299/month tiers); webhook handler for payment confirmation and account status updates
- **Dynamic pricing engine** — Organizations define custom tier/package pricing in Firestore; Cloud Functions validate all payments server-side against the org's stored pricing structure
- **Blog CMS** — Full editor with TinyMCE, draft/publish workflow, SEO meta tags, Open Graph, Twitter Cards, Google Analytics event tracking, view counters
- **Firebase Hosting deployment** — Static export Next.js app deployed to skedence.com via Firebase Hosting with client-side routing rewrites

---

#### Skedence iOS — Client App
*Swift · SwiftUI · Firebase SDK · Stripe iOS SDK · Combine*

Consumer-facing app for clients to manage their training.

- Firebase Auth (email/password) with org-scoped membership resolution
- Real-time booking calendar with trainer availability and slot booking
- In-app lesson package purchases via Stripe Connect (org's publishable key loaded per-org from Firestore)
- Lesson pass balance tracking across two Firestore paths (standard + legacy dual-path support)
- Waiver signing with PDF generation — `WaiverPDFGenerator` and `ActivityPDFGenerator` produce professionally formatted PDFs with custom org branding, uploaded to Firebase Storage
- Group class browsing and enrollment with capacity enforcement
- Multi-athlete support for shared private lesson packages
- Dynamic org branding: primary color and logo loaded from Firestore at runtime

---

#### SkedenceAdmin iOS — Trainer & Admin App
*Swift · SwiftUI · Firebase SDK*

Operations app for trainers and gym owners.

- Role-based auth (owner / admin / trainer) with trainer document ID resolved from Firebase Auth UID via email lookup
- Schedule management: create/edit availability slots, real-time onSnapshot listeners, overlap detection
- Client management: search, view lesson pass balances, booking history, document uploads
- Booking creation with client/trainer/slot/package selection and automatic pass decrement
- Group class creation and management with participant tracking
- Admin panel: manage pricing tiers, locations, lesson packages, Stripe wallet
- Complete business onboarding flow: account creation → Stripe Connect wizard → organization setup
- Trainer invitation system: generates secure UUID token, triggers Cloud Function to send deep-link email, `skedence://setup-password?token=...` opens password setup screen in app
- Analytics dashboard: revenue, booking counts, client stats

---

#### Admin Web Portal — Next.js
*TypeScript · Next.js 16 (App Router) · Tailwind CSS · Shadcn/ui · Recharts · Firebase SDK*

Full web dashboard for organization management at skedence.com.

- Static export deployed to Firebase Hosting; all routes pre-rendered, query params used instead of dynamic segments (`/clients/detail?id=xxx`)
- Auth with anti-glitch pattern using refs to prevent re-render loops with Firebase `onAuthStateChanged`
- Real-time Firestore `onSnapshot` listeners on schedule, booking, and client data
- Reports section: appointment analytics, revenue tracking, client sign-up analytics with Recharts charts
- Intake forms, notification settings, Stripe Connect status and onboarding
- Fully responsive and mobile-optimized (44px touch targets, Tailwind breakpoints, horizontal scroll for schedule grid on mobile)
- Blog admin editor backed by Firestore with TinyMCE, SEO fields, and Google Tag Manager analytics

---

## Skills

| Category | Technologies |
|---|---|
| **Languages** | Swift, TypeScript, JavaScript, HTML, CSS |
| **iOS** | SwiftUI, Combine, Firebase iOS SDK, Stripe iOS SDK, UIKit (basic) |
| **Frontend Web** | Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn/ui, Recharts |
| **Backend** | Firebase Cloud Functions (Node.js 22), Firebase Admin SDK |
| **Database** | Firestore (NoSQL), multi-tenant schema design, security rules |
| **Auth** | Firebase Auth, role-based access control, token-based invitation flows |
| **Payments** | Stripe Connect (Express), payment intents, webhooks, subscription billing |
| **DevOps / Hosting** | Firebase Hosting, static export, `firebase deploy`, Git |
| **Storage** | Firebase Storage (PDF uploads, media) |
| **Architecture** | Multi-tenant SaaS, real-time data, subcollection patterns, dual-path queries |
| **Additional** | PDF generation (Swift), deep linking (iOS URL schemes), SEO, Google Analytics / GTM |

---

## Live Products

- **skedence.com** — Marketing site + admin portal
- **Skedence** — iOS client app (App Store)
- **SkedenceAdmin** — iOS admin app (App Store)

---

*References and portfolio available upon request.*
