# Step 9 Complete: Business Onboarding Flow

## ✅ What We Built

### 1. Onboarding Landing Page
**File: OnboardingLandingView.swift**

A beautiful landing page that shows when no user is signed in:
- Gradient background with app branding
- 4 key feature highlights
- "Create Business Account" CTA
- "Sign In" option for existing users

### 2. Create Business Flow
**File: CreateBusinessView.swift**

Complete business account creation wizard:

#### Collects:
- Business name
- Owner information (first name, last name, email, password)
- Timezone selection (ET, CT, MT, PT)
- Currency selection (USD, CAD, EUR, GBP)

#### Creates:
1. **Firebase Auth account** for owner
2. **Organization document** with:
   ```typescript
   {
     name: "Business Name",
     ownerUserId: "uid_xxx",
     branding: { primaryColor: "#33B2AE", logoUrl: "" },
     stripe: { connectAccountId: null, ... },
     settings: { timezone: "America/New_York", currency: "USD" }
   }
   ```
3. **orgMember document** (owner role)
4. **Trainer profile** (admin: true)
5. **Loads branding** into AuthManager
6. **Launches Stripe onboarding** automatically

### 3. Stripe Connect Onboarding
**File: StripeOnboardingView.swift**

Multi-step Stripe Connect setup wizard:

#### Step 1: Create Account
- Explains benefits of Stripe Connect
- Shows features (accept cards, auto payouts, no fees, PCI compliant)
- Calls `createConnectAccount` Cloud Function

#### Step 2: Complete Setup
- Displays onboarding requirements (business details, bank account, ID verification)
- Generates Stripe onboarding link via `createConnectAccountLink` function
- Opens link in Safari
- Allows "I'll do this later" skip option

#### Step 3: Verification
- "Check Status" button
- Calls `refreshConnectAccountStatus` function
- Verifies `onboardingComplete` and `chargesEnabled` flags
- Shows success screen when ready

#### Step 4: Complete
- Success screen with checkmark
- "Get Started" button to enter app

### 4. Sign In Flow
Embedded in OnboardingLandingView:
- Simple email/password form
- Error handling
- Auto-dismisses on successful sign-in
- Loads org data via AuthManager

## 🎨 Design Features

### Professional UI Elements:
- Step indicator (1-2-3 circles with progress bar)
- Icon-based feature rows
- Benefit checkmarks with green icons
- Loading states with spinners
- Error messages with red backgrounds
- Primary/secondary button styles
- Gradient backgrounds
- Drop shadows for depth

### Accessibility:
- All text uses semantic fonts (headingLarge, bodyMedium, etc.)
- Proper color contrast
- Disabled states for incomplete forms
- Clear error messages

## 🔄 User Journey

### New Business Owner:
1. **Opens app** → Sees OnboardingLandingView
2. **Taps "Create Business Account"** → Opens CreateBusinessView
3. **Fills out form:**
   - Business name: "Elite Volleyball Training"
   - Owner: John Doe, john@example.com
   - Password: ••••••••
   - Timezone: Pacific (PT)
   - Currency: USD
4. **Taps "Create Account"** → Firebase Auth account created
5. **Automatically shows StripeOnboardingView**
6. **Step 1:** Reads about Stripe benefits, taps "Continue"
7. **Step 2:** Taps "Open Stripe Setup" → Opens Safari
8. **Completes Stripe onboarding** in browser (5 minutes)
9. **Returns to app**, taps "I've Finished - Check Status"
10. **Step 3:** Status confirmed, sees success screen
11. **Taps "Get Started"** → Enters main app

### Existing Business Owner:
1. **Opens app** → Sees OnboardingLandingView
2. **Taps "Sign In"** → Opens SignInView
3. **Enters credentials** → Signs in
4. **AuthManager loads org data** → Branding applied
5. **Enters main app**

## 🔧 Technical Implementation

### Cloud Functions Used:
- `createConnectAccount(orgId, email, businessName)` - Creates Stripe Express account
- `createConnectAccountLink(orgId)` - Generates onboarding URL
- `refreshConnectAccountStatus(orgId)` - Checks onboarding completion

### Firestore Operations:
```swift
// 1. Create organization
organizations/{orgId}

// 2. Create orgMember
orgMembers/{userId}_{orgId}

// 3. Create trainer
trainers/{userId}

// All with orgId references
```

### AuthManager Integration:
- Automatically loads orgId after sign-in
- Loads branding (primaryColor, logoUrl) from organization
- Stores stripePublishableKey for future payment integration

## 📱 Where to Add in App

### CoachFlow Admin ContentView.swift:
```swift
@main
struct CoachFlow AdminApp: App {
    @StateObject private var auth = AuthManager()
    
    var body: some Scene {
        WindowGroup {
            if !auth.isAuthenticated {
                OnboardingLandingView()
                    .environmentObject(auth)
            } else {
                ContentView()
                    .environmentObject(auth)
            }
        }
    }
}
```

## 🎯 Next Steps (Step 10)

Now that businesses can onboard, we need to add **platform billing**:

### Step 10 Features:
1. **Create Stripe subscription products** for platform fees
   - Free tier: 0-50 bookings/month → $0
   - Starter: 51-200 bookings/month → $29/month
   - Professional: 201+ bookings/month → $79/month

2. **Add billing status to organizations**
   ```typescript
   billing: {
     plan: "starter",
     status: "active",
     subscriptionId: "sub_xxx",
     currentPeriodEnd: Timestamp
   }
   ```

3. **Implement subscription checks**
   - Show paywall if subscription inactive
   - Display "Upgrade Plan" UI when limits exceeded
   - Webhook handlers for subscription events

4. **Build Manage Subscription UI**
   - View current plan
   - Change payment method
   - Cancel subscription
   - View invoice history

## 🧪 Testing Checklist

### CreateBusinessView:
- [ ] Form validation works (all fields required)
- [ ] Password minimum 6 characters
- [ ] Firebase Auth account created successfully
- [ ] Organization document created with correct fields
- [ ] orgMember created with "owner" role
- [ ] Trainer profile created with isAdmin: true
- [ ] AuthManager loads orgId after creation

### StripeOnboardingView:
- [ ] Step indicator shows correct progress
- [ ] createConnectAccount function succeeds
- [ ] Onboarding URL generated
- [ ] Link opens in Safari
- [ ] "Skip for now" option works
- [ ] Check status detects incomplete onboarding
- [ ] Check status detects complete onboarding
- [ ] Success screen shows after completion

### OnboardingLandingView:
- [ ] Feature rows display correctly
- [ ] "Create Business" opens CreateBusinessView
- [ ] "Sign In" opens SignInView
- [ ] Gradient background renders
- [ ] Buttons have proper shadows

### SignInView:
- [ ] Email/password fields work
- [ ] Sign in with valid credentials succeeds
- [ ] Error shown for invalid credentials
- [ ] Loading state during sign-in
- [ ] Dismisses after successful sign-in

## 📊 Success Metrics

- **Onboarding completion rate**: Track % who finish Stripe setup
- **Time to first booking**: Measure from account creation to first booking
- **Drop-off points**: Identify where users abandon onboarding
- **Support requests**: Monitor "Stripe setup help" tickets

## 🔒 Security Considerations

- ✅ Password minimum length enforced
- ✅ Email validation via Firebase Auth
- ✅ Stripe onboarding happens in secure Safari view
- ✅ Cloud Functions verify user is org owner
- ✅ No sensitive data stored in app
- ✅ Stripe keys loaded dynamically per org

## 📝 Documentation

### For Business Owners:
- Setup guide: "How to Connect Stripe"
- FAQ: "What information does Stripe need?"
- Troubleshooting: "Stripe onboarding issues"

### For Developers:
- Onboarding flow diagram
- Cloud Function API reference
- Testing with Stripe test accounts
- Error handling guide
