//
//  ErrorModal.swift
//  Skedence
//
//  Phase 5.1: Standardized error display modal component
//

import SwiftUI

/// A standardized error modal with consistent styling
struct ErrorModal: View {
    let error: Error
    let onDismiss: () -> Void
    @Binding var isPresented: Bool
    
    init(
        error: Error,
        onDismiss: @escaping () -> Void = {},
        isPresented: Binding<Bool>
    ) {
        self.error = error
        self.onDismiss = onDismiss
        self._isPresented = isPresented
    }
    
    var body: some View {
        ZStack {
            // Background overlay
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture {
                    isPresented = false
                    onDismiss()
                }
            
            // Modal content
            VStack(spacing: Spacing.xl) {
                // Error icon
                ZStack {
                    Circle()
                        .fill(AppTheme.error.opacity(0.15))
                        .frame(width: 80, height: 80)
                    
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(AppTheme.error)
                }
                
                // Error text
                VStack(spacing: Spacing.sm) {
                    Text("Error")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(error.localizedDescription)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                
                // Dismiss button
                Button {
                    isPresented = false
                    onDismiss()
                } label: {
                    Text("OK")
                        .font(.labelLarge)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(AppTheme.error)
                        .cornerRadius(CornerRadius.sm)
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

/// A standardized success modal with consistent styling
struct SuccessModal: View {
    let title: String
    let message: String
    let onDismiss: () -> Void
    @Binding var isPresented: Bool
    
    init(
        title: String,
        message: String,
        onDismiss: @escaping () -> Void = {},
        isPresented: Binding<Bool>
    ) {
        self.title = title
        self.message = message
        self.onDismiss = onDismiss
        self._isPresented = isPresented
    }
    
    var body: some View {
        ConfirmationModal(
            title: title,
            message: message,
            icon: "checkmark.circle.fill",
            iconColor: AppTheme.success,
            primaryButtonLabel: "OK",
            primaryButtonAction: onDismiss,
            isPresented: $isPresented
        )
    }
}
