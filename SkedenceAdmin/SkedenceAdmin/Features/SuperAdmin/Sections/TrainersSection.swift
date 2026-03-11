//
//  TrainersSection.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct TrainersSection: View {
    let trainers: [AdminTrainer]
    let isLoading: Bool
    let canAddTrainer: Bool
    let trainerLimit: Int
    let trainerCount: Int
    @Binding var showingAvatarUpload: Bool
    let onShowAddTrainer: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Upload Trainer Avatar Card
            Button(action: {
                showingAvatarUpload = true
            }) {
                HStack {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.title2)
                        .foregroundStyle(AppTheme.primary)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Upload Trainer Avatar")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Add or update trainer profile photos")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(CornerRadius.md)
                .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
            }
            .buttonStyle(.plain)
            .contentShape(Rectangle())
            
            Divider()
                .padding(.vertical, Spacing.sm)
            
            // Trainer limit banner
            if !canAddTrainer {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Trainer Limit Reached")
                                .font(.headline)
                            Text("You have \(trainerCount) of \(trainerLimit) trainers. Contact support to upgrade your plan and add more trainers.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(CornerRadius.md)
            }
            
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if trainers.isEmpty {
                EmptyStateView(
                    icon: "person.badge.plus",
                    title: "No Trainers",
                    message: "Add trainers to organizations",
                    action: onShowAddTrainer,
                    actionTitle: "Add Trainer"
                )
            } else {
                ForEach(trainers) { trainer in
                    TrainerCard(trainer: trainer)
                }
            }
        }
        .padding()
    }
}

