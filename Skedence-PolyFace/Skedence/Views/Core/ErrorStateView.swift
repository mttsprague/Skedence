//
//  ErrorStateView.swift
//  Skedence
//
//  Phase 6: Standardized error display component
//

import SwiftUI

/// Standardized error display with retry functionality
struct ErrorStateView: View {
    let error: Error
    let retry: (() -> Void)?
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(AppTheme.error)
            
            Text("Something Went Wrong")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            Text(error.localizedDescription)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)
            
            if let retry = retry {
                Button(action: retry) {
                    Label("Try Again", systemImage: "arrow.clockwise")
                        .font(.headingSmall)
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, Spacing.md)
                        .background(AppTheme.primary)
                        .cornerRadius(CornerRadius.md)
                }
                .padding(.top, Spacing.md)
            }
        }
        .padding(Spacing.xl)
    }
}

// MARK: - Error State Extension for Service Errors
extension ErrorStateView {
    /// Initialize with service error and retry action
    init(error: Error, retryAction: @escaping () -> Void) {
        self.error = error
        self.retry = retryAction
    }
    
    /// Initialize with error message only (no retry)
    init(error: Error) {
        self.error = error
        self.retry = nil
    }
}

#Preview {
    VStack(spacing: 40) {
        ErrorStateView(
            error: NSError(domain: "TestError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to connect to server"]),
            retryAction: {}
        )
        
        ErrorStateView(
            error: NSError(domain: "TestError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Permission denied"])
        )
    }
}
