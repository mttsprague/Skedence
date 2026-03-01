//
//  TrainerBioSheet.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import SwiftUI

struct TrainerBioSheet: View {
    @Environment(\.dismiss) var dismiss
    let trainer: Trainer
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header with Avatar and Name
                    VStack(spacing: Spacing.md) {
                        TrainerAvatarView(trainer: trainer, size: 80)
                        
                        Text(trainer.name ?? "Trainer")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if let email = trainer.email {
                            Text(email)
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    
                    Divider()
                        .padding(.horizontal, Spacing.lg)
                    
                    // Bio Content
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("About")
                            .font(.headingMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if let bio = trainer.trainerDescription, !bio.isEmpty {
                            Text(bio)
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                                .lineSpacing(6)
                        } else {
                            Text("No bio available")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textTertiary)
                                .italic()
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                }
                .padding(.vertical, Spacing.xl)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
            .navigationTitle("Trainer Bio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(AppTheme.primary)
                }
            }
        }
    }
}
