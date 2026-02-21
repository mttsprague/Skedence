//
//  OrganizationCodeCard.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct OrganizationCodeCard: View {
    @ObservedObject var adminService: AdminService
    @Binding var alertItem: AlertItem?
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "building.2.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                    
                    Text("Organization Code")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                }
                
                Text("Share this code with new clients to allow them to register")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
                
                if let orgData = adminService.organizationData,
                   let inviteCode = orgData["inviteCode"] as? String {
                    
                    HStack(spacing: Spacing.md) {
                        // Large code display
                        Text(inviteCode)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundStyle(AppTheme.primary)
                            .tracking(2)
                            .padding(.vertical, Spacing.md)
                            .padding(.horizontal, Spacing.lg)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .fill(AppTheme.primary.opacity(0.1))
                            )
                        
                        VStack(spacing: Spacing.sm) {
                            // Copy button
                            Button {
                                #if os(iOS)
                                UIPasteboard.general.string = inviteCode
                                #elseif os(macOS)
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(inviteCode, forType: .string)
                                #endif
                                
                                alertItem = AlertItem(
                                    title: "Copied!",
                                    message: "Organization code copied to clipboard"
                                )
                            } label: {
                                HStack {
                                    Image(systemName: "doc.on.doc.fill")
                                    Text("Copy")
                                        .font(.bodySmall)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.sm)
                                .padding(.horizontal, Spacing.md)
                                .background(AppTheme.primary)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            
                            // Share button
                            #if os(iOS)
                            ShareLink(item: "Join our organization with code: \(inviteCode)") {
                                HStack {
                                    Image(systemName: "square.and.arrow.up.fill")
                                    Text("Share")
                                        .font(.bodySmall)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.sm)
                                .padding(.horizontal, Spacing.md)
                                .background(AppTheme.secondary)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            #endif
                        }
                        .frame(width: 100)
                    }
                } else {
                    HStack {
                        ProgressView()
                        Text("Loading organization code...")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .padding(Spacing.lg)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.md)
    }
}
