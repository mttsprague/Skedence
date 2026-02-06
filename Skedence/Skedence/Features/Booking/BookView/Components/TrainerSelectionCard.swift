//
//  TrainerSelectionCard.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import SwiftUI

struct TrainerSelectionCard: View {
    let selectedTrainer: Trainer?
    let trainers: [Trainer]
    let onSelect: (Trainer) -> Void
    let onInfoTapped: () -> Void
    
    private var trainersOrdered: [Trainer] {
        trainers.sorted { lhs, rhs in
            let lhsPriority = isJeff(lhs) ? 0 : 1
            let rhsPriority = isJeff(rhs) ? 0 : 1
            if lhsPriority != rhsPriority { return lhsPriority < rhsPriority }
            let ln = lhs.name ?? ""
            let rn = rhs.name ?? ""
            return ln.localizedCaseInsensitiveCompare(rn) == .orderedAscending
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Select Trainer")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                Button {
                    onInfoTapped()
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 20))
                        .foregroundStyle(AppTheme.primary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, Spacing.lg)

            CardView(padding: Spacing.md) {
                Menu {
                    ForEach(trainersOrdered, id: \.id) { trainer in
                        Button {
                            onSelect(trainer)
                        } label: {
                            HStack(spacing: Spacing.sm) {
                                TrainerAvatarView(trainer: trainer, size: 28)
                                Text(trainer.name ?? "Unnamed")
                                    .font(.bodyMedium)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: Spacing.md) {
                        TrainerAvatarView(trainer: selectedTrainer, size: 48)
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(selectedTrainer?.name ?? "")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Professional Trainer")
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
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
    
    private func isJeff(_ trainer: Trainer) -> Bool {
        (trainer.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            .localizedCaseInsensitiveCompare("Jeff Schmitz") == .orderedSame
    }
}
