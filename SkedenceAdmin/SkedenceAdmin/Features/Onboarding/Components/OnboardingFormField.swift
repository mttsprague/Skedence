//
//  OnboardingFormField.swift
//  SkedenceAdmin
//
//  Shared form field components for onboarding steps
//

import SwiftUI

/// Standard form field for light backgrounds
struct OnboardingFormField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 24)
            
            TextField(placeholder, text: $text)
                .font(.bodyMedium)
                .keyboardType(keyboardType)
        }
        .padding()
        .background(AppTheme.surfaceSecondary)
        .cornerRadius(CornerRadius.md)
    }
}

/// Form field for dark backgrounds (white background)
struct OnboardingFormFieldLight: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 24)
            
            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(.bodyMedium)
            } else {
                TextField(placeholder, text: $text)
                    .font(.bodyMedium)
                    .keyboardType(keyboardType)
            }
        }
        .padding()
        .background(.white)
        .cornerRadius(CornerRadius.md)
    }
}

/// Section header with icon
struct OnboardingSectionHeader: View {
    let title: String
    let icon: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(AppTheme.primary)
            Text(title)
                .font(.headingSmall)
                .foregroundStyle(AppTheme.textPrimary)
        }
        .padding(.top, Spacing.sm)
    }
}
