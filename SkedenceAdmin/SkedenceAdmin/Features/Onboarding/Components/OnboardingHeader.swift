//
//  OnboardingHeader.swift
//  SkedenceAdmin
//
//  Shared header component for onboarding steps
//

import SwiftUI

struct OnboardingHeader: View {
    let icon: String
    let title: String
    let subtitle: String
    var iconSize: CGFloat = 56
    var alignment: HorizontalAlignment = .center
    
    var body: some View {
        VStack(alignment: alignment, spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: iconSize))
                .foregroundStyle(AppTheme.primary)
                .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : .leading)
                .padding(.bottom, alignment == .center ? Spacing.xs : 0)
            
            Text(title)
                .font(.displaySmall)
                .foregroundStyle(AppTheme.textPrimary)
                .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : .leading)
            
            Text(subtitle)
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : .leading)
                .multilineTextAlignment(alignment == .center ? .center : .leading)
        }
    }
}

struct OnboardingHeaderLight: View {
    let icon: String
    let title: String
    let subtitle: String
    var iconSize: CGFloat = 64
    
    var body: some View {
        VStack(alignment: .center, spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: iconSize))
                .foregroundStyle(.white)
                .shadow(radius: 10)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.bottom, Spacing.md)
            
            Text(title)
                .font(.displayMedium)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .center)
            
            Text(subtitle)
                .font(.bodyLarge)
                .foregroundStyle(.white.opacity(0.9))
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)
        }
    }
}
