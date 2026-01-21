//
//  SubscriptionRequiredView.swift
//  Skedence
//
//  Simple view to handle subscription required state
//

import SwiftUI
import Combine

struct SubscriptionRequiredView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.openURL) var openURL
    
    var body: some View {
        NavigationView {
            VStack(spacing: Spacing.xl) {
                Spacer()
                
                // Icon
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(AppTheme.error)
                
                // Title
                Text("Subscription Required")
                    .font(.displaySmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                // Message
                Text("Your subscription needs attention to continue using this feature. Please contact your organization administrator to update billing.")
                    .font(.bodyLarge)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
                
                Spacer()
                
                // Actions
                VStack(spacing: Spacing.md) {
                    Button {
                        // Open email to support
                        if let url = URL(string: "mailto:support@appvolleyiq.com?subject=Subscription%20Issue") {
                            openURL(url)
                        }
                    } label: {
                        Text("Contact Support")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.horizontal, Spacing.lg)
                    
                    Button {
                        dismiss()
                    } label: {
                        Text("Close")
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .padding(.horizontal, Spacing.lg)
                }
                .padding(.bottom, Spacing.xl)
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
    }
}

#Preview {
    SubscriptionRequiredView()
}
