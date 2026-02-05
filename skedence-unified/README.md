# Skedence Unified Website

This is the unified Next.js application combining the Skedence marketing website and admin portal into a single codebase.

## 🎯 Project Overview

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Deployment**: Firebase Hosting (static export)

## 📁 Project Structure

```
skedence-unified/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Public marketing pages
│   │   │   ├── page.tsx           # Homepage
│   │   │   ├── about/
│   │   │   ├── support/
│   │   │   ├── privacy/
│   │   │   └── terms/
│   │   ├── (admin)/               # Protected admin portal
│   │   │   ├── layout.tsx         # Admin layout with nav
│   │   │   └── dashboard/
│   │   ├── (auth)/                # Authentication pages
│   │   │   ├── login/
│   │   │   └── setup-password/
│   │   ├── (checkout)/            # Checkout flow (coming soon)
│   │   └── layout.tsx             # Root layout
│   ├── components/
│   │   ├── ui/                    # Shadcn/ui components
│   │   ├── marketing/             # Marketing components (TBD)
│   │   ├── admin/                 # Admin components (TBD)
│   │   └── shared/                # Shared components (TBD)
│   ├── lib/
│   │   ├── firebase.ts            # Firebase configuration
│   │   └── utils.ts               # Utility functions
│   ├── hooks/                     # React hooks (TBD)
│   └── types/                     # TypeScript types (TBD)
├── public/                        # Static assets
├── firebase.json                  # Firebase Hosting config
├── .env.local                     # Environment variables
└── next.config.ts                 # Next.js configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: use nvm)
- npm or yarn
- Firebase CLI: `npm install -g firebase-tools`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Build & Deploy

```bash
# Build for production (static export)
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## 🔧 Environment Variables

Create a `.env.local` file with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

## 📋 Current Status

### ✅ Completed

- [x] Project initialization with Next.js 16
- [x] Firebase configuration
- [x] Tailwind CSS + Shadcn/ui setup
- [x] Route groups structure (marketing, admin, auth, checkout)
- [x] Marketing pages (home, about, support, privacy, terms)
- [x] Authentication pages (login, setup-password)
- [x] Basic admin dashboard structure
- [x] Static export configuration
- [x] TypeScript strict mode

### 🔄 In Progress

- [ ] Migrate all admin portal components from `/admin-portal`
- [ ] Copy existing admin pages (clients, trainers, schedule, etc.)
- [ ] Migrate admin hooks and utilities
- [ ] Add authentication middleware for protected routes

### 📅 Upcoming

- [ ] Stripe checkout pages
- [ ] Complete admin portal migration
- [ ] Shared component library
- [ ] Mobile navigation
- [ ] Performance optimization
- [ ] SEO enhancements
- [ ] CI/CD pipeline with GitHub Actions

## 🔐 Authentication

The app uses Firebase Authentication with:
- Email/password login
- Password reset flow
- Protected admin routes (to be implemented)

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Beautiful, accessible component library
- **Design tokens**: Consistent colors, spacing, typography

To add more Shadcn components:
```bash
npx shadcn@latest add [component-name]
```

## 📦 Key Dependencies

- `next@16.1.6` - React framework
- `firebase@^11.3.0` - Firebase SDK
- `tailwindcss@^4.0.0` - CSS framework
- `lucide-react@^0.469.0` - Icon library
- `react-hook-form@^7.54.2` - Form management
- `zod@^3.24.1` - Schema validation
- `recharts@^2.15.0` - Charts library

## 🏗️ Architecture Decisions

### Why Unified App?

1. **Single Codebase**: Easier to maintain and deploy
2. **Shared Components**: Reuse UI components across marketing and admin
3. **Unified Types**: Single source of truth for TypeScript types
4. **Better SEO**: Next.js metadata API for marketing pages
5. **Code Splitting**: Automatic bundle optimization by route groups

### Route Groups

- `(marketing)`: Public pages, no layout wrapper
- `(admin)`: Protected pages with admin navigation
- `(auth)`: Standalone auth pages
- `(checkout)`: Checkout flow pages

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build check
npm run build
```

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Shadcn/ui Docs](https://ui.shadcn.com)
- [Refactoring Plan](../WEBSITE_REFACTORING_PLAN.md)

## 🤝 Contributing

This is a unified refactoring of the Skedence website. The next major steps are:

1. Copy all admin portal pages from `/admin-portal/src/app`
2. Migrate components to organized structure
3. Add authentication middleware
4. Test all routes and functionality
5. Deploy to staging environment

## 📄 License

Private - Skedence © 2026

---

**Status**: Foundation complete, ready for admin portal migration
**Last Updated**: February 4, 2026
