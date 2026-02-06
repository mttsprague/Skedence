//
//  AthleteSelectionCard.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import SwiftUI

struct AthleteSelectionCard: View {
    let index: Int
    let athleteCount: Int
    let selectedAthlete: String?
    let availableAthletes: [String]
    let hasWaiver: Bool?
    let isNew: Bool?
    let onSelect: (String) -> Void
    let onAddNew: () -> Void
    
    private var ordinalNumber: String {
        ["First", "Second", "Third", "Fourth"][index]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            CardView(padding: Spacing.md) {
                Menu {
                    // Existing athletes
                    ForEach(availableAthletes, id: \.self) { athleteName in
                        Button {
                            onSelect(athleteName)
                        } label: {
                            Text(athleteName)
                                .font(.bodyMedium)
                        }
                    }
                    
                    // Add New Athlete option
                    Divider()
                    Button {
                        onAddNew()
                    } label: {
                        Label("Add New Athlete", systemImage: "person.badge.plus")
                            .font(.bodyMedium)
                    }
                } label: {
                    HStack(spacing: Spacing.md) {
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.xs)
                                .fill(AppTheme.primary.opacity(0.08))
                                .frame(width: 48, height: 48)
                            Image(systemName: index == 0 ? "person.fill" : "person.\(index + 1).fill")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(AppTheme.primary)
                        }
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            if let name = selectedAthlete {
                                Text(name)
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text(athleteCount == 1 ? "Selected athlete" : "\(ordinalNumber) athlete")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                Text(athleteCount == 1 ? "Select Athlete" : "Select \(ordinalNumber) Athlete")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Choose from your athletes")
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
            
            // Waiver Status Indicator
            if let athleteName = selectedAthlete {
                HStack(spacing: Spacing.xs) {
                    if let isNew = isNew, isNew {
                        // New athlete - always needs waiver
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.blue)
                        Text("New athlete will need a signed waiver")
                            .font(.caption)
                            .foregroundStyle(.blue)
                    } else if let hasWaiver = hasWaiver {
                        if hasWaiver {
                            // Has signed waiver
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.green)
                            Text("\(athleteName) has a signed waiver")
                                .font(.caption)
                                .foregroundStyle(.green)
                        } else {
                            // Needs waiver
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.blue)
                            Text("\(athleteName) will need a signed waiver")
                                .font(.caption)
                                .foregroundStyle(.blue)
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xxs)
            }
        }
    }
}
