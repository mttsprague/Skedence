//
//  PackagesSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct PackagesSection: View {
    let packages: [AggregatedPackage]
    let isLoading: Bool
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Passes")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                
                if packages.isEmpty && !isLoading {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "ticket")
                            .font(.system(size: 32))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No passes")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(packages) { aggregated in
                            aggregatedPackageRow(aggregated)
                            if aggregated.id != packages.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func aggregatedPackageRow(_ aggregated: AggregatedPackage) -> some View {
        HStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(AppTheme.primary.opacity(0.15))
                Image(systemName: iconForPackageType(aggregated.packageType))
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.primary)
            }
            .frame(width: 48, height: 48)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(aggregated.packageDisplayName)
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if aggregated.hasExpired {
                    Text("Some expired")
                        .font(.labelSmall)
                        .foregroundStyle(Color.orange)
                } else if aggregated.totalRemaining == 0 {
                    Text("All used")
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                } else {
                    Text("\(aggregated.totalRemaining) of \(aggregated.totalLessons) remaining")
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            
            Spacer()
            
            if aggregated.totalRemaining > 0 {
                Text("\(aggregated.totalRemaining)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(aggregated.hasExpired ? Color.orange : AppTheme.primary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
    
    private func iconForPackageType(_ packageType: String) -> String {
        switch packageType {
        case "private", "1_athlete", "single":
            return "person.fill"
        case "2_athlete", "two_athlete":
            return "person.2.fill"
        case "3_athlete", "three_athlete":
            return "person.3.fill"
        case "class_pass", "class":
            return "calendar.badge.clock"
        default:
            return "ticket.fill"
        }
    }
}
