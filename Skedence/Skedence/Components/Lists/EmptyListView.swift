//
//  EmptyListView.swift
//  Skedence
//
//  Phase 5.1: Standardized empty state component for lists
//

import SwiftUI

/// A standardized empty state view for lists
struct EmptyListView: View {
    let icon: String
    let title: String
    let message: String
    var action: (() -> Void)? = nil
    var actionLabel: String? = nil
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Icon
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.1))
                    .frame(width: 80, height: 80)
                
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundStyle(AppTheme.primary)
            }
            
            // Text
            VStack(spacing: Spacing.xs) {
                Text(title)
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(message)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            // Optional action button
            if let action = action, let label = actionLabel {
                Button(action: action) {
                    Text(label)
                        .font(.labelLarge)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, Spacing.md)
                        .background(AppTheme.primary)
                        .cornerRadius(CornerRadius.sm)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.xxl)
    }
}
