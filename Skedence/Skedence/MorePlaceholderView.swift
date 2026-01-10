//
//  MorePlaceholderView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import SwiftUI

struct MorePlaceholderView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("More")
                            .font(.displayMedium)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("Information & Support")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.top, Spacing.md)
                    
                    // Profile Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Profile")
                        
                        CardView {
                            NavigationLink(destination: EditProfileView()) {
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                            .fill(AppTheme.primary.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(AppTheme.primary)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text("Edit Profile")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.primary)
                                        
                                        Text("Update your information")
                                            .font(.labelMedium)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(AppTheme.textTertiary)
                                }
                            }
                        }
                    }
                    
                    // Contact Us Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Contact Us")
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                // Email
                                Link(destination: URL(string: "mailto:support@skedence.com")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.primary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "envelope.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Email Support")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                            
                                            Text("support@skedence.com")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                
                                Divider()
                                
                                // Website
                                Link(destination: URL(string: "https://www.skedence.com")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.secondary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "globe")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.secondary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Website")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                            
                                            Text("skedence.com")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "arrow.up.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Legal Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Legal")
                        
                        CardView {
                            Link(destination: URL(string: "https://www.skedence.com/privacy")!) {
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                            .fill(AppTheme.accent.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        
                                        Image(systemName: "hand.raised.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(AppTheme.accent)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text("Privacy Policy")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.primary)
                                        
                                        Text("View our privacy policy")
                                            .font(.labelMedium)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "arrow.up.right")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(AppTheme.textTertiary)
                                }
                            }
                        }
                    }
                    
                    // App Info
                    VStack(spacing: Spacing.xs) {
                        Text("Skedence")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Text("Version 1.0")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, Spacing.lg)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
            .navigationBarHidden(true)
        }
        .navigationViewStyle(.stack)
    }
}
