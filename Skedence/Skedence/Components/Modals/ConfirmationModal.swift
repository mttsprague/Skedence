//
//  ConfirmationModal.swift
//  Skedence
//
//  Phase 5.1: Standardized confirmation dialog/alert component
//

import SwiftUI

/// A standardized alert item for presenting alerts
struct AlertItem: Identifiable {
    let id = UUID()
    let title: String
    let message: String
    let primaryAction: (() -> Void)?
    let primaryLabel: String
    let secondaryAction: (() -> Void)?
    let secondaryLabel: String?
    
    init(
        title: String,
        message: String,
        primaryLabel: String = "OK",
        primaryAction: (() -> Void)? = nil,
        secondaryLabel: String? = nil,
        secondaryAction: (() -> Void)? = nil
    ) {
        self.title = title
        self.message = message
        self.primaryLabel = primaryLabel
        self.primaryAction = primaryAction
        self.secondaryLabel = secondaryLabel
        self.secondaryAction = secondaryAction
    }
}

/// A standardized confirmation modal with custom styling
struct ConfirmationModal: View {
    let title: String
    let message: String
    let icon: String?
    let iconColor: Color
    let primaryButtonLabel: String
    let primaryButtonAction: () -> Void
    let secondaryButtonLabel: String?
    let secondaryButtonAction: (() -> Void)?
    @Binding var isPresented: Bool
    
    init(
        title: String,
        message: String,
        icon: String? = "checkmark.circle.fill",
        iconColor: Color = AppTheme.success,
        primaryButtonLabel: String = "OK",
        primaryButtonAction: @escaping () -> Void = {},
        secondaryButtonLabel: String? = nil,
        secondaryButtonAction: (() -> Void)? = nil,
        isPresented: Binding<Bool>
    ) {
        self.title = title
        self.message = message
        self.icon = icon
        self.iconColor = iconColor
        self.primaryButtonLabel = primaryButtonLabel
        self.primaryButtonAction = primaryButtonAction
        self.secondaryButtonLabel = secondaryButtonLabel
        self.secondaryButtonAction = secondaryButtonAction
        self._isPresented = isPresented
    }
    
    var body: some View {
        ZStack {
            // Background overlay
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture {
                    isPresented = false
                }
            
            // Modal content
            VStack(spacing: Spacing.xl) {
                // Icon
                if let icon = icon {
                    ZStack {
                        Circle()
                            .fill(iconColor.opacity(0.15))
                            .frame(width: 80, height: 80)
                        
                        Image(systemName: icon)
                            .font(.system(size: 40))
                            .foregroundStyle(iconColor)
                    }
                }
                
                // Text
                VStack(spacing: Spacing.sm) {
                    Text(title)
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                        .multilineTextAlignment(.center)
                    
                    Text(message)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                
                // Buttons
                VStack(spacing: Spacing.sm) {
                    // Primary button
                    Button {
                        primaryButtonAction()
                        isPresented = false
                    } label: {
                        Text(primaryButtonLabel)
                            .font(.labelLarge)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary)
                            .cornerRadius(CornerRadius.sm)
                    }
                    
                    // Secondary button (optional)
                    if let secondaryLabel = secondaryButtonLabel {
                        Button {
                            secondaryButtonAction?()
                            isPresented = false
                        } label: {
                            Text(secondaryLabel)
                                .font(.labelLarge)
                                .fontWeight(.medium)
                                .foregroundStyle(AppTheme.textSecondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.md)
                                .background(Color(UIColor.systemGray6))
                                .cornerRadius(CornerRadius.sm)
                        }
                    }
                }
            }
            .padding(Spacing.xxl)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(CornerRadius.lg)
            .shadow(color: .black.opacity(0.2), radius: 20, x: 0, y: 10)
            .padding(Spacing.xl)
        }
    }
}
