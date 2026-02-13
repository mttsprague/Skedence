# iOS Client App - Passes Display Updates

## Overview
Update the client app's passes display to match the new admin portal structure:
- Show fixed categories (One Athlete, Two Athletes, Three Athletes, Four Athletes) always
- Show dynamic class categories only when purchased
- Group passes by category instead of by individual package type
- Allow expanding categories to see purchase history details

## Files to Update

### 1. ProfileView.swift - Passes Tab

**Current Behavior:**
- Shows each package type from pricing structure as a separate card
- Loops through `pricingService.allPackageOptions` and creates a card for each

**New Behavior:**
- Show 4 fixed athlete categories (always visible)
- Show class pass categories dynamically (only when purchased)
- Each category card shows:
  - Category name (One Athlete, Two Athletes, etc.)
  - Total remaining passes in that category (sum across all packages)
  - Next expiration date (earliest expiring pass in category)
  - Tap to expand and see purchase details

**Implementation Steps:**

1. **Create Category Structure**
```swift
struct PassCategory: Identifiable {
    let id: String
    let displayName: String
    let isFixed: Boolean  // true for 1-4 athlete, false for classes
    var totalRemaining: Int
    var nextExpiration: Date?
    var purchases: [PurchaseDetail]
}

struct PurchaseDetail: Identifiable {
    let id: String
    let packageName: String
    let totalLessons: Int
    let remainingLessons: Int
    let purchaseDate: Date
    let expirationDate: Date
    let isExpired: Bool
}
```

2. **Update passesTab computed property**
```swift
private var passesTab: some View {
    VStack(spacing: 16) {
        if packagesService.isLoading {
            ProgressView().padding()
        } else if let error = packagesService.loadError {
            // Error view...
        } else {
            // Build category groups
            let categories = buildCategoryGroups()
            
            ForEach(categories) { category in
                CategoryCard(
                    category: category,
                    isExpanded: expandedCategories.contains(category.id),
                    onTap: { toggleCategory(category.id) }
                )
            }
            
            // Bottom buttons (Refresh + Purchase)
            // ... existing buttons ...
        }
    }
}
```

3. **Add Helper Functions**
```swift
@State private var expandedCategories: Set<String> = []

private func buildCategoryGroups() -> [PassCategory] {
    var categories: [PassCategory] = []
    
    // Fixed categories
    let fixedCategories = [
        (id: "oneAthlete", name: "One Athlete"),
        (id: "twoAthlete", name: "Two Athletes"),
        (id: "threeAthlete", name: "Three Athletes"),
        (id: "fourAthlete", name: "Four Athletes")
    ]
    
    for fixed in fixedCategories {
        let purchases = getPurchasesForCategory(fixed.id)
        let activePurchases = purchases.filter { !$0.isExpired }
        let totalRemaining = activePurchases.reduce(0) { $0 + $1.remainingLessons }
        let nextExp = activePurchases.map(\.expirationDate).min()
        
        categories.append(PassCategory(
            id: fixed.id,
            displayName: fixed.name,
            isFixed: true,
            totalRemaining: totalRemaining,
            nextExpiration: nextExp,
            purchases: purchases
        ))
    }
    
    // Dynamic class categories
    let classPurchases = getPurchasesForClassCategories()
    let groupedByCategory = Dictionary(grouping: classPurchases) { $0.categoryId }
    
    for (categoryId, purchases) in groupedByCategory {
        let activePurchases = purchases.filter { !$0.isExpired }
        let totalRemaining = activePurchases.reduce(0) { $0 + $1.remainingLessons }
        let nextExp = activePurchases.map(\.expirationDate).min()
        
        categories.append(PassCategory(
            id: categoryId,
            displayName: getCategoryDisplayName(categoryId),
            isFixed: false,
            totalRemaining: totalRemaining,
            nextExpiration: nextExp,
            purchases: purchases
        ))
    }
    
    return categories
}

private func getPurchasesForCategory(_ categoryId: String) -> [PurchaseDetail] {
    packagesService.packages
        .filter { pkg in
            let pkgCategory = getPackageCategory(pkg.packageType)
            return pkgCategory == categoryId
        }
        .map { pkg in
            PurchaseDetail(
                id: pkg.id,
                packageName: pkg.packageName ?? pkg.packageType,
                totalLessons: pkg.totalLessons,
                remainingLessons: max(0, pkg.lessonsRemaining),
                purchaseDate: pkg.purchaseDate,
                expirationDate: pkg.expirationDate,
                isExpired: pkg.expirationDate < Date()
            )
        }
        .sorted { $0.purchaseDate > $1.purchaseDate } // Most recent first
}

private func getPackageCategory(_ packageType: String) -> String {
    // Map package types to categories
    switch packageType {
    case "1_athlete", "private":
        return "oneAthlete"
    case "2_athlete":
        return "twoAthlete"
    case "3_athlete":
        return "threeAthlete"
    case "4_athlete":
        return "fourAthlete"
    default:
        return packageType // For classes, use the package type as category
    }
}

private func toggleCategory(_ categoryId: String) {
    if expandedCategories.contains(categoryId) {
        expandedCategories.remove(categoryId)
    } else {
        expandedCategories.insert(categoryId)
    }
}
```

4. **Create CategoryCard View**
```swift
private func CategoryCard(category: PassCategory, isExpanded: Bool, onTap: @escaping () -> Void) -> some View {
    card {
        VStack(alignment: .leading, spacing: 12) {
            // Header (always visible)
            Button(action: onTap) {
                HStack {
                    // Icon
                    Image(systemName: iconForCategory(category.id))
                        .font(.system(size: 24))
                        .foregroundStyle(category.isFixed ? AppTheme.primary : AppTheme.secondary)
                        .frame(width: 40)
                    
                    // Category info
                    VStack(alignment: .leading, spacing: 4) {
                        Text(category.displayName)
                            .font(.headingMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if category.totalRemaining > 0 {
                            Text("\(category.totalRemaining) remaining")
                                .font(.labelMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                            
                            if let nextExp = category.nextExpiration {
                                Text("Next expires \(nextExp, style: .date)")
                                    .font(.labelSmall)
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        } else {
                            Text("No active passes")
                                .font(.labelMedium)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                    
                    Spacer()
                    
                    // Count badge
                    Text("\(category.totalRemaining)")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(category.totalRemaining > 0 ? AppTheme.primary : AppTheme.textTertiary)
                    
                    // Expand icon
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(AppTheme.textSecondary)
                        .font(.system(size: 14))
                }
            }
            .buttonStyle(.plain)
            
            // Expanded details
            if isExpanded {
                Divider()
                    .padding(.vertical, 4)
                
                if category.purchases.isEmpty {
                    Text("No passes in this category")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.vertical, 8)
                } else {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(category.purchases) { purchase in
                            PurchaseDetailRow(purchase: purchase)
                        }
                    }
                }
            }
        }
    }
}

private func PurchaseDetailRow(purchase: PurchaseDetail) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        HStack {
            Text(purchase.packageName)
                .font(.bodyMedium.weight(.semibold))
                .foregroundStyle(AppTheme.textPrimary)
            
            if purchase.isExpired {
                Text("EXPIRED")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(AppTheme.error)
                    .cornerRadius(4)
            }
        }
        
        HStack(spacing: 16) {
            HStack(spacing: 4) {
                Image(systemName: "ticket.fill")
                    .font(.caption)
                Text("\(purchase.remainingLessons) of \(purchase.totalLessons) remaining")
                    .font(.labelMedium)
            }
            .foregroundStyle(AppTheme.textSecondary)
            
            HStack(spacing: 4) {
                Image(systemName: "calendar")
                    .font(.caption)
                Text("Purchased \(purchase.purchaseDate, style: .date)")
                    .font(.labelSmall)
            }
            .foregroundStyle(AppTheme.textTertiary)
        }
        
        HStack(spacing: 4) {
            Image(systemName: purchase.isExpired ? "exclamationmark.triangle.fill" : "clock")
                .font(.caption)
            Text("Expires \(purchase.expirationDate, style: .date)")
                .font(.labelSmall)
        }
        .foregroundStyle(purchase.isExpired ? AppTheme.error : AppTheme.textSecondary)
    }
    .opacity(purchase.isExpired ? 0.6 : 1.0)
    .padding(.vertical, 8)
}

private func iconForCategory(_ categoryId: String) -> String {
    switch categoryId {
    case "oneAthlete":
        return "person.fill"
    case "twoAthlete":
        return "person.2.fill"
    case "threeAthlete":
        return "person.3.fill"
    case "fourAthlete":
        return "person.fill.badge.plus"
    default:
        return "calendar.badge.clock"
    }
}
```

### 2. PurchaseLessonsView.swift

**Current Behavior:**
- Already groups packages by category (good!)
- Shows categories with packages underneath

**Status:**
✅ No changes needed - already implements the desired grouping behavior

## Summary

The main work is in `ProfileView.swift` to:
1. Add category-based grouping logic
2. Create expandable category cards
3. Show fixed athlete categories always
4. Show class categories dynamically
5. Display purchase history details when expanded

The purchase view is already correct and doesn't need changes.
