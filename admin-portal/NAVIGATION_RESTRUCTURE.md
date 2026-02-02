# Admin Portal Navigation Restructure

## Overview
The admin portal has been restructured with a simplified navigation system featuring 5 main tabs with intelligent sub-menus for related pages. This improves the user experience by reducing cognitive load and organizing features logically.

## New Navigation Structure

### Main Tabs

1. **Scheduling** (with submenu)
   - Calendar - Month/week view with trainer filtering
   - Clients - Manage client profiles
   - Trainers - Manage trainer accounts
   - Book Session - Schedule private sessions
   - Classes - Manage group classes
   - Passes - View and manage client passes
   - Pricing - Configure package pricing

2. **Reports**
   - Analytics and business insights
   - Previously "Analytics" tab

3. **Activity Feed**
   - Track recent activity and changes
   - Standalone tab (no submenu)

4. **Waiver**
   - Manage liability waiver settings
   - Standalone tab (no submenu)

5. **Business Settings** (with submenu)
   - Settings - General business configuration
   - Stripe Settings - Payment processing setup
   - Notifications - Email/SMS notification preferences (placeholder)

## Navigation Components

### Main Components

#### `sidebar.tsx`
- Primary navigation with 5 main tabs
- Mobile hamburger menu
- User profile display
- Sign out button
- Responsive design (mobile, tablet, desktop)
- Touch-optimized with 56px minimum touch targets

#### `scheduling-submenu.tsx`
- Wraps all scheduling-related pages
- Sticky back arrow navigation
- Horizontal scrolling tabs for mobile
- 7 sub-pages: Calendar, Clients, Trainers, Book Session, Classes, Passes, Pricing

#### `business-settings-submenu.tsx`
- Wraps all business settings pages
- Sticky back arrow navigation
- Horizontal scrolling tabs for mobile
- 3 sub-pages: Settings, Stripe Settings, Notifications

#### `calendar-view.tsx`
- Month/week view toggle
- Day selection with visual feedback
- Navigate between months/weeks
- Shows current day and selected day
- Responsive grid layout

### Page Routing

#### Scheduling Pages
- `/scheduling` - Calendar view with day schedule
- `/clients` - Client management
- `/trainers` - Trainer management
- `/bookings` - Book private sessions
- `/classes` - Manage group classes
- `/passes` - View client passes
- `/pricing` - Configure package pricing

#### Standalone Pages
- `/analytics` - Business reports and analytics
- `/activity` - Activity feed
- `/waiver` - Waiver management

#### Business Settings Pages
- `/settings` - General settings
- `/settings/stripe` - Stripe configuration
- `/settings/notifications` - Notification preferences (placeholder)

## Implementation Details

### Active State Detection
The sidebar detects which main tab should be active based on the current route:
- **Scheduling** - Active for `/scheduling`, `/clients`, `/trainers`, `/bookings`, `/classes`, `/passes`, `/pricing`, `/schedule`
- **Business Settings** - Active for any route starting with `/settings`
- **Other tabs** - Active when route matches exactly or starts with tab path

### Mobile Optimization
- Hamburger menu for mobile devices (< 1024px)
- Fixed header with app branding
- Full-screen overlay when menu is open
- Touch-optimized buttons (56px minimum height)
- Horizontal scrolling for submenu tabs
- Hide scrollbar styling with custom CSS utility

### Submenu Navigation
- Back arrow in top-left returns to main menu (dashboard)
- Sticky header remains visible while scrolling
- Sticky submenu tabs below header
- Active tab highlighted with brand color (#3258A3)
- Responsive container with max-width

### Calendar Features
- Month view: 7-column grid (Sun-Sat)
- Week view: 7-day horizontal view
- Navigate forward/backward through time periods
- Visual indicators:
  - Blue background for today
  - Brand color background for selected day
  - Hover states for interactivity
- Day selection triggers schedule load
- Trainer filter dropdown to show specific trainer's schedule

## Styling & Design System

### Colors
- Primary brand: `#3258A3` (blue)
- Hover state: `#274785` (darker blue)
- Background: `gray-50`
- Cards: `white` with `gray-200` borders
- Text: `gray-900` (primary), `gray-600` (secondary)

### Spacing
- Mobile: `p-4` (16px)
- Desktop: `p-6` / `p-8` (24px / 32px)
- Container max-width: `7xl` (1280px)

### Typography
- Headings: `text-xl` to `text-2xl`, `font-bold`
- Body: `text-sm` to `text-base`, `font-medium`
- Labels: `text-xs`, `text-gray-500`

### Touch Targets
- Minimum height: `56px` for main navigation
- Minimum height: `44px` for submenu tabs and form elements
- Adequate spacing between interactive elements

## Dependencies

### Required Packages
- `next` - 16.1.4+
- `react` - 19+
- `firebase` - Firestore database
- `lucide-react` - Icon library
- `date-fns` - Date formatting
- `tailwindcss` - Styling

### Custom Utilities
- `@/lib/utils` - cn() for conditional classNames
- `@/hooks/useAuth` - Authentication and org context
- `@/lib/firebase` - Firebase configuration
- `.hide-scrollbar` - CSS utility for hidden scrollbars

## Migration Notes

### Changes from Previous Structure
1. Removed "Dashboard" as a separate tab (now landing page)
2. Consolidated 12+ tabs into 5 main categories
3. Added Calendar view as primary scheduling interface
4. Moved Analytics to "Reports" for clarity
5. Grouped settings-related pages under "Business Settings"
6. Added "Notifications" placeholder for future feature

### Breaking Changes
- All scheduling pages now require `SchedulingSubmenu` wrapper
- All settings pages now require `BusinessSettingsSubmenu` wrapper
- Removed `DashboardLayout` component (replaced by submenu wrappers)
- Dashboard route (`/dashboard`) now redirects to Scheduling
- Width of sidebar increased from 256px to 320px for better readability

### Backward Compatibility
- All existing page routes remain the same (no URL changes)
- Authentication and authorization unchanged
- Firestore queries and data structure unchanged
- Mobile/tablet support maintained and improved

## Testing Checklist

### Desktop (≥1024px)
- [ ] All main tabs navigate correctly
- [ ] Submenu tabs display horizontally
- [ ] Back arrow returns to main menu
- [ ] Calendar month/week toggle works
- [ ] Day selection loads schedule
- [ ] Trainer filter updates schedule
- [ ] Active states highlight correctly
- [ ] Sign out button works

### Tablet (768px - 1023px)
- [ ] Hamburger menu appears
- [ ] Menu slides in from left
- [ ] Overlay closes menu on tap
- [ ] All navigation functional
- [ ] Touch targets adequate size
- [ ] Layout responsive

### Mobile (< 768px)
- [ ] All tablet features work
- [ ] Submenu tabs scroll horizontally
- [ ] Calendar grid responsive
- [ ] Text remains readable
- [ ] Buttons not overlapping
- [ ] Forms usable

### Functionality
- [ ] Calendar displays current month
- [ ] Navigate forward/backward works
- [ ] Day selection shows bookings and classes
- [ ] Trainer filter affects displayed results
- [ ] Empty states show helpful messages
- [ ] Loading states display correctly
- [ ] Error states handled gracefully

## Future Enhancements

### Planned Features
1. **Notifications Page** - Implement email/SMS notification preferences
2. **Calendar Improvements**
   - Drag-and-drop to reschedule
   - Quick add session from calendar
   - Color coding by trainer or session type
   - Multi-day view option
3. **Dashboard Landing** - Create dedicated dashboard with widgets
4. **Keyboard Navigation** - Add keyboard shortcuts for power users
5. **Search** - Global search across clients, trainers, and sessions

### Accessibility Improvements
- Add ARIA labels to all navigation elements
- Keyboard focus indicators
- Screen reader announcements for state changes
- High contrast mode support

## Deployment

### Build Command
```bash
cd admin-portal
npm run build
```

### Deploy Script
```bash
./deploy-website.sh
```

The script will:
1. Build the admin portal
2. Copy output to `/web/admin-portal/`
3. Deploy to Firebase Hosting
4. Available at `skedence.com/admin-portal/`

## Support

For questions or issues with the new navigation structure, contact the development team or file an issue in the project repository.

---

**Last Updated:** January 2025
**Version:** 2.0.0
