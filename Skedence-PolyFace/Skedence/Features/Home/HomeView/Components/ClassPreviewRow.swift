//
//  ClassPreviewRow.swift
//  Skedence
//
//  Extracted from HomeView.swift - Class preview card component
//

import SwiftUI

struct ClassPreviewRow: View {
    let groupClass: GroupClass
    @ObservedObject var classesService: ClassesService
    @ObservedObject var pricingService: PricingStructureService
    @State private var isRegistered = false
    @State private var seriesClasses: [GroupClass] = []

    /// Looks up the class pass price from the pricing structure.
    private var classPriceText: String? {
        let allPackages = pricingService.pricingStructure?.tiers.flatMap(\.packages) ?? []
        for pkgId in groupClass.eligiblePackageIds {
            if let match = allPackages.first(where: { $0.id == pkgId || $0.packageType == pkgId }) {
                return "\(match.formattedPrice)"
            }
        }
        let classPassPkg = allPackages.first { pkg in
            guard pkg.active else { return false }
            if pkg.packageCategory == .classPass { return true }
            let t = pkg.packageType.lowercased()
            let ttl = pkg.title.lowercased()
            return t.contains("class") || ttl.contains("class")
        }
        if let pkg = classPassPkg {
            return "\(pkg.formattedPrice)"
        }
        if groupClass.priceInCents > 0 {
            return "\(groupClass.formattedPrice)"
        }
        return nil
    }

    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.md) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.secondary, AppTheme.secondaryLight],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 50, height: 50)
                    
                    Image(systemName: "person.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack {
                        Text(groupClass.title)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if isRegistered {
                            BadgeView(text: "Registered", color: AppTheme.success)
                        }
                    }

                    // Date row — show all series dates or single date
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "calendar")
                            .font(.labelSmall)
                        if groupClass.isPartOfSeries == true && !seriesClasses.isEmpty {
                            Text(formatSeriesDates(seriesClasses))
                                .font(.labelMedium)
                        } else {
                            Text(groupClass.startTime.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()))
                                .font(.labelMedium)
                        }
                    }
                    .foregroundStyle(AppTheme.textSecondary)

                    // Series badge
                    if groupClass.isPartOfSeries == true, let total = groupClass.totalSeriesClasses {
                        BadgeView(text: "\(total)-Day Series", color: AppTheme.secondary)
                    }

                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "clock")
                            .font(.labelSmall)
                        Text("\(groupClass.startTime.formatted(date: .omitted, time: .shortened)) - \(groupClass.endTime.formatted(date: .omitted, time: .shortened))")
                            .font(.labelMedium)
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "person.fill")
                            .font(.labelSmall)
                        Text(groupClass.trainerName)
                            .font(.labelMedium)
                    }
                    .foregroundStyle(AppTheme.textSecondary)

                    if let price = classPriceText {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "tag")
                                .font(.labelSmall)
                            Text(price)
                                .font(.labelMedium)
                                .fontWeight(.semibold)
                        }
                        .foregroundStyle(AppTheme.secondary)
                    }
                    
                    // Capacity badge
                    if !isRegistered && groupClass.spotsRemaining <= 3 {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "person.2.fill")
                                .font(.labelSmall)
                            Text("\(groupClass.spotsRemaining) spots left")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(AppTheme.secondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .task(id: classesService.registrationChangeToken) {
            if let id = groupClass.id {
                isRegistered = await classesService.isRegistered(for: id)
            } else {
                isRegistered = false
            }
            // Load sibling classes for series date display
            if groupClass.isPartOfSeries == true, let seriesId = groupClass.seriesId {
                seriesClasses = classesService.allFetchedUpcomingClasses
                    .filter { $0.seriesId == seriesId }
                    .sorted { $0.startTime < $1.startTime }
            }
        }
    }

    /// Format series dates as "Mon 3/10, Tue 3/11, Wed 3/12"
    private func formatSeriesDates(_ classes: [GroupClass]) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE M/d"
        return classes.map { dateFormatter.string(from: $0.startTime) }.joined(separator: ", ")
    }
}
