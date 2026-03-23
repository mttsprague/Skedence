//
//  TrainerCard.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct TrainerCard: View {
    let trainer: AdminTrainer
    @ObservedObject var viewModel: SuperAdminViewModel
    @State private var showingDeleteConfirmation = false
    @State private var showingEditTierSheet = false
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    
    var body: some View {
        Button {
            showingEditTierSheet = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(trainer.displayName)
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    if let email = trainer.email {
                        Text(email)
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    // Pricing tier badge
                    if let tierName = trainer.pricingTierName {
                        HStack(spacing: 4) {
                            Image(systemName: "medal.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(.orange)
                            Text(tierName)
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(6)
                    }
                    
                    if let orgName = trainer.organizationName {
                        Text(orgName)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
                
                Spacer()
                
                StatusBadge(
                    text: trainer.role ?? "trainer",
                    isActive: trainer.active == true
                )
                
                Image(systemName: "chevron.right")
                    .foregroundStyle(AppTheme.textSecondary)
                    .font(.caption)
            }
            .padding(Spacing.md)
            .background(Color.platformBackground)
            .cornerRadius(CornerRadius.md)
            .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showingEditTierSheet) {
            EditTrainerTierSheet(trainer: trainer, viewModel: viewModel)
        }
        .alert("Deactivate Trainer?", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Deactivate", role: .destructive) {
                Task {
                    await viewModel.deactivateTrainer(trainerId: trainer.id, orgId: auth.currentOrgId)
                }
            }
        } message: {
            Text("Deactivating this trainer will hide them from the trainers list and prevent clients from booking with them. They will still appear in the Members tab.")
        }
    }
}
