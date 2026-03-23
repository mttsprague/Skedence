# Tier Pricing Implementation Status

**Feature:** Trainer-specific pricing tiers  
**Status:** 🚧 **IN PROGRESS** - **DO NOT DEPLOY TO PRODUCTION**  
**Date Started:** March 23, 2026  
**Design:** Option 1 - Subtle tier badge when expanded

---

## Overview

Allow organizations to have trainers at different price points. Passes are purchased for a specific tier and can be used with ANY trainer in that tier.

### Example:
- **Master Trainer Tier** ($100/lesson) - Jeff Miller, Sarah Johnson
- **Advanced Trainer Tier** ($80/lesson) - Mike Smith, Lisa Brown
- Client buys "10 Pass - Master Tier" → Can book with Jeff OR Sarah
- Client buys "10 Pass - Advanced Tier" → Can book with Mike OR Lisa

---

## ✅ Phase 1: Data Models & Schema (COMPLETED)

### Models Updated:

**1. Trainer Model** (`Skedence/Skedence/Models/Trainer.swift`)
```swift
struct Trainer {
    // NEW FIELDS:
    let pricingTierId: String?       // e.g., "tier_master"
    let pricingTierName: String?     // e.g., "Master Trainer"
}
```

**2. LessonPackage Model** (`Skedence/Skedence/Models/LessonPackage.swift`)
```swift
struct LessonPackage {
    // NEW FIELDS:
    let pricingTierId: String?       // Which tier this pass is for
    let pricingTierName: String?     // Display name
    let pricePerLesson: Int?         // Price in cents (for display)
    
    // NEW METHOD:
    func isValidForTrainer(_ trainer: Trainer) -> Bool
}
```

**3. ProfileView Updated** (`Skedence/Skedence/Screens/ProfileView.swift`)
- PurchaseDetail struct includes tier info
- Tier badge displays in expanded pass details:
  ```
  🏅 Master Trainer • $100/lesson
  ```
- Color: Orange (.orange)

**4. Polyface App Synced**
- All model changes applied to Polyface client app
- Maintains feature parity with Skedence

---

## 🚧 Phase 2: Purchase Flow (TODO)

### Files to Update:

**1. PurchaseManager.swift**
- [ ] Add tier selection when purchasing
- [ ] Store tier info with purchased package
- [ ] Validate pricing against tier

**2. PurchaseLessonsView.swift**
- [ ] Show trainer tier selection UI
- [ ] Display "Select Trainer Tier" section
- [ ] Show trainers in each tier
- [ ] Filter packages by selected tier

**3. Stripe Functions**
- [ ] Update `createPaymentIntentConnect` to accept tierId
- [ ] Validate pricing structure includes tier

---

## 🚧 Phase 3: Booking Flow (TODO)

### Files to Update:

**1. BookView.swift**
- [ ] Filter available passes by selected trainer's tier
- [ ] Use `package.isValidForTrainer(trainer)` method
- [ ] Show tier mismatch message if no valid passes
- [ ] Update `availableLessonPackages` computed property

**2. TrainerSelectionView.swift** (if exists)
- [ ] Display trainer's tier name
- [ ] Show price per lesson
- [ ] Format: "Jeff Miller - Master Trainer • $100/lesson"

---

## 🚧 Phase 4: Admin Management (TODO)

### Web Admin Portal:

**1. Trainers Page** (`skedence-unified/src/app/(admin)/trainers/page.tsx`)
- [ ] Add "Pricing Tier" dropdown when editing trainers
- [ ] Show current tier assignment in trainer list
- [ ] Allow changing trainer's tier

**2. Pricing Page** (`skedence-unified/src/app/(admin)/pricing/page.tsx`)
- [ ] Show which trainers are assigned to each tier
- [ ] "Trainers in this tier: Jeff Miller, Sarah Johnson"
- [ ] Allow assigning/unassigning trainers

**3. TypeScript Types** (`skedence-unified/src/types/index.ts`)
- [ ] Add pricingTierId, pricingTierName to Trainer interface
- [ ] Add tier fields to LessonPackage interface

### iOS Admin App:

**1. Trainer Management**
- [ ] Add tier selection when creating/editing trainers
- [ ] Show tier in trainer list

---

## 🚧 Phase 5: Migration & Backwards Compatibility (TODO)

### Migration Script:
- [ ] Create `migrate-trainers-to-tiers.js`
- [ ] Assign all existing trainers to "Standard" tier
- [ ] Set all existing passes to null tier (universal)

### Backwards Compatibility:
- [x] **Passes without tier** → Work with any trainer ✅
- [x] **Trainers without tier** → Only accept non-tier passes ✅
- [x] **isValidForTrainer()** method handles all cases ✅

---

## 📐 Firestore Schema Changes

### trainers/{trainerId}
```typescript
{
  ...existing fields...
  pricingTierId: "tier_master",      // NEW
  pricingTierName: "Master Trainer"  // NEW
}
```

### organizations/{orgId}/users/{userId}/packages/{packageId}
```typescript
{
  ...existing fields...
  pricingTierId: "tier_master",      // NEW
  pricingTierName: "Master Trainer", // NEW
  pricePerLesson: 10000              // NEW (cents)
}
```

### organizations/{orgId}/pricingStructure
```typescript
{
  tiers: [
    {
      id: "tier_master",
      tierName: "Master Trainer",
      packages: [...],
      // Optional: trainers: ["trainer_id_1", "trainer_id_2"]
    }
  ]
}
```

---

## 🎨 UI/UX Design

### Passes Tab (ProfileView)
**Before:**
```
Private Lesson - 10 Pass
🎫 8 of 10 remaining
📅 Purchased Feb 1
```

**After (with tier):**
```
Private Lesson - 10 Pass
🏅 Master Trainer • $100/lesson    ← NEW
🎫 8 of 10 remaining
📅 Purchased Feb 1
```

### Purchase Flow:
1. Client opens "Purchase Passes"
2. **NEW:** "Select Trainer Tier" section shows:
   - Master Trainer ($100/lesson) - Jeff Miller, Sarah Johnson
   - Advanced Trainer ($80/lesson) - Mike Smith
3. Select tier → Shows packages for that tier
4. Purchase → Pass is valid for ALL trainers in that tier

### Booking Flow:
1. Client selects trainer (Jeff Miller - Master Trainer)
2. **NEW:** Only shows passes valid for Master tier
3. If no valid passes → "No passes available for this trainer's tier"

---

## 🧪 Testing Checklist (After Implementation)

- [ ] Test: Purchase pass for Master tier
- [ ] Test: Pass shows "Master Trainer" badge in Passes tab
- [ ] Test: Can book with any Master tier trainer using that pass
- [ ] Test: Cannot book with Advanced tier trainer using Master pass
- [ ] Test: Legacy passes (no tier) still work with all trainers
- [ ] Test: Trainers without tier assignment only accept legacy passes
- [ ] Test: Web admin can assign trainers to tiers
- [ ] Test: Tier pricing validates correctly in Stripe functions
- [ ] Test: Migration script works on test data

---

## 🚨 Important Notes

**DO NOT DEPLOY UNTIL:**
1. All phases completed
2. Testing checklist passed
3. Migration script tested
4. User approval on design

**Current Status:**
- ✅ Models ready
- ✅ Display ready (shows tier badge when expanded)
- ⏳ Purchase flow not implemented
- ⏳ Booking flow not implemented
- ⏳ Admin management not implemented

**Next Steps:**
1. Implement Purchase Flow (Phase 2)
2. Implement Booking Flow (Phase 3)
3. Build Admin Management UI (Phase 4)
4. Test thoroughly
5. Create migration script
6. Deploy after approval

---

## 📝 Git Status

**Branch:** rebrand-coachflow  
**Commits:** None yet (in progress)  
**Files Modified:**
- Skedence/Skedence/Models/Trainer.swift
- Skedence/Skedence/Models/LessonPackage.swift
- Skedence/Skedence/Screens/ProfileView.swift
- Skedence-PolyFace/Skedence/Models/Trainer.swift
- Skedence-PolyFace/Skedence/Models/LessonPackage.swift

**Do NOT commit/push until feature is complete.**

---

*This is a work-in-progress feature. All changes are in beta mode and not deployed to production.*
