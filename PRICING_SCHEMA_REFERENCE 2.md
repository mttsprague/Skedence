# Pricing Structure Schema Reference

## Overview
The pricing structure is stored dynamically in Firestore at `organizations/{orgId}/pricingStructure` and is used across both apps and Firebase Functions to ensure consistent pricing.

## 🗂️ Firestore Schema

### Location
```
organizations/{orgId}
  └── pricingStructure: {
        tiers: [...],
        lastUpdated: Date
      }
```

### Complete Schema
```typescript
{
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

## 📱 Client App (Skedence)

### Models
**File:** `Skedence/Skedence/PricingStructure.swift`

```swift
struct PackageOption: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var title: String                    // Display name
    var priceInCents: Int                // Price in cents (8000 = $80)
    var packageType: String              // Unique identifier
    
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

### Service
**File:** `Skedence/Skedence/PricingStructureService.swift`

```swift
class PricingStructureService: ObservableObject {
    @Published var pricingStructure: PricingStructure?
    
    // Load pricing from Firestore
    func loadPricingStructure(for orgId: String) async
    
    // Save pricing to Firestore (admin only)
    func savePricingStructure(_ structure: PricingStructure, for orgId: String) async throws
    
    // Helper properties
    var allPackageOptions: [PackageOption]
    var packageTitles: [String]
    func package(withTitle: String) -> PackageOption?
}
```

### Usage in Views

**ProfileView - Passes Tab:**
```swift
@StateObject private var pricingService = PricingStructureService()

.task {
    await pricingService.loadPricingStructure(for: orgId)
}

// Display packages
let packageTypes = pricingService.allPackageOptions
ForEach(packageTypes) { packageOption in
    passTypeCard(
        title: packageOption.title,
        count: remainingPasses(forType: packageOption.packageType),
        icon: iconForPackageType(packageOption.packageType)
    )
}
```

**PurchaseLessonsView:**
```swift
@StateObject private var pricingService = PricingStructureService()

.task {
    await pricingService.loadPricingStructure(for: orgId)
}

// Use for purchase options
let packages = pricingService.allPackageOptions
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

## 🛠️ Admin App (SkedenceAdmin)

### Where Pricing is Created

**1. During Onboarding (Step 6):**
**File:** `SkedenceAdmin/SkedenceAdmin/OnboardingPackagesView.swift`

```swift
// User creates first package
let pricingStructure = PricingStructure(
    tiers: [
        PricingTier(
            tierName: tierName,
            packages: [
                PackageOption(
                    title: packageName,
                    priceInCents: Int(packagePrice * 100),
                    packageType: packageName.lowercased().replacingOccurrences(of: " ", with: "_")
                )
            ]
        )
    ],
    lastUpdated: Date()
)

// Save to Firestore
let data = try encoder.encode(pricingStructure)
let dictionary = try JSONSerialization.jsonObject(with: data) as? [String: Any]

try await db.collection("organizations").document(orgId).setData([
    "pricingStructure": dictionary
], merge: true)

print("✅ OnboardingPackages: Saved pricing structure for org \(orgId)")
```

**2. After Onboarding (Manage Tab):**
**File:** `SkedenceAdmin/SkedenceAdmin/AdminPanelView.swift` (line 1127)

The Manage tab has a "Pricing Structure" section where owners/admins can:
- Add/edit/delete tiers
- Add/edit/delete packages within each tier
- Save changes to Firestore

## ⚡ Firebase Functions

### Purchase Lesson Package Flow

**File:** `SkedenceAdmin/functions/src/stripe-connect.ts` (line 313)

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
    `Invalid package type or amount. Expected ${validPackages[packageType]} for ${packageType}, got ${amount}`
  );
}
```

**File:** `SkedenceAdmin/functions/src/stripe.ts` (line 69)
Same logic for `createCheckoutSession` function.

### Why This Matters
Functions validate that the purchase amount matches the organization's pricing structure. This prevents:
- Price tampering on the client side
- Outdated prices being charged
- Custom pricing per organization being ignored

## 🔐 Firestore Security Rules

### Organizations Collection
```javascript
match /organizations/{orgId} {
  // Members can read their own organization (includes pricing structure)
  // Changed from 'allow get' to 'allow read' to support snapshot listeners
  allow read: if isMemberOfOrg(orgId);
  
  // Admins can update organization settings (including pricing)
  allow update: if isOrgAdmin(orgId);
}
```

**Key Fix:** Changed from `allow get:` to `allow read:` because:
- `get` only allows single document reads
- `read` includes both `get` and snapshot listeners (`.addSnapshotListener()`)
- Client app uses listeners to monitor subscription status on the same document

## 🔄 Data Flow

### Complete Purchase Flow

```
1. Admin creates pricing in onboarding or Manage tab
   └─> Saves to: organizations/{orgId}/pricingStructure

2. Client app loads pricing structure
   └─> ProfileView.task or PurchaseLessonsView.task
   └─> PricingStructureService.loadPricingStructure(orgId)
   └─> Reads from: organizations/{orgId}/pricingStructure
   └─> Displays dynamic packages and prices

3. User selects package and clicks purchase
   └─> PurchaseLessonsView calls handlePurchase()
   └─> Sends to function: { packageType, amount, trainerId }

4. Firebase Function validates
   └─> Loads: organizations/{orgId}/pricingStructure
   └─> Validates: validPackages[packageType] == amount
   └─> Creates Stripe Payment Intent
   └─> Returns: { clientSecret, paymentIntentId }

5. Client completes payment with Stripe
   └─> StripeService.presentPaymentSheet()
   └─> On success: Creates lessonPackage document
```

## 🧪 Testing Checklist

### Verify Pricing is Saved
1. Go through onboarding in admin app
2. Create a package in Step 6
3. Check console for: `✅ OnboardingPackages: Saved pricing structure for org...`
4. In Firebase Console → Firestore → organizations/{orgId}
5. Verify `pricingStructure` field exists with tiers and packages

### Verify Client App Loads Pricing
1. Open client app (Skedence)
2. Sign in as a client
3. Go to Profile tab → Passes
4. Check console for: `✅ Loaded pricing structure with X tiers`
5. Verify packages display with correct names and icons (not defaults)
6. Tap "Buy Lessons"
7. Verify package dropdown shows custom packages (not 4 defaults)

### Verify Functions Use Correct Pricing
1. In client app, select a package and complete purchase
2. Check Firebase Functions logs for: `✅ Loaded X packages from pricing structure`
3. Verify no "Invalid package type or amount" errors

## ❌ Common Issues

### Issue: "Missing or insufficient permissions"
**Symptom:** Client app can't load pricing, shows 4 default packages
**Cause:** Firestore rules used `allow get:` instead of `allow read:`
**Fix:** Deploy updated firestore.rules with `allow read: if isMemberOfOrg(orgId);`

### Issue: Client shows 4 default packages instead of custom ones
**Symptom:** ProfileView shows "1 Athlete Private Lesson $80", "2 Athlete Private Lesson $120", etc.
**Cause:** Either:
1. Pricing structure not saved during onboarding
2. Permission error loading pricing
3. orgId mismatch

**Debug:**
- Check console for: `✅ Loaded pricing structure with X tiers`
- If no log, check for permission errors
- Verify Firebase Console has pricingStructure field
- Verify user's orgId matches document orgId

### Issue: "Invalid package type or amount" error during purchase
**Symptom:** Purchase fails with validation error from function
**Cause:** Client sent different amount than what's in pricing structure
**Fix:** 
- Verify client loaded latest pricing: `await pricingService.loadPricingStructure(for: orgId)`
- Check Firebase Console pricing matches what client displays
- Clear client app cache and reload

## 🔧 Maintenance

### Adding New Package Types
1. Admin app: Go to Manage → Pricing Structure
2. Add package with descriptive title and packageType
3. Client app: Will automatically display new package
4. Functions: Will automatically validate new package

### Changing Prices
1. Admin app: Edit pricing in Manage → Pricing Structure
2. Save changes
3. Client apps will load new prices on next launch
4. Active purchases use price from when they were initiated

### Schema Changes
If you need to add new fields to PackageOption or PricingTier:
1. Update models in both apps: `Skedence/Skedence/PricingStructure.swift` and `SkedenceAdmin/SkedenceAdmin/PricingStructure.swift`
2. Update Firebase Functions interfaces (if needed)
3. Add migration logic for existing pricing structures
4. Test thoroughly before deploying

## 📚 Related Files

### Client App (Skedence)
- `Skedence/Skedence/PricingStructure.swift` - Data models
- `Skedence/Skedence/PricingStructureService.swift` - Load/save service
- `Skedence/Skedence/ProfileView.swift` - Display packages in Passes tab
- `Skedence/Skedence/PurchaseLessonsView.swift` - Purchase flow
- `Skedence/firestore.rules` - Security rules

### Admin App (SkedenceAdmin)
- `SkedenceAdmin/SkedenceAdmin/PricingStructure.swift` - Data models
- `SkedenceAdmin/SkedenceAdmin/PricingStructureService.swift` - Load/save service
- `SkedenceAdmin/SkedenceAdmin/OnboardingPackagesView.swift` - Create first package
- `SkedenceAdmin/SkedenceAdmin/AdminPanelView.swift` - Edit pricing (line 1127)
- `SkedenceAdmin/firestore.rules` - Security rules

### Firebase Functions
- `SkedenceAdmin/functions/src/stripe-connect.ts` - Purchase with Connect
- `SkedenceAdmin/functions/src/stripe.ts` - Purchase without Connect

---

**Last Updated:** January 12, 2026
**Status:** ✅ Schema consistent across all systems
