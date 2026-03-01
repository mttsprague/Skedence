//
//  PackageSelectionCard.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import SwiftUI

struct PackageSelectionCard: View {
    let packages: [LessonPackage]
    let selectedPackage: LessonPackage?
    let pricingStructure: PricingStructure?
    let onSelect: (LessonPackage) -> Void
    
    private var uniquePackageTypes: [String] {
        let types = Set(packages.map { $0.packageType })
        return Array(types).sorted()
    }
    
    private func totalRemaining(packageType: String) -> Int {
        return packages.filter { $0.packageType == packageType }
            .reduce(0) { $0 + $1.lessonsRemaining }
    }
    
    private func firstPackage(ofType packageType: String) -> LessonPackage? {
        return packages.first { $0.packageType == packageType }
    }
    
    private func displayTitle(_ package: LessonPackage) -> String {
        if let name = package.packageName, !name.isEmpty { return name }
        if let pricing = pricingStructure {
            for tier in pricing.tiers {
                if let match = tier.packages.first(where: { $0.packageType == package.packageType }) {
                    return match.title
                }
            }
        }
        return package.packageType.replacingOccurrences(of: "_", with: " ").capitalized
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Select Pass to Use")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.horizontal, Spacing.lg)

            CardView(padding: Spacing.md) {
                Menu {
                    ForEach(uniquePackageTypes, id: \.self) { packageType in
                        if let firstPkg = firstPackage(ofType: packageType) {
                            Button {
                                onSelect(firstPkg)
                            } label: {
                                let totalRemaining = totalRemaining(packageType: packageType)
                                let passTitle = displayTitle(firstPkg)
                                Text("\(passTitle) (\(totalRemaining) passes left)")
                                    .font(.bodyMedium)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: Spacing.md) {
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.xs)
                                .fill(AppTheme.primary.opacity(0.08))
                                .frame(width: 48, height: 48)
                            Image(systemName: "ticket")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(AppTheme.primary)
                        }
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            if let pkg = selectedPackage {
                                let totalRemaining = totalRemaining(packageType: pkg.packageType)
                                let passTitle = displayTitle(pkg)
                                Text("\(passTitle) (\(totalRemaining) passes left)")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                            } else {
                                Text("Choose a pass")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Select which pass to use")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }
}
