//
//  OrganizationCard.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI
import FirebaseFirestore

struct OrganizationCard: View {
    let organization: Organization
    let onTap: () -> Void
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @State private var showingEditName = false
    @State private var editedName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(organization.name)
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(auth.billingPlan.capitalized)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Button {
                    editedName = organization.name
                    showingEditName = true
                } label: {
                    Image(systemName: "pencil.circle.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                }
                .buttonStyle(.plain)
                
                StatusBadge(
                    text: organization.subscriptionStatus ?? "unknown",
                    isActive: organization.subscriptionStatus == "active"
                )
            }
            
            if let stripeAccountId = organization.stripeAccountId {
                Label(stripeAccountId, systemImage: "creditcard")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        .onTapGesture(perform: onTap)
        .alert("Edit Organization Name", isPresented: $showingEditName) {
            TextField("Organization Name", text: $editedName)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                Task {
                    await saveOrganizationName()
                }
            }
            .disabled(editedName.isEmpty)
        } message: {
            if let error = errorMessage {
                Text(error)
            } else {
                Text("Enter a new name for your organization")
            }
        }
    }
    
    private func saveOrganizationName() async {
        guard let orgId = organization.id,
              !editedName.isEmpty,
              editedName != organization.name else { return }
        
        isSaving = true
        errorMessage = nil
        
        do {
            try await Firestore.firestore()
                .collection("organizations")
                .document(orgId)
                .updateData(["name": editedName])
            
            await MainActor.run {
                isSaving = false
                showingEditName = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isSaving = false
            }
        }
    }
}
