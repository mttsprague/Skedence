//
//  UserCard.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct UserCard: View {
    let user: AdminUser
    @StateObject private var viewModel = SuperAdminViewModel()
    @State private var showingRoleSheet = false
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(user.firstName) \(user.lastName)")
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if let email = user.emailAddress {
                    Text(email)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                if let orgName = user.organizationName {
                    Text(orgName)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
            
            Spacer()
            
            Button {
                showingRoleSheet = true
            } label: {
                StatusBadge(
                    text: user.isActive == false ? "inactive" : (user.role ?? "member"),
                    isActive: user.isActive ?? true
                )
            }
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        .sheet(isPresented: $showingRoleSheet) {
            ChangeRoleSheet(user: user, viewModel: viewModel)
        }
    }
}
