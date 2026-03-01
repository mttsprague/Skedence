//
//  LoadingListView.swift
//  Skedence
//
//  Phase 5.1: Standardized loading state component for lists
//

import SwiftUI

/// A standardized loading view for list states
struct LoadingListView: View {
    var message: String = "Loading..."
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .scaleEffect(1.2)
            
            Text(message)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.xxl)
    }
}

/// A standardized loading row for list views
struct LoadingListRow: View {
    var body: some View {
        HStack(spacing: Spacing.md) {
            ProgressView()
            Text("Loading...")
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
        }
        .padding(Spacing.md)
    }
}
