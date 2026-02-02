# Deployment Checklist - Admin Portal Navigation Restructure

## Pre-Deployment Verification

### Code Quality
- [x] Build completes successfully (`npm run build`)
- [x] No TypeScript errors
- [x] No compilation warnings (metadata viewport warnings are expected)
- [x] All imports resolved correctly
- [x] No console errors in development mode

### Component Verification
- [x] Sidebar renders with 5 main tabs
- [x] SchedulingSubmenu renders with 7 sub-tabs
- [x] BusinessSettingsSubmenu renders with 3 sub-tabs
- [x] CalendarView renders with month/week toggle
- [x] All pages use correct wrapper components

### Functionality Checks
- [ ] Main menu navigation works
- [ ] Submenu navigation works
- [ ] Back arrow returns to main menu
- [ ] Calendar displays current month
- [ ] Day selection triggers schedule load
- [ ] Trainer filter updates schedule
- [ ] Mobile menu opens/closes
- [ ] Sign out works correctly

### Responsive Design
- [ ] Desktop layout (≥1024px) looks correct
- [ ] Tablet layout (768-1023px) works properly
- [ ] Mobile layout (<768px) is usable
- [ ] Touch targets are adequate size
- [ ] No horizontal scrolling (except tabs)
- [ ] Text is readable at all sizes

### Browser Testing
- [ ] Chrome/Edge (Chromium)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Deployment Steps

### 1. Final Build
```bash
cd /Users/matthewsprague/Documents/GitHub/Skedence\ Apps/admin-portal
npm run build
```

**Expected Output:**
- ✅ Compiled successfully
- ✅ 22 routes generated
- ⚠️ Metadata viewport warnings (safe to ignore)

### 2. Review Build Output
```bash
ls -la out/
```

**Verify:**
- All pages have corresponding HTML files
- Assets are present in _next/ directory
- File sizes are reasonable

### 3. Copy to Web Directory
```bash
cd /Users/matthewsprague/Documents/GitHub/Skedence\ Apps
./deploy-website.sh
```

**Script will:**
1. Build admin portal
2. Copy `out/` to `web/admin-portal/`
3. Deploy to Firebase Hosting

### 4. Verify Deployment
Visit: `https://skedence.com/admin-portal/`

**Check:**
- [ ] Login page loads
- [ ] Can sign in successfully
- [ ] Main navigation appears
- [ ] Submenu navigation works
- [ ] Calendar displays correctly
- [ ] All routes accessible

## Post-Deployment Testing

### Quick Smoke Test (5 minutes)
1. **Login**
   - Navigate to skedence.com/admin-portal/
   - Enter credentials
   - Verify successful login

2. **Main Navigation**
   - Click each of 5 main tabs
   - Verify correct page loads
   - Check active state highlighting

3. **Scheduling Submenu**
   - Click Scheduling tab
   - Verify submenu appears
   - Click each sub-tab
   - Use back arrow to return

4. **Business Settings Submenu**
   - Click Business Settings tab
   - Verify submenu appears
   - Click each sub-tab
   - Use back arrow to return

5. **Calendar**
   - Go to Scheduling
   - Verify calendar displays
   - Toggle month/week view
   - Select a day
   - Check if schedule loads

6. **Mobile Menu**
   - Resize browser to mobile width
   - Tap hamburger icon
   - Verify menu slides in
   - Tap overlay to close

### Full Testing (30 minutes)

#### Desktop Testing
- [ ] Navigate all main tabs
- [ ] Test all submenu tabs
- [ ] Calendar month/week toggle
- [ ] Day selection and schedule loading
- [ ] Trainer filter functionality
- [ ] Create/edit operations on each page
- [ ] Sign out and back in

#### Tablet Testing (iPad)
- [ ] Open on real iPad or use browser DevTools
- [ ] Test hamburger menu
- [ ] Test touch targets on all buttons
- [ ] Scroll submenu tabs
- [ ] Interact with calendar
- [ ] Test all forms and inputs
- [ ] Verify landscape and portrait modes

#### Mobile Testing (iPhone)
- [ ] Open on real iPhone or use browser DevTools
- [ ] All tablet tests apply
- [ ] Check text readability
- [ ] Verify button sizes
- [ ] Test in different orientations
- [ ] Check for any layout issues

#### Data Operations
- [ ] Load clients list
- [ ] Edit client profile
- [ ] Load trainers list
- [ ] Book a session
- [ ] Create a class
- [ ] View passes
- [ ] Update pricing
- [ ] View analytics
- [ ] Check activity feed
- [ ] Modify settings

## Rollback Plan

If critical issues are found:

### Option 1: Quick Fix
If issue is minor (CSS, text, etc.):
1. Make fix in codebase
2. `npm run build`
3. `./deploy-website.sh`
4. Verify fix deployed

### Option 2: Full Rollback
If major navigation issues:
1. Restore previous version from Git:
   ```bash
   git log --oneline  # Find commit before restructure
   git revert <commit-hash>  # Or git reset if needed
   ```
2. Rebuild and redeploy:
   ```bash
   npm run build
   ./deploy-website.sh
   ```

### Option 3: Emergency Maintenance Page
If catastrophic failure:
1. Add maintenance page to Firebase Hosting
2. Notify users via email/social media
3. Fix issues offline
4. Redeploy when ready

## Monitoring

### First 24 Hours
- Monitor Firebase Analytics for errors
- Check Firebase Crashlytics for issues
- Review user feedback channels
- Watch support ticket volume

### Metrics to Track
- Login success rate
- Page load times
- Navigation clicks
- Calendar usage
- Mobile vs desktop usage
- Error rates

## User Communication

### Announcement Template
```
Subject: Exciting Update: New Navigation in Skedence Admin Portal

Hi [Name],

We've improved the Skedence admin portal with a cleaner, more organized navigation system!

What's New:
• Simplified navigation with 5 main categories
• New Calendar view for easier scheduling
• Improved mobile and tablet experience
• Logical grouping of related features

Key Changes:
• "Scheduling" tab now contains: Calendar, Clients, Trainers, Book Session, Classes, Passes, and Pricing
• "Business Settings" tab contains: Settings, Stripe Settings, and Notifications
• Back arrow (←) returns you to main menu from any submenu

Everything you need is still there - just easier to find!

Questions? Reply to this email or contact support.

Best regards,
The Skedence Team
```

## Support Preparation

### Common Questions & Answers

**Q: Where did all my tabs go?**
A: They're organized into 5 main categories. Click "Scheduling" or "Business Settings" to see submenu options.

**Q: How do I get back to the main menu?**
A: Click the back arrow (←) in the top-left corner.

**Q: Where is the Calendar?**
A: Click "Scheduling" then "Calendar" - it's the first tab.

**Q: I can't find [feature]**
A: Check the submenu under "Scheduling" or "Business Settings"

**Q: Does this work on my iPad/phone?**
A: Yes! The new navigation is optimized for mobile and tablet devices.

## Success Criteria

### Must Have (Before Deployment)
- [x] Build succeeds
- [ ] All pages load without errors
- [ ] Navigation works on desktop
- [ ] Navigation works on mobile
- [ ] Critical operations work (book, create class, etc.)

### Should Have (First Week)
- [ ] No increase in error rates
- [ ] No increase in support tickets
- [ ] Positive user feedback
- [ ] Improved mobile usage metrics
- [ ] Faster task completion times

### Nice to Have (First Month)
- [ ] Increased calendar usage
- [ ] Reduced time to find features
- [ ] Positive user surveys
- [ ] Lower bounce rates
- [ ] Higher engagement metrics

## Sign-Off

### Before Deploying
- [ ] Technical lead approval
- [ ] Product owner approval
- [ ] QA testing complete
- [ ] Documentation updated
- [ ] Support team notified
- [ ] Rollback plan confirmed

### After Deploying
- [ ] Deployment verified in production
- [ ] Monitoring set up
- [ ] Team notified
- [ ] Users communicated to
- [ ] Documentation published

---

## Final Checklist

- [x] Code changes complete
- [x] Build successful
- [ ] Local testing complete
- [ ] Ready for deployment

**Deployment Status:** ✅ Ready (pending final testing)
**Risk Level:** Low
**Estimated Downtime:** 0 minutes
**Rollback Time:** ~5 minutes if needed

---

**Deployed By:** _________________
**Date:** _________________
**Time:** _________________
**Production URL:** https://skedence.com/admin-portal/
