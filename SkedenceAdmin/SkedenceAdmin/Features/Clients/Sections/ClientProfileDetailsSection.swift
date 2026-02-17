//
//  ClientProfileDetailsSection.swift
//  SkedenceAdmin
//
//  Displays client profile details including emergency contact and referral info
//

import SwiftUI

struct ClientProfileDetailsSection: View {
    let profile: UserProfile
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Contact Information")
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(spacing: Spacing.sm) {
                    // Parent/Guardian Info
                    infoRow(
                        icon: "person.fill",
                        title: "Parent/Guardian",
                        value: profile.fullName,
                        color: AppTheme.primary
                    )
                    
                    infoRow(
                        icon: "envelope.fill",
                        title: "Email",
                        value: profile.emailAddress,
                        color: AppTheme.primary,
                        isLink: true,
                        linkURL: "mailto:\(profile.emailAddress)"
                    )
                    
                    infoRow(
                        icon: "phone.fill",
                        title: "Phone",
                        value: profile.phoneNumber,
                        color: AppTheme.primary,
                        isLink: true,
                        linkURL: "tel:\(profile.phoneNumber)"
                    )
                    
                    // Emergency Contact
                    if !profile.emergencyContactName.isEmpty || !profile.emergencyContactNumber.isEmpty {
                        Divider()
                            .padding(.vertical, Spacing.xs)
                        
                        Text("Emergency Contact")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(.bottom, 2)
                        
                        if !profile.emergencyContactName.isEmpty {
                            infoRow(
                                icon: "exclamationmark.triangle.fill",
                                title: "Name",
                                value: profile.emergencyContactName,
                                color: AppTheme.secondary
                            )
                        }
                        
                        if !profile.emergencyContactNumber.isEmpty {
                            infoRow(
                                icon: "phone.badge.checkmark.fill",
                                title: "Phone",
                                value: profile.emergencyContactNumber,
                                color: AppTheme.secondary,
                                isLink: true,
                                linkURL: "tel:\(profile.emergencyContactNumber)"
                            )
                        }
                    }
                    
                    // Referral Info
                    if let referredBy = profile.referredBy, !referredBy.isEmpty {
                        Divider()
                            .padding(.vertical, Spacing.xs)
                        
                        infoRow(
                            icon: "person.2.fill",
                            title: "Referred By",
                            value: referredBy,
                            color: AppTheme.textSecondary
                        )
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private func infoRow(
        icon: String,
        title: String,
        value: String,
        color: Color,
        isLink: Bool = false,
        linkURL: String = ""
    ) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(color)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.labelSmall)
                    .foregroundStyle(AppTheme.textSecondary)
                
                if isLink, let url = URL(string: linkURL) {
                    Link(destination: url) {
                        Text(value)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.primary)
                            .underline()
                    }
                } else {
                    Text(value)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                }
            }
            
            Spacer()
        }
    }
}
