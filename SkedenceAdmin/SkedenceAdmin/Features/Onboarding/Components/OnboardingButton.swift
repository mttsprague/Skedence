//
//  OnboardingButton.swift
//  SkedenceAdmin
//
//  Shared button components for onboarding steps
//

import SwiftUI

struct OnboardingPrimaryButton: View {
    let title: String
    let isLoading: Bool
    let isEnabled: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                }
                Text(isLoading ? "Loading..." : title)
                    .font(.headingSmall)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(isEnabled ? AppTheme.primary : Color.gray)
            .cornerRadius(CornerRadius.lg)
        }
        .disabled(!isEnabled || isLoading)
    }
}

struct OnboardingSecondaryButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
        }
    }
}
