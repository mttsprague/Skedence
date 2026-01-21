# Admin App Profile & Organization Editing Features

## Overview
Implemented user profile editing and organization management features in the SkedenceAdmin app.

## Features Implemented

### 1. Profile Editing (Account Tab)
**Location**: ContentView.swift (Account/More View)

**Functionality**:
- Edit button next to "Account Information" header
- Modal sheet with form for editing:
  - First Name
  - Last Name
  - Email
- Save functionality that updates:
  - Firestore `trainers` collection document
  - Firebase Auth email (if changed)
  - AuthManager state variables
- Comprehensive error handling and user feedback
- Warning about re-authentication requirement when changing email

**Code Changes**:
- Added state variables: `showingEditProfile`, `editFirstName`, `editLastName`, `editEmail`, `isSavingProfile`, `profileError`
- Added edit button to trigger sheet
- Implemented `saveProfile()` async function
- Form validates that all fields are filled before saving

### 2. Organization Name Editing (Business Tab)
**Location**: SuperAdminView.swift (OrganizationCard)

**Functionality**:
- Edit button (pencil icon) on each organization card
- Alert dialog for editing organization name
- Updates Firestore `organizations` collection
- Real-time error handling
- Owner-only feature

**Code Changes**:
- Added state variables to OrganizationCard: `showingEditName`, `editedName`, `isSaving`, `errorMessage`
- Added edit button next to StatusBadge
- Implemented `saveOrganizationName()` async function
- Used SwiftUI alert with TextField for inline editing

### 3. Stripe Settings Button Fix (Business Tab)
**Location**: SuperAdminView.swift

**Issue**: NavigationLink to OnboardingStripeView wasn't properly configured for standalone use (outside onboarding flow)

**Solution**:
- Created `configureCoordinatorForStripe()` helper function
- Function creates new OnboardingCoordinator instance
- Populates coordinator with:
  - Current organization ID from auth
  - User ID from auth
  - Organization name from viewModel
  - Stripe completion status
- Ensures Stripe Connect flow works for:
  - Initial setup during onboarding
  - Access from Business tab later
  - Updating existing Stripe accounts

**Code Changes**:
- Modified NavigationLink to use `configureCoordinatorForStripe()`
- Added helper function that properly initializes coordinator state

## Technical Details

### Firestore Collections Updated
- `trainers` - firstName, lastName, email fields
- `organizations` - name field

### Authentication
- Profile editing includes Firebase Auth email update
- Requires re-authentication if email changed
- AuthManager state synchronized with Firestore updates

### Error Handling
- All async operations wrapped in try-catch blocks
- User-facing error messages displayed in UI
- Loading states prevent double-submission
- Form validation (non-empty fields)

## Testing Checklist

### Profile Editing
- [ ] Open Account tab
- [ ] Click "Edit" button next to Account Information
- [ ] Change first name, last name, email
- [ ] Click "Save"
- [ ] Verify changes persist after app restart
- [ ] Test with email change (should prompt for re-auth on next auth operation)

### Organization Name Editing
- [ ] Open Business tab
- [ ] Navigate to Organizations section
- [ ] Click pencil icon on organization card
- [ ] Change organization name
- [ ] Click "Save" in alert
- [ ] Verify name updates immediately in UI
- [ ] Verify name persists in Firestore

### Stripe Settings
- [ ] Open Business tab
- [ ] Click "Stripe Settings" card
- [ ] Verify OnboardingStripeView opens without errors
- [ ] Test "Connect with Stripe" flow
- [ ] Verify Stripe account link generation works
- [ ] Test "Check Status" after completing Stripe setup
- [ ] Verify can access even if skipped during onboarding

## Files Modified

1. **ContentView.swift**
   - Lines 146-158: Added profile editing state variables
   - Lines 206-221: Added edit button
   - Lines 363-418: Added edit profile sheet
   - Lines 420-466: Implemented saveProfile() function

2. **SuperAdminView.swift**
   - Lines 215-237: Updated Stripe Settings NavigationLink
   - Lines 427-521: Modified OrganizationCard with edit functionality
   - Lines 421-437: Added configureCoordinatorForStripe() helper

## Notes

- Profile editing available to all trainers/admins/owners
- Organization editing only for owners (enforced by UI access)
- Stripe functionality leverages existing OnboardingStripeView
- All features follow existing app design patterns and DesignSystem
- No breaking changes to existing functionality

## Status
✅ All features implemented and error-free
⏳ Awaiting user testing
