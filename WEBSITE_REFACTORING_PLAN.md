# Skedence Website Refactoring Plan
**Domain:** skedence.com (Firebase Hosting: polyface-ae6d3)  
**Date:** February 4, 2026  
**Current State:** Marketing site (vanilla HTML/CSS/JS) + Admin Portal (Next.js)

---

## 🎯 Executive Summary

The Skedence website currently consists of:
- **Marketing site:** 11 HTML pages (~5,881 lines) with vanilla JS/CSS
- **Admin Portal:** Next.js app (13,124 lines) served at `/admin-portal/`
- **Deployment:** Manual script that builds admin portal → copies to web/ → deploys to Firebase

**Primary Goals:**
1. Consolidate tech stack (eliminate vanilla HTML/CSS/JS)
2. Improve maintainability and development speed
3. Enable SEO optimization for marketing pages
4. Create unified design system
5. Streamline deployment process

---

## 📊 Current Architecture Analysis

### Marketing Site (`/web/`)
```
web/
├── index.html (415 lines)          # Homepage
├── about.html                      # About page
├── privacy.html                    # Privacy policy
├── terms.html                      # Terms of service
├── support.html                    # Support page
├── setup-password.html             # Password setup
├── stripe-keys.html                # Stripe configuration
├── stripe-redirect.html            # Stripe redirect handler
├── checkout-success.html           # Payment success
├── checkout-cancel.html            # Payment cancelled
├── admin-dashboard.html            # Legacy admin dashboard
├── style.css                       # Global styles
├── script.js                       # Marketing site JS
├── admin-dashboard.js              # Legacy admin JS
└── admin-portal/ (copied from build)
```

**Issues:**
- ❌ Duplicate tech stack (vanilla + Next.js)
- ❌ No component reusability
- ❌ Manual copy-paste for shared elements (nav, footer)
- ❌ No TypeScript type safety
- ❌ Inconsistent styling between marketing and admin
- ❌ SEO managed manually in each HTML file
- ❌ Duplicate admin-portal folders (`admin-portal` and `admin-portal 2`)
- ❌ Legacy files (`admin-dashboard.html`, `admin-dashboard.js`)

### Admin Portal (`/admin-portal/`)
```
admin-portal/
├── src/
│   ├── app/ (29 pages)
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── out/ (static export)
└── firebase.json
```

**Current State:**
- ✅ Modern Next.js 14+ with App Router
- ✅ TypeScript + Tailwind CSS + Shadcn/ui
- ✅ Clean architecture (13,124 lines, 52 files)
- ✅ Firebase integration
- ⚠️ Deployed as static export to `/web/admin-portal/`

---

## 🎨 Recommended Architecture

### Option 1: Unified Next.js Monolith (RECOMMENDED)
**Consolidate everything into one Next.js application**

```
skedence-website/
├── src/
│   ├── app/
│   │   ├── (marketing)/           # Marketing pages
│   │   │   ├── page.tsx            # Homepage
│   │   │   ├── about/
│   │   │   ├── pricing/
│   │   │   ├── support/
│   │   │   ├── privacy/
│   │   │   └── terms/
│   │   ├── (admin)/                # Admin portal (protected)
│   │   │   ├── layout.tsx          # Admin layout with auth
│   │   │   ├── dashboard/
│   │   │   ├── clients/
│   │   │   ├── trainers/
│   │   │   └── ... (existing admin pages)
│   │   ├── (auth)/                 # Auth pages
│   │   │   ├── login/
│   │   │   └── setup-password/
│   │   └── api/                    # API routes
│   ├── components/
│   │   ├── marketing/              # Landing page components
│   │   ├── admin/                  # Admin components (existing)
│   │   └── shared/                 # Shared components (nav, footer)
│   └── styles/
│       ├── marketing.css           # Marketing-specific styles
│       └── globals.css             # Shared styles
├── public/
├── firebase.json
└── next.config.ts
```

**Benefits:**
- ✅ Single codebase, single deployment
- ✅ Shared components (nav, footer, buttons)
- ✅ Unified TypeScript types
- ✅ Better SEO with Next.js metadata API
- ✅ Code splitting (marketing vs admin bundles)
- ✅ Simplified CI/CD pipeline
- ✅ Consistent design system

**Tradeoffs:**
- ⚠️ Slightly larger initial bundle
- ⚠️ More complex routing structure

---

### Option 2: Multi-App Monorepo
**Keep marketing and admin separate but in one repo**

```
skedence-monorepo/
├── apps/
│   ├── marketing/                  # Next.js marketing site
│   │   ├── src/
│   │   ├── public/
│   │   └── next.config.ts
│   └── admin/                      # Next.js admin portal
│       ├── src/
│       └── next.config.ts
├── packages/
│   ├── ui/                         # Shared components
│   ├── config/                     # Shared config
│   └── types/                      # Shared types
├── firebase.json
└── turbo.json                      # Turborepo config
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Independent deployments possible
- ✅ Shared packages via monorepo tools (Turborepo/Nx)

**Tradeoffs:**
- ⚠️ More complex setup
- ⚠️ Requires monorepo tooling
- ⚠️ Harder to share code initially

---

## 📋 Phase-by-Phase Refactoring Plan

### **Phase 1: Foundation Setup** (4-6 hours)

#### 1.1 Project Structure
- [ ] Create new directory: `skedence-unified/`
- [ ] Initialize Next.js 14+ with App Router
- [ ] Set up TypeScript strict mode
- [ ] Configure Tailwind CSS + Shadcn/ui
- [ ] Set up ESLint + Prettier

#### 1.2 Migrate Shared Components
- [ ] Move admin portal's existing components to `src/components/admin/`
- [ ] Create `src/components/shared/` for shared elements
- [ ] Build marketing-specific components in `src/components/marketing/`

#### 1.3 Firebase Configuration
- [ ] Copy Firebase config from admin portal
- [ ] Update `firebase.json` for unified hosting
- [ ] Configure environment variables (`.env.local`)

**Deliverable:** Working Next.js skeleton with admin portal components

---

### **Phase 2: Marketing Pages Migration** (8-10 hours)

#### 2.1 Convert HTML Pages to React
- [ ] **Homepage** (`index.html` → `app/(marketing)/page.tsx`)
  - Hero section component
  - Features grid component
  - Pricing table component
  - CTA sections component
  - Testimonials component (if any)

- [ ] **About Page** (`about.html` → `app/(marketing)/about/page.tsx`)
  - Team section
  - Mission/vision content
  - Company story

- [ ] **Support Page** (`support.html` → `app/(marketing)/support/page.tsx`)
  - FAQ accordion
  - Contact form
  - Support resources

- [ ] **Legal Pages**
  - `privacy.html` → `app/(marketing)/privacy/page.tsx`
  - `terms.html` → `app/(marketing)/terms/page.tsx`

#### 2.2 Migrate Styles
- [ ] Convert `style.css` to Tailwind utility classes
- [ ] Extract reusable design tokens (colors, spacing, fonts)
- [ ] Create `marketing.css` for marketing-specific styles
- [ ] Ensure responsive design consistency

#### 2.3 Migrate JavaScript
- [ ] Convert `script.js` functionality to React hooks
  - Mobile menu toggle → `useState`
  - Form handling → `useForm` or React Hook Form
  - Scroll animations → `useEffect` + Intersection Observer
- [ ] Add TypeScript types for all functions

**Deliverable:** All marketing pages functional in Next.js

---

### **Phase 3: Admin Portal Integration** (4-6 hours)

#### 3.1 Route Organization
- [ ] Move admin pages to `app/(admin)/` route group
- [ ] Create admin layout with auth protection
- [ ] Update navigation to use Next.js `<Link>` components
- [ ] Configure route groups for different layouts

#### 3.2 Authentication Flow
- [ ] Move login page to `app/(auth)/login/page.tsx`
- [ ] Move setup-password to `app/(auth)/setup-password/page.tsx`
- [ ] Implement middleware for protected routes
- [ ] Add auth state management

#### 3.3 Clean Up Admin Code
- [ ] Remove unused components from original admin portal
- [ ] Consolidate duplicate utilities
- [ ] Update import paths to new structure
- [ ] Remove console.logs (already partially done)

**Deliverable:** Fully integrated admin portal with auth

---

### **Phase 4: Checkout & Payment Pages** (3-4 hours)

#### 4.1 Stripe Integration Pages
- [ ] Convert `checkout-success.html` → `app/(checkout)/success/page.tsx`
- [ ] Convert `checkout-cancel.html` → `app/(checkout)/cancel/page.tsx`
- [ ] Convert `stripe-keys.html` → `app/(admin)/settings/stripe/page.tsx`
- [ ] Convert `stripe-redirect.html` → API route or client component

#### 4.2 Enhanced Checkout Flow
- [ ] Create checkout session API route
- [ ] Add loading states for payment processing
- [ ] Implement error handling with user-friendly messages
- [ ] Add success/cancel redirects with query params

**Deliverable:** Complete Stripe checkout flow

---

### **Phase 5: SEO & Performance Optimization** (4-6 hours)

#### 5.1 SEO Implementation
- [ ] Add metadata to each page using Next.js Metadata API
- [ ] Generate sitemap.xml dynamically
- [ ] Add robots.txt
- [ ] Implement structured data (JSON-LD) for rich snippets
- [ ] Add Open Graph tags for social sharing
- [ ] Optimize images with Next.js `<Image>` component

#### 5.2 Performance
- [ ] Implement code splitting for marketing vs admin bundles
- [ ] Add loading states and Suspense boundaries
- [ ] Optimize fonts with `next/font`
- [ ] Lazy load below-the-fold content
- [ ] Add service worker for offline functionality (optional)

#### 5.3 Analytics
- [ ] Integrate Google Analytics 4 (if not already)
- [ ] Add conversion tracking
- [ ] Set up Firebase Analytics
- [ ] Add error tracking (Sentry or similar)

**Deliverable:** Optimized, SEO-ready website

---

### **Phase 6: Design System & Consistency** (6-8 hours)

#### 6.1 Unified Design Tokens
- [ ] Extract colors, spacing, typography to Tailwind config
- [ ] Create consistent button variants
- [ ] Standardize form inputs
- [ ] Build card components library
- [ ] Create consistent spacing system

#### 6.2 Component Library
- [ ] Build marketing components library
  - `<Hero />` variants
  - `<FeatureCard />`
  - `<PricingCard />`
  - `<TestimonialCard />`
  - `<CTASection />`
  - `<Newsletter />` signup
  - `<ContactForm />`

- [ ] Extend existing admin components
  - Update to use consistent design tokens
  - Add variants for marketing use

#### 6.3 Navigation & Layout
- [ ] Create marketing navbar component
- [ ] Create admin navbar (already exists, update if needed)
- [ ] Build footer component with links
- [ ] Add breadcrumbs for admin pages
- [ ] Implement mobile-responsive drawer

**Deliverable:** Cohesive design system across site

---

### **Phase 7: Deployment & DevOps** (3-4 hours)

#### 7.1 Build Configuration
- [ ] Update `next.config.ts` for static export
- [ ] Configure Firebase Hosting rewrites
- [ ] Set up environment variables in Firebase
- [ ] Test production build locally

#### 7.2 Deployment Pipeline
- [ ] Update `deploy-website.sh` script
- [ ] Create GitHub Actions workflow (optional)
  - Run on push to main
  - Build Next.js app
  - Deploy to Firebase Hosting
  - Run tests before deploy
- [ ] Set up staging environment (optional)

#### 7.3 Monitoring
- [ ] Configure Firebase Hosting headers (caching, security)
- [ ] Set up uptime monitoring
- [ ] Configure Firebase Performance Monitoring
- [ ] Add custom domain verification

**Deliverable:** Automated deployment pipeline

---

### **Phase 8: Cleanup & Documentation** (2-3 hours)

#### 8.1 Remove Legacy Code
- [ ] Delete old `web/` directory after successful migration
- [ ] Remove duplicate `admin-portal 2` folder in web/
- [ ] Delete `admin-dashboard.html` and `admin-dashboard.js`
- [ ] Clean up unused dependencies
- [ ] Remove old deployment scripts

#### 8.2 Documentation
- [ ] Update README with new architecture
- [ ] Document component usage
- [ ] Create developer setup guide
- [ ] Document deployment process
- [ ] Add troubleshooting guide

#### 8.3 Final Testing
- [ ] Test all marketing pages
- [ ] Test all admin pages
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Performance audit (Lighthouse)

**Deliverable:** Production-ready unified website

---

## 🚀 Quick Start Implementation

### Immediate Actions (Do This First)
```bash
# 1. Remove duplicate folders
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps/web"
rm -rf "admin-portal 2"

# 2. Remove legacy files
rm -f admin-dashboard.html admin-dashboard.js

# 3. Create new unified project
cd "/Users/matthewsprague/Documents/GitHub/Skedence Apps"
npx create-next-app@latest skedence-unified --typescript --tailwind --app --src-dir
```

---

## 📈 Migration Checklist

### Pre-Migration
- [x] Audit current website structure
- [x] Document all pages and features
- [x] Identify shared components
- [ ] Take screenshots of all pages (for comparison)
- [ ] Export current analytics data
- [ ] Backup current deployment

### During Migration
- [ ] Set up parallel development environment
- [ ] Migrate one page at a time
- [ ] Test each page before moving to next
- [ ] Keep old site running until fully tested
- [ ] Document any breaking changes

### Post-Migration
- [ ] A/B test performance vs old site
- [ ] Monitor error rates
- [ ] Verify SEO rankings maintained
- [ ] Check all links working
- [ ] Verify forms submitting correctly
- [ ] Test payment flow thoroughly
- [ ] Update DNS if needed
- [ ] Archive old codebase

---

## 🎯 Success Metrics

### Development Experience
- ✅ Single `npm install` for entire website
- ✅ Single `npm run dev` to develop
- ✅ Single `npm run build` to deploy
- ✅ TypeScript type safety across all pages
- ✅ Component reusability >80%

### Performance
- ✅ Lighthouse score >90 (Performance)
- ✅ First Contentful Paint <1.5s
- ✅ Time to Interactive <3.5s
- ✅ Bundle size <200KB (initial load)

### SEO
- ✅ All pages indexed within 1 week
- ✅ Meta tags on all pages
- ✅ Sitemap generated automatically
- ✅ Structured data implemented

---

## ⚠️ Risks & Mitigation

### Risk: SEO Ranking Loss
**Mitigation:**
- Maintain exact same URL structure
- Add 301 redirects if URLs change
- Keep meta tags consistent
- Monitor Google Search Console during migration

### Risk: Downtime During Deployment
**Mitigation:**
- Use Firebase preview channels for testing
- Deploy during low-traffic hours
- Keep rollback plan ready
- Use blue-green deployment if possible

### Risk: Broken Links
**Mitigation:**
- Create comprehensive link inventory
- Test all internal links before launch
- Set up 404 tracking
- Add custom 404 page with helpful links

### Risk: Payment Flow Issues
**Mitigation:**
- Test Stripe integration thoroughly in test mode
- Verify webhooks working correctly
- Test success/cancel flows multiple times
- Monitor first 24 hours closely after launch

---

## 💰 Estimated Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Foundation | 4-6 hours | 🔴 Critical |
| Phase 2: Marketing Pages | 8-10 hours | 🔴 Critical |
| Phase 3: Admin Integration | 4-6 hours | 🔴 Critical |
| Phase 4: Checkout Pages | 3-4 hours | 🟡 High |
| Phase 5: SEO & Performance | 4-6 hours | 🟡 High |
| Phase 6: Design System | 6-8 hours | 🟢 Medium |
| Phase 7: Deployment | 3-4 hours | 🔴 Critical |
| Phase 8: Cleanup | 2-3 hours | 🟢 Medium |
| **Total** | **34-47 hours** | *~1 week full-time* |

---

## 🎓 Learning Resources

### Next.js App Router
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Route Groups & Layouts](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

### Firebase Hosting
- [Next.js on Firebase Hosting](https://firebase.google.com/docs/hosting/nextjs)
- [Firebase Hosting Rewrites](https://firebase.google.com/docs/hosting/full-config#rewrites)

### Design System
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/utility-first)

---

## 📝 Notes

### Current State Summary
- **Marketing site:** 5,881 lines of vanilla HTML/CSS/JS
- **Admin portal:** 13,124 lines of modern Next.js/TypeScript
- **Total:** ~19,000 lines to maintain
- **Duplicate folders:** `admin-portal 2` in web/ (needs removal)
- **Legacy files:** `admin-dashboard.html`, `admin-dashboard.js` (needs removal)

### Post-Refactor Expected State
- **Unified codebase:** ~15,000-16,000 lines (20% reduction via component reuse)
- **Single tech stack:** Next.js/TypeScript/Tailwind
- **Maintainability:** Significantly improved
- **Development speed:** 2-3x faster for new features

---

## 🚦 Decision Required

**Which approach do you prefer?**

1. **Option 1: Unified Monolith** (Recommended)
   - Single Next.js app with marketing + admin
   - Fastest to implement
   - Easiest to maintain

2. **Option 2: Multi-App Monorepo**
   - Separate marketing and admin apps
   - More complex setup
   - Better separation of concerns

**Recommendation:** Start with Option 1. You can always split later if needed.

---

**Ready to proceed?** Let me know if you want to:
1. Start the migration immediately
2. Review specific phases in detail
3. Adjust the plan based on your priorities
