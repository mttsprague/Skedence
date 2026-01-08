# Subscription Enforcement Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION STATES                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. TRIAL_ACTIVE (14 days)                                         │
│     ├─ isActive: true                                              │
│     ├─ isInGrace: false                                            │
│     ├─ UI: Blue dismissible banner                                 │
│     └─ Access: Full                                                │
│                                                                     │
│  2. PAID_ACTIVE                                                    │
│     ├─ isActive: true                                              │
│     ├─ isInGrace: false                                            │
│     ├─ UI: No paywall                                              │
│     └─ Access: Full                                                │
│                                                                     │
│  3. PAST_DUE (3-day grace)                                         │
│     ├─ isActive: true  ←── Still active!                           │
│     ├─ isInGrace: true                                             │
│     ├─ UI: Orange persistent banner                                │
│     └─ Access: Full (during grace)                                 │
│                                                                     │
│  4. EXPIRED/CANCELED                                               │
│     ├─ isActive: false  ←── Locked!                                │
│     ├─ isInGrace: false                                            │
│     ├─ UI: Full-screen modal                                       │
│     └─ Access: Read-only                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌──────────────────────────────────────────────────────────────────────┐
│                          COACH APP (SkedenceAdmin)                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ContentView                                                │    │
│  │  ├─ TabView (Home, Schedule, Clients, Account)            │    │
│  │  └─ .overlay {                                             │    │
│  │        CoachPaywallView                                     │    │
│  │     }                                                       │    │
│  └─────────────────────────┬──────────────────────────────────┘    │
│                            │                                         │
│  ┌────────────────────────▼────────────────────────────────┐        │
│  │  CoachPaywallView                                        │        │
│  │  ├─ switch billing.paywallState:                        │        │
│  │  │  ├─ .trialBanner  → TrialBannerView                 │        │
│  │  │  ├─ .graceBanner  → GraceBannerView                 │        │
│  │  │  ├─ .fullBlock    → ExpiredModalView                │        │
│  │  │  └─ .none         → (no overlay)                    │        │
│  │  └─ Differentiates: Owner vs Trainer messaging          │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  SubscriptionEnforcementService                          │        │
│  │  ├─ @Published var billing: OrganizationBilling?        │        │
│  │  ├─ startMonitoring(orgId) → Firestore listener        │        │
│  │  ├─ canPerformAction() → Permission check               │        │
│  │  ├─ calculateLostRevenue() → From last 30 days          │        │
│  │  └─ openBillingPortal() → Stripe portal link           │        │
│  └────────────────────────┬─────────────────────────────────┘        │
│                           │                                          │
│                           │ Listens to                               │
│                           ▼                                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        FIRESTORE DATABASE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  organizations/{orgId}                                               │
│  {                                                                   │
│    name: "Polyface Volleyball Academy",                             │
│    billing: {                                                        │
│      isActive: true,          ←─── Core flag for access             │
│      isInGrace: false,        ←─── Grace period flag                │
│      subscriptionStatus: "active",                                   │
│      stripeCustomerId: "cus_abc123",                                 │
│      stripeSubscriptionId: "sub_def456",                             │
│      currentPlan: "studio",                                          │
│      trainerSeats: 5,                                                │
│      trialEndsAt: Timestamp,                                         │
│      gracePeriodEndsAt: null,                                        │
│      currentPeriodEnd: Timestamp                                     │
│    }                                                                 │
│  }                                                                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐          │
│  │  SECURITY RULES                                        │          │
│  │  ─────────────────                                     │          │
│  │  function hasActiveBilling(orgId) {                   │          │
│  │    let org = get(/databases/.../organizations/$(orgId));          │
│  │    return org.data.billing.isActive == true;          │          │
│  │  }                                                     │          │
│  │                                                        │          │
│  │  Applied to:                                           │          │
│  │  ✅ bookings (create, update, delete)                  │          │
│  │  ✅ packages (write)                                   │          │
│  │  ✅ availability (write)                               │          │
│  │  ✅ trainers (write)                                   │          │
│  │  ✅ classes (create, update, delete)                   │          │
│  │                                                        │          │
│  │  ❌ Blocks all writes when isActive = false           │          │
│  │  ✅ Always allows reads (read-only mode)              │          │
│  └────────────────────────────────────────────────────────┘          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                     FIREBASE CLOUD FUNCTIONS                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐          │
│  │  handleStripeWebhook (HTTPS endpoint)                 │          │
│  │  ──────────────────────────────────                   │          │
│  │  Receives events from Stripe:                         │          │
│  │                                                        │          │
│  │  checkout.session.completed                           │          │
│  │    └─► Create billing record                          │          │
│  │        Set isActive = true                            │          │
│  │        Set subscriptionStatus = "trialing"            │          │
│  │                                                        │          │
│  │  customer.subscription.created                        │          │
│  │    └─► Store subscription ID                          │          │
│  │        Update plan and seats                          │          │
│  │                                                        │          │
│  │  invoice.payment_failed                               │          │
│  │    └─► Set subscriptionStatus = "past_due"           │          │
│  │        Set isInGrace = true                           │          │
│  │        Set gracePeriodEndsAt = now + 3 days           │          │
│  │        Keep isActive = true ←─── Still active!        │          │
│  │        Send payment failed email                      │          │
│  │                                                        │          │
│  │  invoice.payment_succeeded                            │          │
│  │    └─► Clear isInGrace = false                        │          │
│  │        Clear gracePeriodEndsAt = null                 │          │
│  │        Set subscriptionStatus = "active"              │          │
│  │                                                        │          │
│  │  customer.subscription.deleted                        │          │
│  │    └─► Set subscriptionStatus = "canceled"           │          │
│  │        Set isActive = false ←─── Locked!              │          │
│  │                                                        │          │
│  └────────────────────────────────────────────────────────┘          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐          │
│  │  expireGracePeriods (Scheduled, daily at midnight)    │          │
│  │  ──────────────────────────────────────────────────   │          │
│  │  1. Find orgs where:                                  │          │
│  │     - isInGrace = true                                │          │
│  │     - gracePeriodEndsAt <= now                        │          │
│  │                                                        │          │
│  │  2. For each expired org:                             │          │
│  │     - Set isActive = false ←─── Lock account          │          │
│  │     - Set isInGrace = false                           │          │
│  │     - Send "Account Paused" email                     │          │
│  └────────────────────────────────────────────────────────┘          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐          │
│  │  createBillingPortalSession (HTTPS callable)          │          │
│  │  ────────────────────────────────────────────         │          │
│  │  1. Verify user is organization owner                 │          │
│  │  2. Get Stripe customer ID                            │          │
│  │  3. Create portal session with return URL             │          │
│  │  4. Return portal URL to app                          │          │
│  └────────────────────────────────────────────────────────┘          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                            STRIPE                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Products & Prices                                                   │
│  ├─ Starter:    $29/month  (1 seat)                                 │
│  ├─ Studio:     $99/month  (5 seats) ⭐️ Most Popular               │
│  ├─ Academy:    $249/month (15 seats)                               │
│  └─ Enterprise: $499/month (unlimited)                              │
│                                                                      │
│  Add-ons                                                             │
│  ├─ Extra Trainer:     $10/month                                    │
│  ├─ Extra Location:    $25/month                                    │
│  └─ Custom Domain:     $15/month                                    │
│                                                                      │
│  Webhooks                                                            │
│  └─ Endpoint: https://.../handleStripeWebhook                       │
│     ├─ checkout.session.completed                                   │
│     ├─ customer.subscription.created                                │
│     ├─ customer.subscription.updated                                │
│     ├─ customer.subscription.deleted                                │
│     ├─ invoice.payment_failed                                       │
│     └─ invoice.payment_succeeded                                    │
│                                                                      │
│  Billing Portal                                                      │
│  └─ Allows customers to:                                            │
│     ├─ Update payment method                                        │
│     ├─ Upgrade/downgrade plan                                       │
│     ├─ View invoices                                                │
│     └─ Cancel subscription                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      CLIENT APP (Skedence)                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐          │
│  │  BookingView                                           │          │
│  │  └─ .overlay {                                         │          │
│  │        if !organizationIsActive {                      │          │
│  │          ClientBookingBlockedView                      │          │
│  │        }                                               │          │
│  │     }                                                  │          │
│  └────────────────────────┬───────────────────────────────┘          │
│                           │                                          │
│  ┌────────────────────────▼───────────────────────────────┐          │
│  │  ClientBookingBlockedView                              │          │
│  │  ├─ Title: "Bookings Temporarily Unavailable"        │          │
│  │  ├─ Message: "Please contact them directly"          │          │
│  │  ├─ Email button → opens mail app                    │          │
│  │  ├─ Phone button → opens phone app                   │          │
│  │  └─ Never mentions billing/money                     │          │
│  └────────────────────────────────────────────────────────┘          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Event Flow Diagrams

### Flow 1: Trial → Active

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐
│ Coach   │      │  Stripe │      │ Firebase │      │ Coach   │
│ Signs Up│      │ Checkout│      │ Webhook  │      │   App   │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬────┘
     │                │                 │                 │
     │ 1. Create org  │                 │                 │
     │ Trial starts   │                 │                 │
     ├───────────────►│                 │                 │
     │                │                 │                 │
     │           2. Day 7               │                 │
     │                │                 │  3. Show trial  │
     │                │                 │     banner      │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │           4. Click "Upgrade"     │                 │
     │                │◄────────────────┤                 │
     │                │                 │                 │
     │ 5. Complete    │                 │                 │
     │    checkout    │                 │                 │
     ├───────────────►│                 │                 │
     │                │                 │                 │
     │                │ 6. checkout.    │                 │
     │                │    session.     │                 │
     │                │    completed    │                 │
     │                ├────────────────►│                 │
     │                │                 │                 │
     │                │                 │ 7. Set billing  │
     │                │                 │    isActive=true│
     │                │                 │    status=active│
     │                │                 ├────────────────►│
     │                │                 │   (Firestore)   │
     │                │                 │                 │
     │                │                 │ 8. Banner       │
     │                │                 │    disappears   │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     └────────────────┴─────────────────┴─────────────────┘
```

### Flow 2: Payment Failure → Grace → Expiration

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐
│ Active  │      │  Stripe │      │ Firebase │      │ Coach   │
│Subscription│    │ Invoice │      │ Webhook  │      │   App   │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬────┘
     │                │                 │                 │
     │           1. Payment failed      │                 │
     │                │                 │                 │
     │                ├────────────────►│                 │
     │                │ invoice.payment_│                 │
     │                │     failed      │                 │
     │                │                 │                 │
     │                │         2. Set: │                 │
     │                │    isActive=true│                 │
     │                │   isInGrace=true│                 │
     │                │   gracePeriodEndsAt               │
     │                │      = now + 3d │                 │
     │                │                 ├────────────────►│
     │                │                 │   (Firestore)   │
     │                │                 │                 │
     │                │                 │ 3. Show orange  │
     │                │                 │    grace banner │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │           4. 3 days pass...      │                 │
     │                │                 │                 │
     │                │         5. Cron job runs          │
     │                │         (midnight)                │
     │                │                 │                 │
     │                │                 │ 6. Query orgs   │
     │                │                 │ where grace     │
     │                │                 │ expired         │
     │                │                 │                 │
     │                │         7. Set: │                 │
     │                │   isActive=false│                 │
     │                │  isInGrace=false│                 │
     │                │                 ├────────────────►│
     │                │                 │   (Firestore)   │
     │                │                 │                 │
     │                │                 │ 8. Show full    │
     │                │                 │    block modal  │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │                │         9. Send "Account Paused"  │
     │                │            email                  │
     │                │                 │                 │
     └────────────────┴─────────────────┴─────────────────┘
```

### Flow 3: Reactivation

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐
│ Expired │      │  Stripe │      │ Firebase │      │ Coach   │
│  Coach  │      │ Billing │      │ Webhook  │      │   App   │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬────┘
     │                │                 │                 │
     │                │                 │ 1. Show modal   │
     │                │                 │   "Account      │
     │                │                 │    Paused"      │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │ 2. Click "Reactivate Now"        │                 │
     ├────────────────┼─────────────────┼────────────────►│
     │                │                 │                 │
     │                │         3. Call createBillingPortalSession
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │                │         4. Return portal URL      │
     │                │                 ├────────────────►│
     │                │                 │                 │
     │ 5. Open Safari │                 │                 │
     │    with portal │                 │                 │
     │◄───────────────┤                 │                 │
     │                │                 │                 │
     │ 6. Update      │                 │                 │
     │    payment     │                 │                 │
     │    method      │                 │                 │
     ├───────────────►│                 │                 │
     │                │                 │                 │
     │                │ 7. invoice.     │                 │
     │                │    payment_     │                 │
     │                │    succeeded    │                 │
     │                ├────────────────►│                 │
     │                │                 │                 │
     │                │         8. Set: │                 │
     │                │   isActive=true │                 │
     │                │   status=active │                 │
     │                │                 ├────────────────►│
     │                │                 │   (Firestore)   │
     │                │                 │                 │
     │ 9. Return to app via deep link   │                 │
     │◄─────────────────────────────────┼────────────────►│
     │                │                 │                 │
     │                │                 │ 10. Modal       │
     │                │                 │     disappears  │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     └────────────────┴─────────────────┴─────────────────┘
```

## Decision Tree: What UI Shows?

```
                    ┌─────────────────┐
                    │ Check billing   │
                    │    status       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
         isActive?                    isActive?
         = false                      = true
              │                             │
              ▼                             ▼
     ┌────────────────┐          ┌─────────────────┐
     │ EXPIRED/       │          │ Check sub       │
     │ CANCELED       │          │ status          │
     └───────┬────────┘          └────────┬────────┘
             │                            │
             ▼                            │
     ┌────────────────┐      ┌───────────┴──────────┐
     │ ExpiredModal   │      │                      │
     │ View           │   isInGrace?          subscriptionStatus
     │ - Full block   │   = true              = "trialing"?
     │ - Revenue loss │      │                      │
     │ - Reactivate   │      ▼                      ▼
     └────────────────┘ ┌──────────┐      ┌──────────────┐
                        │ GRACE    │      │ TRIAL        │
                        │ PERIOD   │      │              │
                        └────┬─────┘      └──────┬───────┘
                             │                   │
                             ▼                   ▼
                    ┌─────────────────┐  ┌──────────────┐
                    │ GraceBanner     │  │ TrialBanner  │
                    │ View            │  │ View         │
                    │ - Orange banner │  │ - Blue banner│
                    │ - 3-day countdown│  │ - Dismissible│
                    │ - Fix payment   │  │ - Days left  │
                    └─────────────────┘  └──────────────┘
                                              │
                                         Days < 7?
                                              │
                                         ┌────┴────┐
                                         │         │
                                        No        Yes
                                         │         │
                                         ▼         ▼
                                    ┌────────┐  Show
                                    │ No     │  banner
                                    │ paywall│
                                    └────────┘
```

## Access Control Matrix

```
┌──────────────────┬─────────┬─────────┬─────────┬─────────┐
│   Action         │ TRIAL   │ ACTIVE  │ GRACE   │ EXPIRED │
├──────────────────┼─────────┼─────────┼─────────┼─────────┤
│ View schedules   │   ✅    │   ✅    │   ✅    │   ✅    │
│ View bookings    │   ✅    │   ✅    │   ✅    │   ✅    │
│ View clients     │   ✅    │   ✅    │   ✅    │   ✅    │
│ View packages    │   ✅    │   ✅    │   ✅    │   ✅    │
├──────────────────┼─────────┼─────────┼─────────┼─────────┤
│ Create booking   │   ✅    │   ✅    │   ✅    │   ❌    │
│ Modify booking   │   ✅    │   ✅    │   ✅    │   ❌    │
│ Cancel booking   │   ✅    │   ✅    │   ✅    │   ❌    │
├──────────────────┼─────────┼─────────┼─────────┼─────────┤
│ Add package      │   ✅    │   ✅    │   ✅    │   ❌    │
│ Edit package     │   ✅    │   ✅    │   ✅    │   ❌    │
│ Delete package   │   ✅    │   ✅    │   ✅    │   ❌    │
├──────────────────┼─────────┼─────────┼─────────┼─────────┤
│ Set availability │   ✅    │   ✅    │   ✅    │   ❌    │
│ Invite trainer   │   ✅    │   ✅    │   ✅    │   ❌    │
│ Create class     │   ✅    │   ✅    │   ✅    │   ❌    │
├──────────────────┼─────────┼─────────┼─────────┼─────────┤
│ Access settings  │   ✅    │   ✅    │   ✅    │   ✅    │
│ Update profile   │   ✅    │   ✅    │   ✅    │   ✅    │
│ Billing portal   │   ✅    │   ✅    │   ✅    │   ✅    │
└──────────────────┴─────────┴─────────┴─────────┴─────────┘

Legend:
  ✅ = Allowed
  ❌ = Blocked (shows error message)

Note: During GRACE period, user maintains full access while
      being prompted to update payment. This prevents business
      disruption due to temporary payment issues.
```

## Three-Layer Enforcement

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: UI (UX)                         │
├─────────────────────────────────────────────────────────────┤
│  Purpose: Prevent accidental actions, guide resolution      │
│  Implementation: SwiftUI overlays and conditional views     │
│                                                              │
│  Components:                                                 │
│  ├─ CoachPaywallView (shows banner/modal)                  │
│  ├─ ClientBookingBlockedView (client-facing)               │
│  └─ SubscriptionEnforcementService (real-time monitoring)  │
│                                                              │
│  Can be bypassed? YES (with technical knowledge)            │
│  Defense: Layers 2 & 3 provide security                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               LAYER 2: BACKEND (Webhooks)                   │
├─────────────────────────────────────────────────────────────┤
│  Purpose: React to Stripe events, manage grace periods      │
│  Implementation: Firebase Cloud Functions                   │
│                                                              │
│  Functions:                                                  │
│  ├─ handleStripeWebhook (processes all Stripe events)      │
│  ├─ expireGracePeriods (daily cron job)                    │
│  └─ createBillingPortalSession (secure portal access)      │
│                                                              │
│  Updates: billing.isActive, billing.isInGrace in Firestore  │
│                                                              │
│  Can be bypassed? NO (server-side only)                     │
│  Defense: Complete protection of billing state              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            LAYER 3: DATABASE (Security Rules)               │
├─────────────────────────────────────────────────────────────┤
│  Purpose: Enforce at data level, prevent direct API abuse   │
│  Implementation: Firestore Security Rules                   │
│                                                              │
│  function hasActiveBilling(orgId) {                         │
│    return get(...).data.billing.isActive == true;           │
│  }                                                           │
│                                                              │
│  Applied to ALL protected writes:                           │
│  ├─ allow create: if ... && hasActiveBilling(orgId)        │
│  ├─ allow update: if ... && hasActiveBilling(orgId)        │
│  └─ allow delete: if ... && hasActiveBilling(orgId)        │
│                                                              │
│  Can be bypassed? NO (enforced by Google Cloud)             │
│  Defense: Ultimate security layer, cannot be circumvented   │
└─────────────────────────────────────────────────────────────┘

Result: Even if user bypasses UI, Firestore rules will reject
        all write operations for expired organizations.
```

---

## File Organization

```
SkedenceAdmin/
├── SkedenceAdmin/
│   ├── Models/
│   │   ├── OrganizationBilling.swift         ← Core billing model
│   │   ├── PricingPlan.swift                 ← Plan definitions
│   │   ├── OnboardingProgress.swift          ← Phase 12
│   │   └── SportTemplate.swift               ← Phase 12
│   │
│   ├── Services/
│   │   ├── SubscriptionEnforcementService.swift  ← Monitoring
│   │   ├── ActivationService.swift           ← Phase 13
│   │   └── TemplateService.swift             ← Phase 12
│   │
│   ├── Views/
│   │   ├── Paywall/
│   │   │   ├── CoachPaywallView.swift        ← Main paywall
│   │   │   ├── TrialBannerView.swift         ← Blue banner
│   │   │   ├── GraceBannerView.swift         ← Orange banner
│   │   │   └── ExpiredModalView.swift        ← Full block
│   │   │
│   │   ├── Pricing/
│   │   │   └── PricingView.swift             ← Phase 13
│   │   │
│   │   └── Onboarding/
│   │       ├── OnboardingTemplateView.swift  ← Phase 12
│   │       └── SetupChecklistView.swift      ← Phase 12
│   │
│   └── ContentView.swift                     ← Wire paywall here
│
├── functions/
│   └── src/
│       ├── stripeWebhooks.ts                 ← All webhooks
│       ├── billingPortal.ts                  ← Portal session
│       ├── emailReminders.ts                 ← Phase 13
│       └── index.ts                          ← Export all
│
└── firestore.rules                           ← Security rules

Skedence/
└── Skedence/
    ├── Views/
    │   └── ClientBookingBlockedView.swift    ← Client overlay
    │
    └── ContentView.swift                     ← Wire overlay here
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Real-time billing monitoring
- ✅ Three-layer security (UI + Backend + Database)
- ✅ Graceful degradation (read-only mode)
- ✅ Owner vs trainer differentiation
- ✅ Client relationship protection
- ✅ Automatic grace period management
- ✅ Revenue loss motivation

Ready to integrate! 🚀
