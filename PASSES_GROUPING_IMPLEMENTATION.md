# Passes Grouping Implementation

## Overview
Updated the client app's purchase passes view to group packages by athlete count instead of displaying each pricing package as a separate card.

## Changes Made

### 1. PurchaseLessonsView.swift

#### Added Grouping Logic
- **`groupedPackages()` function**: Groups all packages by their `packageCategory` (oneAthlete, twoAthlete, threeAthlete, fourAthlete, classPass)
- Sorts categories in logical order: 1 athlete → 2 athletes → 3 athletes → 4 athletes → classes
- Within each category, sorts packages by `lessonCount` (1 pass, 5 passes, 10 passes, etc.)

#### New UI Components

**`packageGroupCard(category:packages:)`**
- Creates a grouped card for each athlete category
- Header shows:
  - Category icon (gradient background)
  - Category name (e.g., "1 Athlete", "2 Athletes")
- Lists all package options for that category underneath

**`packageOptionRow(package:isSelected:gradientColor:onTap:)`**
- Individual row for each pricing package within a group
- Shows:
  - **Lesson count badge** (circular, shows number of passes: "5 passes")
  - **Package title** (if different from category name)
  - **Description** (if provided)
  - **Total price** in bold green
  - **Per-pass price** (e.g., "$40 per pass" if buying 5 passes for $200)
  - **Selection indicator** (checkmark circle)
- Highlights selected package with subtle background color and border

## User Experience

### Before
- Each pricing package showed as a separate large card
- Example: "5 Pass Bundle - 1 Athlete" was its own card
- Harder to compare prices across different quantities

### After
- Packages grouped by athlete count:
  ```
  📦 1 Athlete
    ○ 1 pass - $50
    ○ 5 passes - $200 ($40 per pass)
    ○ 10 passes - $350 ($35 each)
  
  📦 2 Athletes
    ○ 1 pass - $75
    ○ 5 passes - $325 ($65 per pass)
  
  📦 Class
    ○ 1 class - $20
    ○ 10 classes - $180 ($18 per class)
  ```

## Benefits

1. **Better Organization**: All options for the same athlete count are together
2. **Easier Comparison**: Clients can easily see bulk discounts within each category
3. **Cleaner UI**: More compact and scannable
4. **Per-Pass Pricing**: Automatically calculates and displays price per pass for bulk packages
5. **Scalable**: Admins can add any number of pricing tiers (1, 5, 10, 20, 50 passes) and they'll automatically group correctly

## Data Structure

The existing `PackageOption` model already supports this:
- `packageCategory`: Determines which group (oneAthlete, twoAthlete, etc.)
- `lessonCount`: Number of passes in the package (1, 5, 10, etc.)
- `title`: Custom name for the package
- `description`: Optional description
- `priceInCents`: Total price for the package

## Admin Setup

When admins create pricing packages in the admin portal, they should:
1. Set the `packageCategory` to indicate athlete count
2. Set `lessonCount` to indicate quantity (1, 5, 10, etc.)
3. Set price accordingly (with bulk discounts if desired)

The client app will automatically group these correctly.

## Example Data

```swift
// 1 Athlete packages
PackageOption(
    title: "Single Pass",
    priceInCents: 5000,  // $50
    packageCategory: .oneAthlete,
    lessonCount: 1
)

PackageOption(
    title: "5-Pack (Save 20%)",
    priceInCents: 20000,  // $200 ($40 each)
    packageCategory: .oneAthlete,
    lessonCount: 5,
    description: "Best value! Save $50"
)

// These will both appear under "1 Athlete" group
```

## Testing

The grouping logic:
- Handles missing categories (only shows categories that have packages)
- Maintains selection state when switching between packages
- Correctly calculates per-pass pricing for display
- Sorts packages logically (lowest to highest lesson count)

## Future Enhancements

Potential improvements:
- Add "Most Popular" or "Best Value" badges
- Show total savings calculation
- Allow collapsible groups
- Add filtering/search if there are many packages
