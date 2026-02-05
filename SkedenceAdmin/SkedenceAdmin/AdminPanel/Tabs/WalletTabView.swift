//
//  WalletTabView.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct WalletTabView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var adminService: AdminService
    
    @Binding var selectedClient: SimpleUser?
    @Binding var showingProcessPayment: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Client Wallet")
                    .font(.headingLarge)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Process payments and manage payment methods")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.horizontal, Spacing.lg)
            
            CardView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Select Client")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Menu {
                            ForEach(adminService.allUsers) { user in
                                Button {
                                    selectedClient = user
                                } label: {
                                    HStack {
                                        Text("\(user.firstName) \(user.lastName)")
                                        if !user.athleteName.isEmpty {
                                            Text("(\(user.athleteName))")
                                                .font(.caption)
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Text(selectedClient != nil ? "\(selectedClient!.firstName) \(selectedClient!.lastName)" : "Choose a client")
                                    .font(.bodyMedium)
                                    .foregroundStyle(selectedClient != nil ? AppTheme.textPrimary : AppTheme.textSecondary)
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                            .padding(Spacing.sm)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                    .stroke(AppTheme.border, lineWidth: 1)
                            )
                        }
                        .menuStyle(.automatic)
                    }
                    
                    if selectedClient != nil {
                        Divider()
                        
                        Button {
                            showingProcessPayment = true
                        } label: {
                            HStack {
                                Spacer()
                                Image(systemName: "creditcard.fill")
                                Text("Process Payment")
                                    .font(.headingSmall)
                                    .fontWeight(.semibold)
                                Spacer()
                            }
                            .foregroundStyle(.white)
                            .padding(Spacing.md)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                                    .fill(AppTheme.primary)
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }
}
