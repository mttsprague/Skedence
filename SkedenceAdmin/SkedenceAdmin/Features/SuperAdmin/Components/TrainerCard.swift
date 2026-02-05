//
//  TrainerCard.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct TrainerCard: View {
    let trainer: AdminTrainer
    @StateObject private var viewModel = SuperAdminViewModel()
    @State private var showingDeleteConfirmation = false
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    
    var body: some View {
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
            
            Button {
                showingDeleteConfirmation = true
            } label: {
                Image(systemName: "person.fill.xmark")
                    .foregroundColor(.orange)
                    .font(.body)
            }
            .buttonStyle(.plain)
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
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
