//
//  OrganizationsSection.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct OrganizationsSection: View {
    let organizations: [Organization]
    let isLoading: Bool
    let billingPlan: String
    let isBillingBlocked: Bool
    let currentOrgId: String?
    let isDeletingAccount: Bool
    let onCreateOrganization: () -> Void
    let onShowDeleteConfirmation: () -> Void
    @Environment(\.openURL) private var openURL
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if organizations.isEmpty {
                EmptyStateView(
                    icon: "building.2",
                    title: "No Organizations",
                    message: "Create an organization to get started",
                    action: onCreateOrganization,
                    actionTitle: "Create Organization"
                )
            } else {
                ForEach(organizations) { org in
                    OrganizationCard(organization: org) {
                        // View/Edit organization
                    }
                }
                
                // Admin Management Cards
                Divider()
                    .padding(.vertical, Spacing.md)
                
                // Stripe Settings
                NavigationLink(destination: StripeSettingsViewDirect()) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Stripe")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("You can also add Stripe keys in the admin portal at skedence.com.")
                                .font(.footnote)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "creditcard")
                            .foregroundStyle(AppTheme.primary)
                        Image(systemName: "chevron.right")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(CornerRadius.md)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                }
                
                // Contact Us
                Button {
                    if let url = URL(string: "mailto:support@skedence.com?subject=Support%20Request") {
                        openURL(url)
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Contact Us")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Get help from our team")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "envelope")
                            .foregroundStyle(AppTheme.primary)
                        Image(systemName: "chevron.right")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(CornerRadius.md)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                }
                .buttonStyle(.plain)
                
                // Legal Section
                VStack(spacing: Spacing.sm) {
                    Button {
                        if let url = URL(string: "https://www.skedence.com/privacy-policy") {
                            openURL(url)
                        }
                    } label: {
                        HStack {
                            Text("Privacy Policy")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(CornerRadius.md)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                    
                    Button {
                        if let url = URL(string: "https://www.skedence.com/terms-of-service") {
                            openURL(url)
                        }
                    } label: {
                        HStack {
                            Text("Terms of Service")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(CornerRadius.md)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                }
                
                // Danger Zone
                Divider()
                    .padding(.vertical, Spacing.md)
                
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Danger Zone")
                        .font(.headingSmall)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                    
                    Button {
                        onShowDeleteConfirmation()
                    } label: {
                        HStack {
                            Image(systemName: "trash.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.red)
                            
                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text("Delete Account")
                                    .font(.bodyMedium)
                                    .foregroundStyle(.red)
                                
                                Text("Permanently delete all your data")
                                    .font(.labelMedium)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            
                            Spacer()
                            
                            if isDeletingAccount {
                                ProgressView()
                                    .tint(.red)
                            } else {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(CornerRadius.md)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                    .disabled(isDeletingAccount)
                }
            }
        }
        .padding()
    }
}
